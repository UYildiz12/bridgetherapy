# Exhale

A comprehensive therapy support application with mobile (Flutter), web (Next.js), and backend (NestJS) components.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20 LTS
- [Flutter](https://docs.flutter.dev/get-started/install) 3.19+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/<org>/exhale.git
cd exhale

# 2. Copy environment variables
cp .env.example .env

# 3. Start infrastructure (Postgres, Redis, MinIO)
docker compose up -d

# 4. Setup and run backend
cd apps/api
npm install
npx prisma generate
npx prisma db push
npm run start:dev

# 5. Setup and run web (new terminal)
cd apps/web
npm install
npm run dev

# 6. Setup and run mobile (new terminal)
cd apps/mobile
flutter pub get
flutter run
```

## Project Structure

```
exhale/
├── apps/
│   ├── api/          # NestJS backend
│   ├── web/          # Next.js therapist dashboard
│   └── mobile/       # Flutter patient app
├── packages/
│   └── shared-types/ # Shared TypeScript types
├── infrastructure/
│   └── docker/       # Docker configurations
├── docs/             # Documentation
└── .github/          # CI/CD workflows
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | Flutter, Riverpod, Dio, Drift |
| Web | Next.js, TypeScript, shadcn/ui |
| Backend | NestJS, Prisma, PostgreSQL |
| Infrastructure | Docker, Redis, S3/MinIO |

## Documentation

- [Implementation Plan](./docs/implementation_plan.md)
- [Intern Onboarding](./docs/intern_onboarding.md)
- [API Documentation](./apps/api/README.md)
- [Mobile App Guide](./apps/mobile/README.md)
- [Web Dashboard Guide](./apps/web/README.md)

## License

Private - All rights reserved.
