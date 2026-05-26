import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { dbRun } from '@/app/api/_lib/db'
import { clearSessionCookie } from '@/app/api/_lib/session'
import { ensureAuthenticatedUser } from '@/app/api/_lib/security'

export async function POST(request: NextRequest) {
  const authResult = ensureAuthenticatedUser(request)

  if ('response' in authResult) {
    return authResult.response
  }

  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (email && email !== authResult.user.email) {
      return NextResponse.json(
        { error: 'You can only delete your own account', code: 'forbidden' },
        { status: 403 }
      )
    }

    dbRun('DELETE FROM users WHERE email = ?', [authResult.user.email])

    return clearSessionCookie(
      NextResponse.json({ success: true, message: 'Account deleted successfully' })
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}