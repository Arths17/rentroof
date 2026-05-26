'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  signInWithPopup,
} from 'firebase/auth'
import { auth, provider, FRIENDLY_ERRORS } from '@/lib/firebase'
import api from '@/lib/api'
import GoogleButton from '@/components/auth/GoogleButton'
import { useSession } from '@/hooks/useSession'

function strengthScore(password: string): number {
  let score = 0
  if (password.length >= 8)                           score++
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password))                 score++
  return score
}

const STRENGTH_LABELS = ['', 'weak', 'medium', 'strong'] as const

export default function SignupPage() {
  const router = useRouter()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { loading: sessionLoading, authenticated } = useSession()

  useEffect(() => {
    if (!sessionLoading && authenticated) {
      router.replace('/dashboard')
    }
  }, [authenticated, router, sessionLoading])

  const clearError = () => setError('')
  const score = strengthScore(password)
  const strengthLabel = STRENGTH_LABELS[score] ?? ''

  async function handleGoogle() {
    clearError()
    setGoogleLoading(true)
    try {
      console.log("Starting Google sign-in...");
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      console.log("Google sign-in successful:", user.email);
      
      // Notify backend about the new user so it can send welcome email
      try {
        console.log('Calling backend signup for Google user...')
        const backendResponse = await api.auth.signup(
          user.email || '',
          'google-oauth',
          user.displayName || user.email?.split('@')[0] || 'User',
          'growth'
        )
        console.log('Backend response:', backendResponse)
        if (!backendResponse?.success) {
          console.warn('Backend signup warning:', backendResponse)
          // Don't block signup if backend fails
        }
      } catch (err) {
        console.warn('Could not contact backend for Google signup:', err)
        // Don't block signup if backend fails
      }
      
      console.log("Redirecting to dashboard...");
      router.replace('/dashboard')
    } catch (err: unknown) {
      setGoogleLoading(false)
      console.error("Google sign-in error:", err);
      const code = (err as { code?: string }).code ?? ''
      setError(FRIENDLY_ERRORS[code] ?? 'Something went wrong. Please try again.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log("handleSubmit called");
    clearError()
    if (!name)              { setError('Enter your full name.');              return }
    if (!email)             { setError('Enter your email address.');          return }
    if (!password)          { setError('Choose a password.');                  return }
    if (password.length < 6){ setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    console.log("Form validation passed, starting signup...");
    try {
      console.log('Starting signup...')
      const backendResponse = await api.auth.signup(email, password, name, 'growth')
      console.log('Backend response:', backendResponse)

      if (!backendResponse?.success) {
        const err = backendResponse || { detail: 'Signup proxy failed' }
        console.error('Backend error:', err)
        setLoading(false)
        setError(err.detail || err.error || 'Server signup failed')
        return
      }

      console.log('Redirecting to dashboard...')
      router.replace('/dashboard')
    } catch (err: unknown) {
      setLoading(false)
      console.error('Signup error:', err)
      const code = (err as { code?: string }).code ?? ''
      setError(FRIENDLY_ERRORS[code] ?? 'Something went wrong. Please try again.')
    }
  }

  if (sessionLoading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <Link href="/" className="auth-logo">Rent<span className="accent">Proof</span></Link>

        <div className="auth-left-body">
          <div className="auth-left-eyebrow">Free 14-day trial</div>
          <h2>Set up in 10 minutes.<br />Running today.</h2>
          <p className="auth-left-sub">
            Add your properties, invite your tenants with a link, and go live.
            No credit card required. No commitment.
          </p>
          <div className="auth-trust-items">
            <div className="auth-trust-item">14-day free trial, cancel any time</div>
            <div className="auth-trust-item">Tenants join free -- you invite them</div>
            <div className="auth-trust-item">No credit card to start</div>
            <div className="auth-trust-item">Import existing properties in minutes</div>
          </div>
        </div>

        <div className="auth-left-footer">
          2026 RentProof Inc. Built for landlords, loved by tenants.
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <Link href="/" className="auth-mobile-logo">Rent<span className="accent">Proof</span></Link>

          <div className="auth-card-eyebrow">Get started</div>
          <h1>Create account</h1>
          <p className="auth-card-sub">
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--accent)' }}>Log in</Link>
          </p>

          <GoogleButton onClick={handleGoogle} loading={googleLoading} />

          <div className="auth-divider"><span>or</span></div>

          {error && <div className="auth-error show">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                className="auth-input"
                placeholder="Your name"
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

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
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              {password.length > 0 && (
                <div className="password-strength">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`strength-bar${i <= score ? ` ${strengthLabel}` : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <p className="auth-terms">
              By creating an account you agree to our{' '}
              <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
