'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import api from '@/lib/api'
import DashboardHeader from '@/components/layout/DashboardHeader'
import { useSession } from '@/hooks/useSession'

interface MaintenanceRequest {
  id: string
  unit: string
  tenant: string
  title: string
  description: string
  status: 'open' | 'in-progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  submittedDate: string
  completedDate?: string
  assignedTo?: string
}

type MaintenanceStatus = MaintenanceRequest['status']

const MAINTENANCE_FILTERS: (MaintenanceStatus | 'all')[] = [
  'open',
  'in-progress',
  'completed',
  'all',
]

export default function MaintenancePage() {
  const router = useRouter()
  const pathname = usePathname()
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<MaintenanceStatus | 'all'>('open')
  const [updating, setUpdating] = useState<string | null>(null)
  const { loading: sessionLoading, authenticated } = useSession()

  useEffect(() => {
    if (sessionLoading) {
      return
    }

    if (!authenticated) {
      router.push('/login')
      return
    }

    async function loadMaintenance() {
      try {
        const data = await api.dashboard.getMaintenance()
        setRequests(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load maintenance requests')
        console.error('Error loading maintenance:', err)
      } finally {
        setLoading(false)
      }
    }

    loadMaintenance()
  }, [authenticated, router, sessionLoading])

  const getPriorityClass = (priority: string) => `priority-${priority}`
  const getStatusClass = (status: string) => `status-${status}`

  const handleStatusUpdate = async (
    requestId: string,
    newStatus: MaintenanceStatus,
  ) => {
    try {
      setUpdating(requestId)
      const result = await api.dashboard.updateMaintenanceStatus(requestId, newStatus)
      
      if (result.success) {
        // Update local state
        setRequests(requests.map(r =>
          r.id === requestId
            ? {
                ...r,
                status: newStatus,
                completedDate:
                  newStatus === 'completed'
                    ? new Date().toISOString()
                    : r.completedDate,
              }
            : r
        ))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
      console.error('Error updating status:', err)
    } finally {
      setUpdating(null)
    }
  }

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status === filter)

  if (loading || sessionLoading) return <div className="loading">Loading maintenance requests...</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <>
      <DashboardHeader />
      <div className="maintenance-page">
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
        <h1>Maintenance Requests</h1>
        <div className="filter-buttons">
          {MAINTENANCE_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`filter-btn ${filter === status ? 'active' : ''}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="maintenance-list">
        {filteredRequests.map((request) => (
          <div key={request.id} className={`maintenance-card ${getStatusClass(request.status)}`}>
            <div className="card-header">
              <h3>{request.title}</h3>
              <div className="card-badges">
                <span className={`badge ${getPriorityClass(request.priority)}`}>
                  {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)} Priority
                </span>
                <span className={`badge ${getStatusClass(request.status)}`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="card-content">
              <p className="description">{request.description}</p>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Unit</span>
                  <span className="value">{request.unit}</span>
                </div>
                <div className="info-item">
                  <span className="label">Tenant</span>
                  <span className="value">{request.tenant}</span>
                </div>
                <div className="info-item">
                  <span className="label">Submitted</span>
                  <span className="value">{new Date(request.submittedDate).toLocaleDateString()}</span>
                </div>
                {request.assignedTo && (
                  <div className="info-item">
                    <span className="label">Assigned To</span>
                    <span className="value">{request.assignedTo}</span>
                  </div>
                )}
                {request.completedDate && (
                  <div className="info-item">
                    <span className="label">Completed</span>
                    <span className="value">{new Date(request.completedDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="card-actions">
                {request.status !== 'completed' && (
                  <>
                    {request.status === 'open' && (
                      <button
                        onClick={() => handleStatusUpdate(request.id, 'in-progress')}
                        disabled={updating === request.id}
                        className="btn-secondary"
                      >
                        {updating === request.id ? 'Updating...' : 'Mark In Progress'}
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusUpdate(request.id, 'completed')}
                      disabled={updating === request.id}
                      className="btn-primary"
                    >
                      {updating === request.id ? 'Updating...' : 'Mark Completed'}
                    </button>
                  </>
                )}
                {request.status === 'completed' && (
                  <span className="completed-text">✓ Completed</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

        {filteredRequests.length === 0 && (
          <div className="empty-state">
            <p>No maintenance requests yet.</p>
          </div>
        )}
      </div>
    </>
  )
}
