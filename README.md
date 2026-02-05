# Exhale

A therapy support application with web (Next.js), mobile (Flutter), and backend (NestJS) components. Built for therapists and patients to manage sessions, track mood, journal, and stay connected.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20 LTS
- [Flutter](https://docs.flutter.dev/get-started/install) 3.19+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Local Development

```bash
# Clone and enter the repo
git clone https://github.com/UYildiz12/exhale.git
cd exhale

# Copy environment variables
cp .env.example .env

# Start infrastructure (Postgres, Redis, MinIO)
docker compose up -d

# Backend (terminal 1)
cd apps/api
npm install
npx prisma generate
npx prisma db push
npm run start:dev

# Web frontend (terminal 2)
cd apps/web
npm install
npm run dev

# Mobile app (terminal 3)
cd apps/mobile
flutter pub get
flutter run
```

## Project Structure

```
exhale/
├── apps/
│   ├── api/          # NestJS backend with Prisma
│   ├── web/          # Next.js frontend for therapists and patients
│   └── mobile/       # Flutter mobile app
├── packages/
│   └── shared-types/ # Shared TypeScript interfaces
├── docs/             # Project documentation
└── .github/          # CI/CD workflows
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | Flutter, Riverpod, Dio, Drift |
| Web | Next.js, TypeScript, shadcn/ui, Tailwind |
| Backend | NestJS, Prisma, PostgreSQL |
| Infrastructure | Docker, Redis, MinIO |

## Documentation

- [Frontend Pages Specification](./docs/frontend_pages.md)
- [API README](./apps/api/README.md)
- [Web README](./apps/web/README.md)
- [Mobile README](./apps/mobile/README.md)

## License

Private. All rights reserved.
