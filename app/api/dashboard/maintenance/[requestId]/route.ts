import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { dbGet, dbRun } from '@/app/api/_lib/db'
import { ensureAuthenticatedUser } from '@/app/api/_lib/security'

export async function PUT(
  request: NextRequest,
  context: any
) {
  const authResult = ensureAuthenticatedUser(request, ['landlord', 'admin'])

  if ('response' in authResult) {
    return authResult.response
  }

  const requestRow = dbGet<{ id: string }>(
    `SELECT m.id
     FROM maintenance_requests m
     JOIN properties p ON p.id = m.property_id
     WHERE m.id = ? AND p.owner_user_id = ?`,
    [context.params.requestId, authResult.dbUser.id]
  )

  if (!requestRow) {
    return NextResponse.json({ error: 'Maintenance request not found', code: 'not_found' }, { status: 404 })
  }

  const body = await request.json()
  const status = typeof body.status === 'string' ? body.status : ''

  if (!['open', 'in-progress', 'completed'].includes(status)) {
    return NextResponse.json(
      { error: 'Invalid maintenance status', code: 'invalid_request' },
      { status: 400 }
    )
  }

  dbRun(
    `UPDATE maintenance_requests
     SET status = ?, completed_date = CASE WHEN ? = 'completed' THEN datetime('now') ELSE completed_date END,
         updated_date = datetime('now')
     WHERE id = ?`,
    [status, status, context.params.requestId]
  )

  return NextResponse.json({ success: true, status })
}