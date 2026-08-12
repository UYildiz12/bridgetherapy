# Homework Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed six-item homework model with a composable v2 block-document system (worksheets, scales, tables/logs, recurring entries, app-linked activities, per-block review) with zero DB migration and full v1 compatibility.

**Architecture:** New pure modules `blocks.ts` (v2 zod schemas), `completion.ts` (progress math), `adapt.ts` (v1→v2), `presets.ts` alongside the existing `schema.ts` (v1, kept for adapters + legacy API path). Server gains an entry-upsert merge + activity verification. Patient runner, therapist builder, and review pages are rebuilt against `BlockView` renderers. AI draft re-targets the v2 schema. Spec: `docs/superpowers/specs/2026-07-02-homework-blocks-design.md`.

**Tech Stack:** Next.js App Router, zod, Prisma (Json columns only), vitest + testing-library, existing blueprint UI components.

**Conventions for every task:** run tests with `cd apps/web; npx vitest run <file>`; typecheck with `pnpm --filter web typecheck` from repo root; commit from repo root. Never commit with failing tests.

---

### Task 1: v2 block + response schemas (`blocks.ts`)

**Files:**
- Create: `apps/web/src/lib/homework/blocks.ts`
- Test: `apps/web/src/lib/homework/__tests__/blocks.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/web/src/lib/homework/__tests__/blocks.test.ts
import { describe, expect, it } from "vitest";
import { docSchema, responseDocSchema } from "../blocks";

const doc = (blocks: unknown[]) => ({ version: 2, schedule: { cadence: "once" }, blocks });

describe("docSchema", () => {
  it("accepts a thought-record style document", () => {
    const parsed = docSchema.safeParse(
      doc([
        { type: "heading", id: "h1", text: "Thought record" },
        { type: "text", id: "t1", body: "Catch one sticky thought today." },
        { type: "input.text", id: "sit", label: "Situation", multiline: true },
        { type: "input.scale", id: "before", label: "Belief before", min: 0, max: 100, minLabel: "not at all", maxLabel: "completely" },
        { type: "input.choice", id: "q1", label: "Which trap fits?", options: ["Mind reading", "Catastrophizing"], correctIndex: 1 },
        { type: "input.checklist", id: "c1", items: [{ id: "c1a", text: "Read it out loud" }] },
        { type: "input.table", id: "log", label: "Practice log", columns: [{ id: "col1", header: "What happened", kind: "text" }, { id: "col2", header: "SUDS", kind: "scale", min: 0, max: 100 }], minRows: 2 },
        { type: "input.media", id: "m1", label: "Say it", mode: "voice" },
        { type: "input.activity", id: "a1", label: "Log your mood", activity: "mood-checkin", count: 3 },
      ]),
    );
    expect(parsed.success).toBe(true);
  });

  it("rejects duplicate block ids", () => {
    expect(docSchema.safeParse(doc([
      { type: "heading", id: "x", text: "A" },
      { type: "text", id: "x", body: "B" },
    ])).success).toBe(false);
  });

  it("rejects a scale with max <= min and a choice with correctIndex out of range", () => {
    expect(docSchema.safeParse(doc([{ type: "input.scale", id: "s", label: "S", min: 5, max: 5 }])).success).toBe(false);
    expect(docSchema.safeParse(doc([{ type: "input.choice", id: "c", label: "C", options: ["a", "b"], correctIndex: 2 }])).success).toBe(false);
  });

  it("rejects scored multi-choice", () => {
    expect(docSchema.safeParse(doc([{ type: "input.choice", id: "c", label: "C", options: ["a", "b"], multi: true, scored: true }])).success).toBe(false);
  });
});

describe("responseDocSchema", () => {
  it("accepts entries with flat block responses and therapist fields", () => {
    const parsed = responseDocSchema.safeParse({
      version: 2,
      entries: [{ id: "e1", date: "2026-07-02", blocks: { sit: { text: "Team meeting" }, before: { value: 80 }, q1: { selected: [1] }, c1: { checked: ["c1a"] }, log: { rows: [{ col1: "Bus ride", col2: 60 }] }, m1: { mediaId: "med_1" }, a1: { selfDone: true } } }],
      feedback: "Well done",
      comments: { sit: "Good specificity" },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a malformed entry date", () => {
    expect(responseDocSchema.safeParse({ version: 2, entries: [{ id: "e1", date: "July 2", blocks: {} }] }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/lib/homework/__tests__/blocks.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `blocks.ts`**

```ts
// apps/web/src/lib/homework/blocks.ts
import { z } from "zod";

/**
 * Homework v2: a document of blocks. Content blocks inform; input blocks
 * collect. Responses live per dated entry (one-shot = a single entry), keyed
 * by block id with one flat response shape. See the 2026-07-02 design spec.
 */

const blockId = z.string().min(1).max(40);
const label = z.string().min(1).max(200);

export const ACTIVITY_KINDS = ["mood-checkin", "reflection", "breathing", "quick-practice", "lesson"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];
/** Kinds the server can verify against real DB rows; the rest are self-report. */
export const AUTO_VERIFIED: ReadonlySet<ActivityKind> = new Set(["mood-checkin", "reflection"]);

const headingBlock = z.object({ type: z.literal("heading"), id: blockId, text: z.string().min(1).max(160) });
const textBlock = z.object({ type: z.literal("text"), id: blockId, body: z.string().min(1).max(8000), requireAck: z.boolean().optional() });

const inputBase = { id: blockId, label, optional: z.boolean().optional() };

const textInput = z.object({ type: z.literal("input.text"), ...inputBase, multiline: z.boolean().optional(), placeholder: z.string().max(200).optional() });
const scaleInput = z
  .object({ type: z.literal("input.scale"), ...inputBase, min: z.number().int(), max: z.number().int(), step: z.number().positive().optional(), minLabel: z.string().max(40).optional(), maxLabel: z.string().max(40).optional() })
  .refine((b) => b.max > b.min, { message: "max must exceed min" });
const choiceInput = z
  .object({ type: z.literal("input.choice"), ...inputBase, options: z.array(z.string().min(1).max(300)).min(2).max(10), multi: z.boolean().optional(), correctIndex: z.number().int().min(0).optional(), scored: z.boolean().optional() })
  .refine((b) => b.correctIndex === undefined || b.correctIndex < b.options.length, { message: "correctIndex out of range" })
  .refine((b) => !(b.scored && b.multi), { message: "scored choices must be single-select" });
const checklistInput = z.object({ type: z.literal("input.checklist"), id: blockId, label: label.optional(), optional: z.boolean().optional(), items: z.array(z.object({ id: blockId, text: z.string().min(1).max(300) })).min(1).max(20) });
const tableColumn = z
  .object({ id: blockId, header: z.string().min(1).max(80), kind: z.enum(["text", "scale"]), min: z.number().int().optional(), max: z.number().int().optional() })
  .refine((c) => c.kind !== "scale" || (c.min !== undefined && c.max !== undefined && c.max > c.min), { message: "scale columns need min < max" });
const tableInput = z.object({ type: z.literal("input.table"), ...inputBase, columns: z.array(tableColumn).min(1).max(6), minRows: z.number().int().min(1).max(50).optional() });
const mediaInput = z.object({ type: z.literal("input.media"), ...inputBase, mode: z.enum(["voice", "drawing"]), prompt: z.string().max(500).optional() });
const activityInput = z.object({ type: z.literal("input.activity"), ...inputBase, activity: z.enum(ACTIVITY_KINDS), target: z.string().max(80).optional(), count: z.number().int().min(1).max(50).optional() });

export const blockSchema = z.discriminatedUnion("type", [headingBlock, textBlock, textInput, scaleInput, choiceInput, checklistInput, tableInput, mediaInput, activityInput]);
export type Block = z.infer<typeof blockSchema>;
export type InputBlock = Extract<Block, { type: `input.${string}` }>;

export const scheduleSchema = z.object({ cadence: z.enum(["once", "daily", "weekly"]).default("once") });
export type Cadence = z.infer<typeof scheduleSchema>["cadence"];

export const docSchema = z
  .object({ version: z.literal(2), schedule: scheduleSchema.default({ cadence: "once" }), blocks: z.array(blockSchema).min(1).max(40) })
  .superRefine((doc, ctx) => {
    const seen = new Set<string>();
    doc.blocks.forEach((b, i) => {
      if (seen.has(b.id)) ctx.addIssue({ code: "custom", message: "Duplicate block id", path: ["blocks", i, "id"] });
      seen.add(b.id);
    });
  });
export type HomeworkDoc = z.infer<typeof docSchema>;

// ---- Responses ----
/** One flat shape per block; the block's type decides which fields matter. */
export const blockResponseSchema = z.object({
  done: z.boolean().optional(),
  text: z.string().max(8000).optional(),
  value: z.number().optional(),
  selected: z.array(z.number().int().min(0)).max(10).optional(),
  checked: z.array(z.string()).max(20).optional(),
  rows: z.array(z.record(z.string(), z.union([z.string().max(2000), z.number()]))).max(100).optional(),
  mediaId: z.string().optional(),
  selfDone: z.boolean().optional(),
  verifiedIds: z.array(z.string()).max(100).optional(),
});
export type BlockResponse = z.infer<typeof blockResponseSchema>;

export const entrySchema = z.object({
  id: z.string().min(1).max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  blocks: z.record(z.string(), blockResponseSchema).default({}),
});
export type HomeworkEntry = z.infer<typeof entrySchema>;

export const responseDocSchema = z.object({
  version: z.literal(2),
  entries: z.array(entrySchema).max(120).default([]),
  feedback: z.string().max(4000).optional(),
  comments: z.record(z.string(), z.string().max(2000)).optional(),
  reviewedAt: z.string().optional(),
  revisionRequestedAt: z.string().optional(),
});
export type ResponseDoc = z.infer<typeof responseDocSchema>;

export const isInputBlock = (b: Block): b is InputBlock => b.type.startsWith("input.");
```

- [ ] **Step 4: Run tests** → PASS. Run `pnpm --filter web typecheck` → clean.
- [ ] **Step 5: Commit** — `git add apps/web/src/lib/homework/blocks.ts apps/web/src/lib/homework/__tests__/blocks.test.ts && git commit -m "Add homework v2 block and response schemas"`

---

### Task 2: completion + expected-entries math (`completion.ts`)

**Files:**
- Create: `apps/web/src/lib/homework/completion.ts`
- Test: `apps/web/src/lib/homework/__tests__/completion.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/web/src/lib/homework/__tests__/completion.test.ts
import { describe, expect, it } from "vitest";
import { isBlockComplete, isEntryComplete, expectedEntries, docProgress, choiceScore } from "../completion";
import type { Block, HomeworkDoc, HomeworkEntry } from "../blocks";

const D = (blocks: Block[], cadence: "once" | "daily" | "weekly" = "once"): HomeworkDoc => ({ version: 2, schedule: { cadence }, blocks });
const E = (blocks: HomeworkEntry["blocks"]): HomeworkEntry => ({ id: "e1", date: "2026-07-02", blocks });

describe("isBlockComplete", () => {
  it("applies per-type rules", () => {
    expect(isBlockComplete({ type: "text", id: "t", body: "x", requireAck: true }, { done: true })).toBe(true);
    expect(isBlockComplete({ type: "text", id: "t", body: "x" }, undefined)).toBe(true); // no ack required
    expect(isBlockComplete({ type: "input.text", id: "w", label: "W" }, { text: "  " })).toBe(false);
    expect(isBlockComplete({ type: "input.scale", id: "s", label: "S", min: 0, max: 10 }, { value: 7 })).toBe(true);
    expect(isBlockComplete({ type: "input.choice", id: "c", label: "C", options: ["a", "b"] }, { selected: [] })).toBe(false);
    expect(isBlockComplete({ type: "input.checklist", id: "k", items: [{ id: "k1", text: "a" }, { id: "k2", text: "b" }] }, { checked: ["k1"] })).toBe(false);
    expect(isBlockComplete({ type: "input.table", id: "tb", label: "T", columns: [{ id: "c1", header: "H", kind: "text" }], minRows: 2 }, { rows: [{ c1: "x" }, { c1: "y" }] })).toBe(true);
    expect(isBlockComplete({ type: "input.media", id: "m", label: "M", mode: "voice" }, { mediaId: "x" })).toBe(true);
    expect(isBlockComplete({ type: "input.activity", id: "a", label: "A", activity: "mood-checkin", count: 2 }, { verifiedIds: ["1"] })).toBe(false);
    expect(isBlockComplete({ type: "input.activity", id: "a", label: "A", activity: "breathing" }, { selfDone: true })).toBe(true);
  });
});

describe("isEntryComplete", () => {
  it("requires all non-optional input blocks", () => {
    const doc = D([
      { type: "input.text", id: "w", label: "W" },
      { type: "input.scale", id: "s", label: "S", min: 0, max: 10, optional: true },
    ]);
    expect(isEntryComplete(doc, E({ w: { text: "hi" } }))).toBe(true);
    expect(isEntryComplete(doc, E({ s: { value: 3 } }))).toBe(false);
  });
});

describe("expectedEntries", () => {
  const doc = (c: "once" | "daily" | "weekly") => D([{ type: "input.text", id: "w", label: "W" }], c);
  it("is 1 for once and inclusive-days for daily", () => {
    expect(expectedEntries(doc("once"), new Date("2026-07-01"), new Date("2026-07-05"))).toBe(1);
    expect(expectedEntries(doc("daily"), new Date("2026-07-01T15:00:00Z"), new Date("2026-07-05T00:00:00Z"))).toBe(5);
  });
  it("is inclusive ISO weeks for weekly and null without a due date", () => {
    expect(expectedEntries(doc("weekly"), new Date("2026-07-01"), new Date("2026-07-15"))).toBe(3);
    expect(expectedEntries(doc("daily"), new Date("2026-07-01"), null)).toBeNull();
  });
});

describe("docProgress + choiceScore", () => {
  it("counts complete entries and sums scored choices", () => {
    const doc = D([{ type: "input.choice", id: "c", label: "C", options: ["0", "1", "2"], scored: true }], "daily");
    const entries = [E({ c: { selected: [2] } }), { ...E({}), id: "e2", date: "2026-07-03" }];
    expect(docProgress(doc, entries, 5)).toEqual({ complete: 1, expected: 5 });
    expect(choiceScore(doc, entries[0])).toBe(2);
  });
});
```

- [ ] **Step 2: Run** → FAIL (module not found).
- [ ] **Step 3: Implement**

```ts
// apps/web/src/lib/homework/completion.ts
import type { Block, BlockResponse, HomeworkDoc, HomeworkEntry } from "./blocks";
import { AUTO_VERIFIED, isInputBlock } from "./blocks";

/** Per-type completion. Content blocks are complete unless they require an ack. */
export function isBlockComplete(block: Block, r: BlockResponse | undefined): boolean {
  switch (block.type) {
    case "heading":
      return true;
    case "text":
      return block.requireAck ? r?.done === true : true;
    case "input.text":
      return typeof r?.text === "string" && r.text.trim().length > 0;
    case "input.scale":
      return typeof r?.value === "number";
    case "input.choice":
      return (r?.selected?.length ?? 0) > 0;
    case "input.checklist":
      return block.items.every((it) => r?.checked?.includes(it.id));
    case "input.table":
      return (r?.rows?.length ?? 0) >= (block.minRows ?? 1);
    case "input.media":
      return typeof r?.mediaId === "string" && r.mediaId.length > 0;
    case "input.activity": {
      const need = block.count ?? 1;
      if (AUTO_VERIFIED.has(block.activity)) return (r?.verifiedIds?.length ?? 0) >= need;
      return r?.selfDone === true;
    }
  }
}

export function isEntryComplete(doc: HomeworkDoc, entry: HomeworkEntry): boolean {
  return doc.blocks.every((b) => {
    const requires = (isInputBlock(b) && !b.optional) || (b.type === "text" && b.requireAck);
    return !requires || isBlockComplete(b, entry.blocks[b.id]);
  });
}

const DAY = 86_400_000;
const dayFloor = (d: Date) => Math.floor(d.getTime() / DAY);

/** Expected entry count in [assignedAt, dueDate], or null when open-ended. */
export function expectedEntries(doc: HomeworkDoc, assignedAt: Date, dueDate: Date | null): number | null {
  if (doc.schedule.cadence === "once") return 1;
  if (!dueDate) return null;
  const days = Math.max(0, dayFloor(dueDate) - dayFloor(assignedAt)) + 1;
  return doc.schedule.cadence === "daily" ? days : Math.ceil(days / 7);
}

export function docProgress(doc: HomeworkDoc, entries: HomeworkEntry[], expected: number | null) {
  return { complete: entries.filter((e) => isEntryComplete(doc, e)).length, expected };
}

export function isDocComplete(doc: HomeworkDoc, entries: HomeworkEntry[], expected: number | null): boolean {
  const p = docProgress(doc, entries, expected);
  return expected === null ? p.complete > 0 : p.complete >= expected;
}

/** Sum of selected option indexes across scored single-select choices. */
export function choiceScore(doc: HomeworkDoc, entry: HomeworkEntry): number {
  return doc.blocks.reduce((sum, b) => {
    if (b.type !== "input.choice" || !b.scored) return sum;
    return sum + (entry.blocks[b.id]?.selected?.[0] ?? 0);
  }, 0);
}
```

- [ ] **Step 4: Run tests** → PASS. Typecheck clean.
- [ ] **Step 5: Commit** — `git commit -m "Add homework v2 completion and schedule math"`

---

### Task 3: v1 adapters + version-aware parsers (`adapt.ts`)

**Files:**
- Create: `apps/web/src/lib/homework/adapt.ts`
- Test: `apps/web/src/lib/homework/__tests__/adapt.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/web/src/lib/homework/__tests__/adapt.test.ts
import { describe, expect, it } from "vitest";
import { parseDoc, parseResponseDoc } from "../adapt";

const v1Content = {
  items: [
    { id: "i1", kind: "task", title: "Take a walk", detail: "10 minutes" },
    { id: "i2", kind: "reading", title: "Why exposure works", body: "Long text." },
    { id: "i3", kind: "writing", title: "Reflect", prompt: "What did you notice?" },
    { id: "i4", kind: "quiz", title: "Check", question: "Best next step?", choices: ["Avoid", "Approach"], answerIndex: 1 },
    { id: "i5", kind: "voice", title: "Say it", prompt: "Record" },
    { id: "i6", kind: "drawing", title: "Draw it" },
  ],
};
const v1Response = { items: { i1: { done: true }, i3: { text: "Calmer" }, i4: { choiceIndex: 1 }, i5: { mediaId: "m9" } }, feedback: "Nice" };

describe("parseDoc", () => {
  it("adapts v1 content to a v2 doc preserving ids", () => {
    const doc = parseDoc(v1Content);
    expect(doc.version).toBe(2);
    expect(doc.blocks.map((b) => [b.id, b.type])).toEqual([
      ["i1", "input.checklist"],
      ["i2", "text"],
      ["i3", "input.text"],
      ["i4", "input.choice"],
      ["i5", "input.media"],
      ["i6", "input.media"],
    ]);
  });
  it("passes v2 docs through and returns an empty doc for garbage", () => {
    const v2 = { version: 2, schedule: { cadence: "daily" }, blocks: [{ type: "heading", id: "h", text: "Hi" }] };
    expect(parseDoc(v2).schedule.cadence).toBe("daily");
    expect(parseDoc({ nope: true }).blocks).toEqual([]);
  });
});

describe("parseResponseDoc", () => {
  it("adapts a v1 response into entry #0 against the adapted doc", () => {
    const rd = parseResponseDoc(v1Content, v1Response);
    expect(rd.entries).toHaveLength(1);
    const b = rd.entries[0].blocks;
    expect(b.i1.checked).toEqual(["i1.do"]);
    expect(b.i3.text).toBe("Calmer");
    expect(b.i4.selected).toEqual([1]);
    expect(b.i5.mediaId).toBe("m9");
    expect(rd.feedback).toBe("Nice");
  });
  it("passes v2 responses through and defaults garbage to empty entries", () => {
    expect(parseResponseDoc(v1Content, { version: 2, entries: [] }).entries).toEqual([]);
    expect(parseResponseDoc(v1Content, null).entries).toEqual([]);
  });
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**

```ts
// apps/web/src/lib/homework/adapt.ts
import { docSchema, responseDocSchema, type Block, type HomeworkDoc, type ResponseDoc } from "./blocks";
import { setContentSchema, responseSchema, type HomeworkItem } from "./schema";

/** v1 item -> v2 block, preserving the item id so responses keep their key. */
function adaptItem(item: HomeworkItem): Block {
  switch (item.kind) {
    case "task":
      return { type: "input.checklist", id: item.id, label: item.title, items: [{ id: `${item.id}.do`, text: item.detail?.trim() || item.title }] };
    case "reading":
      return { type: "text", id: item.id, body: `${item.title}\n\n${item.body}`, requireAck: true };
    case "writing":
      return { type: "input.text", id: item.id, label: item.title, multiline: true, placeholder: item.prompt };
    case "quiz":
      return { type: "input.choice", id: item.id, label: item.question, options: item.choices, correctIndex: item.answerIndex };
    case "voice":
      return { type: "input.media", id: item.id, label: item.title, mode: "voice", prompt: item.prompt };
    case "drawing":
      return { type: "input.media", id: item.id, label: item.title, mode: "drawing", prompt: item.prompt };
  }
}

const EMPTY_DOC: HomeworkDoc = { version: 2, schedule: { cadence: "once" }, blocks: [] };

/** Version-aware content parser: v2 passthrough, v1 adapted, garbage -> empty. */
export function parseDoc(raw: unknown): HomeworkDoc {
  const v2 = docSchema.safeParse(raw);
  if (v2.success) return v2.data;
  const v1 = setContentSchema.safeParse(raw);
  if (v1.success) return { version: 2, schedule: { cadence: "once" }, blocks: v1.data.items.map(adaptItem) };
  return EMPTY_DOC;
}

/** Version-aware response parser. v1 responses become entry #0. */
export function parseResponseDoc(rawContent: unknown, rawResponse: unknown): ResponseDoc {
  const v2 = responseDocSchema.safeParse(rawResponse ?? {});
  if (v2.success) return v2.data;
  const v1r = responseSchema.safeParse(rawResponse ?? {});
  const v1c = setContentSchema.safeParse(rawContent);
  if (!v1r.success || Object.keys(v1r.data.items).length === 0) {
    return { version: 2, entries: [], feedback: v1r.success ? v1r.data.feedback : undefined, reviewedAt: v1r.success ? v1r.data.reviewedAt : undefined };
  }
  const kinds = new Map((v1c.success ? v1c.data.items : []).map((i) => [i.id, i.kind] as const));
  const blocks: Record<string, Record<string, unknown>> = {};
  for (const [id, r] of Object.entries(v1r.data.items)) {
    const kind = kinds.get(id);
    blocks[id] = {
      ...(kind === "task" && r.done ? { checked: [`${id}.do`] } : {}),
      ...(kind === "reading" ? { done: r.done } : {}),
      ...(r.text !== undefined ? { text: r.text } : {}),
      ...(r.choiceIndex !== undefined ? { selected: [r.choiceIndex] } : {}),
      ...(r.mediaId !== undefined ? { mediaId: r.mediaId } : {}),
    };
  }
  return {
    version: 2,
    entries: [{ id: "legacy", date: "1970-01-01", blocks: blocks as ResponseDoc["entries"][number]["blocks"] }],
    feedback: v1r.data.feedback,
    reviewedAt: v1r.data.reviewedAt,
  };
}
```

- [ ] **Step 4: Run tests** → PASS. Also run the full lib folder: `npx vitest run src/lib/homework` → all green (v1 tests untouched). Typecheck.
- [ ] **Step 5: Commit** — `git commit -m "Add v1 to v2 homework adapters"`

---

### Task 4: presets (`presets.ts`)

**Files:**
- Create: `apps/web/src/lib/homework/presets.ts`
- Test: `apps/web/src/lib/homework/__tests__/presets.test.ts`

- [ ] **Step 1: Failing test**

```ts
// apps/web/src/lib/homework/__tests__/presets.test.ts
import { describe, expect, it } from "vitest";
import { PRESETS } from "../presets";
import { docSchema } from "../blocks";

describe("PRESETS", () => {
  it("ships six presets that all validate against the v2 schema", () => {
    expect(PRESETS).toHaveLength(6);
    for (const p of PRESETS) {
      expect(p.title.length).toBeGreaterThan(0);
      const parsed = docSchema.safeParse(p.doc);
      expect(parsed.success, `${p.id}: ${JSON.stringify(parsed.success ? "" : parsed.error.issues[0])}`).toBe(true);
    }
  });
  it("includes a daily-cadence diary and a scored measure", () => {
    expect(PRESETS.some((p) => p.doc.schedule.cadence === "daily")).toBe(true);
    expect(PRESETS.some((p) => p.doc.blocks.some((b) => b.type === "input.choice" && b.scored))).toBe(true);
  });
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** — `PRESETS: { id, title, description, doc: HomeworkDoc }[]` with exactly these six (write full block arrays; abbreviated here only for the two shown, the engineer writes all six following the same pattern and clinical content from `lib/lessons.ts` phrasing):

```ts
// apps/web/src/lib/homework/presets.ts
import type { HomeworkDoc } from "./blocks";

export interface HomeworkPreset { id: string; title: string; description: string; doc: HomeworkDoc; }

const thoughtRecord: HomeworkDoc = {
  version: 2,
  schedule: { cadence: "once" },
  blocks: [
    { type: "text", id: "intro", body: "Catch one sticky thought and walk it through the columns. Accurate and fair beats positive." },
    { type: "input.text", id: "situation", label: "Situation", multiline: true, placeholder: "Where were you? What happened?" },
    { type: "input.text", id: "emotion", label: "Emotion", placeholder: "One or two words" },
    { type: "input.scale", id: "intensity-before", label: "How strong is it?", min: 0, max: 100, minLabel: "barely", maxLabel: "overwhelming" },
    { type: "input.text", id: "thought", label: "Automatic thought", multiline: true, placeholder: "Word for word, as it showed up" },
    { type: "input.text", id: "evidence-for", label: "Evidence for", multiline: true },
    { type: "input.text", id: "evidence-against", label: "Evidence against", multiline: true },
    { type: "input.text", id: "balanced", label: "A fairer thought", multiline: true },
    { type: "input.scale", id: "intensity-after", label: "And now, how strong?", min: 0, max: 100, minLabel: "barely", maxLabel: "overwhelming" },
  ],
};

const sleepDiary: HomeworkDoc = {
  version: 2,
  schedule: { cadence: "daily" },
  blocks: [
    { type: "text", id: "intro", body: "Fill this in each morning, within an hour of waking if you can." },
    { type: "input.scale", id: "rested", label: "How rested do you feel?", min: 1, max: 10 },
    { type: "input.text", id: "bedtime", label: "Lights out / lights on", placeholder: "23:30 / 07:10" },
    { type: "input.scale", id: "latency", label: "Roughly how long to fall asleep (minutes)?", min: 0, max: 120, step: 5 },
    { type: "input.text", id: "notes", label: "Anything that helped or got in the way?", multiline: true, optional: true },
  ],
};

// The engineer adds, following the exact same shape:
// - exposureLadder: heading + input.table (columns: situation text, SUDS scale 0-100) minRows 5, plus input.table practice log (what/date/SUDS before/after)
// - activationSchedule: daily cadence; input.table (columns: activity text, done text) + input.scale mood + input.activity mood-checkin
// - worryLog: daily cadence; input.text worry, input.choice ["Solvable now", "Hypothetical"], input.text next step (optional)
// - moodMeasure: heading + four scored input.choice blocks (options ordered none->severe) + input.scale overall

export const PRESETS: HomeworkPreset[] = [
  { id: "thought-record", title: "Thought record", description: "Classic seven-column CBT worksheet.", doc: thoughtRecord },
  { id: "sleep-diary", title: "Sleep diary", description: "A short morning entry, daily until the due date.", doc: sleepDiary },
  { id: "exposure-ladder", title: "Exposure ladder and practice log", description: "Build the ladder, then log each practice.", doc: exposureLadder },
  { id: "activation-schedule", title: "Behavioral activation schedule", description: "Plan small activities and track mood.", doc: activationSchedule },
  { id: "worry-log", title: "Worry log", description: "Sort worries into solvable and hypothetical, daily.", doc: worryLog },
  { id: "mood-measure", title: "Mood and anxiety measure", description: "A short scored check, comparable over time.", doc: moodMeasure },
];
```

- [ ] **Step 4: Run tests** → PASS. Typecheck.
- [ ] **Step 5: Commit** — `git commit -m "Add homework presets"`

---

### Task 5: server merge + activity verification

**Files:**
- Modify: `apps/web/src/lib/homework/server.ts` (append)
- Modify: `apps/web/src/app/api/homework/[id]/route.ts` (PATCH branches on v2 body)
- Test: `apps/web/src/lib/homework/__tests__/server-merge.test.ts`

- [ ] **Step 1: Failing tests for the pure merge**

```ts
// apps/web/src/lib/homework/__tests__/server-merge.test.ts
import { describe, expect, it } from "vitest";
import { upsertEntry, entryKeyForDate } from "../server";
import type { HomeworkDoc, ResponseDoc } from "../blocks";

const doc: HomeworkDoc = { version: 2, schedule: { cadence: "daily" }, blocks: [{ type: "input.text", id: "w", label: "W" }] };
const empty: ResponseDoc = { version: 2, entries: [] };

describe("upsertEntry", () => {
  it("creates a dated entry and merges block responses into it on repeat saves", () => {
    const r1 = upsertEntry(doc, empty, { date: "2026-07-02", blocks: { w: { text: "a" } } });
    const r2 = upsertEntry(doc, r1, { date: "2026-07-02", blocks: { w: { text: "ab" } } });
    expect(r2.entries).toHaveLength(1);
    expect(r2.entries[0].blocks.w.text).toBe("ab");
  });
  it("keys daily entries by date and weekly entries by ISO week", () => {
    expect(entryKeyForDate("daily", "2026-07-02")).toBe("2026-07-02");
    expect(entryKeyForDate("weekly", "2026-07-02")).toBe(entryKeyForDate("weekly", "2026-07-03"));
    expect(entryKeyForDate("once", "2026-07-02")).toBe("once");
  });
  it("never lets a patient write verifiedIds", () => {
    const r = upsertEntry(doc, empty, { date: "2026-07-02", blocks: { w: { text: "x", verifiedIds: ["fake"] } } });
    expect(r.entries[0].blocks.w.verifiedIds).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement in `server.ts`** (append; keep all existing exports):

```ts
// append to apps/web/src/lib/homework/server.ts
import { blockResponseSchema, entrySchema, type Cadence, type HomeworkDoc, type ResponseDoc, AUTO_VERIFIED } from "./blocks";
import { z } from "zod";

/** Entries collapse to one per cadence unit; this is the collapse key. */
export function entryKeyForDate(cadence: Cadence, date: string): string {
  if (cadence === "once") return "once";
  if (cadence === "daily") return date;
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Monday=0
  d.setUTCDate(d.getUTCDate() - day);
  return `wk-${d.toISOString().slice(0, 10)}`;
}

export const entryPatchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  blocks: z.record(z.string(), blockResponseSchema),
});
export type EntryPatch = z.infer<typeof entryPatchSchema>;

/** Pure merge: find (or create) the entry for the date's cadence key, merge block responses. Strips server-only fields from the patch. */
export function upsertEntry(doc: HomeworkDoc, current: ResponseDoc, patch: EntryPatch): ResponseDoc {
  const key = entryKeyForDate(doc.schedule.cadence, patch.date);
  const knownIds = new Set(doc.blocks.map((b) => b.id));
  const clean: ResponseDoc["entries"][number]["blocks"] = {};
  for (const [id, r] of Object.entries(patch.blocks)) {
    if (!knownIds.has(id)) continue;
    const { verifiedIds: _server, ...rest } = r; // patients cannot assert verification
    clean[id] = rest;
  }
  const entries = [...current.entries];
  const idx = entries.findIndex((e) => entryKeyForDate(doc.schedule.cadence, e.date) === key);
  if (idx === -1) {
    entries.push(entrySchema.parse({ id: key, date: patch.date, blocks: clean }));
  } else {
    entries[idx] = { ...entries[idx], blocks: { ...entries[idx].blocks, ...Object.fromEntries(Object.entries(clean).map(([id, r]) => [id, { ...entries[idx].blocks[id], ...r, verifiedIds: entries[idx].blocks[id]?.verifiedIds }])) } };
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));
  return { ...current, entries };
}
```

Then an async verifier (same file) used by the route; it queries prisma and writes `verifiedIds` for auto-verified activity blocks:

```ts
export async function verifyActivities(doc: HomeworkDoc, response: ResponseDoc, patientUserId: string, windowStart: Date, windowEnd: Date): Promise<ResponseDoc> {
  const activityBlocks = doc.blocks.filter((b) => b.type === "input.activity" && AUTO_VERIFIED.has(b.activity));
  if (activityBlocks.length === 0 || response.entries.length === 0) return response;
  const [moods, notes] = await Promise.all([
    prisma.moodEntry.findMany({ where: { userId: patientUserId, createdAt: { gte: windowStart, lte: windowEnd } }, select: { id: true } }),
    prisma.journalEntry.findMany({ where: { authorId: patientUserId, createdAt: { gte: windowStart, lte: windowEnd } }, select: { id: true } }),
  ]);
  const idsFor = (kind: string) => (kind === "mood-checkin" ? moods : notes).map((r) => r.id);
  const entries = response.entries.map((e) => ({
    ...e,
    blocks: Object.fromEntries(
      Object.entries({ ...Object.fromEntries(activityBlocks.map((b) => [b.id, e.blocks[b.id] ?? {}])), ...e.blocks }).map(([id, r]) => {
        const block = activityBlocks.find((b) => b.id === id);
        return block ? [id, { ...r, verifiedIds: idsFor(block.type === "input.activity" ? block.activity : "") }] : [id, r];
      }),
    ),
  }));
  return { ...response, entries };
}
```

NOTE: check the actual Prisma model/field names before writing (`MoodEntry.userId` vs `patientId`, `JournalEntry.authorId`) with `grep -n "model MoodEntry" -A 10 packages/db/prisma/schema.prisma` and adjust.

- [ ] **Step 4: Extend `PATCH /api/homework/[id]`** — read the existing route first; add a v2 branch while keeping the v1 branch verbatim (mobile sends v1 bodies for v1 assignments):

```ts
// inside PATCH handler, after auth/ownership checks and loading the assignment row `a`:
const body = await req.json();
if (body && typeof body === "object" && "entry" in body) {
  const parsed = z.object({ entry: entryPatchSchema, submit: z.boolean().optional() }).safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid entry");
  const doc = parseDoc(a.homework.content);
  let responseDoc = parseResponseDoc(a.homework.content, a.response);
  responseDoc = upsertEntry(doc, responseDoc, parsed.data.entry);
  responseDoc = await verifyActivities(doc, responseDoc, user.id, a.createdAt, a.dueDate ?? new Date());
  const expected = expectedEntries(doc, a.createdAt, a.dueDate);
  const complete = isDocComplete(doc, responseDoc.entries, expected);
  const submitting = parsed.data.submit === true && complete;
  if (responseDoc.revisionRequestedAt) responseDoc = { ...responseDoc, revisionRequestedAt: undefined };
  const updated = await prisma.homeworkAssignment.update({
    where: { id: a.id },
    data: { response: asJson(responseDoc), status: submitting ? "COMPLETED" : "IN_PROGRESS", completedAt: submitting ? new Date() : a.completedAt },
  });
  return jsonOk(toPatientAssignmentDTO({ ...updated, homework: a.homework }));
}
// ...existing v1 handling continues unchanged below
```

Match the route's real helper names (`jsonOk` / response shape) to what is already in the file; keep therapist-only fields unwritable from this route.

- [ ] **Step 5: Run merge tests + full homework tests + api homework tests** → green. Typecheck.
- [ ] **Step 6: Commit** — `git commit -m "Add v2 entry merge, activity verification, and PATCH branch"`

---

### Task 6: patient block renderers (`BlockView`)

**Files:**
- Create: `apps/web/src/components/homework/block-view.tsx`
- Test: `apps/web/src/components/homework/__tests__/block-view.test.tsx`

One client component that renders any block and edits its flat response. Props contract:

```ts
export function BlockView({ block, response, onChange, readOnly }: {
  block: Block;
  response: BlockResponse | undefined;
  onChange: (next: BlockResponse) => void;   // merged upstream
  readOnly?: boolean;
})
```

- [ ] **Step 1: Failing tests** — render each block type, assert visible labels; fire change on text (typing calls onChange with `{text}`), scale (range input sets `{value}`), choice (click option → `{selected:[i]}`, multi appends), checklist (toggle id), table (add row button appends empty row; per-cell edit), media reuses existing `VoiceRecorder` / drawing components from `components/homework/` (import the same ones the v1 runner uses — check `app/(app)/homework/[id]/page.tsx` imports first), activity renders a link (`/mood` for mood-checkin, `/notes` reflection, `/wellness` others) and, for self-report kinds, an "I did this" toggle setting `{selfDone:true}`; auto-verified kinds show `verified n of count` text and no toggle.
- [ ] **Step 2-4: Implement + green.** Styling: blueprint language (hairline borders, `rounded-2xl` glass for group panels, serif for scale value numerals via `var(--font-instrument-serif)`), matching mood/reports pages. Scale = native range input styled like the reports rail with the current value shown in serif; table = minimal grid with an "Add row" ghost button.
- [ ] **Step 5: Commit** — `git commit -m "Add homework block renderers"`

---### Task 7: patient runner rebuild

**Files:**
- Modify: `apps/web/src/app/(app)/homework/[id]/page.tsx` (full rewrite, ~127 lines today — read it first for `fetchMyAssignment`/`saveMyResponse` usage and autosave pattern)
- Modify: `apps/web/src/lib/homework/client.ts` (add `saveMyEntry`)
- Test: `apps/web/src/app/(app)/homework/__tests__/runner.test.tsx`

- [ ] **Step 1: Add client fn**

```ts
export const saveMyEntry = (id: string, entry: { date: string; blocks: Record<string, unknown> }, submit?: boolean) =>
  send<PatientAssignment>(`/api/homework/${id}`, "PATCH", { entry, submit });
```

(match the file's existing `send` helper name and DTO types.)

- [ ] **Step 2: Failing page tests** — mock `@/lib/homework/client`; assignment fixture with a v2 daily doc; assert: renders blocks; typing autosaves (debounced fn called with entry for today); entry strip shows expected count from dueDate; "Add today's entry" creates today's entry; a complete one-shot enables Submit which calls `saveMyEntry(..., submit=true)`; `revisionRequestedAt` set → banner with per-block comments visible; v1 fixture (old items/response) still renders via adapters.
- [ ] **Step 3: Implement page** — structure:
  - `parseDoc`/`parseResponseDoc` on the fetched assignment (swr-lite for the fetch, key `homework-${id}`).
  - `cadence === "once"`: single implicit entry (today or the existing one); blocks in a document flow.
  - recurring: entry chip strip (dates from `assignment.createdAt`→`dueDate` for daily; weeks for weekly; cap at expected; future dates disabled), selected entry renders below; chips show a filled dot when their entry is complete.
  - autosave: per-block onChange updates local state and debounce-saves `{date, blocks: {changedId: resp}}` (600ms, like the v1 page's pattern).
  - Progress header: `docProgress` + `expectedEntries`; Submit button enabled when `isDocComplete`; submitted view is read-only with feedback + comments shown under blocks.
- [ ] **Step 4: Green + typecheck.** Also flip the homework LIST page progress line (`app/(app)/homework/page.tsx:47-48`, currently `countComplete(a.set.content, a.response)`) to v2: `const doc = parseDoc(a.set.content); const rd = parseResponseDoc(a.set.content, a.response); const p = docProgress(doc, rd.entries, expectedEntries(doc, new Date(a.createdAt), a.dueDate ? new Date(a.dueDate) : null));` and render `p.complete of p.expected ?? "ongoing"` entries (adjust the existing list test fixture accordingly).
- [ ] **Step 5: Commit** — `git commit -m "Rebuild patient homework runner on blocks"`

---

### Task 8: therapist builder rebuild

**Files:**
- Modify: `apps/web/src/app/(app)/practice/homework/new/page.tsx` (full rewrite; supports `?preset=<id>` and `?edit=<setId>`)
- Create: `apps/web/src/components/homework/block-editor.tsx`
- Modify: `apps/web/src/app/(app)/practice/homework/page.tsx` (add "Start from a preset" menu + edit links; read file first)
- Test: `apps/web/src/components/homework/__tests__/block-editor.test.tsx`

- [ ] **Step 1: Failing tests** — BlockEditor: add block of each family from the grouped menu (Content / Inputs / App activity); edit its config fields; move up/down; duplicate; delete; cadence select round-trips; `onChange(doc)` emits a schema-valid doc; loading a preset doc populates the editor.
- [ ] **Step 2: Implement `BlockEditor`** — controlled component `{ value: HomeworkDoc, onChange }`; block rows with type icon, config inputs per type (label/body/options textarea one-per-line/scale min-max-labels/table column list with add-remove/checklist item list/activity kind select + count), up/down/duplicate/delete icon buttons; new-block ids via `crypto.randomUUID().slice(0, 8)`.
- [ ] **Step 3: Rebuild `new/page.tsx`** — left: title/description inputs + cadence + BlockEditor; right (lg+): sticky live preview rendering `BlockView` per block with a local scratch response state labeled "Patient preview"; actions: Save set (POST or PATCH via existing `client.ts` set fns — check names with `grep -n "createSet\|updateSet" apps/web/src/lib/homework/client.ts`), Start-from-preset (loads `PRESETS` doc), and keep the existing AI-draft entry point wired but feed its output through `parseDoc` (it emits v1 until Task 10 — the adapter makes this seamless).
- [ ] **Step 4: Green + typecheck; keep existing practice/homework page tests passing (update fixtures where the copy changed).**
- [ ] **Step 5: Commit** — `git commit -m "Rebuild homework builder on blocks with presets"`

---

### Task 9: review flow (entries, per-block comments, revision, scores)

**Files:**
- Modify: therapist assignment review page (locate with `grep -rn "ReviewDetail\|review" apps/web/src/app/(app)/practice/assignments --include="*.tsx" -l`)
- Modify: `apps/web/src/app/api/therapist/assignments/[id]/review/route.ts`
- Modify: `apps/web/src/lib/homework/client.ts` (review call gains `comments`, `requestRevision`)
- Test: extend the existing review page + route tests in place

- [ ] **Step 1: Failing tests** — route: accepts `{feedback?, comments?, reviewed?, requestRevision?}`, writes `comments`/`reviewedAt`/`revisionRequestedAt` into the response JSON (merging, not clobbering entries); page: renders entries timeline (dated), block answers read-only via `BlockView readOnly`, comment input per block saving `comments[blockId]`, score line for scored docs (`choiceScore` per entry), "Request changes" button.
- [ ] **Step 2: Implement route** — parse body with zod; load assignment (existing ownership checks); `const rd = parseResponseDoc(content, a.response)`; merge fields (`reviewed: true → reviewedAt = now`, `requestRevision: true → revisionRequestedAt = now`); save via `asJson`.
- [ ] **Step 3: Implement page** — entries as vertical timeline (chip per date + per-entry score when scored); blocks rendered with `BlockView readOnly` + comment textarea under each input block; overall feedback box kept.
- [ ] **Step 4: Green + typecheck.**
- [ ] **Step 5: Commit** — `git commit -m "Add per-block review, revision requests, and scores"`

---

### Task 10: AI draft v2

**Files:**
- Modify: `apps/web/src/lib/homework/ai-draft.ts`
- Test: `apps/web/src/lib/homework/__tests__/ai-draft.test.ts` (exists — extend)

- [ ] **Step 1: Failing test** — draft schema now validates `content` against `docSchema`; prompt text mentions every block type and cadence rules; a fixture Gemini reply containing a v2 doc parses.
- [ ] **Step 2: Implement** — swap `setContentSchema` → `docSchema` in `draftSchema`; rewrite the system prompt: list the nine block types with their exact JSON fields (copy from `blocks.ts`), cadence semantics ("daily/weekly homework is a template the patient fills per day/week"), rules (2-12 blocks, lead with a short `text` intro, prefer scales for ratings, tables for logs, never invent activity kinds beyond the enum).
- [ ] **Step 3: Green (all ai-draft tests) + typecheck.**
- [ ] **Step 4: Commit** — `git commit -m "Retarget AI homework drafts to v2 blocks"`

---

### Task 11: polish + gates + ship

**Files:**
- Modify: reminder cron copy (locate with `grep -rn "due" apps/web/src/app/api/cron -l`) — cadence-aware line: daily/weekly assignments say "Today's entry is waiting" instead of "Due soon" (read the cron file first; keep payload shape).
- Modify: `apps/mobile` homework screen (locate the assignment renderer) — if `content.version === 2`, render title/description + "Open Exhale on the web to complete this one." instead of items.
- Modify: `docs/frontend_pages.md` (homework rows) + `docs/capabilities_checklist.md` (homework line mentions blocks/recurrence) to match reality.

- [ ] **Step 1: Implement the three above.**
- [ ] **Step 2: Full gates** — `pnpm --filter web typecheck`; `cd apps/web; npx vitest run` (all green); `npx dotenv-cli -e ../../.env -- pnpm build` (dev server stopped first).
- [ ] **Step 3: Commit** — `git commit -m "Cadence-aware reminders, mobile v2 guard, docs"`
- [ ] **Step 4: Working-version demo** — start the dev server; verify as the walkthrough in the final report (builder: preset → tweak → save → assign; patient: recurring entries + worksheet + submit; review: comments + request changes). Push + deploy only on user sign-off.

---

## Self-review notes

- Spec coverage: schemas §1↔Task 1-3, presets §2.2↔Task 4, server/API §5↔Task 5, runner §3↔Task 6-7, builder §2.1↔Task 8, review §4↔Task 9, AI §2.3↔Task 10, polish §5/§7↔Task 11. Activity verification limited to mood/reflection per spec §1.5.
- Type consistency: `parseDoc`/`parseResponseDoc` (Task 3) are the only entry points used by Tasks 5-9; `BlockResponse` flat shape used everywhere; `expectedEntries(doc, assignedAt, dueDate)` signature identical in Tasks 2, 5, 7.
- Known judgment calls for the engineer: match existing helper names in routes/client rather than the placeholders `jsonOk`/`send`; check Prisma field names before `verifyActivities`; keep v1 API branch untouched for mobile.
