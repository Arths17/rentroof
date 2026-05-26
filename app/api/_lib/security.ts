import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { dbGet } from './db'
import { getSessionToken, verifySessionToken } from './session'

export type AppRole = 'landlord' | 'tenant' | 'admin'

export type DbUser = {
  id: string
  email: string
  name: string | null
  role: AppRole
  plan: string | null
  photo_url: string | null
}

export type SanitizedUser = {
  id: string
  email: string
  name?: string
  role: AppRole
  plan?: string
  photoURL?: string
}

function toSanitizedUser(user: DbUser): SanitizedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    role: user.role,
    plan: user.plan ?? undefined,
    photoURL: user.photo_url ?? undefined,
  }
}

function hashBytes(value: string): string {
  return crypto.createHash('sha256').update(value).digest('base64url')
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('base64url')
  const derivedKey = crypto.scryptSync(password, salt, 64)
  return `scrypt$${salt}$${derivedKey.toString('base64url')}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false
  }

  const [, salt, encodedHash] = parts
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('base64url')
  const derivedBuffer = Buffer.from(derivedKey)
  const storedBuffer = Buffer.from(encodedHash)

  return (
    derivedBuffer.length === storedBuffer.length &&
    crypto.timingSafeEqual(derivedBuffer, storedBuffer)
  )
}

export function stableUserId(email: string): string {
  return `user_${hashBytes(email.toLowerCase())}`
}

export function ensureAuthenticatedUser(
  request: NextRequest,
  allowedRoles: AppRole[] = [],
): { user: SanitizedUser; dbUser: DbUser } | { response: NextResponse } {
  const sessionUser = verifySessionToken(getSessionToken(request))

  if (!sessionUser) {
    return {
      response: NextResponse.json(
        { error: 'Invalid or expired session', code: 'unauthorized' },
        { status: 401 }
      ),
    }
  }

  const dbUser = dbGet<DbUser>(
    'SELECT id, email, name, role, plan, photo_url FROM users WHERE email = ?',
    [sessionUser.email]
  )

  if (!dbUser) {
    return {
      response: NextResponse.json(
        { error: 'Account not found', code: 'unauthorized' },
        { status: 401 }
      ),
    }
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(dbUser.role)) {
    return {
      response: NextResponse.json(
        { error: 'Forbidden', code: 'forbidden' },
        { status: 403 }
      ),
    }
  }

  return {
    user: toSanitizedUser(dbUser),
    dbUser,
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
