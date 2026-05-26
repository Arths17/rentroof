import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { attachSessionCookie, createSessionToken } from '@/app/api/_lib/session'
import { dbGet, dbRun, dbTransaction } from '@/app/api/_lib/db'
import {
  hashPassword,
  normalizeEmail,
  stableUserId,
  verifyPassword,
} from '@/app/api/_lib/security'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, plan } = body

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    const normalizedEmail = normalizeEmail(email)
    const existingUser = dbGet<{
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

    const isGoogleSignup = password === 'google-oauth'
    const storedPasswordHash = isGoogleSignup ? existingUser?.password_hash ?? hashPassword(password) : hashPassword(password)

    const user = dbTransaction(() => {
      if (existingUser) {
        if (!isGoogleSignup && !verifyPassword(password, existingUser.password_hash)) {
          throw new Error('ACCOUNT_EXISTS')
        }

        dbRun(
          `UPDATE users
           SET name = ?, plan = COALESCE(?, plan), updated_at = datetime('now')
           WHERE email = ?`,
          [name, plan || null, normalizedEmail]
        )

        return {
          id: existingUser.id,
          email: existingUser.email,
          name,
          role: existingUser.role,
          plan: plan || existingUser.plan || 'growth',
          photo_url: existingUser.photo_url,
          password_hash: existingUser.password_hash,
        }
      }

      const userId = stableUserId(normalizedEmail)
      dbRun(
        `INSERT INTO users (id, email, password_hash, name, role, plan, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [userId, normalizedEmail, storedPasswordHash, name, 'landlord', plan || 'growth']
      )

      return {
        id: userId,
        email: normalizedEmail,
        name,
        role: 'landlord',
        plan: plan || 'growth',
        photo_url: null,
        password_hash: storedPasswordHash,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Unable to create account' },
        { status: 500 }
      )
    }

    const effectivePlan = user.plan ?? plan ?? 'growth'

    const response = attachSessionCookie(
      NextResponse.json({
        success: true,
        message: 'Account created successfully',
        user: {
          id: user.id,
          email: user.email,
          name,
          plan: effectivePlan,
          role: user.role,
        },
        redirectUrl: '/dashboard',
      }),
      createSessionToken({
        id: user.id,
        email: user.email,
        name,
        plan: effectivePlan,
        role: user.role,
      })
    )

    return response
  } catch (error) {
    if (error instanceof Error && error.message === 'ACCOUNT_EXISTS') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
