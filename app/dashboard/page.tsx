'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import api from '@/lib/api'
import { useSession } from '@/hooks/useSession'

type DashboardSummary = {
  units: number
  rentCollected: string
  overduePayments: number
  openMaintenance: number
}

type Payment = {
  id: string
  tenantId: string
  unitId: string
  amount: number
  paymentMethod: string
  status: string
  timestamp: string
  propertyInfo?: {
    id: string
    address: string
  }
  tenantName?: string
  unitNumber?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<DashboardSummary>({
    units: 0,
    rentCollected: '$0',
    overduePayments: 0,
    openMaintenance: 0,
  })
  const { user, loading: sessionLoading, authenticated } = useSession()

  useEffect(() => {
    if (sessionLoading) {
      return
    }

    if (!authenticated) {
      router.replace('/login')
      return
    }

    const loadDashboard = async () => {
      try {
        const [properties, rentStatus, maintenance, allPayments] = await Promise.all([
          api.dashboard.getProperties(),
          api.dashboard.getRentStatus(),
          api.dashboard.getMaintenance(),
          api.dashboard.getPayments(),
        ])

        const totalUnits = properties.reduce((count: number, property: any) => {
          return count + (property.units?.length || 0)
        }, 0)

        const now = new Date()
        const overduePayments = properties.reduce((count: number, property: any) => {
          const units = property.units || []
          const propertyOverdue = units.filter((unit: any) => {
            if (unit.status === 'paid' || unit.status === 'vacant') return false
            const dueDay = Number(unit.dueDate)
            if (!dueDay || Number.isNaN(dueDay)) return false

            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
            const safeDueDay = Math.min(dueDay, daysInMonth)
            const dueDate = new Date(now.getFullYear(), now.getMonth(), safeDueDay)
            const overdueThreshold = new Date(dueDate)
            overdueThreshold.setDate(overdueThreshold.getDate() + 2)

            return now > overdueThreshold
          }).length

          return count + propertyOverdue
        }, 0)

        const rentCollected = rentStatus?.totalRentCollected ?? 0
        const openMaintenance = maintenance.filter((request: any) => request.status === 'open').length

        setSummary({
          units: totalUnits,
          rentCollected: `$${Number(rentCollected).toLocaleString()}`,
          overduePayments,
          openMaintenance,
        })

        // Set payments and sort by most recent first
        if (allPayments && Array.isArray(allPayments)) {
          const sortedPayments = allPayments.sort((a: any, b: any) => {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          })
          setPayments(sortedPayments.slice(0, 10)) // Show last 10 payments
        }
      } catch (error) {
        console.error('Failed to load dashboard summary:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [authenticated, router, sessionLoading])

  async function handleSignOut() {
    await api.auth.logout()
    router.replace('/login')
  }

  async function handleDeleteAccount() {
    const firstConfirm = confirm(
      'Are you sure you want to permanently delete your account? This action CANNOT be undone.'
    )
    if (!firstConfirm) return

    const secondConfirm = confirm(
      'This will delete your account AND all associated data:\n\n' +
      '✓ All properties\n' +
      '✓ All tenants and units\n' +
      '✓ All rent payments\n' +
      '✓ All maintenance requests\n\n' +
      'Type "DELETE" in the next prompt if you are absolutely sure.'
    )
    if (!secondConfirm) return

    const userInput = prompt('Type "DELETE" to confirm account deletion:')
    if (userInput !== 'DELETE') {
      alert('Account deletion cancelled.')
      return
    }

    const email = user?.email
    if (!email) {
      alert('No user is signed in.')
      return
    }

    try {
      console.log('Starting account deletion for:', email)

      try {
        console.log('Calling backend delete...')
        const backendResponse = await api.auth.delete(email)
        console.log('Backend delete response:', backendResponse)
        if (!backendResponse?.success) {
          console.warn('Backend cleanup failed:', backendResponse)
        }
      } catch (err) {
        console.warn('Could not reach backend for cleanup:', err)
      }

      await api.auth.logout()
      console.log('✓ User deleted and session cleared')

      router.replace('/signup')
    } catch (err: any) {
      console.error('Delete account error:', err)
      alert('Failed to delete account: ' + (err?.message || err))
    }
  }

  if (loading || sessionLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg)',
      }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--mid)', letterSpacing: '0.1em' }}>
          Loading...
        </div>
      </div>
    )
  }

  const displayName = user?.name || user?.email?.split('@')[0] || 'there'
  const firstName   = displayName.split(' ')[0]
  const initials    = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="dash-page">
      <nav className="dash-nav">
        <Link href="/dashboard" className="dash-nav-logo">
          Rent<span className="accent">Proof</span>
        </Link>

        <div className="dash-nav-right">
          <div className="dash-user-info">
            <div className="dash-avatar">
              {user?.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={displayName}
                  width={32}
                  height={32}
                  referrerPolicy="no-referrer"
                />
              ) : initials}
            </div>
            <span className="dash-user-name">{displayName}</span>
          </div>
          <button className="dash-signout" onClick={handleSignOut}>Sign out</button>
          <button className="dash-delete" onClick={handleDeleteAccount}>Delete account</button>
        </div>
      </nav>

      <main className="dash-main">
        <div className="dash-nav-buttons dash-nav-buttons--dashboard">
          <button 
            className={`nav-btn${pathname === '/properties' ? ' active' : ''}`}
            onClick={() => router.push('/properties')}
          >
            📍 Properties
          </button>
          <button 
            className={`nav-btn${pathname === '/maintenance' ? ' active' : ''}`}
            onClick={() => router.push('/maintenance')}
          >
            🔧 Maintenance
          </button>
          <button 
            className={`nav-btn${pathname === '/deposits' ? ' active' : ''}`}
            onClick={() => router.push('/deposits')}
          >
            🔒 Deposits
          </button>
          <button 
            className={`nav-btn${pathname === '/tenant/portal' ? ' active' : ''}`}
            onClick={() => router.push('/tenant/portal')}
          >
            👥 Tenants
          </button>
        </div>

        <div className="dash-welcome">
          <div className="dash-welcome-eyebrow">Dashboard</div>
          <h1>Welcome back, {firstName}.</h1>
          <p className="dash-welcome-sub">
            Here is what is happening across your portfolio right now.
          </p>
        </div>

        <div className="dash-stats">
          {[
            { label: 'Units',            value: String(summary.units), cls: '',       sub: summary.units === 0 ? 'No units added yet' : 'Active units' },
            { label: 'Rent collected',   value: summary.rentCollected, cls: 'green',  sub: 'This month' },
            { label: 'Payments overdue', value: String(summary.overduePayments), cls: 'accent', sub: '2+ days past due date' },
            { label: 'Open maintenance', value: String(summary.openMaintenance), cls: '', sub: 'Requests pending' },
          ].map(s => (
            <div className="dash-stat-card" key={s.label}>
              <div className="dash-stat-label">{s.label}</div>
              <div className={`dash-stat-value${s.cls ? ` ${s.cls}` : ''}`}>{s.value}</div>
              <div className="dash-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {payments.length > 0 && (
          <div className="recent-payments">
            <h2>Recent Payments</h2>
            <div className="payments-list">
              {payments.map((payment) => (
                <div className="payment-item" key={payment.id}>
                  <div className="payment-details">
                    <div className="payment-header">
                      <span className="tenant-name">{payment.tenantName || 'Unknown Tenant'}</span>
                      <span className="unit-number">{payment.unitNumber || 'Unit'}</span>
                    </div>
                    <div className="property-address">{payment.propertyInfo?.address || 'Property'}</div>
                    <div className="payment-meta">
                      <span className="payment-method">{payment.paymentMethod}</span>
                      <span className="payment-date">
                        {new Date(payment.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="payment-amount">
                    <span className="amount">${payment.amount.toLocaleString()}</span>
                    <span className={`status status-${payment.status}`}>{payment.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="dash-setup">
          <div className="dash-setup-title">Get your portfolio running</div>
          <p className="dash-setup-sub">Three steps to go live. Takes about 10 minutes.</p>

          <div className="setup-steps">
            <div className="setup-step">
              <div className="setup-step-num">1</div>
              <div className="setup-step-body">
                <h4>Add your first property</h4>
                <p>Enter the address and unit details. Add multiple units under one property.</p>
                <button 
                  className="setup-step-action"
                  onClick={() => router.push('/properties')}
                >
                  Add property &rarr;
                </button>
              </div>
            </div>

            <div className="setup-step">
              <div className="setup-step-num">2</div>
              <div className="setup-step-body">
                <h4>Invite your tenants</h4>
                <p>Send each tenant an invite link. They join free and are set up in minutes.</p>
                <button 
                  className="setup-step-action"
                  onClick={() => router.push('/tenant/portal')}
                >
                  Send invites &rarr;
                </button>
              </div>
            </div>

            <div className="setup-step">
              <div className="setup-step-num">3</div>
              <div className="setup-step-body">
                <h4>Upload your leases</h4>
                <p>Store signed leases and documents. Both parties always have access.</p>
                <button 
                  className="setup-step-action"
                  onClick={() => router.push('/properties')}
                >
                  Upload documents &rarr;
                </button>
              </div>
            </div>

            <div className="setup-step">
              <div className="setup-step-num">4</div>
              <div className="setup-step-body">
                <h4>Manage your deposits</h4>
                <p>Track security deposits held for your tenants.</p>
                <button 
                  className="setup-step-action"
                  onClick={() => router.push('/deposits')}
                >
                  View deposits &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
