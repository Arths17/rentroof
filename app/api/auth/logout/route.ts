import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { clearSessionCookie } from '@/app/api/_lib/session'

export async function POST(_request: NextRequest) {
  const response = clearSessionCookie(
    NextResponse.json({ success: true, message: 'Logged out successfully' })
  )

  return response
}
