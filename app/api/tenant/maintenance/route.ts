import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { dbGet, dbRun } from '@/app/api/_lib/db'
import { ensureAuthenticatedUser } from '@/app/api/_lib/security'

export async function GET(request: NextRequest) {
  const authResult = ensureAuthenticatedUser(request, ['tenant', 'landlord', 'admin'])

  if ('response' in authResult) {
    return authResult.response
  }

  const requests = dbGet<{ unit_id: string }>(
    `SELECT u.id AS unit_id
     FROM units u
     WHERE u.tenant_user_id = ?
     ORDER BY u.created_at DESC
     LIMIT 1`,
    [authResult.dbUser.id]
  )

  if (!requests) {
    return NextResponse.json([])
  }

  const maintenanceRequests = dbGet<any>(
    `SELECT id, unit_id, tenant_name, title, description, status, priority, submitted_date, images_json
     FROM maintenance_requests
     WHERE unit_id = ?
     ORDER BY submitted_date DESC`,
    [requests.unit_id]
  )

  return NextResponse.json(maintenanceRequests ? [maintenanceRequests] : [])
}

export async function POST(request: NextRequest) {
  const authResult = ensureAuthenticatedUser(request, ['tenant'])

  if ('response' in authResult) {
    return authResult.response
  }

  try {
    const body = await request.json()
    const { tenantId, unitId, title, description, priority, images } = body

    if (!tenantId || !unitId || !title) {
      return NextResponse.json(
        { error: 'Tenant ID, unit ID, and title are required', code: 'invalid_request' },
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

    const requestId = `maint_req_${Date.now()}`
    const submittedDate = new Date().toISOString()

    dbRun(
      `INSERT INTO maintenance_requests (
        id, property_id, unit_id, tenant_user_id, tenant_name, title, description, priority, status, submitted_date, updated_date, images_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
      [
        requestId,
        unit.property_id,
        unitId,
        authResult.dbUser.id,
        authResult.user.name || authResult.user.email,
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
          tenantId,
          unitId,
          title,
          description: description || '',
          priority: priority || 'medium',
          status: 'open',
          submittedDate,
          images: Array.isArray(images) ? images : [],
        },
        message: 'Maintenance request submitted successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to submit maintenance request', code: 'server_error' },
      { status: 500 }
    )
  }
}
