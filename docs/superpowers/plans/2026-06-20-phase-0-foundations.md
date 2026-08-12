# Phase 0 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a deployable, tested foundation: a pnpm monorepo with Prisma pointed at Supabase, the NestJS/Redis/MinIO stack retired, a Next.js API skeleton with Supabase-Auth verification + zod validation + audit logging, working web login/signup, CI, and a live Vercel preview deploy.

**Architecture:** Approach B from the design spec ([2026-06-20-architecture-redesign-design.md](../specs/2026-06-20-architecture-redesign-design.md)). One Next.js app on Vercel is both the web UI and the single backend (`/api` Route Handlers). Supabase provides Postgres + Auth (Storage/Realtime arrive in later phases). The app `User` row is keyed by the Supabase Auth user UUID and created at signup via a provision endpoint.

**Tech Stack:** pnpm workspaces, Prisma 6, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Next.js 16 (App Router, Route Handlers), TypeScript, zod, Vitest, GitHub Actions, Vercel.

**Conventions for every task:** exact paths are relative to repo root (`exhale/`). Run all `pnpm` commands from repo root unless noted. Commit messages follow Conventional Commits. Do **not** add `Co-Authored-By` lines.

---

## File Structure (decided up front)

```
exhale/
├── package.json                      # root: workspace scripts + devDeps (MODIFY/CREATE)
├── pnpm-workspace.yaml               # workspace globs (CREATE)
├── .npmrc                            # pnpm settings (CREATE)
├── .env.example                      # rewritten for Supabase (MODIFY)
├── docs/deployment.md                # deploy + env runbook (CREATE)
├── packages/
│   ├── db/                           # Prisma client + schema (CREATE; schema moved from apps/api)
│   │   ├── package.json
│   │   ├── prisma/schema.prisma
│   │   └── src/index.ts              # PrismaClient singleton + re-exports
│   └── shared-types/                 # unchanged this phase
└── apps/
    ├── web/                          # Next.js: UI + /api backend
    │   ├── vitest.config.ts          # (CREATE)
    │   ├── middleware.ts             # Supabase session refresh (CREATE)
    │   └── src/
    │       ├── lib/
    │       │   ├── env.ts            # server-only env validation (CREATE)
    │       │   ├── http.ts           # json() response helper (CREATE)
    │       │   ├── supabase/server.ts, client.ts, admin.ts  (CREATE)
    │       │   ├── auth.ts           # getAuthUser() (CREATE)
    │       │   ├── validation.ts     # zod parse helper (CREATE)
    │       │   └── audit.ts          # writeAuditLog() (CREATE)
    │       └── app/
    │           ├── api/me/route.ts                 (CREATE)
    │           ├── api/auth/provision/route.ts     (CREATE)
    │           ├── (auth)/login/page.tsx           (CREATE)
    │           ├── (auth)/signup/page.tsx          (CREATE)
    │           └── app/page.tsx                    # protected landing (CREATE)
    ├── api/                          # DELETE (NestJS retired)
    └── mobile/                       # untouched this phase (rebuilt in Phase 1)
```

Each `src/lib/*` file has one responsibility so handlers stay thin and testable.

---

## Task 1: Adopt pnpm workspace

**Files:**
- Create: `pnpm-workspace.yaml`, `.npmrc`, `package.json` (root)

- [ ] **Step 1: Create the workspace manifest**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/web"
  - "packages/*"
```

- [ ] **Step 2: Create `.npmrc`**

`.npmrc`:
```
auto-install-peers=true
strict-peer-dependencies=false
```

- [ ] **Step 3: Create the root `package.json`**

`package.json`:
```json
{
  "name": "exhale",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "dev": "pnpm --filter web dev",
    "build": "pnpm --filter web build",
    "typecheck": "pnpm -r --if-present typecheck",
    "test": "pnpm -r --if-present test",
    "db:generate": "pnpm --filter @exhale/db generate",
    "db:migrate": "pnpm --filter @exhale/db migrate"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 4: Install and verify the workspace resolves**

Run: `pnpm install`
Expected: completes without error; a root `pnpm-lock.yaml` is created and `node_modules` populated.

- [ ] **Step 5: Commit**

```bash
git add pnpm-workspace.yaml .npmrc package.json pnpm-lock.yaml
git commit -m "chore: adopt pnpm workspace"
```

---

## Task 2: Create `packages/db` with Prisma pointed at Supabase

**Files:**
- Create: `packages/db/package.json`, `packages/db/prisma/schema.prisma`, `packages/db/src/index.ts`
- Source: existing schema at `apps/api/prisma/schema.prisma` (copy then edit)

- [ ] **Step 1: Create `packages/db/package.json`**

```json
{
  "name": "@exhale/db",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "generate": "prisma generate",
    "migrate": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "validate": "prisma validate",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@prisma/client": "^6.1.0"
  },
  "devDependencies": {
    "prisma": "^6.1.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create `packages/db/prisma/schema.prisma`**

Copy the entire model set from `apps/api/prisma/schema.prisma`, with **two edits** to the top blocks and **one edit** to the `User` model. Generator and datasource:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled (PgBouncer, port 6543) for runtime
  directUrl = env("DIRECT_URL")     // direct (port 5432) for migrations
}
```

Change the `User.id` line so the id is supplied (it will equal the Supabase Auth UUID), instead of an auto-generated cuid:

```prisma
model User {
  id            String    @id            // = Supabase auth.users.id (UUID), set at provision
  // ...all other User fields and relations unchanged from the original schema...
}
```

Keep every other model, enum, relation, and index exactly as in the original file. (Messaging models are added in their own phase.)

- [ ] **Step 3: Create the Prisma singleton `packages/db/src/index.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
```

- [ ] **Step 4: Create `packages/db/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "declaration": true,
    "noEmit": true
  },
  "include": ["src", "prisma"]
}
```

- [ ] **Step 5: Install deps and generate the client**

Run:
```bash
pnpm install
pnpm --filter @exhale/db generate
```
Expected: `prisma generate` prints "Generated Prisma Client". (No DB connection needed for generate.)

- [ ] **Step 6: Validate the schema**

Run: `pnpm --filter @exhale/db validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀"

- [ ] **Step 7: Commit**

```bash
git add packages/db pnpm-lock.yaml
git commit -m "feat(db): add @exhale/db package with Prisma schema for Supabase"
```

---

## Task 3: Connect to Supabase and run the first migration

**Prereq (manual, one-time):** Create a Supabase project at https://supabase.com. From Project Settings → Database, copy the **connection pooler** URI (Transaction mode, port 6543) and the **direct** URI (port 5432). From Project Settings → API, copy the Project URL, the `anon` key, and the `service_role` key.

**Files:**
- Create: `.env` (gitignored), `packages/db/prisma/migrations/**` (generated)

- [ ] **Step 1: Create `.env` at repo root (do NOT commit)**

```bash
# Supabase Postgres
DATABASE_URL="postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:5432/postgres"
```

- [ ] **Step 2: Confirm `.env` is gitignored**

Run: `git check-ignore .env`
Expected: prints `.env`. If it prints nothing, add `.env` to `.gitignore`, then commit that change.

- [ ] **Step 3: Create the initial migration against Supabase**

Run: `pnpm --filter @exhale/db exec prisma migrate dev --name init`
Expected: Prisma connects via `DIRECT_URL`, creates all tables, and writes `packages/db/prisma/migrations/<timestamp>_init/migration.sql`. Output ends with "Your database is now in sync with your schema."

- [ ] **Step 4: Verify tables exist**

Run: `pnpm --filter @exhale/db exec prisma db pull --print`
Expected: the printed schema includes `User`, `PatientProfile`, `TherapistProfile`, `MoodEntry`, `Session`, `AuditLog`, etc.

- [ ] **Step 5: Commit the migration**

```bash
git add packages/db/prisma/migrations
git commit -m "feat(db): initial migration against Supabase Postgres"
```

---

## Task 4: Retire NestJS, Redis, and MinIO

**Files:**
- Delete: `apps/api/`, `docker-compose.yml`
- Modify: `.env.example`, `README.md`

- [ ] **Step 1: Delete the NestJS app and docker-compose**

Run:
```bash
git rm -r apps/api docker-compose.yml
```

- [ ] **Step 2: Rewrite `.env.example`**

Replace the entire contents of `.env.example` with:
```bash
# ===================================
# Exhale Environment Variables
# Copy to .env and fill in values from your Supabase project.
# ===================================

# Supabase Postgres (Project Settings -> Database)
DATABASE_URL="postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:5432/postgres"

# Supabase API (Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"   # server-only, never exposed to the client
```

- [ ] **Step 3: Update `README.md` Quick Start and Tech Stack**

In `README.md`, replace the "Local Development" code block with:
```bash
git clone https://github.com/UYildiz12/exhale.git
cd exhale
cp .env.example .env          # fill in Supabase values
pnpm install
pnpm --filter @exhale/db migrate   # apply migrations
pnpm dev                      # Next.js app (web + API) on http://localhost:3000
```
In the same file, update the Tech Stack table: change Backend to `Next.js Route Handlers, Prisma, Supabase (Postgres/Auth/Storage/Realtime)`, and remove the Redis/MinIO row. Update Project Structure to drop `apps/api` and add `packages/db`.

- [ ] **Step 4: Verify nothing references the deleted app**

Run: `git grep -n "apps/api" -- . ':!docs'`
Expected: no results (docs may still reference history; that's fine).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: retire NestJS API, Redis, and MinIO in favor of Supabase"
```

---

## Task 5: Add Vitest to the web app

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/vitest.config.ts`, `apps/web/src/lib/__tests__/smoke.test.ts`

- [ ] **Step 1: Add test deps and scripts to `apps/web/package.json`**

Add to `devDependencies`: `"vitest": "^2.1.0"`, `"@vitejs/plugin-react": "^4.3.0"`, `"vite-tsconfig-paths": "^5.1.0"`. Add to `scripts`: `"test": "vitest run"`, `"test:watch": "vitest"`, `"typecheck": "tsc --noEmit"`.

- [ ] **Step 2: Create `apps/web/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    clearMocks: true,
  },
});
```

- [ ] **Step 3: Write a smoke test (TDD harness check)**

`apps/web/src/lib/__tests__/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("vitest harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run it**

Run: `pnpm --filter web test`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts apps/web/src/lib/__tests__/smoke.test.ts pnpm-lock.yaml
git commit -m "test(web): add vitest harness"
```

---

## Task 6: Supabase client helpers + env validation

**Files:**
- Modify: `apps/web/package.json` (add deps), add `@exhale/db` dependency
- Create: `apps/web/src/lib/env.ts`, `apps/web/src/lib/http.ts`, `apps/web/src/lib/supabase/{admin,server,client}.ts`
- Test: `apps/web/src/lib/__tests__/env.test.ts`

- [ ] **Step 1: Add dependencies to `apps/web/package.json`**

Add to `dependencies`: `"@supabase/supabase-js": "^2.45.0"`, `"@supabase/ssr": "^0.5.0"`, `"@exhale/db": "workspace:*"`. Then run `pnpm install`.

- [ ] **Step 2: Write the failing env test**

`apps/web/src/lib/__tests__/env.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const VALID = {
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  DATABASE_URL: "postgresql://x",
  DIRECT_URL: "postgresql://x",
};

describe("serverEnv", () => {
  const original = { ...process.env };
  beforeEach(() => { Object.assign(process.env, VALID); });
  afterEach(() => { process.env = { ...original }; });

  it("parses a valid environment", async () => {
    const { serverEnv } = await import("../env");
    expect(serverEnv().SUPABASE_SERVICE_ROLE_KEY).toBe("service");
  });

  it("throws when a required var is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { serverEnv } = await import("../env");
    expect(() => serverEnv()).toThrow();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm --filter web test src/lib/__tests__/env.test.ts`
Expected: FAIL — cannot find module `../env`.

- [ ] **Step 4: Implement `apps/web/src/lib/env.ts`**

```ts
import "server-only";
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
});

export function serverEnv() {
  return schema.parse(process.env);
}
```

Note: `zod` is already a dependency of `apps/web`. If the `server-only` import breaks Vitest (it targets the Next runtime), add `"server-only"` to `test.server.deps.inline` in `vitest.config.ts`, or alias it to an empty module — but try without first.

- [ ] **Step 5: Run it to verify it passes**

Run: `pnpm --filter web test src/lib/__tests__/env.test.ts`
Expected: 2 passed.

- [ ] **Step 6: Create the response helper `apps/web/src/lib/http.ts`**

```ts
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
```

- [ ] **Step 7: Create the admin client `apps/web/src/lib/supabase/admin.ts`**

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "../env";

export function supabaseAdmin() {
  const env = serverEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

- [ ] **Step 8: Create the SSR server client `apps/web/src/lib/supabase/server.ts`**

```ts
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverEnv } from "../env";

export async function createSupabaseServerClient() {
  const env = serverEnv();
  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component; middleware refreshes the session instead
          }
        },
      },
    },
  );
}
```

- [ ] **Step 9: Create the browser client `apps/web/src/lib/supabase/client.ts`**

```ts
"use client";
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 10: Typecheck + commit**

Run: `pnpm --filter web typecheck`
Expected: no errors.
```bash
git add apps/web/package.json apps/web/src/lib pnpm-lock.yaml
git commit -m "feat(web): add supabase clients, env validation, and http helper"
```

---

## Task 7: Auth helper `getAuthUser`

**Files:**
- Create: `apps/web/src/lib/auth.ts`
- Test: `apps/web/src/lib/__tests__/auth.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/web/src/lib/__tests__/auth.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
vi.mock("../supabase/admin", () => ({
  supabaseAdmin: () => ({ auth: { getUser } }),
}));
vi.mock("../supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser } }),
}));

describe("getAuthUser", () => {
  beforeEach(() => getUser.mockReset());

  it("returns null when there is no bearer token and no cookie session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("no session") });
    const { getAuthUser } = await import("../auth");
    const req = new Request("http://t/api/me");
    expect(await getAuthUser(req)).toBeNull();
  });

  it("returns the user from a valid bearer token", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "uid-1", email: "a@b.co" } }, error: null });
    const { getAuthUser } = await import("../auth");
    const req = new Request("http://t/api/me", { headers: { authorization: "Bearer tok" } });
    expect(await getAuthUser(req)).toEqual({ authId: "uid-1", email: "a@b.co" });
    expect(getUser).toHaveBeenCalledWith("tok");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter web test src/lib/__tests__/auth.test.ts`
Expected: FAIL — cannot find module `../auth`.

- [ ] **Step 3: Implement `apps/web/src/lib/auth.ts`**

```ts
import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { createSupabaseServerClient } from "./supabase/server";

export interface AuthUser {
  authId: string;
  email: string;
}

export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization");

  // Mobile / API clients: bearer token
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    const { data, error } = await supabaseAdmin().auth.getUser(token);
    if (error || !data.user?.email) return null;
    return { authId: data.user.id, email: data.user.email };
  }

  // Web client: cookie session
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  return { authId: data.user.id, email: data.user.email };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm --filter web test src/lib/__tests__/auth.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auth.ts apps/web/src/lib/__tests__/auth.test.ts
git commit -m "feat(web): add getAuthUser supporting bearer and cookie sessions"
```

---

## Task 8: Validation + audit helpers

**Files:**
- Create: `apps/web/src/lib/validation.ts`, `apps/web/src/lib/audit.ts`
- Test: `apps/web/src/lib/__tests__/validation.test.ts`

- [ ] **Step 1: Write the failing validation test**

`apps/web/src/lib/__tests__/validation.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseBody } from "../validation";

describe("parseBody", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("returns parsed data on success", async () => {
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ name: "x" }) });
    const result = await parseBody(req, schema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.name).toBe("x");
  });

  it("returns a 400 response on invalid input", async () => {
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ name: "" }) });
    const result = await parseBody(req, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("returns a 400 response on malformed JSON", async () => {
    const req = new Request("http://t", { method: "POST", body: "{not json" });
    const result = await parseBody(req, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter web test src/lib/__tests__/validation.test.ts`
Expected: FAIL — cannot find module `../validation`.

- [ ] **Step 3: Implement `apps/web/src/lib/validation.ts`**

```ts
import type { z } from "zod";
import { json } from "./http";

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

export async function parseBody<T>(
  req: Request,
  schema: z.ZodSchema<T>,
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: json({ error: "Invalid JSON body" }, 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: json({ error: "Validation failed", issues: parsed.error.issues }, 400),
    };
  }
  return { ok: true, data: parsed.data };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm --filter web test src/lib/__tests__/validation.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Implement `apps/web/src/lib/audit.ts`**

```ts
import "server-only";
import { prisma } from "@exhale/db";

export interface AuditEntry {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      metadata: entry.metadata ?? undefined,
      ipAddress: entry.ipAddress ?? undefined,
      userAgent: entry.userAgent ?? undefined,
    },
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/validation.ts apps/web/src/lib/audit.ts apps/web/src/lib/__tests__/validation.test.ts
git commit -m "feat(web): add zod parseBody and audit log helpers"
```

---

## Task 9: `/api/auth/provision` and `/api/me` route handlers

**Files:**
- Create: `apps/web/src/app/api/auth/provision/route.ts`, `apps/web/src/app/api/me/route.ts`
- Test: `apps/web/src/app/api/__tests__/me.test.ts`, `apps/web/src/app/api/__tests__/provision.test.ts`

- [ ] **Step 1: Write the failing test for `/api/me`**

`apps/web/src/app/api/__tests__/me.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getAuthUser = vi.fn();
const findUnique = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@exhale/db", () => ({ prisma: { user: { findUnique } } }));

describe("GET /api/me", () => {
  beforeEach(() => { getAuthUser.mockReset(); findUnique.mockReset(); });

  it("401 when unauthenticated", async () => {
    getAuthUser.mockResolvedValue(null);
    const { GET } = await import("../me/route");
    const res = await GET(new Request("http://t/api/me"));
    expect(res.status).toBe(401);
  });

  it("404 when authenticated but not provisioned", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue(null);
    const { GET } = await import("../me/route");
    const res = await GET(new Request("http://t/api/me"));
    expect(res.status).toBe(404);
  });

  it("200 with the user when provisioned", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue({ id: "uid-1", email: "a@b.co", role: "PATIENT" });
    const { GET } = await import("../me/route");
    const res = await GET(new Request("http://t/api/me"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("uid-1");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter web test src/app/api/__tests__/me.test.ts`
Expected: FAIL — cannot find module `../me/route`.

- [ ] **Step 3: Implement `apps/web/src/app/api/me/route.ts`**

```ts
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@exhale/db";
import { json } from "@/lib/http";

export async function GET(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const user = await prisma.user.findUnique({
    where: { id: auth.authId },
    include: { therapistProfile: true, patientProfile: true },
  });
  if (!user) return json({ error: "Not provisioned" }, 404);

  return json({ data: user }, 200);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm --filter web test src/app/api/__tests__/me.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Write the failing test for `/api/auth/provision`**

`apps/web/src/app/api/__tests__/provision.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getAuthUser = vi.fn();
const upsert = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@exhale/db", () => ({ prisma: { user: { upsert } } }));
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));

function post(body: unknown) {
  return new Request("http://t/api/auth/provision", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/provision", () => {
  beforeEach(() => { getAuthUser.mockReset(); upsert.mockReset(); });

  it("401 when unauthenticated", async () => {
    getAuthUser.mockResolvedValue(null);
    const { POST } = await import("../auth/provision/route");
    expect((await POST(post({ firstName: "A", lastName: "B", role: "PATIENT" }))).status).toBe(401);
  });

  it("400 on invalid role", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    const { POST } = await import("../auth/provision/route");
    expect((await POST(post({ firstName: "A", lastName: "B", role: "WIZARD" }))).status).toBe(400);
  });

  it("201 and creates the user + profile", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    upsert.mockResolvedValue({ id: "uid-1", email: "a@b.co", role: "PATIENT" });
    const { POST } = await import("../auth/provision/route");
    const res = await POST(post({ firstName: "A", lastName: "B", role: "PATIENT" }));
    expect(res.status).toBe(201);
    expect(upsert).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm --filter web test src/app/api/__tests__/provision.test.ts`
Expected: FAIL — cannot find module `../auth/provision/route`.

- [ ] **Step 7: Implement `apps/web/src/app/api/auth/provision/route.ts`**

```ts
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@exhale/db";
import { parseBody } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { json } from "@/lib/http";

const ProvisionBody = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["PATIENT", "THERAPIST"]),
});

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const parsed = await parseBody(req, ProvisionBody);
  if (!parsed.ok) return parsed.response;
  const { firstName, lastName, role } = parsed.data;

  const user = await prisma.user.upsert({
    where: { id: auth.authId },
    update: {},
    create: {
      id: auth.authId,
      email: auth.email,
      firstName,
      lastName,
      role,
      ...(role === "THERAPIST"
        ? { therapistProfile: { create: {} } }
        : { patientProfile: { create: {} } }),
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "PROVISION_USER",
    resourceType: "User",
    resourceId: user.id,
  });

  return json({ data: user }, 201);
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `pnpm --filter web test src/app/api/__tests__/provision.test.ts`
Expected: 3 passed.

- [ ] **Step 9: Add the `@/` path alias if missing**

Confirm `apps/web/tsconfig.json` has `"paths": { "@/*": ["./src/*"] }` under `compilerOptions`. If absent, add it. Re-run `pnpm --filter web typecheck` (expected: no errors) and `pnpm --filter web test` (expected: all green).

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/app/api apps/web/tsconfig.json
git commit -m "feat(api): add /api/me and /api/auth/provision route handlers"
```

---

## Task 10: Web auth — middleware, login, signup, protected page

**Files:**
- Create: `apps/web/middleware.ts`, `apps/web/src/lib/supabase/middleware.ts`, `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/app/(auth)/signup/page.tsx`, `apps/web/src/app/app/page.tsx`
- Test: `apps/web/src/lib/__tests__/provision-client.test.ts`

- [ ] **Step 1: Create the session-refresh helper `apps/web/src/lib/supabase/middleware.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser(); // refreshes the session cookie if needed
  return response;
}
```

- [ ] **Step 2: Create `apps/web/middleware.ts`**

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 3: Write a failing test for the provision client wrapper**

`apps/web/src/lib/__tests__/provision-client.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { provisionUser } from "../provision-client";

describe("provisionUser", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("POSTs to /api/auth/provision with the bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "uid-1" } }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const out = await provisionUser("tok", { firstName: "A", lastName: "B", role: "PATIENT" });

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/provision", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ authorization: "Bearer tok" }),
    }));
    expect(out.id).toBe("uid-1");
  });

  it("throws on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 400 })));
    await expect(provisionUser("tok", { firstName: "A", lastName: "B", role: "PATIENT" })).rejects.toThrow();
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `pnpm --filter web test src/lib/__tests__/provision-client.test.ts`
Expected: FAIL — cannot find module `../provision-client`.

- [ ] **Step 5: Implement `apps/web/src/lib/provision-client.ts`**

```ts
export interface ProvisionInput {
  firstName: string;
  lastName: string;
  role: "PATIENT" | "THERAPIST";
}

export async function provisionUser(accessToken: string, input: ProvisionInput) {
  const res = await fetch("/api/auth/provision", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Provision failed: ${res.status}`);
  const body = await res.json();
  return body.data as { id: string };
}
```

- [ ] **Step 6: Run it to verify it passes**

Run: `pnpm --filter web test src/lib/__tests__/provision-client.test.ts`
Expected: 2 passed.

- [ ] **Step 7: Implement the signup page `apps/web/src/app/(auth)/signup/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { provisionUser } from "@/lib/provision-client";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", role: "PATIENT" as "PATIENT" | "THERAPIST" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: signErr } = await supabase.auth.signUp({ email: form.email, password: form.password });
    if (signErr) { setError(signErr.message); setLoading(false); return; }
    const token = data.session?.access_token;
    if (!token) { setError("Check your email to confirm, then log in."); setLoading(false); return; }
    try {
      await provisionUser(token, { firstName: form.firstName, lastName: form.lastName, role: form.role });
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provisioning failed");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 360, margin: "4rem auto", display: "grid", gap: 12 }}>
      <h1>Create your account</h1>
      <input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
      <input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
      <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "PATIENT" | "THERAPIST" })}>
        <option value="PATIENT">Patient</option>
        <option value="THERAPIST">Therapist</option>
      </select>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <button disabled={loading} type="submit">{loading ? "Creating…" : "Sign up"}</button>
    </form>
  );
}
```

- [ ] **Step 8: Implement the login page `apps/web/src/app/(auth)/login/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signErr) { setError(signErr.message); setLoading(false); return; }
    router.push("/app");
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 360, margin: "4rem auto", display: "grid", gap: 12 }}>
      <h1>Log in</h1>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <button disabled={loading} type="submit">{loading ? "Signing in…" : "Log in"}</button>
    </form>
  );
}
```

- [ ] **Step 9: Implement the protected page `apps/web/src/app/app/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@exhale/db";

export default async function AppHome() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: data.user.id } });
  if (!user) redirect("/signup");

  return (
    <main style={{ maxWidth: 640, margin: "4rem auto" }}>
      <h1>Welcome, {user.firstName}</h1>
      <p>You are signed in as a {user.role.toLowerCase()}.</p>
    </main>
  );
}
```

- [ ] **Step 10: Manual end-to-end verification**

Run: `pnpm dev` (ensure `.env` is filled). Then:
1. Visit `http://localhost:3000/signup`, create a patient account.
   - Expected: redirect to `/app` showing "Welcome, <name>". (If email confirmation is on in Supabase, you'll see the "check your email" message — disable "Confirm email" in Supabase Auth settings for local dev, or confirm then log in.)
2. Visit `http://localhost:3000/app` in a fresh private window → redirected to `/login`.
3. Log in → lands on `/app`.
4. In Supabase Table Editor, confirm a `User` row (id = auth uid) and a `PatientProfile` row exist, plus an `AuditLog` row with action `PROVISION_USER`.

- [ ] **Step 11: Run the full test suite + typecheck**

Run: `pnpm --filter web test && pnpm --filter web typecheck`
Expected: all tests pass, no type errors.

- [ ] **Step 12: Commit**

```bash
git add apps/web/middleware.ts apps/web/src/lib apps/web/src/app
git commit -m "feat(web): supabase auth — middleware, signup, login, protected app page"
```

---

## Task 11: Replace CI workflow

**Files:**
- Modify (replace): `.github/workflows/ci.yml`

- [ ] **Step 1: Replace `.github/workflows/ci.yml` entirely**

```yaml
name: CI

on:
  push:
    branches: [master, main, architecture-redesign]
  pull_request:

jobs:
  web:
    name: Web + API — typecheck & test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma client
        run: pnpm --filter @exhale/db generate

      - name: Validate Prisma schema
        run: pnpm --filter @exhale/db validate

      - name: Typecheck
        run: pnpm --filter web typecheck

      - name: Test
        run: pnpm --filter web test
```

Note: tests mock `@exhale/db` and Supabase, so CI needs **no** database or secrets. The Flutter job returns in the Phase 1 mobile plan.

- [ ] **Step 2: Verify the workflow file is valid YAML locally**

Run: `pnpm dlx js-yaml .github/workflows/ci.yml > /dev/null && echo OK`
Expected: `OK`.

- [ ] **Step 3: Commit and push to trigger CI**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: replace multi-app pipeline with pnpm typecheck + vitest"
git push -u origin architecture-redesign
```
Expected: the `web` job runs on GitHub and passes. Fix any failures before continuing.

---

## Task 12: Deployment config + runbook

**Files:**
- Create: `apps/web/vercel.json`, `docs/deployment.md`

- [ ] **Step 1: Create `apps/web/vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd ../.. && pnpm --filter @exhale/db generate && pnpm --filter web build",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "framework": "nextjs"
}
```

- [ ] **Step 2: Create `docs/deployment.md`**

```markdown
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
```

- [ ] **Step 3: Connect Vercel and verify a preview deploy**

In the Vercel dashboard, import the repo with Root Directory `apps/web`, add the env vars from Step 2, and trigger a deploy of the `architecture-redesign` branch.
Expected: build succeeds; the preview URL serves the landing page, `/signup` and `/login` work, and `/app` redirects to `/login` when logged out.

- [ ] **Step 4: Commit**

```bash
git add apps/web/vercel.json docs/deployment.md
git commit -m "chore: add vercel config and deployment runbook"
```

---

## Definition of Done (Phase 0)

- `pnpm install && pnpm --filter web test && pnpm --filter web typecheck` all pass locally.
- CI is green on the branch.
- A real Supabase project holds the migrated schema.
- A user can sign up (web), get a provisioned `User` + profile row, log in, reach `/app`, and be redirected to `/login` when logged out.
- An `AuditLog` row is written on provision.
- A Vercel preview deploy of the branch is live.
- `apps/api`, Redis, and MinIO are gone; `.env.example` and `README` reflect the Supabase stack.

---

## Self-Review

**Spec coverage (Phase 0 lines of the design spec):**
- Supabase project + schema migrated → Tasks 2, 3.
- Pooled + direct connections → Task 2 (datasource), Task 3 (env).
- Supabase Auth wired into web → Tasks 6–10. (Mobile auth deferred to the Phase 1 mobile plan — noted; Phase 0 validates the cross-client API via bearer-token tests in Tasks 7 & 9.)
- API skeleton: JWT verification + zod + audit → Tasks 7, 8, 9.
- Retire NestJS/Redis/MinIO → Task 4.
- CI + preview deploys → Tasks 11, 12.

**Placeholder scan:** No TBD/TODO; all steps contain concrete code or exact commands. Manual-only steps (Supabase project creation, Vercel import) are external actions with explicit expected outcomes.

**Type consistency:** `getAuthUser` returns `{ authId, email }` and is consumed with those names in Tasks 9 & 10. `parseBody` returns the `{ ok, data | response }` discriminated union used in Task 9. `provisionUser(accessToken, input)` signature matches its test and the signup page call. `prisma.user.upsert`/`findUnique` mocks match the handler calls. `json(body, status)` signature is consistent across all handlers.

**Known assumptions:** library versions are pinned to current-stable majors; if `@supabase/ssr` cookie API differs at install time, follow its README for `getAll`/`setAll`. The `server-only` import may need Vitest inlining (noted in Task 6, Step 4).
