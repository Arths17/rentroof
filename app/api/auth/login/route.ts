import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { attachSessionCookie, createSessionToken } from '@/app/api/_lib/session'
import { dbGet, dbRun } from '@/app/api/_lib/db'
import {
  hashPassword,
  normalizeEmail,
  stableUserId,
  verifyPassword,
} from '@/app/api/_lib/security'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const normalizedEmail = normalizeEmail(email)
    const user = dbGet<{
      id: string
      email: string
      name: string | null
      role: string
      plan: string | null
      photo_url: string | null
      password_hash: string
    }>(
      'SELECT id, email, name, role, plan, photo_url, password_hash FROM users WHERE email = ?',
      [normalizedEmail]
    )

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    dbRun(
      'UPDATE users SET updated_at = datetime(\'now\') WHERE email = ?',
      [normalizedEmail]
    )

    const response = attachSessionCookie(
      NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          plan: user.plan ?? undefined,
          photoURL: user.photo_url ?? undefined,
        },
        redirectUrl: '/dashboard',
      }),
      createSessionToken({
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        role: user.role,
        plan: user.plan ?? undefined,
        photoURL: user.photo_url ?? undefined,
      })
    )

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
