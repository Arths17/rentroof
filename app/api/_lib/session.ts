import crypto from 'crypto'
import type { NextRequest, NextResponse } from 'next/server'

export type SessionUser = {
  id: string
  email: string
  role: string
  name?: string
  plan?: string
  photoURL?: string
}

type SessionPayload = SessionUser & {
  exp: number
}

const SESSION_COOKIE = 'auth_token'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7
const SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET || process.env.SECRET_KEY || 'rentproof-dev-session-secret'

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(value: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url')
}

export function createSessionToken(user: SessionUser): string {
  const payload: SessionPayload = {
    ...user,
    exp: Date.now() + SESSION_TTL_MS,
  }
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  return `${encodedPayload}.${sign(encodedPayload)}`
}

export function verifySessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) {
    return null
  }

  const [encodedPayload, providedSignature] = token.split('.')
  if (!encodedPayload || !providedSignature) {
    return null
  }

  const expectedSignature = sign(encodedPayload)
  const providedBuffer = Buffer.from(providedSignature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload
    if (!payload.exp || payload.exp <= Date.now()) {
      return null
    }

    const { exp: _exp, ...user } = payload
    return user
  } catch {
    return null
  }
}

export function getSessionToken(request: NextRequest): string | undefined {
  const cookieValue = request.cookies?.get?.(SESSION_COOKIE)?.value
  if (cookieValue) {
    return cookieValue
  }

  const headerValue = request.headers?.get?.('cookie') ?? ''
  const match = headerValue.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]+)`))
  return match?.[1]
}

export function attachSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  })

  return response
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return response
}
