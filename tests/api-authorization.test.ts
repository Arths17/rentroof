import { describe, expect, it } from 'vitest'

import { GET as getProperties } from '@/app/api/dashboard/properties/route'
import { POST as payRent } from '@/app/api/tenant/pay-rent/route'
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

describe('api authorization guards', () => {
  it('rejects unauthenticated dashboard property reads', async () => {
    const response = await getProperties(new Request('http://localhost/api/dashboard/properties') as never)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid or expired session',
      code: 'unauthorized',
    })
  })

  it('rejects landlord sessions from tenant payment endpoints', async () => {
    const signupResponse = await signup(
      createJsonRequest('http://localhost/api/auth/signup', {
        email: 'landlord.guard@example.com',
        password: 'strong-password',
        name: 'Landlord Guard',
        plan: 'growth',
      }) as never
    )

    const cookie = signupResponse.headers.get('set-cookie')?.split(';')[0] ?? ''

    const response = await payRent(
      new Request('http://localhost/api/tenant/pay-rent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie,
        },
        body: JSON.stringify({
        tenantId: 'tenant-guard',
        unitId: 'unit-guard',
        amount: 1200,
        paymentMethod: 'card',
        }),
      }) as never
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Forbidden',
      code: 'forbidden',
    })

    expect(cookie).toContain('auth_token=')
  })
})