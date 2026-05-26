import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '@/app/login/page'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  login: vi.fn(),
  checkAuth: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  deleteAccount: vi.fn(),
  signInWithPopup: vi.fn(),
  useSession: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
}))

vi.mock('@/hooks/useSession', () => ({
  useSession: () => mocks.useSession(),
}))

vi.mock('@/lib/api', () => ({
  default: {
    auth: {
      login: mocks.login,
      signup: mocks.signup,
      checkAuth: mocks.checkAuth,
      logout: mocks.logout,
      delete: mocks.deleteAccount,
    },
  },
}))

vi.mock('@/lib/firebase', () => ({
  auth: {},
  provider: {},
  FRIENDLY_ERRORS: {},
}))

vi.mock('firebase/auth', () => ({
  signInWithPopup: mocks.signInWithPopup,
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useSession.mockReturnValue({
      loading: false,
      authenticated: false,
      user: null,
    })
  })

  it('submits credentials to the session API and redirects on success', async () => {
    mocks.login.mockResolvedValue({
      success: true,
      redirectUrl: '/dashboard',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        role: 'landlord',
      },
    })

    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'owner@example.com')
    await user.type(screen.getByLabelText(/password/i), 'correct-horse-battery-staple')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith(
        'owner@example.com',
        'correct-horse-battery-staple'
      )
    })
    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows a validation error when required fields are missing', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(screen.getByText('Enter your email and password.')).toBeInTheDocument()
    expect(mocks.login).not.toHaveBeenCalled()
  })
})
