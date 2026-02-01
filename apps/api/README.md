# Exhale API

NestJS backend API for the Exhale therapy application.

## Getting Started

### Prerequisites

- Node.js 20 LTS
- Docker (for PostgreSQL and Redis)
- npm

### Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Start Docker services (from project root)
docker compose up -d

# Push schema to database
npx prisma db push

# Run in development mode
npm run start:dev
```

### Environment Variables

Copy `.env.example` from the project root or create `.env.local`:

```env
DATABASE_URL="postgresql://therapy_user:therapy_local_password@localhost:5432/therapy_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key"
```

## Project Structure

```
src/
├── main.ts                  # Entry point
├── app.module.ts            # Root module
├── prisma/                  # Database service
├── auth/                    # Authentication (coming)
├── users/                   # User management (coming)
├── homework/                # Homework CRUD (coming)
├── journal/                 # Smart journal (coming)
├── mood/                    # Mood tracking (coming)
├── sessions/                # Session management (coming)
└── common/
    ├── decorators/          # Custom decorators
    ├── guards/              # Auth guards
    ├── filters/             # Exception filters
    └── interceptors/        # Request interceptors
```

## Available Commands

```bash
# Development
npm run start:dev     # Start with hot reload

# Production
npm run build         # Build for production
npm run start:prod    # Run production build

# Testing
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:cov      # Test coverage

# Database
npx prisma generate   # Generate Prisma client
npx prisma db push    # Push schema changes
npx prisma studio     # Open database GUI
npx prisma migrate dev # Create migration
```

## API Documentation

Swagger documentation is available at `/api/docs` when running in development mode.

## Module Overview

| Module | Description | Status |
|--------|-------------|--------|
| PrismaModule | Database access | Done |
| AuthModule | JWT authentication | Planned |
| UsersModule | User CRUD | Planned |
| HomeworkModule | Homework management | Planned |
| MoodModule | Mood check-ins | Planned |
| JournalModule | Private journaling | Planned |
| SessionsModule | Video sessions | Planned |
