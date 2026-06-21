# Exhale Web

The web app is a Next.js App Router application that contains both the browser UI and API Route Handlers. It uses Supabase for auth, Prisma for database access, and can be installed as a PWA.

## Commands

```bash
pnpm --filter web dev
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
```

Root scripts load `.env` where needed:

```bash
pnpm dev
pnpm build
pnpm db:migrate
```

## Environment

Copy the root `.env.example` to `.env` and fill in Supabase values. `AI_key` is the Google API key used by server-side Gemini session summaries.

## Main Routes

- `/` landing page
- `/login`, `/signup` auth
- `/dashboard` authenticated home
- `/mood` patient mood tracking
- `/intake` patient matching intake
- `/find` patient therapist directory and connection requests
- `/homework` patient assignments
- `/practice/*` therapist patient, request, homework, assignment, and profile tools
