import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { dbGet, dbRun } from '@/app/api/_lib/db'
import { ensureAuthenticatedUser } from '@/app/api/_lib/security'

export async function POST(request: NextRequest, context: any) {
  const authResult = ensureAuthenticatedUser(request, ['landlord', 'admin'])

  if ('response' in authResult) {
    return authResult.response
  }

  const property = dbGet<{ id: string }>(
    'SELECT id FROM properties WHERE id = ? AND owner_user_id = ?',
    [context.params.propertyId, authResult.dbUser.id]
  )

  if (!property) {
    return NextResponse.json({ error: 'Property not found', code: 'not_found' }, { status: 404 })
  }

  const body = await request.json()
  const { name, tenant, email, rentAmount, status, dueDate } = body

  if (!name || !email || rentAmount == null) {
    return NextResponse.json(
      { error: 'Unit name, email, and rent amount are required', code: 'invalid_request' },
      { status: 400 }
    )
  }

  const unitId = `unit_${Date.now()}`

  dbRun(
    `INSERT INTO units (
      id, property_id, tenant_name, tenant_email, name, rent_amount, status, due_day, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      unitId,
      context.params.propertyId,
      tenant || '',
      email,
      name,
      Number(rentAmount),
      status || 'vacant',
      dueDate == null || dueDate === '' ? null : Number(dueDate),
    ]
  )

  const unit = dbGet<{ id: string; name: string }>('SELECT id, name FROM units WHERE id = ?', [unitId])

  return NextResponse.json(
    {
      success: true,
      unit: {
        id: unit?.id ?? unitId,
        name,
        tenant: tenant || '',
        email,
        rentAmount: Number(rentAmount),
        status: status || 'vacant',
        dueDate: dueDate == null || dueDate === '' ? null : String(dueDate),
      },
    },
    { status: 201 }
  )
}