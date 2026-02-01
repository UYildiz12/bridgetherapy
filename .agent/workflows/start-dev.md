---
description: Start the full development environment (Infrastructure, Backend, Web, Mobile)
---

This workflow starts all components of the MindfulPath application for local development.

1. Start Infrastructure (Postgres, Redis, MinIO)
// turbo
```bash
docker compose up -d
```

2. Start Backend API (NestJS)
Open a new terminal and run:
```bash
cd apps/api
npm run start:dev
```

3. Start Web Dashboard (Next.js)
Open a new terminal and run:
```bash
cd apps/web
npm run dev
```

4. Start Mobile App (Flutter)
Open a new terminal and run:
```bash
cd apps/mobile
flutter run
```
