import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { dbAll, dbGet, dbRun } from '@/app/api/_lib/db'
import { ensureAuthenticatedUser } from '@/app/api/_lib/security'

export async function GET(request: NextRequest) {
  const authResult = ensureAuthenticatedUser(request, ['landlord', 'admin'])

  if ('response' in authResult) {
    return authResult.response
  }

  const requests = dbAll<{
    id: string
    unit_id: string
    unit_name: string
    tenant_name: string | null
    title: string
    description: string
    priority: string
    status: string
    submitted_date: string
    images_json: string
    completed_date: string | null
    assigned_to_user_id: string | null
  }>(
    `SELECT
      m.id,
      m.unit_id,
      u.name AS unit_name,
      m.tenant_name,
      m.title,
      m.description,
      m.priority,
      m.status,
      m.submitted_date,
      m.images_json,
      m.completed_date,
      m.assigned_to_user_id
    FROM maintenance_requests m
    JOIN units u ON u.id = m.unit_id
    JOIN properties p ON p.id = m.property_id
    WHERE p.owner_user_id = ?
    ORDER BY m.submitted_date DESC`,
    [authResult.dbUser.id]
  )

  return NextResponse.json(
    requests.map((requestItem) => ({
      id: requestItem.id,
      unit: requestItem.unit_name,
      tenant: requestItem.tenant_name ?? '',
      title: requestItem.title,
      description: requestItem.description,
      priority: requestItem.priority,
      status: requestItem.status,
      submittedDate: requestItem.submitted_date,
      images: JSON.parse(requestItem.images_json || '[]'),
      completedDate: requestItem.completed_date ?? undefined,
      assignedTo: requestItem.assigned_to_user_id ?? undefined,
    }))
  )
}

export async function POST(request: NextRequest) {
  const authResult = ensureAuthenticatedUser(request, ['landlord', 'admin'])

  if ('response' in authResult) {
    return authResult.response
  }

  try {
    const body = await request.json()
    const { unitId, title, description, priority, images } = body

    if (!unitId || !title) {
      return NextResponse.json(
        { error: 'Unit ID and title are required', code: 'invalid_request' },
        { status: 400 }
      )
    }

    const unit = dbGet<{ id: string; property_id: string; tenant_name: string | null }>(
      `SELECT u.id, u.property_id, u.tenant_name
       FROM units u
       JOIN properties p ON p.id = u.property_id
       WHERE u.id = ? AND p.owner_user_id = ?`,
      [unitId, authResult.dbUser.id]
    )

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found', code: 'not_found' }, { status: 404 })
    }

    const requestId = `maint_req_${Date.now()}`
    const submittedDate = new Date().toISOString()

    dbRun(
      `INSERT INTO maintenance_requests (
        id, property_id, unit_id, tenant_name, title, description, priority, status, submitted_date, updated_date, images_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
      [
        requestId,
        unit.property_id,
        unit.id,
        unit.tenant_name || '',
        title,
        description || '',
        priority || 'medium',
        submittedDate,
        submittedDate,
        JSON.stringify(Array.isArray(images) ? images : []),
      ]
    )

    return NextResponse.json(
      {
        success: true,
        request: {
          id: requestId,
          unitId,
          title,
          description: description || '',
          priority: priority || 'medium',
          status: 'open',
          submittedDate,
          images: Array.isArray(images) ? images : [],
        },
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', code: 'server_error' },
      { status: 500 }
    )
  }
}
