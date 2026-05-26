import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { dbGet, dbRun } from '@/app/api/_lib/db'
import { ensureAuthenticatedUser } from '@/app/api/_lib/security'

export async function PUT(request: NextRequest, context: any) {
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
  const { address, city, state, zipCode } = body

  if (!address || !city || !state) {
    return NextResponse.json(
      { error: 'Address, city, and state are required', code: 'invalid_request' },
      { status: 400 }
    )
  }

  dbRun(
    `UPDATE properties
     SET address = ?, city = ?, state = ?, zip_code = ?, updated_at = datetime('now')
     WHERE id = ? AND owner_user_id = ?`,
    [address, city, state, zipCode || null, context.params.propertyId, authResult.dbUser.id]
  )

  return NextResponse.json({ success: true, property: { id: context.params.propertyId, address, city, state, zipCode: zipCode || null } })
}