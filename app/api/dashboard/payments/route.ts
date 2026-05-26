import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { dbAll } from '@/app/api/_lib/db'
import { ensureAuthenticatedUser } from '@/app/api/_lib/security'

type PaymentRow = {
  id: string
  tenant_user_id: string | null
  tenant_name: string | null
  unit_id: string
  unit_name: string
  amount: number
  payment_method: string
  status: string
  timestamp: string
  receipt_url: string | null
  property_id: string
  address: string
}

export async function GET(request: NextRequest) {
  const authResult = ensureAuthenticatedUser(request, ['landlord', 'admin'])

  if ('response' in authResult) {
    return authResult.response
  }

  const payments = dbAll<PaymentRow>(
    `SELECT
      pay.id,
      pay.tenant_user_id,
      pay.tenant_name,
      pay.unit_id,
      u.name AS unit_name,
      pay.amount,
      pay.payment_method,
      pay.status,
      pay.timestamp,
      pay.receipt_url,
      p.id AS property_id,
      p.address
    FROM payments pay
    JOIN units u ON u.id = pay.unit_id
    JOIN properties p ON p.id = pay.property_id
    WHERE p.owner_user_id = ?
    ORDER BY pay.timestamp DESC
    LIMIT 100`,
    [authResult.dbUser.id]
  )

  return NextResponse.json(
    payments.map((payment) => ({
      id: payment.id,
      tenantId: payment.tenant_user_id ?? '',
      unitId: payment.unit_id,
      amount: payment.amount,
      paymentMethod: payment.payment_method,
      status: payment.status,
      timestamp: payment.timestamp,
      receiptUrl: payment.receipt_url ?? undefined,
      tenantName: payment.tenant_name ?? undefined,
      unitNumber: payment.unit_name,
      propertyInfo: {
        id: payment.property_id,
        address: payment.address,
      },
    }))
  )
}
