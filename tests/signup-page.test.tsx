import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SignupPage from '@/app/signup/page'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  signup: vi.fn(),
  checkAuth: vi.fn(),
  login: vi.fn(),
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
      signup: mocks.signup,
      checkAuth: mocks.checkAuth,
      login: mocks.login,
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

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useSession.mockReturnValue({
      loading: false,
      authenticated: false,
      user: null,
    })
  })

  it('submits signup details to the session API and redirects on success', async () => {
    mocks.signup.mockResolvedValue({
      success: true,
      redirectUrl: '/dashboard',
      user: {
        id: 'user-2',
        email: 'new.owner@example.com',
        role: 'landlord',
        name: 'New Owner',
      },
    })

    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(screen.getByLabelText(/full name/i), 'New Owner')
    await user.type(screen.getByLabelText(/^email$/i), 'new.owner@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'strong-password')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mocks.signup).toHaveBeenCalledWith(
        'new.owner@example.com',
        'strong-password',
        'New Owner',
        'growth'
      )
    })
    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows a validation error for short passwords', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(screen.getByLabelText(/full name/i), 'New Owner')
    await user.type(screen.getByLabelText(/^email$/i), 'new.owner@example.com')
    await user.type(screen.getByLabelText(/^password$/i), '123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByText('Password must be at least 6 characters.')).toBeInTheDocument()
    expect(mocks.signup).not.toHaveBeenCalled()
  })
})
