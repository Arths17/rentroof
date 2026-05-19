'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import api from '@/lib/api'
import DashboardHeader from '@/components/layout/DashboardHeader'

interface Property {
  id: string
  address: string
  city: string
  state: string
  zipCode?: string
  units?: any[]
}

interface UnitFormState {
  name: string
  tenant: string
  rentAmount: string
  status: string
  dueDate: string
}

export default function PropertiesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [unitFormFor, setUnitFormFor] = useState<string | null>(null)
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null)
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
  })
  const [unitFormData, setUnitFormData] = useState<UnitFormState>({
    name: '',
    tenant: '',
    rentAmount: '',
    status: 'vacant',
    dueDate: '',
  })

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

  const getMonthlyDueDate = (dueDay: string | number | null | undefined) => {
    const day = Number(dueDay)
    if (!day || Number.isNaN(day)) return null

    const now = new Date()
    const safeDay = Math.min(day, getDaysInMonth(now.getFullYear(), now.getMonth()))
    return new Date(now.getFullYear(), now.getMonth(), safeDay)
  }

  const isOverdue = (dueDay: string | number | null | undefined) => {
    const dueDate = getMonthlyDueDate(dueDay)
    if (!dueDate) return false

    const overdueThreshold = new Date(dueDate)
    overdueThreshold.setDate(overdueThreshold.getDate() + 2)
    return new Date() > overdueThreshold
  }

  const formatDueDay = (dueDay: string | number | null | undefined) => {
    const day = Number(dueDay)
    if (!day || Number.isNaN(day)) return 'No due day'
    const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th'
    return `Due on the ${day}${suffix}`
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) {
        router.push('/login')
        return
      }

      try {
        const data = await api.dashboard.getProperties()
        setProperties(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load properties')
        console.error('Error loading properties:', err)
      } finally {
        setLoading(false)
      }
    })
    return unsub
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await api.dashboard.createProperty(
        formData.address,
        formData.city,
        formData.state,
        formData.zipCode
      )
      
      if (result.success) {
        setProperties([...properties, result.property])
        setFormData({ address: '', city: '', state: '', zipCode: '' })
        setShowForm(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create property')
    }
  }

  const handleUnitSubmit = async (e: React.FormEvent, propertyId: string) => {
    e.preventDefault()

    try {
      const rentAmount = Number(unitFormData.rentAmount)
      const result = await api.dashboard.createUnit(
        propertyId,
        unitFormData.name,
        unitFormData.tenant,
        rentAmount,
        unitFormData.status,
        unitFormData.dueDate
      )

      if (result.success) {
        setProperties(prev => prev.map(property => {
          if (property.id !== propertyId) return property
          return result.property
        }))
        setUnitFormData({
          name: '',
          tenant: '',
          rentAmount: '',
          status: 'vacant',
          dueDate: '',
        })
        setUnitFormFor(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create unit')
    }
  }

  const handleEditProperty = (property: Property) => {
    setEditingPropertyId(property.id)
    setFormData({
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode || '',
    })
  }

  const handleUpdateProperty = async (e: React.FormEvent, propertyId: string) => {
    e.preventDefault()
    try {
      const result = await api.dashboard.updateProperty(
        propertyId,
        formData.address,
        formData.city,
        formData.state,
        formData.zipCode
      )

      if (result.success) {
        setProperties(prev => prev.map(p => p.id === propertyId ? result.property : p))
        setEditingPropertyId(null)
        setFormData({ address: '', city: '', state: '', zipCode: '' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update property')
    }
  }

  const handleEditUnit = (unit: any) => {
    setEditingUnitId(unit.id)
    setUnitFormData({
      name: unit.name,
      tenant: unit.tenant,
      rentAmount: String(unit.rentAmount),
      status: unit.status,
      dueDate: unit.dueDate || '',
    })
  }

  const handleUpdateUnit = async (e: React.FormEvent, propertyId: string, unitId: string) => {
    e.preventDefault()
    try {
      const rentAmount = Number(unitFormData.rentAmount)
      const result = await api.dashboard.updateUnit(
        propertyId,
        unitId,
        unitFormData.name,
        unitFormData.tenant,
        rentAmount,
        unitFormData.status,
        unitFormData.dueDate
      )

      if (result.success) {
        setProperties(prev => prev.map(p => p.id === propertyId ? result.property : p))
        setEditingUnitId(null)
        setUnitFormData({
          name: '',
          tenant: '',
          rentAmount: '',
          status: 'vacant',
          dueDate: '',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update unit')
    }
  }

  if (loading) return <div className="loading">Loading properties...</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <>
      <DashboardHeader />
      <div className="properties-page">
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
        <h1>Properties</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Add Property'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="property-form">
          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Zip Code</label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">Create Property</button>
        </form>
      )}

      <div className="properties-list">
        {properties.map((property) => (
          <div key={property.id} className="property-card">
            {editingPropertyId === property.id ? (
              <form onSubmit={(e) => handleUpdateProperty(e, property.id)} className="property-form">
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Zip Code</label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Save</button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setEditingPropertyId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="property-header">
                  <h3>{property.address}</h3>
                  <div className="property-header-actions">
                    <span className="property-location">{property.city}, {property.state}</span>
                    <button
                      type="button"
                      className="unit-toggle-btn"
                      onClick={() => handleEditProperty(property)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="unit-toggle-btn"
                      onClick={() => setUnitFormFor(unitFormFor === property.id ? null : property.id)}
                    >
                      {unitFormFor === property.id ? 'Cancel Unit' : 'Add Unit'}
                    </button>
                  </div>
                </div>

            {unitFormFor === property.id && (
              <form
                className="property-form unit-form"
                onSubmit={(e) => handleUnitSubmit(e, property.id)}
              >
                <div className="form-row">
                  <div className="form-group">
                    <label>Unit Name</label>
                    <input
                      type="text"
                      value={unitFormData.name}
                      onChange={(e) => setUnitFormData({ ...unitFormData, name: e.target.value })}
                      placeholder="1A"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Tenant</label>
                    <input
                      type="text"
                      value={unitFormData.tenant}
                      onChange={(e) => setUnitFormData({ ...unitFormData, tenant: e.target.value })}
                      placeholder="Leave blank if vacant"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Rent Amount</label>
                    <input
                      type="number"
                      value={unitFormData.rentAmount}
                      onChange={(e) => setUnitFormData({ ...unitFormData, rentAmount: e.target.value })}
                      placeholder="1800"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={unitFormData.status}
                      onChange={(e) => setUnitFormData({ ...unitFormData, status: e.target.value })}
                    >
                      <option value="vacant">Vacant</option>
                      <option value="occupied">Occupied</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <div className="form-group">
                      <label>Monthly Due Day</label>
                    <input
                        type="number"
                      value={unitFormData.dueDate}
                      onChange={(e) => setUnitFormData({ ...unitFormData, dueDate: e.target.value })}
                        placeholder="5"
                        min="1"
                        max="31"
                      />
                  </div>
                </div>
                <button type="submit" className="btn-primary">Save Unit</button>
              </form>
            )}

            {property.units && property.units.length > 0 && (
              <div className="property-units">
                <h4>Units ({property.units.length})</h4>
                <div className="units-grid">
                  {property.units.map((unit: any) => (
                    editingUnitId === unit.id ? (
                      <div key={unit.id} className="unit-edit-form">
                        <form onSubmit={(e) => handleUpdateUnit(e, property.id, unit.id)}>
                          <div className="form-row">
                            <div className="form-group">
                              <label>Unit Name</label>
                              <input
                                type="text"
                                value={unitFormData.name}
                                onChange={(e) => setUnitFormData({ ...unitFormData, name: e.target.value })}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Tenant</label>
                              <input
                                type="text"
                                value={unitFormData.tenant}
                                onChange={(e) => setUnitFormData({ ...unitFormData, tenant: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label>Rent Amount</label>
                              <input
                                type="number"
                                value={unitFormData.rentAmount}
                                onChange={(e) => setUnitFormData({ ...unitFormData, rentAmount: e.target.value })}
                                min="0"
                                step="0.01"
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Status</label>
                              <select
                                value={unitFormData.status}
                                onChange={(e) => setUnitFormData({ ...unitFormData, status: e.target.value })}
                              >
                                <option value="vacant">Vacant</option>
                                <option value="occupied">Occupied</option>
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Due Day</label>
                              <input
                                type="number"
                                value={unitFormData.dueDate}
                                onChange={(e) => setUnitFormData({ ...unitFormData, dueDate: e.target.value })}
                                min="1"
                                max="31"
                              />
                            </div>
                          </div>
                          <div className="form-actions">
                            <button type="submit" className="btn-primary">Save</button>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setEditingUnitId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div
                        key={unit.id}
                        className="unit-badge"
                        onClick={() => handleEditUnit(unit)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="unit-name">{unit.name}</span>
                        <span className={`unit-status ${isOverdue(unit.dueDate) ? 'late' : unit.status}`}>
                          {isOverdue(unit.dueDate) ? 'Overdue' : unit.status}
                        </span>
                        <span className="unit-due-date">{formatDueDay(unit.dueDate)}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
            {(!property.units || property.units.length === 0) && (
              <div className="empty-state">
                <p>No units added yet.</p>
              </div>
            )}
              </>
            )}
          </div>
        ))}
      </div>

        {properties.length === 0 && (
          <div className="empty-state">
            <p>No properties yet. Create your first property to get started.</p>
          </div>
        )}
      </div>
    </>
  )
}
