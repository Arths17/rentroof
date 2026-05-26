import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/hooks/useSession'

const mocks = vi.hoisted(() => ({
  checkAuth: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  default: {
    auth: {
      checkAuth: mocks.checkAuth,
    },
  },
}))

describe('useSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exposes an authenticated session when the API returns a valid user', async () => {
    mocks.checkAuth.mockResolvedValue({
      authenticated: true,
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        role: 'landlord',
        name: 'Owner User',
      },
    })

    const { result } = renderHook(() => useSession())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.authenticated).toBe(true)
    expect(result.current.user?.email).toBe('owner@example.com')
  })

  it('treats an invalid session as unauthenticated', async () => {
    mocks.checkAuth.mockResolvedValue({
      authenticated: false,
      message: 'Invalid or expired session',
    })

    const { result } = renderHook(() => useSession())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.authenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })
})
