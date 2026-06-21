# Therapist Pending-Approval Gate — Design

**Date:** 2026-06-21
**Branch:** architecture-redesign
**Status:** Approved, ready for implementation plan

## Problem

The signup flow lets any visitor self-assign the `THERAPIST` role. `apps/web/src/app/(auth)/signup/page.tsx` has a role `<select>` (PATIENT | THERAPIST), and `apps/web/src/app/api/auth/provision/route.ts` writes whatever role the client sends straight to the `User` row. Anyone can register as a therapist.

This is currently harmless because no therapist-only functionality exists. It **must** be gated before any therapist capability (access to patient data, session notes, homework authoring, etc.) ships. This is a security/authorization gate, not a UI nicety.

## Decision

**Pending-approval model.** Therapists still self-register as `THERAPIST`, but a newly registered therapist lands in a **pending** state and receives **no therapist functionality** until an **admin approves** them. Patients are unaffected — they register and use the app immediately.

### Threat model (the core idea)

We keep trusting the client-sent role, but make the `THERAPIST` role grant **nothing** on its own. A self-registered therapist is pending, and every therapist capability is gated server-side on an **approval flag the client cannot set**. "Anyone can register as THERAPIST" therefore becomes harmless: such an account is inert and access-less until an admin approves it.

**This safety property only holds if every therapist capability checks approval.** A reusable server-side guard is therefore a first-class deliverable, not an afterthought. The guard must exist before the first therapist-only route ships.

### Alternatives considered

- **Force everyone to PATIENT + manual role elevation.** Most secure default, but the product owner wants therapists to self-identify at signup and enter an onboarding queue rather than be invisible until elevated.
- **Invite code / signup token.** Lightest gate, but pushes vetting out-of-band (whoever holds the code) and gives no record of who is awaiting review.
- **License-verification onboarding flow.** Strongest vetting but effectively its own feature; out of scope for the current MVP (YAGNI).

## Data model

Add one nullable field to `TherapistProfile` in `packages/db/prisma/schema.prisma`:

```prisma
approvedAt   DateTime?   // null = pending admin approval; set = approved & active
```

- `null` = pending, timestamp = approved. Doubles as the approved boolean; carries the approval time for audit.
- **Not** modeling a `PENDING/APPROVED/REJECTED` enum yet. Rejection/suspension can be handled later via the existing `User.isActive` flag or a follow-up enum. Revisit if a rejection workflow is needed.
- Existing therapist rows (if any in dev) become pending after the migration — the safe default.

A Prisma migration adds the column. Running `prisma migrate dev` requires a live DB connection and is an operator step (documented in the plan).

## Components

### 1. Provision route (`apps/web/src/app/api/auth/provision/route.ts`)

Minimal change. Still accepts `role: "PATIENT" | "THERAPIST"` (ADMIN remains rejected with 400 by the Zod enum). A new therapist's `therapistProfile` is created with `approvedAt` defaulting to `null` = pending. The request body has **no** approval field, so a client cannot self-approve. Add a clarifying comment documenting why trusting the role here is safe.

### 2. Authorization guard (new `apps/web/src/lib/authz.ts`)

The actual gate. `requireApprovedTherapist(req)`:

1. `getAuthUser(req)` → 401 if unauthenticated.
2. Load the DB user (with `therapistProfile`).
3. 403 if `role !== "THERAPIST"`.
4. 403 if `therapistProfile?.approvedAt` is null (pending).
5. Return the user on success.

Returns a discriminated result (`{ ok: true, user }` or `{ ok: false, response }`) mirroring the `parseBody` convention in `lib/validation.ts`, so route handlers can early-return the response. Every future therapist-only route calls this. Fully tested now, even though no therapist route consumes it yet.

### 3. Approval helper (new `apps/web/src/lib/approve-therapist.ts`)

`approveTherapist(email)`:

- Find the user by email; throw a typed/identifiable error if not found.
- Throw if the user is not a `THERAPIST`.
- Idempotent: if `approvedAt` is already set, return without rewriting it.
- Otherwise set `therapistProfile.approvedAt = new Date()` and write an `APPROVE_THERAPIST` audit log (subject = the therapist's user id, consistent with how `provision` records `PROVISION_USER`; `metadata: { via: "cli" }`).

### 4. Approval CLI (new `apps/web/src/scripts/approve-therapist.ts`)

Thin wrapper: reads the email from `process.argv`, calls `approveTherapist`, prints the result, exits non-zero on error. Wired as `pnpm --filter web db:approve <email>` via a new `db:approve` script and a `tsx` devDependency in `apps/web/package.json`. This is the "DB update now, admin UI later" mechanism; the helper is the seam a future admin UI/route reuses.

### 5. UI

- **Signup page** (`(auth)/signup/page.tsx`): keep the Patient/Therapist `<select>`. Add a one-line note that therapist accounts require approval before access.
- **App landing** (`app/page.tsx`): a `THERAPIST` whose `therapistProfile.approvedAt` is null sees a "your therapist account is pending approval" screen instead of therapist UI. Patients unchanged.
- `/api/me` and the provision response already return `therapistProfile` in full via `publicUserSelect`, so `approvedAt` reaches the client with **no** change to those selects.

## Data flow

1. Visitor signs up, selects Therapist → Supabase `signUp` → `provisionUser(token, { firstName, lastName, role: "THERAPIST" })`.
2. Provision route creates the `User` (role THERAPIST) + `therapistProfile { approvedAt: null }` → pending.
3. Therapist logs in → `app/page.tsx` reads `approvedAt == null` → pending screen. Any therapist API call hits `requireApprovedTherapist` → 403.
4. Operator runs `pnpm --filter web db:approve <email>` → `approvedAt` set, audit logged.
5. Therapist reloads → `approvedAt` set → full access; guard passes.

## Error handling

- Provision: unchanged (401 unauth, 400 invalid body via existing `parseBody`).
- Guard: 401 unauthenticated, 404 not provisioned, 403 wrong role, 403 pending. Wrapped so unexpected DB errors surface as the standard 500 (`withErrorHandling`) when used in a route.
- CLI: clear stderr message + non-zero exit on not-found / not-a-therapist; idempotent success message if already approved.

## Testing

- `provision.test.ts` (extend): registering as THERAPIST creates the profile with no approval set (pending); existing PATIENT/401/400 cases unchanged.
- `authz.test.ts` (new): 401 unauthenticated, 404 not provisioned, 403 wrong role, 403 pending therapist, pass when approved.
- `approve-therapist.test.ts` (new): not found, not a therapist, idempotent when already approved, success sets `approvedAt` + writes the audit log.

UI pending-state rendering is low-risk presentational and not unit-tested; security-critical units (guard, helper, provision) are.

## Out of scope (YAGNI)

- Admin UI for reviewing/approving therapists (CLI now, UI later).
- Rejection/suspension workflow and `REJECTED` status.
- Email notifications on approval.
- License capture/verification.

## Files

**Modify:** `packages/db/prisma/schema.prisma` (+ migration), `apps/web/src/app/api/auth/provision/route.ts`, `apps/web/src/app/app/page.tsx`, `apps/web/src/app/(auth)/signup/page.tsx`, `apps/web/package.json`.

**Create:** `apps/web/src/lib/authz.ts`, `apps/web/src/lib/approve-therapist.ts`, `apps/web/src/scripts/approve-therapist.ts`, `apps/web/src/lib/__tests__/authz.test.ts`, `apps/web/src/lib/__tests__/approve-therapist.test.ts`.
