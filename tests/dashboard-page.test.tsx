import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from '@/app/dashboard/page'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  logout: vi.fn(),
  deleteAccount: vi.fn(),
  useSession: vi.fn(),
  getProperties: vi.fn(),
  getRentStatus: vi.fn(),
  getMaintenance: vi.fn(),
  getPayments: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
  usePathname: () => '/dashboard',
}))

vi.mock('@/hooks/useSession', () => ({
  useSession: () => mocks.useSession(),
}))

vi.mock('@/lib/api', () => ({
  default: {
    auth: {
      logout: mocks.logout,
      delete: mocks.deleteAccount,
      checkAuth: vi.fn(),
      login: vi.fn(),
      signup: vi.fn(),
    },
    dashboard: {
      getProperties: mocks.getProperties,
      getRentStatus: mocks.getRentStatus,
      getMaintenance: mocks.getMaintenance,
      getPayments: mocks.getPayments,
      updateMaintenanceStatus: vi.fn(),
      getDeposits: vi.fn(),
    },
  },
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state while the session is still resolving', () => {
    mocks.useSession.mockReturnValue({
      loading: true,
      authenticated: false,
      user: null,
    })

    render(<DashboardPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders portfolio data for an authenticated user', async () => {
    mocks.useSession.mockReturnValue({
      loading: false,
      authenticated: true,
      user: {
        id: 'user-1',
        email: 'ada@example.com',
        role: 'landlord',
        name: 'Ada Lovelace',
      },
    })
    mocks.getProperties.mockResolvedValue([
      {
        id: 'prop-1',
        address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        units: [{ id: 'unit-1', dueDate: '5', status: 'pending' }],
      },
    ])
    mocks.getRentStatus.mockResolvedValue({ totalRentCollected: 2500 })
    mocks.getMaintenance.mockResolvedValue([{ id: 'm-1', status: 'open' }])
    mocks.getPayments.mockResolvedValue([
      {
        id: 'p-1',
        tenantName: 'Taylor Tenant',
        unitNumber: '2A',
        amount: 2500,
        paymentMethod: 'bank',
        status: 'completed',
        timestamp: '2026-01-15T10:00:00.000Z',
        propertyInfo: { id: 'prop-1', address: '123 Main St, Austin, TX' },
      },
    ])

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Welcome back, Ada.')).toBeInTheDocument()
    })
    expect(screen.getByText('Taylor Tenant')).toBeInTheDocument()
    expect(
      screen.getByText('$2,500', { selector: '.dash-stat-value.green' })
    ).toBeInTheDocument()
  })

  it('redirects unauthenticated users to the login page', async () => {
    mocks.useSession.mockReturnValue({
      loading: false,
      authenticated: false,
      user: null,
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/login')
    })
  })
})
