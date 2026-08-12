# Exhale

A therapy support application: a Next.js web app, installable as a PWA, whose API lives in Route Handlers and is backed by Supabase and Prisma. It supports patients and therapists across onboarding, mood tracking, therapist matching, homework, media responses, and AI-assisted session summaries.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20 LTS
- pnpm 10.x through Corepack (`corepack enable`)

### Local Development

```bash
git clone https://github.com/UYildiz12/exhale.git
cd exhale
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Project Structure

```text
exhale/
|-- apps/
|   `-- web/          # Next.js app, Route Handler API, installable PWA
|-- packages/
|   `-- db/           # Prisma schema, migrations, and client package
|-- docs/             # Project documentation
`-- .github/          # CI workflow
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Web / App | Next.js App Router, TypeScript, Tailwind, shadcn/ui, installable PWA |
| Backend | Next.js Route Handlers, Prisma, Supabase Auth/Postgres/Storage |
| AI | Google Gemini Interactions API via `@google/genai` |
| Mobile (planned) | Expo / React Native, sharing the Route Handler/Supabase backend |

## Documentation

- [Feature Inventory](./docs/frontend_pages.md)
- [Web README](./apps/web/README.md)

## Phase 0 exit criteria: closed with coverage, remaining backlog

The Phase 0 gate is closed with the minimum required regression tests for:

- auth provisioning and user creation
- login / forgot-password / reset-password flow surface
- role-based therapist access guard
- user profile contract + session access flow

These items are intentionally not implemented yet and are tracked as non-blocking follow-up work:

1. Concurrent provision race handling under parallel sign-up requests.
2. Full email-confirmation signup flow after the confirmation email is clicked.
3. Admin approval flow for pending therapists from UI to database state.
4. Expired or already-used password reset link handling in a live environment.
5. Re-provisioning role drift when a user is first created as PATIENT and later attempts THERAPIST.
6. Prisma migration drift between schema updates and deployed database state.
7. Deployment/env drift for Supabase and Postgres credentials across local/staging/prod.
8. Profile completeness validation beyond the core role contract (e.g., missing therapist/patient profile metadata).

These remain in backlog form only; they are not blockers for the current Phase 0 completion call.

## License

Private. All rights reserved.
