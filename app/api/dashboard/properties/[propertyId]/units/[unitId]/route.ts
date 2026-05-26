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

  const unit = dbGet<{ id: string }>(
    `SELECT u.id
     FROM units u
     JOIN properties p ON p.id = u.property_id
     WHERE u.id = ? AND p.id = ? AND p.owner_user_id = ?`,
    [context.params.unitId, context.params.propertyId, authResult.dbUser.id]
  )

  if (!unit) {
    return NextResponse.json({ error: 'Unit not found', code: 'not_found' }, { status: 404 })
  }

  const body = await request.json()
  const { name, tenant, email, rentAmount, status, dueDate } = body

  dbRun(
    `UPDATE units
     SET name = ?, tenant_name = ?, tenant_email = ?, rent_amount = ?, status = ?, due_day = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      name,
      tenant || '',
      email,
      Number(rentAmount),
      status || 'vacant',
      dueDate == null || dueDate === '' ? null : Number(dueDate),
      context.params.unitId,
    ]
  )

  return NextResponse.json({
    success: true,
    unit: {
      id: context.params.unitId,
      name,
      tenant: tenant || '',
      email,
      rentAmount: Number(rentAmount),
      status: status || 'vacant',
      dueDate: dueDate == null || dueDate === '' ? null : String(dueDate),
    },
  })
}
