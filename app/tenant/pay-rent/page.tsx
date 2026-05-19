'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface TenantData {
  tenant?: {
    id: string
    name: string
  }
  unit?: {
    id: string
    number: string
    status?: string
    paidDate?: string
    lease?: {
      rentAmount: number
    }
  }
  currentRent?: {
    amount: number
    status: string
    dueDate: string
  }
}

export default function PayRentPage() {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [portalData, setPortalData] = useState<TenantData | null>(null)
  const router = useRouter()

  // Get real tenant and unit data from portal
  const tenantId = portalData?.tenant?.id || 'tenant123'
  const unitId = portalData?.unit?.id || 'unit2a'
  const expectedAmount = portalData?.unit?.lease?.rentAmount || 1950

  useEffect(() => {
    const loadPortalData = async () => {
      try {
        const data = await api.tenant.getPortal()
        setPortalData(data)
        // Pre-fill amount with expected rent
        if (data.unit?.lease?.rentAmount) {
          setAmount(data.unit.lease.rentAmount.toString())
        }
      } catch (err) {
        console.error('Error loading portal data:', err)
      }
    }

    loadPortalData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    try {
      setLoading(true)

      const amountNumber = parseFloat(amount)
      if (isNaN(amountNumber) || amountNumber <= 0) {
        setError('Please enter a valid amount')
        return
      }

      const result = await api.tenant.payRent(
        tenantId,
        unitId,
        amountNumber,
        paymentMethod
      )

      if (result.success) {
        setSuccess(true)
        setAmount('')
        setTimeout(() => {
          router.push('/tenant/portal')
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
      console.error('Payment error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="payment-success">
        <div className="success-content">
          <h1>✓ Payment Submitted Successfully!</h1>
          <p>Your payment of ${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been submitted.</p>
          <p>Check your email for the receipt and confirmation.</p>
          <p className="redirect-message">Redirecting to tenant portal...</p>
        </div>
      </div>
    )
  }

  // Check if rent is already paid
  const isPaid = portalData?.unit?.status === 'paid'
  const paidDate = portalData?.unit?.paidDate

  if (isPaid && paidDate) {
    return (
      <div className="pay-rent-page">
        <div className="dash-nav-buttons">
          <button 
            className="nav-btn"
            onClick={() => router.push('/tenant/portal')}
          >
            👥 Back to Portal
          </button>
          <button 
            className="nav-btn"
            onClick={() => router.push('/tenant/maintenance')}
          >
            🔧 Maintenance
          </button>
          <button 
            className="nav-btn"
            onClick={() => router.push('/tenant/move-in-walkthrough')}
          >
            🚪 Move-In Walkthrough
          </button>
        </div>

        <div className="page-header">
          <h1>Pay Rent</h1>
        </div>

        <div className="payment-already-made">
          <div className="success-badge">✓ PAID</div>
          <h2>Rent Payment Complete</h2>
          <div className="payment-info">
            <div className="info-item">
              <span className="label">Amount Paid:</span>
              <span className="value">${expectedAmount.toLocaleString()}</span>
            </div>
            <div className="info-item">
              <span className="label">Payment Date:</span>
              <span className="value">{new Date(paidDate).toLocaleDateString()}</span>
            </div>
            <div className="info-item">
              <span className="label">Status:</span>
              <span className="value" style={{ color: '#4CAF50' }}>✓ Completed</span>
            </div>
          </div>
          <p className="message">Thank you for your payment! Your rent for this month has been fully paid.</p>
          <button 
            className="primary-btn"
            onClick={() => router.push('/tenant/portal')}
          >
            Back to Portal
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pay-rent-page">
      <div className="dash-nav-buttons">
        <button 
          className="nav-btn"
          onClick={() => router.push('/tenant/portal')}
        >
          👥 Back to Portal
        </button>
        <button 
          className="nav-btn"
          onClick={() => router.push('/tenant/maintenance')}
        >
          🔧 Maintenance
        </button>
        <button 
          className="nav-btn"
          onClick={() => router.push('/tenant/move-in-walkthrough')}
        >
          🚪 Move-In Walkthrough
        </button>
      </div>

      <div className="page-header">
        <h1>Pay Rent</h1>
      </div>

      <div className="rent-info-card">
        <h2>Rent Summary</h2>
        <div className="info-row">
          <span className="label">Expected Amount:</span>
          <span className="value">${expectedAmount.toLocaleString()}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="payment-form">
        <h2>Payment Details</h2>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="amount">Amount to Pay *</label>
          <div className="amount-input-wrapper">
            <span className="currency">$</span>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              disabled={loading}
            />
          </div>
          <p className="hint">You can pay less or more than the expected amount</p>
        </div>

        <div className="form-group">
          <label htmlFor="method">Payment Method *</label>
          <select
            id="method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            disabled={loading}
            required
          >
            <option value="bank">Bank Transfer</option>
            <option value="card">Credit/Debit Card</option>
            <option value="ach">ACH Transfer</option>
            <option value="check">Check (Mail-in)</option>
          </select>
        </div>

        <div className="payment-methods-info">
          {paymentMethod === 'bank' && (
            <div className="method-info">
              <h3>Bank Transfer Instructions</h3>
              <p>Use your online banking service to transfer funds. Funds typically arrive within 1-2 business days.</p>
            </div>
          )}
          {paymentMethod === 'card' && (
            <div className="method-info">
              <h3>Credit/Debit Card</h3>
              <p>You will be redirected to a secure payment processor. A small processing fee may apply.</p>
            </div>
          )}
          {paymentMethod === 'ach' && (
            <div className="method-info">
              <h3>ACH Transfer</h3>
              <p>Set up an ACH transfer for a cost-effective way to pay. Funds typically arrive within 1-2 business days.</p>
            </div>
          )}
          {paymentMethod === 'check' && (
            <div className="method-info">
              <h3>Check Payment</h3>
              <p>Mail checks to the address provided in your lease. Please write your unit number on the check.</p>
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary btn-large">
          {loading ? 'Processing...' : 'Submit Payment'}
        </button>
      </form>

      <div className="payment-security">
        <p>🔒 Your payment information is secure and encrypted</p>
      </div>
    </div>
  )
}
