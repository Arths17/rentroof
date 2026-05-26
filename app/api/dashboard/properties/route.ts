import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { dbAll, dbRun, dbTransaction } from '@/app/api/_lib/db'
import { ensureAuthenticatedUser } from '@/app/api/_lib/security'

type PropertyRow = {
  property_id: string
  address: string
  city: string
  state: string
  zip_code: string | null
  unit_id: string | null
  unit_name: string | null
  tenant_name: string | null
  tenant_email: string | null
  rent_amount: number | null
  status: string | null
  due_day: number | null
  paid_date: string | null
  updated_at: string
}

function requireLandlord(request: NextRequest) {
  return ensureAuthenticatedUser(request, ['landlord', 'admin'])
}

function buildPropertyList(rows: PropertyRow[]) {
  const properties = new Map<string, any>()

  for (const row of rows) {
    if (!properties.has(row.property_id)) {
      properties.set(row.property_id, {
        id: row.property_id,
        address: row.address,
        city: row.city,
        state: row.state,
        zipCode: row.zip_code ?? undefined,
        units: [],
      })
    }

    if (row.unit_id) {
      properties.get(row.property_id).units.push({
        id: row.unit_id,
        name: row.unit_name,
        tenant: row.tenant_name ?? '',
        email: row.tenant_email ?? '',
        rentAmount: row.rent_amount ?? 0,
        status: row.status ?? 'vacant',
        dueDate: row.due_day == null ? null : String(row.due_day),
        paidDate: row.paid_date ?? undefined,
      })
    }
  }

  return Array.from(properties.values())
}

export async function GET(request: NextRequest) {
  const authResult = requireLandlord(request)

  if ('response' in authResult) {
    return authResult.response
  }

  const rows = dbAll<PropertyRow>(
    `SELECT
      p.id AS property_id,
      p.address,
      p.city,
      p.state,
      p.zip_code,
      p.updated_at,
      u.id AS unit_id,
      u.name AS unit_name,
      u.tenant_name,
      u.tenant_email,
      u.rent_amount,
      u.status,
      u.due_day,
      u.paid_date
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    WHERE p.owner_user_id = ?
    ORDER BY p.created_at DESC, u.created_at ASC`,
    [authResult.dbUser.id]
  )

  return NextResponse.json(buildPropertyList(rows))
}

export async function POST(request: NextRequest) {
  const authResult = requireLandlord(request)

  if ('response' in authResult) {
    return authResult.response
  }

  try {
    const body = await request.json()
    const { address, city, state, zipCode } = body

    if (!address || !city || !state) {
      return NextResponse.json(
        { error: 'Address, city, and state are required', code: 'invalid_request' },
        { status: 400 }
      )
    }

    const propertyId = `prop_${Date.now()}`

    dbRun(
      `INSERT INTO properties (id, owner_user_id, address, city, state, zip_code, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [propertyId, authResult.dbUser.id, address, city, state, zipCode || null]
    )

    const property = dbAll<PropertyRow>(
      `SELECT
        p.id AS property_id,
        p.address,
        p.city,
        p.state,
        p.zip_code,
        p.updated_at,
        NULL AS unit_id,
        NULL AS unit_name,
        NULL AS tenant_name,
        NULL AS tenant_email,
        NULL AS rent_amount,
        NULL AS status,
        NULL AS due_day,
        NULL AS paid_date
      FROM properties p
      WHERE p.id = ? AND p.owner_user_id = ?`,
      [propertyId, authResult.dbUser.id]
    )

    return NextResponse.json(
      {
        success: true,
        property: buildPropertyList(property)[0],
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
