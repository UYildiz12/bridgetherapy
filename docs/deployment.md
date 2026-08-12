# Deployment Runbook

## Supabase (one-time)
1. Create a project at supabase.com.
2. Project Settings → Database: copy the pooler URI (port 6543) → `DATABASE_URL`
   (append `?pgbouncer=true&connection_limit=1`); copy the direct URI (5432) → `DIRECT_URL`.
3. Project Settings → API: copy Project URL, `anon` key, `service_role` key.
4. Apply migrations from your machine: `pnpm --filter @exhale/db migrate:deploy`.

## Vercel
1. New Project → import the repo. Set the **Root Directory** to `apps/web`.
2. Add Environment Variables (Production + Preview):
   - `DATABASE_URL`, `DIRECT_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy. Every PR gets a preview URL; `master`/`main` deploys production.

## Migrations in CI/CD
Run `pnpm --filter @exhale/db migrate:deploy` against `DIRECT_URL` as a release step
(locally or a dedicated GitHub Action) — not during the Vercel build.
