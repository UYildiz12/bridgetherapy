# Survey Capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the remaining non-billing, non-HIPAA capabilities surfaced by the CBT therapist survey as free MVP features, and keep a repo-level checklist mapped to current status.

**Architecture:** Keep one trusted Next.js API backed by Prisma/Supabase. Add one compact `SessionWorkspace` table for session-adjacent collaboration state, then layer client helpers and role-specific pages over existing authorization patterns. Content-heavy capabilities ship as curated in-repo libraries first, not external CMS integrations.

**Tech Stack:** Next.js App Router, React, Prisma, Supabase Postgres, Vitest, Testing Library, Gemini via existing `AI_key`.

---

### Task 1: Capability Checklist

**Files:**
- Create: `docs/capabilities_checklist.md`
- Source: `Scaleresults/BDT TERAPİSTLERİ ANKETİ.csv`

- [x] **Step 1: Record the survey-derived checklist**

Create a table with every scale item, average rating, implementation status, owner surface, and notes. Keep raw survey files out of Git unless explicitly requested.

- [x] **Step 2: Review against current product**

Mark video, homework tracking, reminders, mood tracking, therapist notes, and Lumen as implemented; mark whiteboard, psychoeducation library, protocol library, formal measures, urgent therapist access, and biometric/passkey lock as missing or partial.

### Task 2: Session Workspace Model and APIs

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/20260622103000_add_session_workspace/migration.sql`
- Create: `apps/web/src/lib/session-workspace.ts`
- Modify: `apps/web/src/app/api/__tests__/sessions.test.ts`
- Create: `apps/web/src/app/api/sessions/[id]/workspace/route.ts`
- Create: `apps/web/src/app/api/therapist/sessions/[id]/workspace/route.ts`

- [x] **Step 1: Write failing API tests**

Add tests proving patients can read/update only their own `patientNote` and `whiteboard`, while therapists can read/update the linked session workspace.

- [x] **Step 2: Add the Prisma model**

Add `SessionWorkspace` with `sessionId`, `whiteboard`, `patientNote`, timestamps, and a unique session relation.

- [x] **Step 3: Implement shared DTO helpers**

Create helpers for safe default workspace shape, whiteboard validation, and DTO conversion.

- [x] **Step 4: Implement patient and therapist routes**

Use existing `getAuthUser`, `requireApprovedTherapist`, and linked-session patterns.

### Task 3: Session Workspace UI

**Files:**
- Create: `apps/web/src/components/sessions/session-whiteboard.tsx`
- Modify: `apps/web/src/app/(app)/sessions/page.tsx`
- Modify: `apps/web/src/app/(app)/practice/sessions/[id]/page.tsx`
- Modify: related page tests under `__tests__`

- [x] **Step 1: Write failing component/page tests**

Patient page must show previous summaries, a patient session-note field, and whiteboard save controls. Therapist detail must show previous session history and whiteboard controls.

- [x] **Step 2: Implement a free canvas whiteboard MVP**

Use pointer events on `<canvas>`, persist strokes as JSON through the workspace APIs, and keep it usable on mobile.

- [x] **Step 3: Surface patient-facing summaries and history**

Expose existing `SessionSummary` to the patient sessions page and add a compact previous-session list to therapist detail.

### Task 4: CBT Education and Protocol Libraries

**Files:**
- Create: `apps/web/src/lib/education.ts`
- Create: `apps/web/src/app/(app)/learn/page.tsx`
- Create: `apps/web/src/app/(app)/practice/protocols/page.tsx`
- Modify: `apps/web/src/components/app/app-shell.tsx`
- Create/modify tests for the two pages and nav.

- [x] **Step 1: Write failing page/nav tests**

Tests assert patient nav includes Learn, therapist nav includes Protocols, and pages render CBT loop, psychoeducation modules, and intervention protocol cards.

- [x] **Step 2: Implement curated static libraries**

Ship readable CBT loop education, psychoeducation modules, and protocol templates that therapists can use to guide homework creation.

### Task 5: Progress, Measures, and Urgent Access

**Files:**
- Modify: `apps/web/src/app/api/reports/progress/route.ts`
- Modify: `apps/web/src/app/(app)/reports/page.tsx`
- Modify: `apps/web/src/app/(app)/settings/page.tsx`
- Modify tests for reports/settings/API.

- [x] **Step 1: Write failing tests for richer metrics**

Reports API should include session attendance, homework totals, reflection counts, and lightweight measure-style trend buckets.

- [x] **Step 2: Implement progress aggregation**

Aggregate existing mood, homework, session, and reflection data without introducing medical diagnosis claims.

- [x] **Step 3: Add urgent-access preference copy**

Settings should let users record that urgent therapist contact depends on therapist preference, while preserving crisis/988 boundaries.

### Task 6: AI Homework Drafting and Browser Lock MVP

**Files:**
- Create: `apps/web/src/lib/homework/ai-draft.ts`
- Create: `apps/web/src/app/api/therapist/homework/draft/route.ts`
- Modify: `apps/web/src/app/(app)/practice/homework/new/page.tsx`
- Create: `apps/web/src/components/security/browser-lock.tsx`
- Modify: `apps/web/src/app/(app)/settings/page.tsx`
- Create/modify tests for AI draft and settings.

- [x] **Step 1: Write failing tests**

AI draft route should require approved therapist, reject unsafe empty prompts, call Gemini Flash-Lite with `store: false`, and return a validated homework-set draft. Settings should show the browser lock surface.

- [x] **Step 2: Implement guarded AI draft**

Use existing Gemini patterns, keep output JSON-shaped, and frame it as therapist-reviewed draft assistance only.

- [x] **Step 3: Implement free browser lock**

Use WebAuthn/passkey capability detection for a browser-supported lock affordance; fallback copy explains unsupported devices.

### Task 7: Verification and Release

**Files:**
- All touched files.

- [x] **Step 1: Run targeted tests after each slice**

Use `pnpm --filter web test -- <paths>` for the affected tests.

- [ ] **Step 2: Run full gates**

Run `pnpm --filter web test`, `pnpm --filter web typecheck`, `pnpm --filter web lint`, and a production-env build.

- [ ] **Step 3: Commit, push, and deploy**

Commit the implementation, push `master`, wait for the Vercel production deployment, and report the production URL.
