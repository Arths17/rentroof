'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import api from '@/lib/api'
import DashboardHeader from '@/components/layout/DashboardHeader'
import { useSession } from '@/hooks/useSession'

interface Deposit {
  id: string
  unit: string
  tenant: string
  amount: number
  dateReceived: string
  moveInDate: string
  moveOutDate?: string
  status: 'held' | 'returned' | 'applied'
  returnDeadline?: string
  returnedDate?: string
  returnAmount?: number
}

interface Payment {
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

export default function DepositsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { loading: sessionLoading, authenticated } = useSession()

  useEffect(() => {
    if (sessionLoading) {
      return
    }

    if (!authenticated) {
      router.push('/login')
      return
    }

    async function loadDeposits() {
      try {
        const [depositsData, paymentsData] = await Promise.all([
          api.dashboard.getDeposits(),
          api.dashboard.getPayments(),
        ])
        setDeposits(depositsData)
        setPayments(paymentsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDeposits()
  }, [authenticated, router, sessionLoading])

  const getStatusClass = (status: string) => `status-${status}`
  const getTotalHeld = () => deposits
    .filter(d => d.status === 'held')
    .reduce((sum, d) => sum + d.amount, 0)

  if (loading || sessionLoading) return <div className="loading">Loading deposits...</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <>
      <DashboardHeader />
      <div className="deposits-page">
        <div className="dash-nav-buttons">
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
      
      <div className="page-header">
        <h1>Security Deposits</h1>
        <div className="summary-card">
          <div className="summary-item">
            <span className="label">Total Held</span>
            <span className="value">${getTotalHeld().toLocaleString()}</span>
          </div>
          <div className="summary-item">
            <span className="label">Number of Deposits</span>
            <span className="value">{deposits.length}</span>
          </div>
        </div>
      </div>

      <div className="deposits-list">
        {deposits.map((deposit) => (
          <div key={deposit.id} className={`deposit-card ${getStatusClass(deposit.status)}`}>
            <div className="card-header">
              <div>
                <h3>Unit {deposit.unit}</h3>
                <p className="tenant-name">{deposit.tenant}</p>
              </div>
              <span className={`badge ${getStatusClass(deposit.status)}`}>
                {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
              </span>
            </div>

            <div className="card-content">
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Deposit Amount</span>
                  <span className="value amount">${deposit.amount.toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <span className="label">Date Received</span>
                  <span className="value">{new Date(deposit.dateReceived).toLocaleDateString()}</span>
                </div>
                <div className="info-item">
                  <span className="label">Move-in Date</span>
                  <span className="value">{new Date(deposit.moveInDate).toLocaleDateString()}</span>
                </div>
                {deposit.moveOutDate && (
                  <div className="info-item">
                    <span className="label">Move-out Date</span>
                    <span className="value">{new Date(deposit.moveOutDate).toLocaleDateString()}</span>
                  </div>
                )}
                {deposit.returnDeadline && deposit.status === 'held' && (
                  <div className="info-item">
                    <span className="label">Return Deadline</span>
                    <span className="value">{new Date(deposit.returnDeadline).toLocaleDateString()}</span>
                  </div>
                )}
                {deposit.returnedDate && (
                  <div className="info-item">
                    <span className="label">Returned Date</span>
                    <span className="value">{new Date(deposit.returnedDate).toLocaleDateString()}</span>
                  </div>
                )}
                {deposit.returnAmount && (
                  <div className="info-item">
                    <span className="label">Return Amount</span>
                    <span className="value amount">${deposit.returnAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {deposits.length === 0 && (
        <div className="empty-state">
          <p>No deposits recorded yet.</p>
        </div>
      )}

      <div className="page-header" style={{ marginTop: '3rem' }}>
        <h2>Rent Payments</h2>
      </div>

      <div className="payments-list">
        {payments.length > 0 ? (
          payments.map((payment) => (
            <div className="payment-card" key={payment.id}>
              <div className="card-header">
                <div>
                  <h3>{payment.tenantName || 'Unknown Tenant'}</h3>
                  <p className="unit-info">{payment.unitNumber ? `Unit ${payment.unitNumber}` : 'Property'}</p>
                  <p className="property-info">{payment.propertyInfo?.address || 'N/A'}</p>
                </div>
                <span className={`badge status-${payment.status}`}>
                  {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                </span>
              </div>

              <div className="card-content">
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Amount</span>
                    <span className="value">${payment.amount.toLocaleString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Payment Method</span>
                    <span className="value" style={{ textTransform: 'capitalize' }}>
                      {payment.paymentMethod}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Payment Date</span>
                    <span className="value">
                      {new Date(payment.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>No payments recorded yet.</p>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
