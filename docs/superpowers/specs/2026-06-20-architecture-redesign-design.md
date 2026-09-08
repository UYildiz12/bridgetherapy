# Bridge — Architecture Redesign Design

**Date:** 2026-06-20 (revised 2026-06-21)
**Status:** Approved; Phase 0 implemented.
**Goal:** Re-architect Bridge to prioritize **stability** and **easy deployment**, targeting a **usable MVP for real people** (real therapists/patients), delivered on **web + an installable PWA**.

> **Revision (2026-06-21) — mobile strategy changed.** The original plan paired the Next.js web app with a separate **Flutter** mobile app. That meant building every screen twice in two languages (TSX + Dart) with no shared types — the most expensive way to get "app + web." **Decision: drop Flutter.** v1 ships the Next.js app as an **installable PWA** (one codebase = web + phone app). Real native iOS/Android, when needed (App Store presence, HealthKit, robust iOS push), comes later via **Expo / React Native**, which reuses the same TypeScript + Supabase stack so the switch is a UI re-skin, not a rewrite. Sections below are updated to reflect this.

---

## 1. Context & Motivation

The existing repo is a well-architected *scaffold*, not a working app (~5% built):

- **Mobile** is the default Flutter counter demo — no real implementation.
- **API** (NestJS) has only a half-built auth module that isn't even registered in `app.module.ts`; no CRUD modules exist.
- **Web** (Next.js) has a landing page + shadcn component library; none of the ~66 spec'd pages exist.
- **Infra** assumes self-hosted Postgres + Redis + MinIO via docker-compose.

The strongest existing asset is the **Prisma schema** (`apps/api/prisma/schema.prisma`) — a thoughtful domain model with role separation, E2E-encrypted journals, audit logging, and sensible indexes.

The current shape (3 deployables + 2 app stores + 3 stateful services) is the opposite of "easy deployment." This redesign removes moving parts and leans on managed services, while preserving the good data model.

### Decisions made during brainstorming

| Question | Decision |
|---|---|
| Near-term goal | **Usable MVP for real people** — tight feature set, real auth, safe hosting |
| Platforms | **Web + installable PWA at launch**; native iOS/Android via **Expo deferred** (revised 2026-06-21 — Flutter dropped) |
| Hosting / ops | **Supabase + Vercel** (least to operate) |
| Heavy features for v1 | Media uploads, realtime messaging, video sessions, push notifications (all four requested) |
| Architecture shape | **Approach B — Supabase + a unified Next.js API** |

---

## 2. Target Architecture (Approach B)

One trusted backend. For v1 there is a **single client** — the Next.js app, which is both the website and an **installable PWA**. A future Expo (React Native) client would attach the same way (same `/api`, same Supabase auth/realtime).

```
   ┌───────────────────────┐     ┌──────────────────────────────┐
   │  Next.js app on Vercel │     │  (same Next.js deployment)    │
   │  • web UI (App Router) │────▶│  • /api = the ONE backend     │──Prisma──▶ Supabase Postgres
   │  • installable PWA     │     │  • Vercel Cron (reminders)    │
   │    (manifest + SW)     │     └───────┬───────────┬──────────┘
   └───────────┬───────────┘             │           │
               │ realtime read stream    │           │
               ▼                    provider       Supabase Auth / Storage
        Supabase Realtime          secrets         (identity, files)
        (Message table, RLS)     (Daily, FCM)
   ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
     future: Expo native app  ─ ─ ▶ same /api + Supabase
   └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

**Components**

- **Next.js on Vercel** — serves the web UI *and* the single backend-for-frontend (`/api` Route Handlers) *and* scheduled jobs (Vercel Cron). Shipped as an installable PWA (manifest + service worker). Holds all server-side secrets (DB service access, Daily/Twilio, FCM). All business logic and authorization live here, in typed TypeScript.
- **Future Expo client (deferred)** — when native is needed, an Expo/React-Native app talks to the same `/api` over HTTPS (the `getAuthUser` Bearer-token path already supports this) and uses `@supabase/supabase-js` for the auth session + realtime read-stream. Reuses types and logic; only the UI layer is rebuilt in native primitives.
- **Supabase (managed)** — Postgres (system of record), Auth (identity), Storage (file bytes), Realtime (live message delivery).

**Deploy surfaces:** Vercel + Supabase. **No app stores for v1** (the PWA installs from the browser); no servers to operate; no Redis; no MinIO.

---

## 3. Keep / Change / Retire

| Current artifact | Fate | Notes |
|---|---|---|
| Prisma schema | **Keep** | Move to `packages/db`; point at Supabase Postgres. |
| `packages/shared-types` | **Keep + expand** | Typed contract shared by web + API (and a future Expo client). |
| Next.js web (landing + shadcn UI) | **Keep** | Build out pages + `/api` route handlers. |
| NestJS API (`apps/api`) | **Retire** | Logic moves into Next.js `/api`. Salvage business rules + schema only. |
| Custom JWT auth | **Retire** | Replaced by Supabase Auth. Removes the unwired, buggy auth code. |
| Redis, MinIO, docker-compose (prod) | **Retire** | Supabase replaces them. Optional slim local setup only. |
| Flutter app (counter demo) | **Retire (removed)** | Deleted `apps/mobile` + a duplicate `apps/mobile_app`. A PWA replaces it for v1; native via Expo later. |
| **PWA support** (new) | **Add** | `manifest.ts`, app icons, service worker + registration, iOS install hint, Apple/theme metadata. Makes the Next.js app installable. |

---

## 4. Data Model

- Reuse the existing schema, managed by **Prisma Migrate** against Supabase.
- **Connection handling (the one Vercel + Prisma gotcha):** use Supabase's **pooled** connection (port 6543, PgBouncer) at runtime and a **`directUrl`** (port 5432) for migrations. Must be set up in Phase 0.
- **Add the missing messaging model:**
  - `Conversation` — links a patient and a therapist.
  - `Message` — `conversationId`, `senderId`, `body`, optional attachments (Media), `readAt`, `createdAt`.
  - The current schema has no messaging tables at all, yet chat is a v1 feature.
- **Enable RLS** on `Conversation` / `Message` (and any other realtime-exposed table) so clients can subscribe to live updates without leaking other users' data.

---

## 5. Heavy Features Under Approach B

- **Media uploads:** API mints a **signed upload URL** for Supabase Storage; client uploads bytes directly (keeps large files off Vercel's serverless request limits); client posts the resulting object path back; API records the `Media` row. Downloads use API-minted signed URLs.
- **Realtime messaging:** *writes* go through the API (validate → persist → audit → trigger push); *reads* (live delivery) use **Supabase Realtime** subscribed directly to `Message`, gated by RLS. This is the single deliberate, documented exception where clients touch Supabase directly for data.
- **Video sessions:** an API route mints a Daily/Twilio room + short-lived join token (provider secret stays server-side); clients join with the token.
- **Push notifications:** device tokens registered via the API; event-driven pushes (e.g. new message) sent inline from the API write handler; scheduled reminders (homework due, upcoming session) via **Vercel Cron** hitting an API route. No standalone scheduler or long-running server.

---

## 6. Auth & Security

- **Supabase Auth** for identity (email/password, email verification, password reset; OAuth later). Both clients obtain a Supabase session JWT.
- The Next.js API **verifies the Supabase JWT** on every request and enforces role + ownership rules **in TypeScript** — authorization lives in one place.
- **RLS** enabled as defense-in-depth, and required on the realtime-exposed tables.
- **Audit logging** written by the API on sensitive actions (the `AuditLog` model already exists).
- **E2E-encrypted journal:** client encrypts before sending; the API stores only ciphertext + IV (the schema is already designed for this).
- **Input validation** with `zod` at every API boundary (already a web dependency) — fills the validation gap the NestJS API never had.

### Compliance note

Handling real patient mental-health data implies HIPAA-style obligations (BAAs, encryption at rest/in transit, access controls, retention/deletion, breach handling). Supabase and Vercel both offer paths to this, but it is a **gating concern before onboarding real patients** and must be tracked as its own workstream — it is out of scope for the initial build phases but explicitly acknowledged here.

---

## 7. Build Sequence

The architecture supports all four heavy features, but they ship in order so a real, stable product reaches users early:

- **Phase 0 — Foundations:** Supabase project; schema migrated (with pooled + direct connections); Supabase Auth wired into the web app; API skeleton (JWT verification + zod + audit middleware); retire NestJS/Redis/MinIO; PWA support; CI + Vercel preview deploys. *(Done.)*
- **Phase 1 — Core loop → first real-user release:** accounts/roles/patient–therapist linking → mood tracking → journal (E2E) → homework → session scheduling. Built once in the Next.js app (web + PWA). **Build switch-friendly for a future Expo move:** data/logic in hooks, thin presentational components, Tailwind classes (→ NativeWind later).
- **Phase 2 — Media:** unlocks voice-note / drawing homework + avatars.
- **Phase 3 — Messaging:** realtime chat.
- **Phase 4 — Push:** reminders + message pings.
- **Phase 5 — Video:** heaviest feature, last.

Each phase is independently shippable and testable.

---

## 8. "Stable" Definition & Testing

**Stable means:** one source of truth (the API) · managed services we don't operate · typed contracts (shared-types + zod) so client/DB can't drift · tested authorization + RLS · CI running typecheck / tests / migration-check per PR · a Vercel preview deploy per PR.

**Test focus** concentrates where a health app actually breaks: authorization rules (who can read/write what), RLS policies on messaging, and the API contract.

---

## 9. Tradeoffs Accepted with Approach B

- More API code than the Supabase-native (BaaS-direct) option.
- A future Expo client will depend on Vercel serverless `/api` (cold starts) — mitigated by the realtime read path and keeping handlers light. (Not a concern for the PWA, which is the same deployment.)
- PWA limits on iOS (manual "Add to Home Screen", weaker push/hardware) — accepted for v1; the Expo path exists for when those matter.
- Two access paths exist by design (API for writes, Realtime for message reads) — a documented exception, not a general pattern.
- Vendor reliance on Supabase + Vercel — accepted in exchange for minimal ops.

---

## 10. Out of Scope (for now)

- Billing / invoicing / superbills.
- Analytics & outcome dashboards (GAD-7 / PHQ-9 aggregation).
- Resource library, availability/integration settings beyond the basics.
- **Native iOS/Android apps (Expo)** — deferred until App Store presence, HealthKit, or robust iOS push is actually needed. PWA covers v1.
- Full HIPAA certification work (tracked separately; gates real-patient onboarding).
