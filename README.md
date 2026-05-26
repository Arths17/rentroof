# RentProof

RentProof is a property operations platform for landlords and property managers.

**AI was used for fixing errors relating to backend auth**

It includes:
- A Next.js 15 frontend for marketing pages, landlord dashboard, and tenant portal UX.
- A FastAPI backend for content, auth, dashboard, and tenant APIs.
- Firebase integration for frontend auth/database configuration.

## Tech Stack

- Frontend: Next.js 15, React 19, TypeScript
- Backend: FastAPI, Pydantic, Uvicorn
- Client integration: `lib/api.ts` (FastAPI) and `lib/firebase.ts` (Firebase SDK)
- Hosting targets: Vercel (frontend) and any Python host for FastAPI backend

## Repository Layout

```text
rentproof/
├── app/                       # Next.js App Router pages + route handlers
├── components/                # Shared UI components
├── lib/                       # API/Firebase client utilities
├── backend/                   # FastAPI application
├── css/ js/                   # Static legacy-style assets
├── firestore.rules            # Firestore security rules
├── .env.local.example         # Frontend environment template
└── START.md                   # Local run helper notes
```

## Local Development

### 1) Frontend setup

```bash
npm install
cp .env.local.example .env.local
```

Set Firebase values in `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Optional (for backend API URL override):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 2) Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` with at least:

```env
FRONTEND_URL=http://localhost:3000
DEBUG=True
SECRET_KEY=change-this
```

### 3) Run both services

Terminal 1 (frontend):

```bash
cd /Users/atharvranjan/rentproof
npm run dev
```

Terminal 2 (backend):

```bash
cd /Users/atharvranjan/rentproof/backend
source venv/bin/activate
python main.py
```

URLs:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

## Environment Variables

Frontend (`.env.local`):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_API_URL` (optional)

Backend (`backend/.env`):
- `FRONTEND_URL` (used by CORS)
- `SECRET_KEY`
- `DEBUG`

## API Modules

Mounted in `backend/main.py`:
- `/api/content` -> landing page content APIs
- `/api/auth` -> auth check/login/signup/delete
- `/api/dashboard` -> properties, units, rent status, maintenance, deposits, payments
- `/api/tenant` -> portal, rent payment, maintenance, move-in walkthrough

## Notes

- Backend persistence currently uses JSON files under `backend/.data/` for local development.
- Some auth and payment flows are placeholder/mock implementations intended for later hardening.

## Deployment

Frontend (Vercel):

```bash
npx vercel
```

Add all `NEXT_PUBLIC_*` vars in Vercel project settings.

For Firestore rules deployment:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```
