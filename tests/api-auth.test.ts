import { describe, expect, it } from 'vitest'
import { GET as checkAuth } from '@/app/api/auth/check/route'
import { POST as login } from '@/app/api/auth/login/route'
import { POST as logout } from '@/app/api/auth/logout/route'
import { POST as signup } from '@/app/api/auth/signup/route'

function createJsonRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('auth route handlers', () => {
  it('rejects invalid login payloads', async () => {
    const response = await login(createJsonRequest('http://localhost/api/auth/login', { email: '' }) as never)
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Email and password are required',
    })
  })

  it('signs up, validates, and logs out with a signed session cookie', async () => {
    const signupResponse = await signup(
      createJsonRequest('http://localhost/api/auth/signup', {
        email: 'route.user@example.com',
        password: 'strong-password',
        name: 'Route User',
        plan: 'growth',
      }) as never
    )

    expect(signupResponse.status).toBe(200)
    const setCookie = signupResponse.headers.get('set-cookie')
    expect(setCookie).toContain('auth_token=')

    const cookie = setCookie?.split(';')[0] ?? ''
    const checkResponse = await checkAuth(
      new Request('http://localhost/api/auth/check', {
        headers: { cookie },
      }) as never
    )

    expect(checkResponse.status).toBe(200)
    await expect(checkResponse.json()).resolves.toMatchObject({
      authenticated: true,
      user: {
        email: 'route.user@example.com',
      },
    })

    const logoutResponse = await logout(new Request('http://localhost/api/auth/logout', { method: 'POST' }) as never)
    expect(logoutResponse.status).toBe(200)
    expect(logoutResponse.headers.get('set-cookie')).toContain('auth_token=;')
  })

  it('rejects missing sessions', async () => {
    const response = await checkAuth(new Request('http://localhost/api/auth/check') as never)
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      authenticated: false,
      message: 'Invalid or expired session',
    })
  })
})
