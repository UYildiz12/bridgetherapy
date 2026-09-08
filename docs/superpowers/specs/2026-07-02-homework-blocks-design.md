# Homework Blocks: A Flexible Homework System

Date: 2026-07-02
Status: Approved direction (Approach B), spec for review
Owner: bridge web (apps/web), consumed read-only by mobile

## Goal

Let a therapist compose almost any homework and send it to a patient: structured
clinical worksheets, recurring practice logs, app-linked activities, and mixed
psychoeducation, with per-block review. Replace the fixed six-item model with a
composable block document while keeping every existing set, assignment, and API
route working.

## Non-goals

- No calendar-grade scheduling (specific times, per-slot windows). Cadence only.
- No new database tables or enum changes in this pass. Both `Homework.content`
  and `HomeworkAssignment.response` stay JSON.
- No unreviewed AI assignment. Drafts always land in the builder first.
- Mobile authoring. Mobile renders v1 sets as today and shows an "open on web"
  notice for v2 assignments until the app is updated.

## 1. Data model

### 1.1 Document (Homework.content)

```ts
{
  version: 2,
  schedule: { cadence: "once" | "daily" | "weekly" },  // "once" default
  blocks: Block[]                                       // 1..40, ordered, unique ids
}
```

### 1.2 Blocks

Zod discriminated union on `type`. Shared: `id` (unique in doc), `optional?: boolean`
on input blocks.

Content blocks (no response):
- `heading`: `{ text }` - section title, also groups the runner visually.
- `text`: `{ body, requireAck? }` - instructions or psychoeducation; with
  `requireAck` the patient must mark it read (replaces v1 `reading`).

Input blocks (patient responds):
- `input.text`: `{ label, multiline?, placeholder? }`
- `input.scale`: `{ label, min, max, step?, minLabel?, maxLabel? }` - SUDS 0-100,
  mood 1-10, belief 0-100.
- `input.choice`: `{ label, options: string[], multi?, correctIndex?, scored? }` -
  `correctIndex` gives quiz semantics; `scored` means option index = points
  (self-scoring measures such as PHQ-9-style questionnaires).
- `input.checklist`: `{ label?, items: [{ id, text }] }`
- `input.table`: `{ label, columns: [{ id, header, kind: "text" | "scale",
  min?, max? }], minRows? }` - patient adds rows; exposure logs, activity
  schedules.
- `input.media`: `{ label, mode: "voice" | "drawing", prompt? }`
- `input.activity`: `{ label, activity: "mood-checkin" | "reflection" |
  "breathing" | "quick-practice" | "lesson", target?: string, count?: number }` -
  real app actions. Verification mode derives from the kind (1.5).

Worksheets are sequences: a thought record is `text` -> `input.text` ->
`input.scale` -> `input.text` -> `input.text` -> `input.scale`. No nested
groups; `heading` blocks provide sectioning (YAGNI).

### 1.3 Response (HomeworkAssignment.response)

```ts
{
  version: 2,
  entries: [{ id, date: "YYYY-MM-DD", blocks: Record<blockId, BlockResponse> }],
  feedback?: string,                    // overall therapist feedback (as v1)
  comments?: Record<blockId, string>,   // per-block therapist comments
  reviewedAt?: string,
  revisionRequestedAt?: string          // therapist requested changes
}
```

BlockResponse per type: `{ done }` (ack, checklist uses `{ checked: string[] }`),
`{ text }`, `{ value }` (scale), `{ selected: number[] }` (choice),
`{ rows: Record<colId, string | number>[] }` (table), `{ mediaId }` (media),
`{ selfDone?, verifiedIds? }` (activity; `verifiedIds` server-written only).

One-shot homework is a single entry. Recurring homework appends one dated entry
per cadence unit (max one per day for daily, per ISO week for weekly). Missed
units may be backfilled; entry date is chosen by the patient within the
assignment window.

### 1.4 Completion

- Block complete: per-type rules (scale = value set; table = rows >= minRows ?? 1;
  choice = selection made; media = mediaId; ack = done; checklist = all items;
  activity = verified count >= count ?? 1, or selfDone for self-report kinds).
- Entry complete: all non-optional input blocks (and requireAck texts) complete.
- Expected entries: computed, never stored. `once` = 1. Daily/weekly = calendar
  units between `assignment.createdAt` and `dueDate` inclusive; without a
  dueDate, expected = entries so far + 1 (open-ended; progress shows count).
- Assignment progress = complete entries / expected. Submission stays explicit
  (patient submits; status transitions as today: PENDING -> IN_PROGRESS ->
  COMPLETED). Revision request does not change status; it sets
  `revisionRequestedAt`, and any later patient edit clears it and re-submission
  updates `completedAt`.

### 1.5 Activity verification

- Auto-verified (DB-backed): `mood-checkin` (MoodEntry), `reflection`
  (JournalEntry). Server counts rows created inside `[createdAt, dueDate ?? now]`
  and writes `verifiedIds` on read/save; the patient cannot self-mark these.
- Self-report (no DB record today): `breathing`, `quick-practice`, `lesson`.
  Runner deep-links to the feature and offers "I did this" (`selfDone`).
- Future upgrade (out of scope): an `ActivityEvent` table lets all kinds
  auto-verify; the block schema already supports it (no shape change needed).

### 1.6 Compatibility

- `parseContent` / `parseResponse` in `lib/homework/schema.ts` become
  version-aware: v1 items adapt to blocks at read time (`task` -> checklist with
  one item, `reading` -> text + requireAck, `writing` -> input.text, `quiz` ->
  input.choice with correctIndex, `voice`/`drawing` -> input.media), v1
  responses adapt to entry #0. Pure functions, fully unit-tested. No data
  migration, no dual code paths past the parser.
- All new documents are written as v2. Editing a legacy set re-saves as v2.
- Mobile: v2 assignments return normally over the API; the mobile app's
  unknown-version guard shows "Open on the web to complete this one." (small
  mobile change, listed in phase 5).

## 2. Authoring: three doors, one format

### 2.1 Builder (`/practice/homework/new`, rebuilt)

- Vertical block list; add-block menu grouped Content / Inputs / App activity.
- Per-block inline config form; move up/down, duplicate, delete.
- Cadence picker (once / daily / weekly) at the top with plain-language helper
  ("Patients add one entry per day until the due date").
- Live patient preview pane rendering the real runner component read-only.
- Blueprint aesthetic (glass panels, hairlines, serif headings), mobile-safe.

### 2.2 Presets

`lib/homework/presets.ts`: shipped block documents, loaded via "Start from a
preset" into the builder (fully editable, saved as the therapist's own set):
Thought record; Exposure ladder + practice log (table); Behavioral activation
schedule (table, daily); Sleep diary (daily); Worry log (daily); Mood and
anxiety measure (scored choices). Direct import into the builder (no DB, no
endpoint); presets are constants shipped with the web bundle.

### 2.3 AI drafts

`lib/homework/ai-draft.ts` re-targets the v2 document schema (same guarded
Gemini structured-output flow and model). The prompt documents the block
palette and cadence semantics. Output validates against the v2 zod schema and
opens in the builder; nothing is assignable without therapist review.

## 3. Patient runner (`/homework/[id]`, rebuilt)

- One-shot: blocks render as a single document flow; autosave per change
  (debounced PATCH, as today); explicit Submit.
- Recurring: dated entry strip (chips; today highlighted; add entry for today,
  backfill allowed); selecting an entry opens the same runner scoped to it;
  progress header shows entries complete / expected.
- Activity blocks show verification state live and deep-link to the feature.
- Revision banner when `revisionRequestedAt` is set, surfacing per-block
  comments inline under the relevant blocks.
- States: loading skeletons, error, empty (no blocks = invalid, guarded by
  schema), submitted/read-only with feedback visible.

## 4. Therapist review (assignment detail, extended)

- Entries timeline; per-entry rendered responses using the same block renderers.
- Per-block comment box writing `comments[blockId]`; overall feedback kept.
- Scored choice blocks show summed score per entry (trend across entries when
  recurring).
- Actions: mark reviewed (`reviewedAt`), request changes
  (`revisionRequestedAt`), both in response JSON; no status enum change.

## 5. API surface

Existing routes keep their shapes; payloads carry v2 documents and responses.

- `POST/PATCH` set create/update: validates v2 document schema.
- `PATCH` assignment response: entry upsert `{ entryId?, date, blocks }`;
  server merges, recomputes activity verification, updates status/completedAt.
- Review route: accepts `feedback`, `comments`, `reviewedAt`,
  `revisionRequestedAt` (therapist-only fields stripped from patient writes, as
  today).
- AI draft route: unchanged path, v2 output.
- Reminder cron: unchanged; copy gains cadence awareness ("Today's entry" vs
  "Due soon") in phase 5.

## 6. Testing

- Unit: schema validation, v1 -> v2 adapters (content and response), per-block
  completion, entry completion, expected-entries math (once/daily/weekly, with
  and without dueDate), activity verification counting, choice scoring.
- Pages: runner one-shot and recurring (add entry, backfill, autosave, submit,
  revision banner), builder (add/configure/reorder/preset load/preview), review
  (per-block comments, request changes, scores).
- API: submission merge, therapist-field stripping, activity auto-verify with
  seeded MoodEntry, legacy v1 assignment round-trip.

## 7. Build phases (each ships green)

1. Schema v2 + adapters + completion/expected-entries logic + unit tests.
2. Patient runner (render, respond, entries, autosave, submit, revision banner).
3. Builder + presets + live preview.
4. AI draft v2 + review flow (comments, request changes, scores).
5. Polish: cadence-aware reminder copy, mobile "open on web" guard, docs
   (frontend_pages, capabilities checklist) refresh.

## 8. Risks and mitigations

- Adapter fidelity: legacy sets must render identically; covered by round-trip
  unit tests against captured v1 fixtures.
- Builder complexity creep: block config forms stay minimal (no rich text, no
  conditional logic); YAGNI enforced at review.
- AI drift: v2 schema validation rejects malformed drafts; the builder is the
  only path to save.
- Recurring UX confusion: entry strip copy tested with the plain-language
  helper; backfill capped to the assignment window.
