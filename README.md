# Exhale

A therapy support application: a Next.js web app (installable as a PWA) whose API lives in Route Handlers, backed by Supabase. Built for therapists and patients to manage sessions, track mood, journal, and stay connected. (Native iOS/Android via Expo is planned for later — it reuses the same TypeScript + Supabase stack.)

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20 LTS
- pnpm 9+ (`corepack enable`)

### Local Development

```bash
git clone https://github.com/UYildiz12/exhale.git
cd exhale
cp .env.example .env          # fill in Supabase values
pnpm install
pnpm db:migrate               # apply migrations (loads root .env)
pnpm dev                      # Next.js app (web + API) on http://localhost:3000
```

## Project Structure

```
exhale/
├── apps/
│   └── web/          # Next.js app (web UI + API) — installable PWA
├── packages/
│   ├── db/           # Prisma schema + client package
│   └── shared-types/ # Shared TypeScript interfaces
├── docs/             # Project documentation
└── .github/          # CI/CD workflows
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Web / App | Next.js (App Router), TypeScript, Tailwind, shadcn/ui — installable PWA |
| Backend | Next.js Route Handlers, Prisma, Supabase (Postgres/Auth/Storage/Realtime) |
| Mobile (planned) | Expo / React Native — shares the TypeScript + Supabase stack |

## Documentation

- [Frontend Pages Specification](./docs/frontend_pages.md)
- [Web README](./apps/web/README.md)

## License

Private. All rights reserved.
