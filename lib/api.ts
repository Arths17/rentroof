// API utility functions for making requests to FastAPI backend
// This file centralizes all API calls for the frontend

// Use environment variable or default to FastAPI backend on port 8000
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export const api = {
  // ==================== CONTENT ENDPOINTS ====================
  content: {
    getFeatures: async () => {
      const res = await fetch(`${API_BASE}/content/features`)
      if (!res.ok) throw new Error('Failed to fetch features')
      return res.json()
    },

    getPricing: async () => {
      const res = await fetch(`${API_BASE}/content/pricing`)
      if (!res.ok) throw new Error('Failed to fetch pricing')
      return res.json()
    },

    getTestimonials: async () => {
      const res = await fetch(`${API_BASE}/content/testimonials`)
      if (!res.ok) throw new Error('Failed to fetch testimonials')
      return res.json()
    },

    getStats: async () => {
      const res = await fetch(`${API_BASE}/content/stats`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
  },

  // ==================== AUTH ENDPOINTS ====================
  auth: {
    checkAuth: async () => {
      const res = await fetch(`${API_BASE}/auth/check`)
      return res.json()
    },

    login: async (email: string, password: string) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) throw new Error('Login failed')
      return res.json()
    },

    signup: async (
      email: string,
      password: string,
      name: string,
      plan: string = 'growth'
    ) => {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, plan }),
      })
      if (!res.ok) throw new Error('Signup failed')
      return res.json()
    },

    delete: async (email: string) => {
      const res = await fetch(`${API_BASE}/auth/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('Delete failed')
      return res.json()
    },
  },

  // ==================== DASHBOARD ENDPOINTS ====================
  dashboard: {
    getProperties: async () => {
      const res = await fetch(`${API_BASE}/dashboard/properties`)
      if (!res.ok) throw new Error('Failed to fetch properties')
      return res.json()
    },

    createProperty: async (
      address: string,
      city: string,
      state: string,
      zipCode: string
    ) => {
      const res = await fetch(`${API_BASE}/dashboard/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, city, state, zipCode }),
      })
      if (!res.ok) throw new Error('Failed to create property')
      return res.json()
    },

    createUnit: async (
      propertyId: string,
      name: string,
      tenant: string,
      rentAmount: number,
      status: string = 'vacant',
      dueDate: string = ''
    ) => {
      const res = await fetch(`${API_BASE}/dashboard/properties/${propertyId}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          tenant,
          rentAmount,
          status,
          dueDate: dueDate || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create unit')
      return res.json()
    },

    updateProperty: async (
      propertyId: string,
      address: string,
      city: string,
      state: string,
      zipCode: string
    ) => {
      const res = await fetch(`${API_BASE}/dashboard/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, city, state, zipCode }),
      })
      if (!res.ok) throw new Error('Failed to update property')
      return res.json()
    },

    updateUnit: async (
      propertyId: string,
      unitId: string,
      name: string,
      tenant: string,
      rentAmount: number,
      status: string = 'vacant',
      dueDate: string = ''
    ) => {
      const res = await fetch(
        `${API_BASE}/dashboard/properties/${propertyId}/units/${unitId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            tenant,
            rentAmount,
            status,
            dueDate: dueDate || null,
          }),
        }
      )
      if (!res.ok) throw new Error('Failed to update unit')
      return res.json()
    },

    getRentStatus: async () => {
      const res = await fetch(`${API_BASE}/dashboard/rent-status`)
      if (!res.ok) throw new Error('Failed to fetch rent status')
      return res.json()
    },

    getMaintenance: async () => {
      const res = await fetch(`${API_BASE}/dashboard/maintenance`)
      if (!res.ok) throw new Error('Failed to fetch maintenance requests')
      return res.json()
    },

    createMaintenance: async (
      unitId: string,
      title: string,
      description: string,
      priority: string = 'medium',
      images: string[] = []
    ) => {
      const res = await fetch(`${API_BASE}/dashboard/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId, title, description, priority, images }),
      })
      if (!res.ok) throw new Error('Failed to create maintenance request')
      return res.json()
    },

    updateMaintenanceStatus: async (requestId: string, status: string) => {
      const res = await fetch(`${API_BASE}/dashboard/maintenance/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update maintenance status')
      return res.json()
    },

    getPayments: async () => {
      const res = await fetch(`${API_BASE}/dashboard/payments`)
      if (!res.ok) throw new Error('Failed to fetch payments')
      return res.json()
    },

    getDeposits: async () => {
      const res = await fetch(`${API_BASE}/dashboard/deposits`)
      if (!res.ok) throw new Error('Failed to fetch deposits')
      return res.json()
    },

    createDeposit: async (
      unitId: string,
      tenantId: string,
      amount: number,
      dateReceived: string
    ) => {
      const res = await fetch(`${API_BASE}/dashboard/deposits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId, tenantId, amount, dateReceived }),
      })
      if (!res.ok) throw new Error('Failed to create deposit')
      return res.json()
    },
  },

  // ==================== TENANT ENDPOINTS ====================
  tenant: {
    getPortal: async () => {
      const res = await fetch(`${API_BASE}/tenant/portal`)
      if (!res.ok) throw new Error('Failed to fetch tenant portal')
      return res.json()
    },

    getMaintenance: async () => {
      const res = await fetch(`${API_BASE}/tenant/maintenance`)
      if (!res.ok) throw new Error('Failed to fetch maintenance requests')
      return res.json()
    },

    payRent: async (
      tenantId: string,
      unitId: string,
      amount: number,
      paymentMethod: string
    ) => {
      const res = await fetch(`${API_BASE}/tenant/pay-rent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, unitId, amount, paymentMethod }),
      })
      if (!res.ok) throw new Error('Payment failed')
      return res.json()
    },

    submitMaintenance: async (
      tenantId: string,
      unitId: string,
      title: string,
      description: string,
      priority: string = 'medium',
      images: string[] = []
    ) => {
      const res = await fetch(`${API_BASE}/tenant/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          unitId,
          title,
          description,
          priority,
          images,
        }),
      })
      if (!res.ok) throw new Error('Failed to submit maintenance request')
      return res.json()
    },

    getMoveInWalkthrough: async () => {
      const res = await fetch(`${API_BASE}/tenant/move-in-walkthrough`)
      if (!res.ok) throw new Error('Failed to fetch move-in walkthrough')
      return res.json()
    },

    submitMoveInWalkthrough: async (
      tenantId: string,
      unitId: string,
      roomId: string,
      photos: string[]
    ) => {
      const res = await fetch(`${API_BASE}/tenant/move-in-walkthrough`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, unitId, roomId, photos }),
      })
      if (!res.ok) throw new Error('Failed to submit walkthrough photos')
      return res.json()
    },
  },
}

export default api
