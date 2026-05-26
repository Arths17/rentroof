import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { dbAll, dbGet } from '@/app/api/_lib/db'
import { ensureAuthenticatedUser } from '@/app/api/_lib/security'

type PortalRow = {
  property_id: string
  address: string
  city: string
  state: string
  zip_code: string | null
  unit_id: string
  unit_name: string
  tenant_user_id: string | null
  tenant_name: string | null
  tenant_email: string | null
  rent_amount: number
  status: string
  due_day: number | null
  paid_date: string | null
  tenant_role: string | null
  tenant_display_name: string | null
  tenant_photo_url: string | null
}

function buildPortal(unit: PortalRow | undefined, maintenanceRequests: any[]) {
  if (!unit) {
    return {
      tenant: null,
      property: null,
      unit: null,
      currentRent: null,
      documents: [],
      maintenanceRequests: [],
    }
  }

  const dueDay = unit.due_day ?? 1
  const today = new Date()
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const dueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(dueDay, 28))

  return {
    tenant: {
      id: unit.tenant_user_id ?? `tenant_${unit.unit_id}`,
      name: unit.tenant_display_name ?? unit.tenant_name ?? 'Tenant',
      email: unit.tenant_email ?? '',
      role: unit.tenant_role ?? 'tenant',
      photoURL: unit.tenant_photo_url ?? undefined,
    },
    property: {
      id: unit.property_id,
      address: `${unit.address}, ${unit.city}, ${unit.state}${unit.zip_code ? ` ${unit.zip_code}` : ''}`,
    },
    unit: {
      id: unit.unit_id,
      number: unit.unit_name,
      status: unit.status,
      paidDate: unit.paid_date,
      lease: {
        id: `lease_${unit.unit_id}`,
        startDate: new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString(),
        endDate: new Date(today.getFullYear() + 1, today.getMonth(), 1).toISOString(),
        rentAmount: unit.rent_amount,
        dueDate: dueDay,
      },
    },
    currentRent: {
      dueDate: dueDate.toISOString(),
      amount: unit.rent_amount,
      status: unit.status,
      paymentMethods: [
        { type: 'bank', label: 'Bank Transfer' },
        { type: 'card', label: 'Credit Card' },
      ],
    },
    documents: [
      {
        id: `doc_${unit.unit_id}`,
        name: 'Lease Agreement',
        type: 'pdf',
        uploadedDate: new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString(),
      },
    ],
    maintenanceRequests,
  }
}

export async function GET(request: NextRequest) {
  const authResult = ensureAuthenticatedUser(request, ['tenant', 'landlord', 'admin'])

  if ('response' in authResult) {
    return authResult.response
  }

  const unit =
    authResult.dbUser.role === 'tenant'
      ? dbGet<PortalRow>(
          `SELECT
            p.id AS property_id,
            p.address,
            p.city,
            p.state,
            p.zip_code,
            u.id AS unit_id,
            u.name AS unit_name,
            u.tenant_user_id,
            u.tenant_name,
            u.tenant_email,
            u.rent_amount,
            u.status,
            u.due_day,
            u.paid_date,
            t.role AS tenant_role,
            t.name AS tenant_display_name,
            t.photo_url AS tenant_photo_url
           FROM units u
           JOIN properties p ON p.id = u.property_id
           LEFT JOIN users t ON t.id = u.tenant_user_id
           WHERE u.tenant_user_id = ?
           ORDER BY u.created_at DESC
           LIMIT 1`,
          [authResult.dbUser.id]
        )
      : dbGet<PortalRow>(
          `SELECT
            p.id AS property_id,
            p.address,
            p.city,
            p.state,
            p.zip_code,
            u.id AS unit_id,
            u.name AS unit_name,
            u.tenant_user_id,
            u.tenant_name,
            u.tenant_email,
            u.rent_amount,
            u.status,
            u.due_day,
            u.paid_date,
            t.role AS tenant_role,
            t.name AS tenant_display_name,
            t.photo_url AS tenant_photo_url
           FROM units u
           JOIN properties p ON p.id = u.property_id
           LEFT JOIN users t ON t.id = u.tenant_user_id
           WHERE p.owner_user_id = ? AND u.tenant_user_id IS NOT NULL
           ORDER BY u.created_at DESC
           LIMIT 1`,
          [authResult.dbUser.id]
        )

  if (!unit) {
    return NextResponse.json({ tenant: null, property: null, unit: null, currentRent: null, documents: [], maintenanceRequests: [] })
  }

  const maintenanceRequests = dbAll(
    `SELECT id, unit_id, tenant_name, title, description, status, priority, submitted_date, images_json
     FROM maintenance_requests
     WHERE unit_id = ?
     ORDER BY submitted_date DESC`,
    [unit.unit_id]
  ).map((requestItem: any) => ({
    id: requestItem.id,
    unit: unit.unit_name,
    tenant: requestItem.tenant_name ?? unit.tenant_name ?? '',
    title: requestItem.title,
    description: requestItem.description,
    status: requestItem.status,
    priority: requestItem.priority,
    submittedDate: requestItem.submitted_date,
    images: JSON.parse(requestItem.images_json || '[]'),
  }))

  return NextResponse.json(buildPortal(unit, maintenanceRequests))
}
