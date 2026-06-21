# Exhale

A therapy support application with a web app (Next.js, including the API via Route Handlers) and a mobile app (Flutter), backed by Supabase. Built for therapists and patients to manage sessions, track mood, journal, and stay connected.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20 LTS
- [Flutter](https://docs.flutter.dev/get-started/install) 3.19+
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
│   ├── web/          # Next.js frontend for therapists and patients
│   └── mobile/       # Flutter mobile app
├── packages/
│   ├── db/           # Prisma schema + client package
│   └── shared-types/ # Shared TypeScript interfaces
├── docs/             # Project documentation
└── .github/          # CI/CD workflows
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | Flutter, Riverpod, Dio, Drift |
| Web | Next.js, TypeScript, shadcn/ui, Tailwind |
| Backend | Next.js Route Handlers, Prisma, Supabase (Postgres/Auth/Storage/Realtime) |

## Documentation

- [Frontend Pages Specification](./docs/frontend_pages.md)
- [Web README](./apps/web/README.md)
- [Mobile README](./apps/mobile/README.md)

## License

Private. All rights reserved.
