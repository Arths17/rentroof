'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth, provider, FRIENDLY_ERRORS } from '@/lib/firebase'
import api from '@/lib/api'
import GoogleButton from '@/components/auth/GoogleButton'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      if (u) {
        ;(async () => {
          try {
            await api.tenant.getPortal()
            router.replace('/tenant')
          } catch (e) {
            console.error('Error checking tenant portal:', e)
            router.replace('/dashboard')
          }
        })()
      }
    })
    return unsub
  }, [router])

  const clearError = () => setError('')

  async function handleGoogle() {
    clearError()
    setGoogleLoading(true)
    try {
      await signInWithPopup(auth, provider)
      try {
        await api.tenant.getPortal()
        router.replace('/tenant')
      } catch (e) {
        console.error('Error checking tenant portal:', e)
        router.replace('/dashboard')
      }
    } catch (err: unknown) {
      setGoogleLoading(false)
      console.error('Google sign-in error:', err)
      const code = (err as { code?: string }).code ?? ''
      setError(FRIENDLY_ERRORS[code] ?? 'Something went wrong. Please try again.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    clearError()
    if (!email || !password) { setError('Enter your email and password.'); return }

    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      try {
        await api.tenant.getPortal()
        router.replace('/tenant')
      } catch (e) {
        console.error('Error checking tenant portal:', e)
        router.replace('/dashboard')
      }
    } catch (err: unknown) {
      setLoading(false)
      console.error('Email sign-in error:', err)
      const code = (err as { code?: string }).code ?? ''
      setError(FRIENDLY_ERRORS[code] ?? 'Something went wrong. Please try again.')
    }
  }

  async function handleForgot(e: React.MouseEvent) {
    e.preventDefault()
    clearError()
    if (!email) { setError('Enter your email address first, then click Forgot password.'); return }
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      setError(FRIENDLY_ERRORS[code] ?? 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <Link href="/" className="auth-logo">Rent<span className="accent">Proof</span></Link>

        <div className="auth-left-body">
          <div className="auth-left-eyebrow">Property management</div>
          <h2>Your portfolio.<br />Under control.</h2>
          <p className="auth-left-sub">
            Everything you need to run a professional rental operation -- rent tracking,
            maintenance, documentation, and deposit protection in one place.
          </p>
          <div className="auth-trust-items">
            <div className="auth-trust-item">Automated rent reminders and late fees</div>
            <div className="auth-trust-item">Timestamped move-in documentation</div>
            <div className="auth-trust-item">One-click dispute evidence export</div>
            <div className="auth-trust-item">Free tenant portal, no setup friction</div>
          </div>
        </div>

        <div className="auth-left-footer">
          2026 RentProof Inc. All rights reserved.
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <Link href="/" className="auth-mobile-logo">Rent<span className="accent">Proof</span></Link>

          <div className="auth-card-eyebrow">Welcome back</div>
          <h1>Log in</h1>
          <p className="auth-card-sub">
            Don&rsquo;t have an account?{' '}
            <Link href="/signup" style={{ color: 'var(--accent)' }}>Sign up free</Link>
          </p>

          <GoogleButton onClick={handleGoogle} loading={googleLoading} />

          <div className="auth-divider"><span>or</span></div>

          {resetSent && (
            <div style={{
              fontSize: '0.72rem', color: 'var(--paid)',
              background: 'var(--paid-bg)', border: '1px solid rgba(34,192,107,0.2)',
              borderRadius: '3px', padding: '0.75rem 1rem', marginBottom: '1rem', lineHeight: 1.5,
            }}>
              Reset email sent. Check your inbox.
            </div>
          )}

          {error && <div className="auth-error show">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="auth-input"
                placeholder="Your password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <div className="auth-forgot">
                <a href="#" onClick={handleForgot}>Forgot password?</a>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
