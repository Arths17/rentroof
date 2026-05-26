// API utility functions for making requests to the Next.js API routes or a
// configured backend. All requests include credentials so session cookies flow
// correctly across same-origin and proxied deployments.

type ApiErrorPayload = {
  error?: string
  detail?: string
  message?: string
}

export type AuthCheckResponse = {
  authenticated: boolean
  message?: string
  user?: {
    id: string
    email: string
    role: string
    name?: string
    plan?: string
    photoURL?: string
  }
}

type RequestInitWithJson = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

async function requestJson<T = any>(path: string, init: RequestInitWithJson = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const body = init.body
  const isJsonBody = body !== null && body !== undefined && !(body instanceof FormData)

  if (isJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    body: isJsonBody ? JSON.stringify(body) : (body as BodyInit | null | undefined),
  })

  const data = (await response.json().catch(() => null)) as T & ApiErrorPayload | null

  if (!response.ok) {
    const message = data?.error || data?.detail || data?.message || `Request failed (${response.status})`
    throw new Error(message)
  }

  return data as T
}

export const api = {
  // ==================== CONTENT ENDPOINTS ====================
  content: {
    getFeatures: async () => requestJson('/content/features'),
    getPricing: async () => requestJson('/content/pricing'),
    getTestimonials: async () => requestJson('/content/testimonials'),
    getStats: async () => requestJson('/content/stats'),
  },

  // ==================== AUTH ENDPOINTS ====================
  auth: {
    checkAuth: async (): Promise<AuthCheckResponse> =>
      requestJson<AuthCheckResponse>('/auth/check'),
    login: async (email: string, password: string) =>
      requestJson('/auth/login', {
        method: 'POST',
        body: { email, password },
      }),
    signup: async (
      email: string,
      password: string,
      name: string,
      plan: string = 'growth'
    ) =>
      requestJson('/auth/signup', {
        method: 'POST',
        body: { email, password, name, plan },
      }),
    logout: async () => requestJson('/auth/logout', { method: 'POST' }),
    delete: async (email: string) =>
      requestJson('/auth/delete', {
        method: 'POST',
        body: { email },
      }),
  },

  // ==================== DASHBOARD ENDPOINTS ====================
  dashboard: {
    getProperties: async () => requestJson('/dashboard/properties'),
    createProperty: async (
      address: string,
      city: string,
      state: string,
      zipCode: string
    ) =>
      requestJson('/dashboard/properties', {
        method: 'POST',
        body: { address, city, state, zipCode },
      }),
    createUnit: async (
      propertyId: string,
      name: string,
      tenant: string,
      email: string,
      rentAmount: number,
      status: string = 'vacant',
      dueDate: string = ''
    ) =>
      requestJson(`/dashboard/properties/${propertyId}/units`, {
        method: 'POST',
        body: {
          name,
          tenant,
          email,
          rentAmount,
          status,
          dueDate: dueDate || null,
        },
      }),
    updateProperty: async (
      propertyId: string,
      address: string,
      city: string,
      state: string,
      zipCode: string
    ) =>
      requestJson(`/dashboard/properties/${propertyId}`, {
        method: 'PUT',
        body: { address, city, state, zipCode },
      }),
    updateUnit: async (
      propertyId: string,
      unitId: string,
      name: string,
      tenant: string,
      email: string,
      rentAmount: number,
      status: string = 'vacant',
      dueDate: string = ''
    ) =>
      requestJson(`/dashboard/properties/${propertyId}/units/${unitId}`, {
        method: 'PUT',
        body: {
          name,
          tenant,
          email,
          rentAmount,
          status,
          dueDate: dueDate || null,
        },
      }),
    getRentStatus: async () => requestJson('/dashboard/rent-status'),
    getMaintenance: async () => requestJson('/dashboard/maintenance'),
    createMaintenance: async (
      unitId: string,
      title: string,
      description: string,
      priority: string = 'medium',
      images: string[] = []
    ) =>
      requestJson('/dashboard/maintenance', {
        method: 'POST',
        body: { unitId, title, description, priority, images },
      }),
    updateMaintenanceStatus: async (requestId: string, status: string) =>
      requestJson(`/dashboard/maintenance/${requestId}`, {
        method: 'PUT',
        body: { status },
      }),
    getPayments: async () => requestJson('/dashboard/payments'),
    getDeposits: async () => requestJson('/dashboard/deposits'),
    createDeposit: async (
      unitId: string,
      tenantId: string,
      amount: number,
      dateReceived: string
    ) =>
      requestJson('/dashboard/deposits', {
        method: 'POST',
        body: { unitId, tenantId, amount, dateReceived },
      }),
  },

  // ==================== TENANT ENDPOINTS ====================
  tenant: {
    getPortal: async () => requestJson('/tenant/portal'),
    getMaintenance: async () => requestJson('/tenant/maintenance'),
    payRent: async (
      tenantId: string,
      unitId: string,
      amount: number,
      paymentMethod: string
    ) =>
      requestJson('/tenant/pay-rent', {
        method: 'POST',
        body: { tenantId, unitId, amount, paymentMethod },
      }),
    submitMaintenance: async (
      tenantId: string,
      unitId: string,
      title: string,
      description: string,
      priority: string = 'medium',
      images: string[] = []
    ) =>
      requestJson('/tenant/maintenance', {
        method: 'POST',
        body: { tenantId, unitId, title, description, priority, images },
      }),
    getMoveInWalkthrough: async () => requestJson('/tenant/move-in-walkthrough'),
    submitMoveInWalkthrough: async (
      tenantId: string,
      unitId: string,
      roomId: string,
      photos: string[]
    ) =>
      requestJson('/tenant/move-in-walkthrough', {
        method: 'POST',
        body: { tenantId, unitId, roomId, photos },
      }),
  },
}

export default api
