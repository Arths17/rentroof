import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // TODO: Verify user authentication
  // TODO: Fetch from database filtered by user ID

  // Start with empty list - landlord records deposits
  const deposits: any[] = []

  return NextResponse.json(deposits)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { unitId, tenantId, amount, dateReceived } = body

    if (!unitId || !amount) {
      return NextResponse.json(
        { error: 'Unit ID and amount are required' },
        { status: 400 }
      )
    }

    // TODO: Create deposit record in database

    return NextResponse.json(
      {
        success: true,
        deposit: {
          id: 'new_dep_id',
          unitId,
          amount,
          dateReceived: dateReceived || new Date().toISOString(),
          status: 'held',
        },
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
