'use client'

import { useEffect, useState } from 'react'
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
  }
}

export default function TenantMaintenancePage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [portalData, setPortalData] = useState<TenantData | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    images: [] as string[],
  })
  const router = useRouter()

  // Get actual tenant and unit IDs from portal
  const tenantId = portalData?.tenant?.id || 'tenant123'
  const unitId = portalData?.unit?.id || 'unit2a'

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get portal data to get actual tenant and unit IDs
        const portal = await api.tenant.getPortal()
        setPortalData(portal)
        
        // Fetch maintenance requests
        const data = await api.tenant.getMaintenance()
        setRequests(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load requests')
        console.error('Error loading requests:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await api.tenant.submitMaintenance(
        tenantId,
        unitId,
        formData.title,
        formData.description,
        formData.priority,
        formData.images
      )

      if (result.success) {
        // Refresh the list from server to ensure persistence
        const updatedRequests = await api.tenant.getMaintenance()
        setRequests(updatedRequests)
        setFormData({ title: '', description: '', priority: 'medium', images: [] })
        setShowForm(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    }
  }

  if (loading) return <div className="loading">Loading maintenance requests...</div>

  return (
    <div className="tenant-maintenance-page">
      <div className="dash-nav-buttons">
        <button 
          className="nav-btn"
          onClick={() => router.push('/tenant/portal')}
        >
          👥 Back to Portal
        </button>
        <button 
          className="nav-btn"
          onClick={() => router.push('/tenant/pay-rent')}
        >
          💳 Pay Rent
        </button>
        <button 
          className="nav-btn"
          onClick={() => router.push('/tenant/move-in-walkthrough')}
        >
          🚪 Move-In Walkthrough
        </button>
      </div>

      <div className="page-header">
        <h1>Maintenance Requests</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : 'Submit New Request'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="maintenance-form">
          <h2>Submit Maintenance Request</h2>
          
          <div className="form-group">
            <label htmlFor="title">Issue Title *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Leaky faucet"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Please describe the issue in detail..."
              rows={4}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <button type="submit" className="btn-primary">Submit Request</button>
        </form>
      )}

      <div className="requests-list">
        {requests.length > 0 ? (
          requests.map((request) => (
            <div key={request.id} className="request-card">
              <h3>{request.title}</h3>
              <p>{request.description}</p>
              <div className="request-meta">
                <span className={`priority-${request.priority}`}>
                  {request.priority.toUpperCase()}
                </span>
                <span className={`status-${request.status}`}>
                  {request.status.toUpperCase()}
                </span>
                <span className="date">
                  {new Date(request.submittedDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>No maintenance requests submitted yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
