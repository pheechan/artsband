# Artsband Monorepo

Artsband is now organized as a full-stack monorepo:

- `apps/web`: Next.js App Router frontend for members and admins
- `apps/api`: FastAPI scheduler-ready backend for Vercel
- `supabase`: SQL migrations for auth, membership approval, and RLS

The current architecture keeps Supabase as the system of record for auth and database access, while moving the product into a server-first write model.

The legacy Vite files at the repository root are intentionally left in place as migration reference material, but the active application now lives under `apps/web` and `apps/api`.

## Workspace Scripts

Run these from the repo root:

```bash
npm install
npm run dev
npm run dev:web
npm run dev:api
npm run build:web
npm run build:api
```

## Environment Files

Committed templates:

- `apps/web/.env.example`
- `apps/api/.env.example`

Local placeholder files are already created for convenience:

- `apps/web/.env.local`
- `apps/api/.env`

Replace the placeholder values with your real Supabase and deployment values later.

## Web Environment Contract

`apps/web/.env.local`

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_SITE_URL=
```

## API Environment Contract

`apps/api/.env`

```dotenv
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
WEB_APP_URL=
CORS_ORIGINS=
APP_ENV=development
SCHEDULER_MODE=stub
```

## Supabase Setup

For a brand-new Supabase project, you can run `supabase/schema.sql` directly.
For an existing project that already has earlier tables or data, use the migration files instead.

Apply the migrations in `supabase/migrations`, especially:

- `20260106051903_931ebe79-d553-4327-b92c-ea138cbff2a0.sql`
- `20260106051910_095e39c6-350f-47ae-8d4b-e6a37ccc18f1.sql`
- `20260328181000_membership_approval_and_server_first.sql`

Important behavior after the new migration:

- Signup stores `student_id` and creates a `pending` profile.
- Pending users can sign in but are routed to `/pending`.
- Only `approved` members can access member routes.
- Admins can approve, reject, or suspend accounts from `/admin/members`.

## Vercel Deployment Guide

Deploy this same GitHub repo as two separate Vercel projects.

### 1. Web Project

- Import the repo into Vercel.
- Set the root directory to `apps/web`.
- Add the web environment variables from `apps/web/.env.example`.
- Deploy.

### 2. API Project

- Import the same repo again as a second Vercel project.
- Set the root directory to `apps/api`.
- Add the API environment variables from `apps/api/.env.example`.
- Deploy.

### 3. Connect Them

- Copy the deployed API URL.
- Set `NEXT_PUBLIC_API_BASE_URL` in the web project to that API URL.
- Redeploy the web project.

This keeps each runtime isolated:

- Next.js logs and env vars stay with the web project.
- Python runtime and scheduler endpoints stay with the API project.

## Current Feature Surface

### Web

- `/auth`: sign in and student-ID-based signup
- `/pending`: membership review state and self-service profile fixes
- `/dashboard`: approved member landing page
- `/songs`: suggestion and voting flow through server routes
- `/availability`: weekly matrix saved through server routes
- `/members`: approved member directory
- `/profile`: self-service profile editing
- `/admin/members`: manual approval workflow

### API

- `GET /health`
- `GET /scheduler/capabilities`
- `POST /scheduler/recommendations`

The scheduler endpoint is deliberately a stub for now. It already exposes the long-term contract so the real algorithm can be merged in later without redesigning the API.
