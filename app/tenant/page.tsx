'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import TenantPortalPage from './portal/page'

export default function TenantPage() {
  const router = useRouter()
  const { loading, authenticated } = useSession()

  useEffect(() => {
    if (!loading && !authenticated) {
      router.push('/login')
    }
  }, [authenticated, loading, router])

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!authenticated) {
    return null
  }

  return <TenantPortalPage />
}
