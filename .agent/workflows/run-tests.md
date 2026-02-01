---
description: Run specific test suites (Unit, E2E, Watch Mode) for Backend, Web, and Mobile
---

This workflow helps you run targeted tests for specific parts of the system.

# Backend (NestJS)

1. Run Unit Tests (Watch Mode) - Best for TDD
// turbo
```bash
cd apps/api && npm run test:watch
```

2. Run End-to-End (E2E) Tests
// turbo
```bash
cd apps/api && npm run test:e2e
```

3. Run Test Coverage
// turbo
```bash
cd apps/api && npm run test:cov
```

# Web Dashboard (Next.js)

4. Run Component Tests
// turbo
```bash
cd apps/web && npm run test
```

5. Run E2E Tests (Playwright)
// turbo
```bash
cd apps/web && npx playwright test
```

# Mobile App (Flutter)

6. Run All Tests
// turbo
```bash
cd apps/mobile && flutter test
```

7. Run Integration Tests
// turbo
```bash
cd apps/mobile && flutter test integration_test
```

# Debugging Tests

If tests are failing:
1. Check database container is running: `docker compose ps`
2. Check environment variables: `apps/api/.env`
3. Generate Prisma client: `cd apps/api && npx prisma generate`
