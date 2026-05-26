# RentProof FastAPI Backend

## Overview

This service powers the RentProof API surface used by the Next.js frontend.

Current modules:
- Content APIs (features, pricing, testimonials, stats)
- Auth APIs (check, login, signup, delete)
- Dashboard APIs (properties, units, rent status, payments, maintenance, deposits)
- Tenant APIs (portal, pay rent, maintenance, move-in walkthrough)

## Structure

```text
backend/
├── main.py               # FastAPI app and router mounting
├── auth.py               # Auth-related endpoints
├── models.py             # Pydantic request/response models
├── routers/
│   ├── content.py
│   ├── dashboard.py
│   └── tenant.py
├── requirements.txt
├── setup.sh
└── .data/                # Local JSON persistence (created at runtime)
```

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
FRONTEND_URL=http://localhost:3000
SECRET_KEY=change-this
DEBUG=True
```

Run server:

```bash
python main.py
```

API URLs:
- Base: http://localhost:8000
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

### Root and health
- `GET /`
- `GET /health`

### Content (`/api/content`)
- `GET /features`
- `GET /pricing`
- `GET /testimonials`
- `GET /stats`

### Auth (`/api/auth`)
- `GET /check`
- `POST /login`
- `POST /signup`
- `POST /delete`

### Dashboard (`/api/dashboard`)
- `GET /properties`
- `POST /properties`
- `POST /properties/{property_id}/units`
- `PUT /properties/{property_id}`
- `PUT /properties/{property_id}/units/{unit_id}`
- `GET /rent-status`
- `GET /payments`
- `GET /maintenance`
- `POST /maintenance`
- `PUT /maintenance/{request_id}`
- `GET /deposits`
- `POST /deposits`

### Tenant (`/api/tenant`)
- `GET /portal`
- `POST /pay-rent`
- `GET /maintenance`
- `POST /maintenance`
- `GET /move-in-walkthrough`
- `POST /move-in-walkthrough`

## Local Data Behavior

For development, router modules persist data in JSON files under `backend/.data/`.

Files are created automatically as needed:
- `properties.json`
- `payments.json`
- `maintenance.json`
- `deposits.json`

This allows local testing without a separate database.

## Example Requests

```bash
curl http://localhost:8000/api/content/features

curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

curl http://localhost:8000/api/dashboard/rent-status

curl -X POST http://localhost:8000/api/tenant/pay-rent \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"tenant123","unitId":"unit_1","amount":1200,"paymentMethod":"bank"}'
```

## Integration Notes

- Frontend API client: `../lib/api.ts`
- CORS is configured in `main.py` and includes `FRONTEND_URL`.
- Auth and payment logic currently include placeholder/mock behavior and should be hardened before production.
