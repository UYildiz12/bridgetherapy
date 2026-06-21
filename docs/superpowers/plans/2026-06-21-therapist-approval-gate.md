# Therapist Pending-Approval Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the self-assignable `THERAPIST` role harmless by putting every new therapist into a pending state that grants no therapist functionality until an admin approves them via a CLI.

**Architecture:** Keep trusting the client-sent role at signup, but add an `approvedAt` flag on `TherapistProfile` that the client cannot set. A reusable server-side guard (`requireApprovedTherapist`) is the gate every future therapist route calls; a tested `approveTherapist(email)` helper + `tsx` CLI flips the flag. The signup page moves onto the existing `auth-card`/`auth-segment` design system with a verification warning and prominent Exhale branding.

**Tech Stack:** Next.js 16 (App Router), Prisma 6 + Postgres (Supabase), Supabase Auth, Vitest (node env, mocked `@exhale/db`/`@/lib/auth`/`@/lib/audit`), pnpm workspaces, `tsx` for the CLI.

---

## Preconditions (READ FIRST)

- **Branch:** `architecture-redesign`. Work here.
- **Dirty working tree — do NOT use `git add -a` / `git commit -a`.** The tree already contains unrelated, uncommitted **PWA work**: modified `apps/web/src/app/layout.tsx`, a `sharp` devDependency in root `package.json` + its `pnpm-lock.yaml` entries, and untracked `apps/web/public/sw.js`, `apps/web/src/app/manifest.ts`, `apps/web/src/components/pwa/`, `apps/web/public/icons/`, `scripts/`, `Scaleresults/`. Every task below stages **explicit paths only**.
- **Lockfile caution (Task 4):** adding `tsx`/`dotenv-cli` re-resolves `pnpm-lock.yaml`, which already carries the unrelated `sharp` change. When committing Task 4, the lockfile diff will include `sharp`. Pause at that checkpoint and confirm with the user (or land the PWA work first) before committing `pnpm-lock.yaml`.
- **DB access:** Task 1 applies a Prisma migration, which needs the Supabase dev DB (`DATABASE_URL`/`DIRECT_URL` in root `.env`). If the DB is unreachable in this session, follow the fallback in Task 1 so types/tests still proceed, and apply the migration before any deploy.
- **Commits:** conventional style (`feat:`/`test:`/`docs:`). Do **not** add `Co-Authored-By` trailers (user preference).

## File Structure

**Create:**
- `apps/web/src/lib/authz.ts` — `requireApprovedTherapist(req)`: the server-side approval gate. One responsibility: authorize an approved therapist or return the rejecting `Response`.
- `apps/web/src/lib/__tests__/authz.test.ts` — guard tests.
- `apps/web/src/lib/approve-therapist.ts` — `approveTherapist(email)`: the privileged approval mutation + audit log.
- `apps/web/src/lib/__tests__/approve-therapist.test.ts` — helper tests.
- `apps/web/src/scripts/approve-therapist.ts` — thin CLI wrapper over the helper.
- `docs/runbooks/approving-therapists.md` — operator runbook.

**Modify:**
- `packages/db/prisma/schema.prisma` — add `approvedAt DateTime?` to `TherapistProfile` (+ migration).
- `apps/web/src/app/api/auth/provision/route.ts` — clarifying comment only; behavior already creates pending therapists.
- `apps/web/src/app/api/__tests__/provision.test.ts` — add a regression guard that a registered therapist is pending.
- `apps/web/src/app/app/page.tsx` — pending-approval screen for unapproved therapists.
- `apps/web/src/app/(auth)/signup/page.tsx` — redesign onto `auth-card` + `auth-segment` + warning + Exhale brand + `?role=` deep-link.
- `apps/web/src/app/(auth)/auth.css` — add `.auth-brand`, `.auth-warning`.
- `apps/web/package.json` — add `tsx` + `dotenv-cli` devDeps and `db:approve` script.

---

## Task 1: Add `approvedAt` to the data model

**Files:**
- Modify: `packages/db/prisma/schema.prisma` (the `TherapistProfile` model)
- Create (via Prisma): `packages/db/prisma/migrations/<timestamp>_add_therapist_approval/migration.sql`

- [ ] **Step 1: Add the field to `TherapistProfile`**

In `packages/db/prisma/schema.prisma`, add the `approvedAt` line to the `TherapistProfile` model (place it just under `bio`):

```prisma
model TherapistProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  licenseNumber String?
  specialty     String?
  bio           String?
  approvedAt    DateTime? // null = pending admin approval; set = approved & active

  // Relationships
  patients      PatientTherapist[]
  createdHomework Homework[]
  sessionNotes  SessionNote[]
}
```

- [ ] **Step 2: Create + apply the migration and regenerate the client**

Run: `pnpm --filter @exhale/db migrate -- --name add_therapist_approval`
Expected: Prisma creates `packages/db/prisma/migrations/<timestamp>_add_therapist_approval/migration.sql`, applies it, and regenerates the client. The SQL should be exactly:

```sql
-- AlterTable
ALTER TABLE "TherapistProfile" ADD COLUMN "approvedAt" TIMESTAMP(3);
```

**Fallback if the dev DB is unreachable this session:** run `pnpm --filter @exhale/db generate` instead (regenerates the client types offline so the rest of the plan typechecks and tests pass), and create+apply the migration above before deploying.

- [ ] **Step 3: Verify the generated client knows the field**

Run: `pnpm --filter @exhale/db typecheck`
Expected: PASS (no type errors).

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations
git commit -m "feat(db): add approvedAt to TherapistProfile for pending-approval gate"
```

(If you used the fallback and no migration dir exists yet, stage only `packages/db/prisma/schema.prisma`.)

---

## Task 2: `requireApprovedTherapist` authorization guard (TDD)

**Files:**
- Create: `apps/web/src/lib/authz.ts`
- Test: `apps/web/src/lib/__tests__/authz.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/web/src/lib/__tests__/authz.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getAuthUser = vi.fn();
const findUnique = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@exhale/db", () => ({ prisma: { user: { findUnique } } }));

function req() {
  return new Request("http://t/api/therapist/whatever");
}

async function load() {
  return (await import("../authz")).requireApprovedTherapist;
}

describe("requireApprovedTherapist", () => {
  beforeEach(() => { getAuthUser.mockReset(); findUnique.mockReset(); });

  it("401 when unauthenticated", async () => {
    getAuthUser.mockResolvedValue(null);
    const guard = await load();
    const result = await guard(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("404 when authenticated but not provisioned", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue(null);
    const guard = await load();
    const result = await guard(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(404);
  });

  it("403 when the user is not a therapist", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue({ id: "uid-1", email: "a@b.co", role: "PATIENT", therapistProfile: null });
    const guard = await load();
    const result = await guard(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("403 when the therapist is pending (approvedAt null)", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue({
      id: "uid-1", email: "a@b.co", role: "THERAPIST",
      therapistProfile: { id: "tp-1", approvedAt: null },
    });
    const guard = await load();
    const result = await guard(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("ok with the user when the therapist is approved", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue({
      id: "uid-1", email: "a@b.co", role: "THERAPIST",
      therapistProfile: { id: "tp-1", approvedAt: new Date("2026-01-01") },
    });
    const guard = await load();
    const result = await guard(req());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.id).toBe("uid-1");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test src/lib/__tests__/authz.test.ts`
Expected: FAIL — cannot find module `../authz`.

- [ ] **Step 3: Implement the guard**

`apps/web/src/lib/authz.ts`:

```ts
import "server-only";
import { getAuthUser } from "./auth";
import { json } from "./http";
import { prisma } from "@exhale/db";
import type { Prisma } from "@exhale/db";

const therapistSelect = {
  id: true,
  email: true,
  role: true,
  therapistProfile: { select: { id: true, approvedAt: true } },
} satisfies Prisma.UserSelect;

export type RequireTherapistResult =
  | { ok: true; user: Prisma.UserGetPayload<{ select: typeof therapistSelect }> }
  | { ok: false; response: Response };

/**
 * The therapist authorization gate. The THERAPIST role is self-assignable at
 * signup and therefore grants nothing on its own — every therapist-only route
 * MUST call this so access depends on `approvedAt`, which only an admin can set.
 */
export async function requireApprovedTherapist(req: Request): Promise<RequireTherapistResult> {
  const auth = await getAuthUser(req);
  if (!auth) return { ok: false, response: json({ error: "Unauthorized" }, 401) };

  const user = await prisma.user.findUnique({
    where: { id: auth.authId },
    select: therapistSelect,
  });
  if (!user) return { ok: false, response: json({ error: "Not provisioned" }, 404) };
  if (user.role !== "THERAPIST") return { ok: false, response: json({ error: "Forbidden" }, 403) };
  if (!user.therapistProfile?.approvedAt) {
    return { ok: false, response: json({ error: "Therapist account pending approval" }, 403) };
  }

  return { ok: true, user };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test src/lib/__tests__/authz.test.ts`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/authz.ts apps/web/src/lib/__tests__/authz.test.ts
git commit -m "feat(web): add requireApprovedTherapist authorization gate"
```

---

## Task 3: `approveTherapist` helper (TDD)

**Files:**
- Create: `apps/web/src/lib/approve-therapist.ts`
- Test: `apps/web/src/lib/__tests__/approve-therapist.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/web/src/lib/__tests__/approve-therapist.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const update = vi.fn();
const writeAuditLog = vi.fn();
vi.mock("@exhale/db", () => ({
  prisma: { user: { findUnique }, therapistProfile: { update } },
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog }));

async function load() {
  const mod = await import("../approve-therapist");
  return mod;
}

describe("approveTherapist", () => {
  beforeEach(() => { findUnique.mockReset(); update.mockReset(); writeAuditLog.mockReset(); });

  it("throws when no user has that email", async () => {
    findUnique.mockResolvedValue(null);
    const { approveTherapist, TherapistApprovalError } = await load();
    await expect(approveTherapist("ghost@b.co")).rejects.toBeInstanceOf(TherapistApprovalError);
    expect(update).not.toHaveBeenCalled();
  });

  it("throws when the user is not a therapist", async () => {
    findUnique.mockResolvedValue({ id: "u1", email: "p@b.co", role: "PATIENT", therapistProfile: null });
    const { approveTherapist, TherapistApprovalError } = await load();
    await expect(approveTherapist("p@b.co")).rejects.toBeInstanceOf(TherapistApprovalError);
    expect(update).not.toHaveBeenCalled();
  });

  it("is idempotent when already approved (no write, no audit)", async () => {
    findUnique.mockResolvedValue({
      id: "u1", email: "t@b.co", role: "THERAPIST",
      therapistProfile: { id: "tp1", approvedAt: new Date("2026-01-01") },
    });
    const { approveTherapist } = await load();
    const result = await approveTherapist("t@b.co");
    expect(result.status).toBe("already-approved");
    expect(update).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("approves a pending therapist: sets approvedAt + writes audit", async () => {
    findUnique.mockResolvedValue({
      id: "u1", email: "t@b.co", role: "THERAPIST",
      therapistProfile: { id: "tp1", approvedAt: null },
    });
    update.mockResolvedValue({ id: "tp1" });
    const { approveTherapist } = await load();
    const result = await approveTherapist("t@b.co");

    expect(result.status).toBe("approved");
    expect(result.userId).toBe("u1");
    expect(update).toHaveBeenCalledOnce();
    const updateArg = update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: "tp1" });
    expect(updateArg.data.approvedAt).toBeInstanceOf(Date);

    expect(writeAuditLog).toHaveBeenCalledOnce();
    const auditArg = writeAuditLog.mock.calls[0][0];
    expect(auditArg.action).toBe("APPROVE_THERAPIST");
    expect(auditArg.userId).toBe("u1");
    expect(auditArg.resourceId).toBe("tp1");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test src/lib/__tests__/approve-therapist.test.ts`
Expected: FAIL — cannot find module `../approve-therapist`.

- [ ] **Step 3: Implement the helper**

`apps/web/src/lib/approve-therapist.ts`:

```ts
import "server-only";
import { prisma } from "@exhale/db";
import { writeAuditLog } from "./audit";

/** Thrown for operator-correctable problems (unknown email, not a therapist). */
export class TherapistApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TherapistApprovalError";
  }
}

export interface ApproveResult {
  status: "approved" | "already-approved";
  userId: string;
  email: string;
}

/**
 * Approve a therapist by email: sets TherapistProfile.approvedAt and writes an
 * APPROVE_THERAPIST audit log. Idempotent — re-approving an approved therapist
 * is a no-op. This is the seam a future admin UI/route reuses.
 */
export async function approveTherapist(email: string): Promise<ApproveResult> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      therapistProfile: { select: { id: true, approvedAt: true } },
    },
  });

  if (!user) throw new TherapistApprovalError(`No user found with email ${email}`);
  if (user.role !== "THERAPIST") {
    throw new TherapistApprovalError(`${email} is not a therapist (role: ${user.role})`);
  }
  if (!user.therapistProfile) {
    throw new TherapistApprovalError(`${email} has no therapist profile`);
  }
  if (user.therapistProfile.approvedAt) {
    return { status: "already-approved", userId: user.id, email: user.email };
  }

  await prisma.therapistProfile.update({
    where: { id: user.therapistProfile.id },
    data: { approvedAt: new Date() },
  });

  await writeAuditLog({
    userId: user.id,
    action: "APPROVE_THERAPIST",
    resourceType: "TherapistProfile",
    resourceId: user.therapistProfile.id,
    metadata: { via: "cli" },
  });

  return { status: "approved", userId: user.id, email: user.email };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test src/lib/__tests__/approve-therapist.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/approve-therapist.ts apps/web/src/lib/__tests__/approve-therapist.test.ts
git commit -m "feat(web): add approveTherapist helper with audit logging"
```

---

## Task 4: Approval CLI + package wiring

**Files:**
- Create: `apps/web/src/scripts/approve-therapist.ts`
- Modify: `apps/web/package.json` (devDeps + script)
- Modify (re-resolved): `pnpm-lock.yaml`

> **Lockfile checkpoint:** see Preconditions. The `pnpm-lock.yaml` diff here will also contain the pre-existing `sharp` (PWA) entry. Confirm with the user before committing the lockfile.

- [ ] **Step 1: Add devDependencies + script to `apps/web/package.json`**

Add `tsx` and `dotenv-cli` to `devDependencies`, and a `db:approve` script. The relevant edited regions:

```jsonc
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "db:approve": "dotenv -e ../../.env -- tsx src/scripts/approve-therapist.ts"
  },
```

```jsonc
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^4.3.0",
    "dotenv-cli": "^11.0.0",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "tsx": "^4.19.0",
    "tw-animate-css": "^1.4.0",
    "typescript": "^5",
    "vite-tsconfig-paths": "^5.1.0",
    "vitest": "^2.1.0"
  }
```

- [ ] **Step 2: Install**

Run: `pnpm install`
Expected: resolves `tsx` and `dotenv-cli` into `apps/web`; updates `pnpm-lock.yaml`.

- [ ] **Step 3: Write the CLI**

`apps/web/src/scripts/approve-therapist.ts` (relative import — no `@/` alias, so `tsx` needs no tsconfig-path resolution):

```ts
import { approveTherapist, TherapistApprovalError } from "../lib/approve-therapist";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: pnpm --filter web db:approve <email>");
    process.exit(1);
  }

  try {
    const result = await approveTherapist(email);
    if (result.status === "already-approved") {
      console.log(`${result.email} is already approved — no change.`);
    } else {
      console.log(`Approved therapist ${result.email} (${result.userId}).`);
    }
    process.exit(0);
  } catch (err) {
    if (err instanceof TherapistApprovalError) {
      console.error(`Cannot approve ${email}: ${err.message}`);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

void main();
```

> Note: `approve-therapist.ts` imports `server-only`, which is a no-op in plain Node/`tsx` (it only throws when bundled for the browser), so the CLI runs fine.

- [ ] **Step 4: Verify the CLI's argument handling (no DB / no .env needed)**

Run: `pnpm --filter web exec tsx src/scripts/approve-therapist.ts`
Expected: prints `Usage: pnpm --filter web db:approve <email>` and exits non-zero.

(Invoke `tsx` directly here — bypassing the `dotenv` wrapper — so the usage check doesn't depend on `.env` existing. The no-arg branch returns before touching Prisma. A full approval run needs the dev DB and a real pending therapist — exercised manually in Task 8's runbook, not here.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/src/scripts/approve-therapist.ts pnpm-lock.yaml
git commit -m "feat(web): add db:approve CLI for therapist approval"
```

---

## Task 5: Lock the provision route's pending behavior (TDD guard)

**Files:**
- Modify: `apps/web/src/app/api/auth/provision/route.ts` (comment only)
- Test: `apps/web/src/app/api/__tests__/provision.test.ts`

The route already creates therapists with an empty `therapistProfile` (so `approvedAt` defaults to null = pending) and the request body has no approval field. This task adds a regression guard so that invariant can't silently break, plus a comment documenting why trusting the role here is safe.

- [ ] **Step 1: Add the regression test**

Append this test inside the `describe("POST /api/auth/provision", ...)` block in `apps/web/src/app/api/__tests__/provision.test.ts`:

```ts
  it("creates a THERAPIST as pending — no approval set, client cannot set it", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-2", email: "t@b.co" });
    upsert.mockResolvedValue({ id: "uid-2", email: "t@b.co", role: "THERAPIST" });
    const { POST } = await import("../auth/provision/route");
    const res = await POST(post({ firstName: "T", lastName: "H", role: "THERAPIST" }));
    expect(res.status).toBe(201);

    const callArg = upsert.mock.calls[0][0];
    expect(callArg.create.role).toBe("THERAPIST");
    // Profile created empty → approvedAt defaults to null (pending).
    expect(callArg.create.therapistProfile).toEqual({ create: {} });
    // Defense in depth: nothing in the create payload sets approval.
    expect(JSON.stringify(callArg.create)).not.toContain("approvedAt");
  });
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `pnpm --filter web test src/app/api/__tests__/provision.test.ts`
Expected: PASS (4 passed) — this guards already-correct behavior.

- [ ] **Step 3: Add the explanatory comment to the route**

In `apps/web/src/app/api/auth/provision/route.ts`, add a comment directly above the `const user = await prisma.user.upsert({` line:

```ts
  // A client may self-assign role THERAPIST, but that grants nothing: the new
  // therapistProfile is created with approvedAt = null (pending), and there is
  // no approval field in the request body. Access is gated by
  // requireApprovedTherapist (lib/authz.ts), which an admin unlocks via db:approve.
  const user = await prisma.user.upsert({
```

- [ ] **Step 4: Re-run the test (still green after the comment)**

Run: `pnpm --filter web test src/app/api/__tests__/provision.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/auth/provision/route.ts apps/web/src/app/api/__tests__/provision.test.ts
git commit -m "test(web): guard that registered therapists are pending by default"
```

---

## Task 6: Pending-approval screen on the app landing

**Files:**
- Modify: `apps/web/src/app/app/page.tsx`

No unit test: this is a presentational server component and the repo has no RSC test harness (vitest env is `node`, no jsdom). The security enforcement it reflects is covered by Task 2's guard tests. Verify by reading the diff + the manual check below.

- [ ] **Step 1: Replace the component body to branch on approval**

Replace the entire contents of `apps/web/src/app/app/page.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@exhale/db";

export default async function AppHome() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    include: { therapistProfile: true },
  });
  if (!user) redirect("/signup");

  const isPendingTherapist =
    user.role === "THERAPIST" && !user.therapistProfile?.approvedAt;

  if (isPendingTherapist) {
    return (
      <main style={{ maxWidth: 640, margin: "4rem auto" }}>
        <h1>Thanks, {user.firstName} — your therapist account is under review</h1>
        <p>
          Our team verifies every therapist before granting access to patient
          features. You&apos;ll be able to use the full therapist workspace as soon
          as your account is approved. We&apos;ll be in touch shortly.
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 640, margin: "4rem auto" }}>
      <h1>Welcome, {user.firstName}</h1>
      <p>You are signed in as a {user.role.toLowerCase()}.</p>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 3: Manual verification (optional, needs DB + dev server)**

With `pnpm dev` running: sign up as a therapist → `/app` shows the "under review" screen. Run `pnpm --filter web db:approve <that-email>`, reload `/app` → the normal welcome screen. (Automated coverage of the gate itself lives in Task 2.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/app/page.tsx
git commit -m "feat(web): show pending-approval screen for unapproved therapists"
```

---

## Task 7: Signup redesign — design system, Exhale brand, role toggle, therapist warning

**Files:**
- Modify: `apps/web/src/app/(auth)/signup/page.tsx`
- Modify: `apps/web/src/app/(auth)/auth.css` (add `.auth-brand`, `.auth-warning`)

No unit test: `"use client"` component with no React testing setup in the repo (vitest env is `node`, no jsdom/@testing-library). Verify via typecheck + the manual check below. The role only ever sends `PATIENT | THERAPIST` to the already-tested provision route.

- [ ] **Step 1: Add the two CSS classes**

Append to `apps/web/src/app/(auth)/auth.css`:

```css
/* Prominent brand lockup on the signup card — larger than the 24px layout logo. */
.auth-brand {
  font-family: var(--font-instrument-serif), serif;
  font-size: 52px;
  line-height: 1;
  letter-spacing: 0.5px;
  color: var(--ink);
  margin: 0 0 14px;
}

/* Therapist verification callout — noticeable but not an error. */
.auth-warning {
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink);
  background: rgba(214, 158, 46, 0.10);
  border: 1px solid rgba(214, 158, 46, 0.35);
  border-radius: 10px;
  padding: 11px 13px;
}

@media (max-width: 480px) {
  .auth-brand {
    font-size: 42px;
  }
}
```

- [ ] **Step 2: Rewrite the signup page**

Replace the entire contents of `apps/web/src/app/(auth)/signup/page.tsx` with:

```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { provisionUser } from "@/lib/provision-client";

type Role = "PATIENT" | "THERAPIST";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [role, setRole] = useState<Role>("PATIENT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pre-select from the landing deep-link (/signup?role=therapist). Read on the
  // client to avoid useSearchParams' Suspense requirement during prerender.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("role");
    if (param === "therapist") setRole("THERAPIST");
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: signErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });
    if (signErr) {
      setError(signErr.message);
      setLoading(false);
      return;
    }
    const token = data.session?.access_token;
    if (!token) {
      setError("Check your email to confirm, then log in.");
      setLoading(false);
      return;
    }
    try {
      await provisionUser(token, { firstName: form.firstName, lastName: form.lastName, role });
      router.refresh(); // ensure server components see the new session before navigating
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provisioning failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-brand">Exhale</div>
      <div className="auth-eyebrow">Create your account</div>
      <h1 className="auth-title">Start your journey</h1>
      <p className="auth-sub">A calm, structured space — for patients and therapists alike.</p>

      <form className="auth-form" onSubmit={onSubmit}>
        <div className="auth-row">
          <div className="auth-field">
            <label className="auth-label" htmlFor="firstName">First name</label>
            <input
              id="firstName"
              className="auth-input"
              autoComplete="given-name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="lastName">Last name</label>
            <input
              id="lastName"
              className="auth-input"
              autoComplete="family-name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="auth-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="password">Password</label>
          <input
            id="password"
            className="auth-input"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        <div className="auth-field">
          <span className="auth-label">I am a</span>
          <div className="auth-segment" role="group" aria-label="Account type">
            <button
              type="button"
              className={role === "PATIENT" ? "active" : ""}
              aria-pressed={role === "PATIENT"}
              onClick={() => setRole("PATIENT")}
            >
              Patient
            </button>
            <button
              type="button"
              className={role === "THERAPIST" ? "active" : ""}
              aria-pressed={role === "THERAPIST"}
              onClick={() => setRole("THERAPIST")}
            >
              Therapist
            </button>
          </div>
        </div>

        {role === "THERAPIST" && (
          <p className="auth-warning">
            Therapist accounts go through a verification check by our team. You can
            sign in right away, but access to patient features is unlocked only after
            we approve your account.
          </p>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button className="cta-button auth-submit" type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="auth-alt">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 4: Manual verification (optional, needs dev server)**

With `pnpm dev`: visit `/signup` → large "Exhale" brand, segmented Patient/Therapist toggle, no warning. Click **Therapist** → amber verification warning appears. Visit `/signup?role=therapist` → Therapist pre-selected with the warning shown. Submitting as Patient and as Therapist both reach `/app`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(auth)/signup/page.tsx apps/web/src/app/(auth)/auth.css
git commit -m "feat(web): redesign signup with role toggle, therapist warning, Exhale brand"
```

---

## Task 8: Operator runbook + full verification

**Files:**
- Create: `docs/runbooks/approving-therapists.md`

- [ ] **Step 1: Write the runbook**

`docs/runbooks/approving-therapists.md`:

```markdown
# Approving a therapist

New therapists self-register at `/signup` and land in a **pending** state: they
can sign in, but every therapist capability is blocked by `requireApprovedTherapist`
(`apps/web/src/lib/authz.ts`) until an admin approves them.

## Approve

From the repo root, with the dev/prod `.env` present at the repo root:

```bash
pnpm --filter web db:approve therapist@example.com
```

- Sets `TherapistProfile.approvedAt` and writes an `APPROVE_THERAPIST` audit log.
- Idempotent: re-running on an approved therapist reports "already approved" and changes nothing.
- Errors (non-zero exit) if the email is unknown or the account is not a therapist.

The command loads `DATABASE_URL` from the root `.env` via `dotenv-cli`. If your
env lives elsewhere, point the `-e` flag in the `db:approve` script at it, or set
`DATABASE_URL` in your shell before running.

## Verify

The therapist reloads `/app`: the "under review" screen is replaced by the
therapist workspace. (No approval = `app/page.tsx` keeps showing the pending screen.)
```

- [ ] **Step 2: Run the full web test suite**

Run: `pnpm --filter web test`
Expected: PASS — all suites green, including the new `authz`, `approve-therapist`, and the extended `provision` tests.

- [ ] **Step 3: Typecheck the whole repo**

Run: `pnpm -r typecheck`
Expected: PASS for `@exhale/db` and `web`.

- [ ] **Step 4: Lint the web app**

Run: `pnpm --filter web lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add docs/runbooks/approving-therapists.md
git commit -m "docs: runbook for approving therapists"
```

---

## Done — what shipped

- `TherapistProfile.approvedAt` gates therapist access; the client can never set it.
- `requireApprovedTherapist` is the single server-side gate for every future therapist route (fully tested).
- `approveTherapist` + `pnpm --filter web db:approve <email>` is the admin approval path (tested helper; idempotent; audit-logged).
- Provision behavior locked by a regression test: registered therapists are pending.
- `/app` shows a pending screen to unapproved therapists.
- Signup uses the `auth-card` design system with a prominent Exhale brand, a segmented role control, a therapist verification warning, and landing deep-link pre-selection.
- Operator runbook documents approval.
```
