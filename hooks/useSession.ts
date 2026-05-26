'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

export type SessionUser = {
  id: string
  email: string
  role: string
  name?: string
  plan?: string
  photoURL?: string
}

type UseSessionResult = {
  user: SessionUser | null
  loading: boolean
  authenticated: boolean
}

export function useSession(): UseSessionResult {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const response = await api.auth.checkAuth()
        if (!cancelled) {
          setUser(response.authenticated ? response.user ?? null : null)
        }
      } catch {
        if (!cancelled) {
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  return {
    user,
    loading,
    authenticated: user !== null,
  }
}
