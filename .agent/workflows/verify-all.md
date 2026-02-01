---
description: Run verification checks (Lint, Test, Build) for all apps
---

This workflow runs quality checks across the entire monorepo.

# Backend API Checks

1. Lint API
// turbo
```bash
cd apps/api && npm run lint
```

2. Test API
// turbo
```bash
cd apps/api && npm run test
```

# Web Dashboard Checks

3. Lint Web
// turbo
```bash
cd apps/web && npm run lint
```

4. Build Web (Type Check)
// turbo
```bash
cd apps/web && npm run build
```

# Mobile App Checks

5. Analyze Mobile
// turbo
```bash
cd apps/mobile && flutter analyze
```

6. Test Mobile
// turbo
```bash
cd apps/mobile && flutter test
```
