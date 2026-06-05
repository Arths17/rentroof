'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardHeader from '@/components/layout/DashboardHeader'
import ChatBot from '@/components/ChatBot'
import { useSession } from '@/hooks/useSession'

export default function TenantAssistantPage() {
  const router = useRouter()
  const { loading: sessionLoading, authenticated } = useSession()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionLoading) return
    if (!authenticated) {
      router.push('/login')
      return
    }

    setLoading(false)
  }, [sessionLoading, authenticated, router])

  if (loading || sessionLoading) return <div className="loading">Loading…</div>

  return (
    <>
      <DashboardHeader />
      <main className="dash-page">
        <div className="dash-main-wrapper" style={{ padding: '2rem' }}>
          <div style={{ maxWidth: 980, margin: '0 auto' }}>
            <h1>Assistant</h1>
            <p className="dash-welcome-sub">Ask the RentProof Assistant anything about your tenancy.</p>
            <div style={{ marginTop: '1rem' }}>
              <ChatBot />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
