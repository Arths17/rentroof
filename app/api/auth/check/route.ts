import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { dbGet } from '@/app/api/_lib/db'
import { getSessionToken, verifySessionToken } from '@/app/api/_lib/session'

type DbUser = {
  id: string
  email: string
  name: string | null
  role: string
  plan: string | null
  photo_url: string | null
}

export async function GET(request: NextRequest) {
  const sessionUser = verifySessionToken(getSessionToken(request))

  if (!sessionUser) {
    return NextResponse.json(
      { authenticated: false, message: 'Invalid or expired session' },
      { status: 401 }
    )
  }

  const dbUser = dbGet<DbUser>(
    'SELECT id, email, name, role, plan, photo_url FROM users WHERE email = ?',
    [sessionUser.email]
  )

  if (!dbUser) {
    return NextResponse.json(
      { authenticated: false, message: 'Account not found' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name ?? undefined,
      role: dbUser.role,
      plan: dbUser.plan ?? undefined,
      photoURL: dbUser.photo_url ?? undefined,
    },
  })
}
