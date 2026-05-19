'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import api from '@/lib/api'
import DashboardHeader from '@/components/layout/DashboardHeader'

interface TenantPortalData {
  tenant: {
    id: string
    name: string
    email: string
    role: string
  }
  property: {
    id: string
    address: string
  }
  unit: {
    id: string
    number: string
    lease: {
      id: string
      startDate: string
      endDate: string
      rentAmount: number
      dueDate: number
    }
  }
  currentRent: {
    dueDate: string
    amount: number
    status: string
    paymentMethods: any[]
  }
  documents: any[]
  maintenanceRequests: any[]
}

export default function TenantPortalPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [data, setData] = useState<TenantPortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) {
        router.push('/login')
        return
      }

      try {
        const portalData = await api.tenant.getPortal()
        setData(portalData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tenant portal')
        console.error('Error loading portal:', err)
      } finally {
        setLoading(false)
      }
    })
    return unsub
  }, [router])

  if (loading) return <div className="loading">Loading tenant portal...</div>
  if (error) return <div className="error">Error: {error}</div>
  if (!data || !data.tenant) {
    return (
      <div className="tenant-portal">
        <div className="empty-state">
          <p>No tenant portal set up yet. Please contact your landlord to set up your account.</p>
        </div>
      </div>
    )
  }

  const getDaysUntilDue = () => {
    const due = new Date(data.currentRent.dueDate)
    const today = new Date()
    const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  const getRentStatusClass = () => {
    if (data.currentRent.status === 'paid') return 'status-paid'
    if (data.currentRent.status === 'pending' && getDaysUntilDue() > 0) return 'status-pending'
    return 'status-late'
  }

  return (
    <>
      <DashboardHeader />
      <div className="tenant-portal">
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
      
      <div className="portal-header">
        <h1>Welcome, {data.tenant.name}</h1>
        <p className="property-location">{data.property.address}</p>
      </div>

      <div className="portal-grid">
        {/* Current Rent Section */}
        <div className={`portal-card rent-card ${getRentStatusClass()}`}>
          <h2>Current Rent</h2>
          <div className="rent-details">
            <div className="rent-amount">
              <span className="label">Amount Due</span>
              <span className="value">${data.currentRent.amount.toLocaleString()}</span>
            </div>
            <div className="rent-due-date">
              <span className="label">Due Date</span>
              <span className="value">{new Date(data.currentRent.dueDate).toLocaleDateString()}</span>
            </div>
            <div className={`rent-status ${data.currentRent.status}`}>
              <span>{data.currentRent.status.toUpperCase()}</span>
            </div>
          </div>
          {data.currentRent.status !== 'paid' && (
            <button 
              onClick={() => router.push('/tenant/pay-rent')}
              className="btn-primary"
            >
              Pay Rent Now
            </button>
          )}
        </div>

        {/* Lease Information */}
        <div className="portal-card lease-card">
          <h2>Lease Information</h2>
          <div className="lease-info">
            <div className="info-item">
              <span className="label">Unit</span>
              <span className="value">{data.unit.number}</span>
            </div>
            <div className="info-item">
              <span className="label">Lease Start</span>
              <span className="value">{new Date(data.unit.lease.startDate).toLocaleDateString()}</span>
            </div>
            <div className="info-item">
              <span className="label">Lease End</span>
              <span className="value">{new Date(data.unit.lease.endDate).toLocaleDateString()}</span>
            </div>
            <div className="info-item">
              <span className="label">Monthly Rent</span>
              <span className="value">${data.unit.lease.rentAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="portal-card documents-card">
          <h2>Documents</h2>
          {data.documents.length > 0 ? (
            <div className="documents-list">
              {data.documents.map((doc) => (
                <div key={doc.id} className="document-item">
                  <span className="document-icon">📄</span>
                  <span className="document-name">{doc.name}</span>
                  <span className="document-date">
                    {new Date(doc.uploadedDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-message">No documents available yet</p>
          )}
        </div>

        {/* Maintenance Requests */}
        <div className="portal-card maintenance-card">
          <h2>Maintenance Requests</h2>
          {data.maintenanceRequests.length > 0 ? (
            <div className="requests-list">
              {data.maintenanceRequests.map((request) => (
                <div key={request.id} className="request-item">
                  <div className="request-title">{request.title}</div>
                  <div className="request-status">{request.status.toUpperCase()}</div>
                  <div className="request-date">
                    {new Date(request.submittedDate).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-message">No maintenance requests</p>
          )}
          <button 
            onClick={() => router.push('/tenant/maintenance')}
            className="btn-secondary"
          >
            Submit New Request
          </button>
        </div>
      </div>

      <div className="portal-actions">
        <button 
          onClick={() => router.push('/tenant/move-in-walkthrough')}
          className="btn-secondary"
        >
          Move-in Walkthrough
        </button>
      </div>
    </div>
    </>
  )
}
