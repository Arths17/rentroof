import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { dbAll, dbGet, dbRun } from '@/app/api/_lib/db'
import { ensureAuthenticatedUser } from '@/app/api/_lib/security'

export async function GET(request: NextRequest) {
  const authResult = ensureAuthenticatedUser(request, ['landlord', 'admin'])

  if ('response' in authResult) {
    return authResult.response
  }

  const deposits = dbAll<{
    id: string
    unit_id: string
    unit_name: string
    tenant_name: string | null
    amount: number
    date_received: string
    move_in_date: string
    move_out_date: string | null
    status: string
    return_deadline: string | null
    returned_date: string | null
    return_amount: number | null
  }>(
    `SELECT
      d.id,
      d.unit_id,
      u.name AS unit_name,
      d.tenant_name,
      d.amount,
      d.date_received,
      d.move_in_date,
      d.move_out_date,
      d.status,
      d.return_deadline,
      d.returned_date,
      d.return_amount
    FROM deposits d
    JOIN units u ON u.id = d.unit_id
    JOIN properties p ON p.id = d.property_id
    WHERE p.owner_user_id = ?
    ORDER BY d.date_received DESC`,
    [authResult.dbUser.id]
  )

  return NextResponse.json(
    deposits.map((deposit) => ({
      id: deposit.id,
      unit: deposit.unit_name,
      tenant: deposit.tenant_name ?? '',
      amount: deposit.amount,
      dateReceived: deposit.date_received,
      moveInDate: deposit.move_in_date,
      moveOutDate: deposit.move_out_date ?? undefined,
      status: deposit.status,
      returnDeadline: deposit.return_deadline ?? undefined,
      returnedDate: deposit.returned_date ?? undefined,
      returnAmount: deposit.return_amount ?? undefined,
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
    const { unitId, tenantId, amount, dateReceived } = body

    if (!unitId || !amount) {
      return NextResponse.json(
        { error: 'Unit ID and amount are required', code: 'invalid_request' },
        { status: 400 }
      )
    }

    const unit = dbGet<{ id: string; property_id: string; tenant_name: string | null; tenant_user_id: string | null }>(
      `SELECT u.id, u.property_id, u.tenant_name, u.tenant_user_id
       FROM units u
       JOIN properties p ON p.id = u.property_id
       WHERE u.id = ? AND p.owner_user_id = ?`,
      [unitId, authResult.dbUser.id]
    )

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found', code: 'not_found' }, { status: 404 })
    }

    const depositId = `dep_${Date.now()}`
    const receivedDate = dateReceived || new Date().toISOString()

    dbRun(
      `INSERT INTO deposits (
        id, property_id, unit_id, tenant_user_id, tenant_name, amount, date_received, move_in_date, status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'held', datetime('now'))`,
      [
        depositId,
        unit.property_id,
        unit.id,
        tenantId || unit.tenant_user_id || null,
        unit.tenant_name || '',
        Number(amount),
        receivedDate,
        receivedDate,
      ]
    )

    return NextResponse.json(
      {
        success: true,
        deposit: {
          id: depositId,
          unitId,
          amount: Number(amount),
          dateReceived: receivedDate,
          status: 'held',
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
