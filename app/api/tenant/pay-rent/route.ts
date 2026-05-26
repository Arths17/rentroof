import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { dbGet, dbRun } from '@/app/api/_lib/db'
import { ensureAuthenticatedUser } from '@/app/api/_lib/security'

export async function POST(request: NextRequest) {
  const authResult = ensureAuthenticatedUser(request, ['tenant'])

  if ('response' in authResult) {
    return authResult.response
  }

  try {
    const body = await request.json()
    const { tenantId, amount, paymentMethod, unitId } = body

    if (!tenantId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'Tenant ID, amount, and payment method are required', code: 'invalid_request' },
        { status: 400 }
      )
    }

    const unit = dbGet<{ id: string; property_id: string; rent_amount: number }>(
      'SELECT id, property_id, rent_amount FROM units WHERE id = ? AND tenant_user_id = ?',
      [unitId, authResult.dbUser.id]
    )

    if (!unit || tenantId !== authResult.dbUser.id) {
      return NextResponse.json({ error: 'Forbidden', code: 'forbidden' }, { status: 403 })
    }

    const paymentId = `payment_${Date.now()}`
    const timestamp = new Date().toISOString()

    dbRun(
      `INSERT INTO payments (
        id, property_id, unit_id, tenant_user_id, tenant_name, amount, payment_method, status, timestamp, receipt_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)`,
      [
        paymentId,
        unit.property_id,
        unit.id,
        authResult.dbUser.id,
        authResult.user.name || authResult.user.email,
        Number(amount),
        paymentMethod,
        timestamp,
        `/receipts/${paymentId}.pdf`,
      ]
    )

    dbRun(
      `UPDATE units SET status = 'paid', paid_date = ?, updated_at = datetime('now') WHERE id = ?`,
      [timestamp, unit.id]
    )

    return NextResponse.json(
      {
        success: true,
        payment: {
          id: paymentId,
          tenantId,
          unitId,
          amount: Number(amount),
          paymentMethod,
          status: 'completed',
          timestamp,
          receiptUrl: `/receipts/${paymentId}.pdf`,
        },
        message: 'Payment submitted successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Payment processing failed', code: 'server_error' },
      { status: 500 }
    )
  }
}
