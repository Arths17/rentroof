import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { dbAll } from '@/app/api/_lib/db'
import { ensureAuthenticatedUser } from '@/app/api/_lib/security'

export async function GET(request: NextRequest) {
  const authResult = ensureAuthenticatedUser(request, ['landlord', 'admin'])

  if ('response' in authResult) {
    return authResult.response
  }

  const units = dbAll<{
    unit_id: string
    unit_name: string
    tenant_name: string | null
    rent_amount: number
    status: string
    due_day: number | null
    paid_date: string | null
  }>(
    `SELECT
      u.id AS unit_id,
      u.name AS unit_name,
      u.tenant_name,
      u.rent_amount,
      u.status,
      u.due_day,
      u.paid_date
    FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_user_id = ?
    ORDER BY p.created_at DESC, u.created_at ASC`,
    [authResult.dbUser.id]
  )

  const currentMonth = new Date().toISOString().slice(0, 7)
  const payments = dbAll<{ unit_id: string; amount: number }>(
    `SELECT unit_id, amount
     FROM payments pay
     JOIN properties p ON p.id = pay.property_id
     WHERE p.owner_user_id = ? AND substr(timestamp, 1, 7) = ?`,
    [authResult.dbUser.id, currentMonth]
  )

  const totalRentExpected = units.reduce((total, unit) => total + Number(unit.rent_amount || 0), 0)
  const totalRentCollected = payments.reduce((total, payment) => total + Number(payment.amount || 0), 0)
  const collectedUnits = units.filter((unit) => unit.status === 'paid').length

  return NextResponse.json({
    month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    totalUnits: units.length,
    collectedUnits,
    percentageCollected: units.length === 0 ? 0 : Math.round((collectedUnits / units.length) * 100),
    totalRentExpected,
    totalRentCollected,
    units: units.map((unit) => ({
      id: unit.unit_id,
      unit: unit.unit_name,
      tenant: unit.tenant_name ?? '',
      amount: Number(unit.rent_amount),
      status: unit.status,
      paidDate: unit.paid_date ?? undefined,
      dueDate: unit.due_day == null ? undefined : String(unit.due_day),
    })),
  })
}
