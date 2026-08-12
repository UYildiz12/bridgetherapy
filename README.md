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

## License

Private. All rights reserved.
