import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const requiredKeys: Array<keyof typeof firebaseConfig> = ['apiKey', 'authDomain', 'projectId', 'appId']

function hasFirebaseConfig(): boolean {
  return requiredKeys.every((key) => {
    const value = firebaseConfig[key]
    return typeof value === 'string' && value.trim().length > 0
  })
}

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let providerInstance: GoogleAuthProvider | null = null

export let firebaseInitError = ''
export const firebaseReady = (() => {
  if (!hasFirebaseConfig()) {
    firebaseInitError = 'Firebase client configuration is missing. Set NEXT_PUBLIC_FIREBASE_* variables.'
    return false
  }

  try {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
    authInstance = getAuth(app)

    const p = new GoogleAuthProvider()
    p.setCustomParameters({ prompt: 'select_account' })
    providerInstance = p
    return true
  } catch {
    firebaseInitError = 'Firebase client configuration is invalid. Check NEXT_PUBLIC_FIREBASE_API_KEY and related values.'
    return false
  }
})()

export const auth = authInstance
export const provider = providerInstance

export const FRIENDLY_ERRORS: Record<string, string> = {
  'auth/user-not-found':         'No account found with that email.',
  'auth/wrong-password':         'Incorrect password.',
  'auth/invalid-credential':     'Incorrect email or password.',
  'auth/email-already-in-use':   'An account with this email already exists.',
  'auth/weak-password':          'Password must be at least 6 characters.',
  'auth/invalid-email':          'Enter a valid email address.',
  'auth/popup-closed-by-user':   'Sign-in popup was closed. Try again.',
  'auth/popup-blocked':          'Allow popups for this site and try again.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/too-many-requests':      'Too many attempts. Try again in a few minutes.',
  'auth/user-disabled':          'This account has been disabled.',
}
