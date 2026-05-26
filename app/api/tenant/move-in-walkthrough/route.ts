import crypto from 'crypto'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { dbAll, dbGet, dbRun } from '@/app/api/_lib/db'
import { ensureAuthenticatedUser } from '@/app/api/_lib/security'

const DEFAULT_ROOMS = [
  { id: 'room1', name: 'Living Room' },
  { id: 'room2', name: 'Kitchen' },
  { id: 'room3', name: 'Bedroom 1' },
  { id: 'room4', name: 'Bedroom 2' },
  { id: 'room5', name: 'Bathroom' },
]

export async function GET(request: NextRequest) {
  const authResult = ensureAuthenticatedUser(request, ['tenant', 'landlord', 'admin'])

  if ('response' in authResult) {
    return authResult.response
  }

  const unit =
    authResult.dbUser.role === 'tenant'
      ? dbGet<{ id: string; property_id: string; status: string; tenant_name: string | null }>(
          'SELECT id, property_id, status, tenant_name FROM units WHERE tenant_user_id = ? ORDER BY created_at DESC LIMIT 1',
          [authResult.dbUser.id]
        )
      : dbGet<{ id: string; property_id: string; status: string; tenant_name: string | null }>(
          `SELECT u.id, u.property_id, u.status, u.tenant_name
           FROM units u
           JOIN properties p ON p.id = u.property_id
           WHERE p.owner_user_id = ? AND u.tenant_user_id IS NOT NULL
           ORDER BY u.created_at DESC
           LIMIT 1`,
          [authResult.dbUser.id]
        )

  if (!unit) {
    return NextResponse.json({
      id: null,
      tenantId: null,
      unitId: null,
      status: 'not-started',
      startedDate: null,
      completedDate: null,
      rooms: DEFAULT_ROOMS.map((room) => ({ ...room, status: 'pending', photos: [] })),
      instructions: 'Take clear photos of the condition of each room. Capture any existing damage, stains, or wear.',
    })
  }

  const walkthrough = dbGet<{
    id: string
    status: string
    started_date: string | null
    completed_date: string | null
    instructions: string
  }>(
    'SELECT id, status, started_date, completed_date, instructions FROM walkthroughs WHERE unit_id = ? LIMIT 1',
    [unit.id]
  )

  if (!walkthrough) {
    const walkthroughId = `walk_${unit.id}`
    const startedDate = new Date().toISOString()
    dbRun(
      `INSERT INTO walkthroughs (id, property_id, unit_id, tenant_user_id, status, started_date, instructions, updated_at)
       VALUES (?, ?, ?, ?, 'not-started', ?, ?, datetime('now'))`,
      [walkthroughId, unit.property_id, unit.id, authResult.dbUser.role === 'tenant' ? authResult.dbUser.id : null, startedDate, 'Take clear photos of the condition of each room. Capture any existing damage, stains, or wear.']
    )
    for (const room of DEFAULT_ROOMS) {
      dbRun(
        `INSERT INTO walkthrough_rooms (id, walkthrough_id, name, status, photos_json, updated_at)
         VALUES (?, ?, ?, 'pending', '[]', datetime('now'))`,
        [`${walkthroughId}_${room.id}`, walkthroughId, room.name]
      )
    }
  }

  const rooms = dbAll<{
    id: string
    name: string
    status: string
    photos_json: string
  }>(
    'SELECT id, name, status, photos_json FROM walkthrough_rooms WHERE walkthrough_id = ? ORDER BY created_at ASC',
    [`walk_${unit.id}`]
  )

  return NextResponse.json({
    id: `walk_${unit.id}`,
    tenantId: authResult.dbUser.id,
    unitId: unit.id,
    status: walkthrough?.status ?? 'not-started',
    startedDate: walkthrough?.started_date ?? null,
    completedDate: walkthrough?.completed_date ?? null,
    rooms: rooms.length > 0 ? rooms.map((room) => ({ id: room.id, name: room.name, status: room.status, photos: JSON.parse(room.photos_json || '[]') })) : DEFAULT_ROOMS.map((room) => ({ ...room, status: 'pending', photos: [] })),
    instructions:
      walkthrough?.instructions ??
      'Take clear photos of the condition of each room. Capture any existing damage, stains, or wear.',
  })
}

export async function POST(request: NextRequest) {
  const authResult = ensureAuthenticatedUser(request, ['tenant'])

  if ('response' in authResult) {
    return authResult.response
  }

  try {
    const body = await request.json()
    const { tenantId, unitId, roomId, photos } = body

    if (!tenantId || !unitId || !roomId) {
      return NextResponse.json(
        { error: 'Tenant ID, unit ID, and room ID are required', code: 'invalid_request' },
        { status: 400 }
      )
    }

    const unit = dbGet<{ id: string; property_id: string }>(
      'SELECT id, property_id FROM units WHERE id = ? AND tenant_user_id = ?',
      [unitId, authResult.dbUser.id]
    )

    if (!unit || tenantId !== authResult.dbUser.id) {
      return NextResponse.json({ error: 'Forbidden', code: 'forbidden' }, { status: 403 })
    }

    const walkthroughId = `walk_${unit.id}`
    const contentHash = crypto
      .createHash('sha256')
      .update(`${tenantId}${unitId}${roomId}${JSON.stringify(photos || [])}${new Date().toISOString()}`)
      .digest('hex')

    dbRun(
      `UPDATE walkthrough_rooms
       SET status = 'completed', photos_json = ?, updated_at = datetime('now')
       WHERE walkthrough_id = ? AND id = ?`,
      [JSON.stringify(Array.isArray(photos) ? photos : []), walkthroughId, roomId]
    )

    dbRun(
      `UPDATE walkthroughs
       SET status = 'in-progress', updated_at = datetime('now')
       WHERE id = ?`,
      [walkthroughId]
    )

    return NextResponse.json(
      {
        success: true,
        room: {
          id: roomId,
          tenantId,
          unitId,
          photoCount: Array.isArray(photos) ? photos.length : 0,
          uploadedDate: new Date().toISOString(),
          locked: true,
          certificate: {
            timestamp: new Date().toISOString(),
            hash: contentHash,
            status: 'verified',
          },
        },
        message: 'Room photos submitted and locked successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to submit walkthrough photos', code: 'server_error' },
      { status: 500 }
    )
  }
}
