# Phase 1A — App Shell + Mood Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder `/app` page with a real authenticated dashboard shell, and ship the first product feature end-to-end: a patient can log a daily mood and see their history — all through the API with proper authorization.

**Architecture:** Approach B (see [architecture spec](../specs/2026-06-20-architecture-redesign-design.md)). The authenticated app lives under a `(app)` route group with a server-side auth guard; it uses **shadcn/ui + Tailwind in dark mode** (distinct from the marketing landing's "blueprint" look, but a shared dark palette keeps it cohesive). Data access is in **plain portable functions** (`mood-client.ts`) — not React hooks — so a future Expo client reuses them; only the presentational layer is web-specific. All mood reads/writes go through `/api/mood`, which enforces patient-only, own-data access.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind, shadcn/ui, Prisma (`@exhale/db`), Supabase Auth, zod, Vitest.

**Phase 1 decomposition (this is slice 1A of 5):** 1A app shell + mood · 1B journal (E2E) · 1C patient–therapist linking · 1D homework · 1E scheduling. Each ships independently.

**Conventions:** paths are relative to repo root. Run `pnpm` from repo root. Tests run with `pnpm --filter web test` (env vars not needed — DB/Supabase are mocked). For typecheck/build, env is loaded via `pnpm build` / placeholder vars. Do NOT add `Co-Authored-By` lines. Do NOT commit the untracked `Scaleresults/` directory.

---

## File Structure

```
apps/web/src/
├── app/
│   ├── app/page.tsx                      # DELETE (placeholder; replaced by (app)/dashboard)
│   ├── (app)/
│   │   ├── layout.tsx                    # CREATE — auth guard + dark shell (server component)
│   │   ├── dashboard/page.tsx            # CREATE — home: greeting + mood CTA + recent moods
│   │   └── mood/page.tsx                  # CREATE — mood check-in form + history (client)
│   ├── (auth)/layout.tsx                 # MODIFY — redirect authed → /dashboard (was /app)
│   ├── (auth)/login/page.tsx             # MODIFY — push /dashboard (was /app)
│   ├── (auth)/signup/page.tsx            # MODIFY — push /dashboard (was /app)
│   └── api/mood/route.ts                 # CREATE — GET (list) + POST (create), patient-only
├── components/app/
│   ├── app-shell.tsx                     # CREATE — top bar (logo, user, sign out) wrapper
│   └── sign-out-button.tsx               # CREATE — client sign-out
└── lib/
    ├── mood-client.ts                    # CREATE — portable fetch fns (tested)
    └── patient.ts                        # CREATE — server helper: resolve PatientProfile from auth
```

Each file has one responsibility: `mood-client.ts` is the portable data layer; `patient.ts` centralizes "auth user → patient profile + 401/403"; the route is thin; the pages are presentational.

---

## Task 1: Authenticated app shell + redirect cleanup

**Files:**
- Create: `apps/web/src/components/app/sign-out-button.tsx`, `apps/web/src/components/app/app-shell.tsx`, `apps/web/src/app/(app)/layout.tsx`
- Modify: `apps/web/src/app/(auth)/layout.tsx`, `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/app/(auth)/signup/page.tsx`
- Delete: `apps/web/src/app/app/page.tsx` (and the now-empty `apps/web/src/app/app/` folder)

- [ ] **Step 1: Sign-out button** — create `apps/web/src/components/app/sign-out-button.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.refresh();
    router.push("/");
  }
  return (
    <Button variant="ghost" size="sm" onClick={signOut}>
      Sign out
    </Button>
  );
}
```

- [ ] **Step 2: App shell** — create `apps/web/src/components/app/app-shell.tsx`:

```tsx
import Link from "next/link";
import { SignOutButton } from "./sign-out-button";

export function AppShell({
  firstName,
  role,
  children,
}: {
  firstName: string;
  role: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            exhale
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {firstName} · {role.toLowerCase()}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: (app) layout with auth guard** — create `apps/web/src/app/(app)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@exhale/db";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { firstName: true, role: true },
  });
  if (!user) redirect("/signup");

  return (
    <AppShell firstName={user.firstName} role={user.role}>
      {children}
    </AppShell>
  );
}
```

- [ ] **Step 4: Repoint auth redirects from `/app` to `/dashboard`.**

In `apps/web/src/app/(auth)/layout.tsx`, change the line `if (data.user) redirect("/app");` to:
```tsx
  if (data.user) redirect("/dashboard");
```
In `apps/web/src/app/(auth)/login/page.tsx`, change `router.push("/app");` to:
```tsx
    router.push("/dashboard");
```
In `apps/web/src/app/(auth)/signup/page.tsx`, change `router.push("/app");` to:
```tsx
      router.push("/dashboard");
```

- [ ] **Step 5: Delete the placeholder.**

Run: `git rm apps/web/src/app/app/page.tsx`
(If `apps/web/src/app/app/` has no other files, it disappears — verify with `git status`.)

- [ ] **Step 6: Typecheck.**

Run: `pnpm --filter web typecheck`
Expected: no errors. (Note: `(app)/dashboard` and `(app)/mood` pages don't exist yet — that's fine, routes are file-based; nothing imports them.)

- [ ] **Step 7: Commit.**

```bash
git add apps/web/src/components/app apps/web/src/app/"(app)" apps/web/src/app/"(auth)"
git commit -m "feat(web): authenticated app shell + move home to /dashboard"
```

---

## Task 2: Patient-resolution server helper

**Files:**
- Create: `apps/web/src/lib/patient.ts`
- Test: `apps/web/src/lib/__tests__/patient.test.ts`

This centralizes "authenticated user → their PatientProfile, or the right error response" so both mood routes (and future patient features) reuse it. `MoodEntry.patientId` references `PatientProfile.id`, not `User.id`, so this resolves the hop.

- [ ] **Step 1: Write the failing test** — `apps/web/src/lib/__tests__/patient.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getAuthUser = vi.fn();
const findUnique = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@exhale/db", () => ({ prisma: { user: { findUnique } } }));

describe("requirePatient", () => {
  beforeEach(() => { vi.resetModules(); getAuthUser.mockReset(); findUnique.mockReset(); });

  it("401 when unauthenticated", async () => {
    getAuthUser.mockResolvedValue(null);
    const { requirePatient } = await import("../patient");
    const result = await requirePatient(new Request("http://t/api/mood"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("403 when the user has no patient profile", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue({ patientProfile: null });
    const { requirePatient } = await import("../patient");
    const result = await requirePatient(new Request("http://t/api/mood"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("returns the patientProfile id when present", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue({ patientProfile: { id: "pp-1" } });
    const { requirePatient } = await import("../patient");
    const result = await requirePatient(new Request("http://t/api/mood"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.patientId).toBe("pp-1");
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`Cannot find module '../patient'`).

Run: `pnpm --filter web test src/lib/__tests__/patient.test.ts`

- [ ] **Step 3: Implement** `apps/web/src/lib/patient.ts`:

```ts
import "server-only";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@exhale/db";
import { json } from "@/lib/http";

type PatientResult =
  | { ok: true; patientId: string }
  | { ok: false; response: Response };

/** Resolve the authenticated user's PatientProfile id, or the correct error response. */
export async function requirePatient(req: Request): Promise<PatientResult> {
  const auth = await getAuthUser(req);
  if (!auth) return { ok: false, response: json({ error: "Unauthorized" }, 401) };

  const user = await prisma.user.findUnique({
    where: { id: auth.authId },
    select: { patientProfile: { select: { id: true } } },
  });
  if (!user?.patientProfile) {
    return { ok: false, response: json({ error: "Not a patient" }, 403) };
  }
  return { ok: true, patientId: user.patientProfile.id };
}
```

- [ ] **Step 4: Run it — expect PASS** (3 passed).

Run: `pnpm --filter web test src/lib/__tests__/patient.test.ts`

- [ ] **Step 5: Commit.**

```bash
git add apps/web/src/lib/patient.ts apps/web/src/lib/__tests__/patient.test.ts
git commit -m "feat(api): add requirePatient auth helper"
```

---

## Task 3: Mood API — `GET` + `POST /api/mood`

**Files:**
- Create: `apps/web/src/app/api/mood/route.ts`
- Test: `apps/web/src/app/api/__tests__/mood.test.ts`

- [ ] **Step 1: Write the failing test** — `apps/web/src/app/api/__tests__/mood.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const requirePatient = vi.fn();
const create = vi.fn();
const findMany = vi.fn();
vi.mock("@/lib/patient", () => ({ requirePatient }));
vi.mock("@exhale/db", () => ({ prisma: { moodEntry: { create, findMany } } }));
import { json } from "@/lib/http";

function post(body: unknown) {
  return new Request("http://t/api/mood", { method: "POST", body: JSON.stringify(body) });
}

describe("/api/mood", () => {
  beforeEach(() => { vi.resetModules(); requirePatient.mockReset(); create.mockReset(); findMany.mockReset(); });

  it("GET 401/403 propagates the requirePatient response", async () => {
    requirePatient.mockResolvedValue({ ok: false, response: json({ error: "Unauthorized" }, 401) });
    const { GET } = await import("../mood/route");
    expect((await GET(new Request("http://t/api/mood"))).status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("GET 200 returns the patient's entries newest-first", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp-1" });
    findMany.mockResolvedValue([{ id: "m1", moodScore: 7 }]);
    const { GET } = await import("../mood/route");
    const res = await GET(new Request("http://t/api/mood"));
    expect(res.status).toBe(200);
    expect((await res.json()).data[0].id).toBe("m1");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: "pp-1" }, orderBy: { createdAt: "desc" } }),
    );
  });

  it("POST 400 on an out-of-range moodScore", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp-1" });
    const { POST } = await import("../mood/route");
    expect((await POST(post({ moodScore: 11 }))).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("POST 201 creates an entry for the patient", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp-1" });
    create.mockResolvedValue({ id: "m2", moodScore: 5, tags: ["tired"] });
    const { POST } = await import("../mood/route");
    const res = await POST(post({ moodScore: 5, notes: "ok", tags: ["tired"] }));
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ patientId: "pp-1", moodScore: 5, tags: ["tired"] }) }),
    );
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`Cannot find module '../mood/route'`).

Run: `pnpm --filter web test src/app/api/__tests__/mood.test.ts`

- [ ] **Step 3: Implement** `apps/web/src/app/api/mood/route.ts`:

```ts
import { z } from "zod";
import { prisma } from "@exhale/db";
import { requirePatient } from "@/lib/patient";
import { parseBody } from "@/lib/validation";
import { json } from "@/lib/http";
import { withErrorHandling } from "@/lib/http";

const CreateMood = z.object({
  moodScore: z.number().int().min(1).max(10),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});

export const GET = withErrorHandling(async (req: Request) => {
  const patient = await requirePatient(req);
  if (!patient.ok) return patient.response;

  const entries = await prisma.moodEntry.findMany({
    where: { patientId: patient.patientId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return json({ data: entries }, 200);
});

export const POST = withErrorHandling(async (req: Request) => {
  const patient = await requirePatient(req);
  if (!patient.ok) return patient.response;

  const parsed = await parseBody(req, CreateMood);
  if (!parsed.ok) return parsed.response;
  const { moodScore, notes, tags } = parsed.data;

  const entry = await prisma.moodEntry.create({
    data: { patientId: patient.patientId, moodScore, notes, tags: tags ?? [] },
  });
  return json({ data: entry }, 201);
});
```

Note: `withErrorHandling` and `json` both come from `@/lib/http` (added in Phase 0). The single `import { json, withErrorHandling } from "@/lib/http";` line is fine — split here only for clarity; combine into one import.

- [ ] **Step 4: Run it — expect PASS** (4 passed).

Run: `pnpm --filter web test src/app/api/__tests__/mood.test.ts`

- [ ] **Step 5: Commit.**

```bash
git add apps/web/src/app/api/mood apps/web/src/app/api/__tests__/mood.test.ts
git commit -m "feat(api): add /api/mood GET + POST (patient-only)"
```

---

## Task 4: Portable mood data client

**Files:**
- Create: `apps/web/src/lib/mood-client.ts`
- Test: `apps/web/src/lib/__tests__/mood-client.test.ts`

Plain async functions (no React) so an Expo client can reuse them verbatim.

- [ ] **Step 1: Write the failing test** — `apps/web/src/lib/__tests__/mood-client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchMoodEntries, createMoodEntry } from "../mood-client";

describe("mood-client", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetchMoodEntries returns the data array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "m1", moodScore: 6, tags: [], createdAt: "2026-06-21T00:00:00Z" }] }), { status: 200 }),
    ));
    const entries = await fetchMoodEntries();
    expect(entries[0].id).toBe("m1");
  });

  it("createMoodEntry POSTs the payload and returns the entry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "m2", moodScore: 8, tags: [], createdAt: "x" } }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const entry = await createMoodEntry({ moodScore: 8 });
    expect(entry.id).toBe("m2");
    expect(fetchMock).toHaveBeenCalledWith("/api/mood", expect.objectContaining({ method: "POST" }));
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 400 })));
    await expect(createMoodEntry({ moodScore: 5 })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`Cannot find module '../mood-client'`).

Run: `pnpm --filter web test src/lib/__tests__/mood-client.test.ts`

- [ ] **Step 3: Implement** `apps/web/src/lib/mood-client.ts`:

```ts
export interface MoodEntry {
  id: string;
  moodScore: number;
  notes?: string | null;
  tags: string[];
  createdAt: string;
}

export interface CreateMoodInput {
  moodScore: number;
  notes?: string;
  tags?: string[];
}

export async function fetchMoodEntries(): Promise<MoodEntry[]> {
  const res = await fetch("/api/mood");
  if (!res.ok) throw new Error(`Failed to load mood entries: ${res.status}`);
  return (await res.json()).data as MoodEntry[];
}

export async function createMoodEntry(input: CreateMoodInput): Promise<MoodEntry> {
  const res = await fetch("/api/mood", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to save mood: ${res.status}`);
  return (await res.json()).data as MoodEntry;
}
```

- [ ] **Step 4: Run it — expect PASS** (3 passed).

Run: `pnpm --filter web test src/lib/__tests__/mood-client.test.ts`

- [ ] **Step 5: Commit.**

```bash
git add apps/web/src/lib/mood-client.ts apps/web/src/lib/__tests__/mood-client.test.ts
git commit -m "feat(web): add portable mood data client"
```

---

## Task 5: Mood page — check-in form + history

**Files:**
- Create: `apps/web/src/app/(app)/mood/page.tsx`

Client component; uses `mood-client` for data, shadcn `Card`/`Button` + Tailwind for UI. Loads history on mount, lets the patient log a score (1–10), optional comma-separated tags, and a note.

- [ ] **Step 1: Implement** `apps/web/src/app/(app)/mood/page.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { fetchMoodEntries, createMoodEntry, type MoodEntry } from "@/lib/mood-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function MoodPage() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMoodEntries().then(setEntries).catch(() => setError("Couldn't load your history."));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (score === null) return;
    setSaving(true);
    setError(null);
    try {
      const entry = await createMoodEntry({
        moodScore: score,
        notes: notes.trim() || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setEntries((prev) => [entry, ...prev]);
      setScore(null);
      setTags("");
      setNotes("");
    } catch {
      setError("Couldn't save that. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-8">
      <section>
        <h1 className="mb-1 text-2xl font-semibold">How are you feeling?</h1>
        <p className="mb-5 text-sm text-muted-foreground">Log a quick check-in. 1 = low, 10 = great.</p>
        <Card>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                {SCORES.map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={score === n ? "default" : "outline"}
                    size="icon"
                    onClick={() => setScore(n)}
                    aria-pressed={score === n}
                  >
                    {n}
                  </Button>
                ))}
              </div>
              <input
                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="Tags (comma separated): tired, hopeful"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <textarea
                className="min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="Anything you want to note? (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div>
                <Button type="submit" disabled={score === null || saving}>
                  {saving ? "Saving…" : "Log mood"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Recent check-ins</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet — log your first above.</p>
        ) : (
          <div className="grid gap-3">
            {entries.map((m) => (
              <Card key={m.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>Mood {m.moodScore}/10</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                {(m.notes || m.tags.length > 0) && (
                  <CardContent className="grid gap-2 text-sm">
                    {m.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {m.tags.map((t) => (
                          <span key={t} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.notes && <p className="text-muted-foreground">{m.notes}</p>}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck.**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 3: Commit.**

```bash
git add apps/web/src/app/"(app)"/mood
git commit -m "feat(web): mood check-in + history page"
```

---

## Task 6: Dashboard home

**Files:**
- Create: `apps/web/src/app/(app)/dashboard/page.tsx`

The landing-after-login page: a greeting and a card linking to mood check-in. Server component (the shell already provides the name; here we keep it simple and link to features).

- [ ] **Step 1: Implement** `apps/web/src/app/(app)/dashboard/page.tsx`:

```tsx
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">A calm space to check in with yourself.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/mood" className="no-underline">
          <Card className="transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Mood check-in</CardTitle>
              <CardDescription>Log how you feel and see your trend over time.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Takes about a minute →</CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + full test suite.**

Run: `pnpm --filter web typecheck && pnpm --filter web test`
Expected: no type errors; all tests pass (Phase 0's 27 + the new patient/mood/mood-client tests).

- [ ] **Step 3: Commit.**

```bash
git add apps/web/src/app/"(app)"/dashboard
git commit -m "feat(web): dashboard home with mood entry point"
```

---

## Task 7: Build + manual end-to-end verification

- [ ] **Step 1: Production build.**

Run: `pnpm build`
Expected: compiles clean; route list shows `/dashboard`, `/mood`, and `/api/mood` (the latter dynamic `ƒ`); `/app` is gone.

- [ ] **Step 2: Manual e2e** (requires the real Supabase `.env`).

Run: `pnpm dev`, then:
1. Log in (or sign up) as a **patient** → you land on `/dashboard` inside the dark app shell (header shows your name + "patient" + Sign out).
2. Click **Mood check-in** → pick a score, add a tag + note, **Log mood** → it appears in "Recent check-ins" immediately.
3. Reload `/mood` → the entry persists (came from the DB).
4. In Supabase Table Editor, confirm a `MoodEntry` row with your `patientId`, score, and tags.
5. Click **Sign out** → back to the landing; visiting `/dashboard` now redirects to `/login`.
6. (Authz check) Log in as a **therapist** account and visit `/mood` directly → the page loads but the history fetch / a POST returns **403** (therapists aren't patients). *(A therapist-facing view comes in a later slice.)*

---

## Definition of Done (Phase 1A)

- `pnpm --filter web test` and `pnpm --filter web typecheck` pass; `pnpm build` is clean.
- A patient can log a mood and see persisted history, entirely through `/api/mood`.
- `/api/mood` rejects unauthenticated (401) and non-patient (403) callers, and validates input (400).
- The authenticated app renders in the dark shell with working sign-out; `/app` is replaced by `/dashboard`.
- Data logic lives in portable `mood-client.ts` (no React) for a future Expo reuse.

---

## Self-Review

**Spec coverage:** Implements the "mood tracking" item of Phase 1 and the authenticated app shell the rest of Phase 1 builds on. Switch-friendly per the spec: data layer is plain functions; only pages/components are web-specific. Authorization (patient-only, own-data) is enforced server-side and tested.

**Placeholder scan:** No TBD/TODO; every step has concrete code or exact commands. The only non-automated step is Task 7's manual e2e (needs the real Supabase project + a browser), with explicit expected outcomes.

**Type consistency:** `requirePatient(req)` → `{ok:true,patientId} | {ok:false,response}` used identically in the mood route. `MoodEntry`/`CreateMoodInput` from `mood-client.ts` are used by the mood page. `json`/`withErrorHandling`/`parseBody` reuse the Phase 0 signatures. The route writes `tags: tags ?? []` (schema field is `String[]`). `MoodEntry.patientId` → `PatientProfile.id` resolved via `requirePatient`.

**Known assumptions:** the dark app uses shadcn tokens (globals.css `.dark`) applied via a `dark` wrapper in `AppShell` — confirm the product is meant to use shadcn (distinct from the landing's blueprint CSS). If you'd rather the app continue the blueprint aesthetic, that's a swap in `AppShell` + the pages' classes, not a logic change.
