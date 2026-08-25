# BookiOps

Internal admin microservice for Booki.ai onboarding and restaurant number-change approvals.

## Architecture

- **Frontend** (`frontend/`) — React admin SPA (port 5174)
- **Backend** (`backend/`) — Express API (port 5050)
- **Database** — Firebase Firestore project `bookiops` (workflow data only; `ops_*` collections)
- **Live restaurant SoT** — `twilio_openai` Firestore `tenants` via phone API (unchanged)

## Quick start

1. In Firebase Console (project **bookiops**): Firestore Native mode is already created.
2. Project settings → Service accounts → **Generate new private key**. Save the JSON in `backend/` (filename must contain `firebase-adminsdk`).
3. Start the API:

```bash
cd backend
cp .env.example .env   # set INTERNAL_API_KEY to match twilio_openai
npm install
npm run dev
```

4. Frontend:

```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

Default admin (from seed): `admin@booki.co.za` / `ChangeMeAdmin123!`

Restaurant ingest subjects are seeded for existing mock mybooki owners (billy@, ryan@, …).

Postgres / `docker compose` is no longer required.

## Required twilio_openai env

```
INTERNAL_API_KEY=<same as BookiOps>
```

Additive routes:

- `GET /api/internal/restaurants`
- `PATCH /api/internal/restaurants/:id/phone-number`

## Required mybooki env

```
VITE_BOOKIOPS_API_URL=http://localhost:5050
```

When unset/empty, Signup and SetNumber keep previous behavior (feature-safe).
