# AGENTS.md

## Monorepo overview

pnpm workspace with two packages:
- `frontend/` — Vite 6 + React 19 + TanStack Router + Tailwind CSS 4 + shadcn/ui
- `backend/api/` — NestJS 11 REST API

Database: Supabase (PostgreSQL). Frontend talks to Supabase directly for most operations; the NestJS backend handles auth (OTP flow, registration) and runs on port 3000.

## Essential commands

```bash
pnpm dev              # start frontend dev server (localhost:5173)
pnpm dev:backend      # start backend dev server (localhost:3000)
pnpm build            # frontend build (tsc + vite build)
```

Root scripts just delegate to packages via `pnpm --filter`. The frontend must pass `tsc` before `vite build`. Backend build: run `pnpm --filter backend dev` or `cd backend/api && nest start --watch`.

## TanStack Router (frontend)

Routes live in `src/routes/`. The file `src/routeTree.gen.ts` is **auto-generated** by the TanStackRouterVite plugin — never edit it. Adding or renaming a route file triggers regeneration automatically during dev/build.

Path alias: `@/` → `src/`.

## Tailwind CSS 4 + shadcn/ui

Uses Tailwind v4 with the `@tailwindcss/vite` plugin (no `tailwind.config` file). shadcn/ui configured via `components.json` with Radix Nova style and Lucide icons. Components installed under `src/components/ui/`.

## Backend environment variables

The backend needs these env vars (not in `.env.example` but used in code):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET`
- `DATABASE_URL` (Postgres connection string for `pg`)
- `RESEND_API_KEY` (email service)

## Database setup

Run `setup_database.sql` against the Supabase project to create all tables, functions, and seed data. Migrations in `backend/supabase/migrations/` track incremental changes.

## Code style (backend)

Prettier: single quotes, trailing commas. ESLint with typescript-eslint strict typed config. Run `pnpm --filter api lint` before committing.
