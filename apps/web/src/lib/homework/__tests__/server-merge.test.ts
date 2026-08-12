// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@exhale/db", () => ({ prisma: {} }));

import { upsertEntry, entryKeyForDate, parseAnyContent, parseAnyResponse } from "../server";
import type { HomeworkDoc, ResponseDoc } from "../blocks";

const doc: HomeworkDoc = {
  version: 2,
  schedule: { cadence: "daily" },
  blocks: [{ type: "input.text", id: "w", label: "W" }],
};
const empty: ResponseDoc = { version: 2, entries: [] };

describe("entryKeyForDate", () => {
  it("keys daily by date, weekly by ISO week, once by constant", () => {
    expect(entryKeyForDate("daily", "2026-07-02")).toBe("2026-07-02");
    expect(entryKeyForDate("weekly", "2026-07-02")).toBe(entryKeyForDate("weekly", "2026-07-03"));
    expect(entryKeyForDate("weekly", "2026-07-05")).not.toBe(entryKeyForDate("weekly", "2026-07-06")); // Sun vs Mon
    expect(entryKeyForDate("once", "2026-07-02")).toBe("once");
  });
});

describe("upsertEntry", () => {
  it("creates a dated entry and merges block responses on repeat saves", () => {
    const r1 = upsertEntry(doc, empty, { date: "2026-07-02", blocks: { w: { text: "a" } } });
    const r2 = upsertEntry(doc, r1, { date: "2026-07-02", blocks: { w: { text: "ab" } } });
    expect(r2.entries).toHaveLength(1);
    expect(r2.entries[0].blocks.w.text).toBe("ab");
  });

  it("keeps separate entries for separate days and sorts them", () => {
    const r1 = upsertEntry(doc, empty, { date: "2026-07-03", blocks: { w: { text: "later" } } });
    const r2 = upsertEntry(doc, r1, { date: "2026-07-02", blocks: { w: { text: "earlier" } } });
    expect(r2.entries.map((e) => e.date)).toEqual(["2026-07-02", "2026-07-03"]);
  });

  it("drops unknown block ids and never lets a patient write verifiedIds", () => {
    const r = upsertEntry(doc, empty, {
      date: "2026-07-02",
      blocks: { w: { text: "x", verifiedIds: ["fake"] }, ghost: { text: "boo" } },
    });
    expect(r.entries[0].blocks.w.verifiedIds).toBeUndefined();
    expect(r.entries[0].blocks.ghost).toBeUndefined();
  });

  it("preserves server-written verifiedIds across patient merges", () => {
    const withVerified: ResponseDoc = {
      version: 2,
      entries: [{ id: "2026-07-02", date: "2026-07-02", blocks: { w: { text: "a", verifiedIds: ["real"] } } }],
    };
    const r = upsertEntry(doc, withVerified, { date: "2026-07-02", blocks: { w: { text: "b" } } });
    expect(r.entries[0].blocks.w.text).toBe("b");
    expect(r.entries[0].blocks.w.verifiedIds).toEqual(["real"]);
  });
});

describe("parseAnyContent / parseAnyResponse", () => {
  it("passes v2 through and keeps v1 in its original shape", () => {
    expect((parseAnyContent(doc) as HomeworkDoc).version).toBe(2);
    const v1 = { items: [{ id: "i1", kind: "writing", title: "W" }] };
    const parsed = parseAnyContent(v1) as { items: unknown[] };
    expect(parsed.items).toHaveLength(1);
    const v2r = parseAnyResponse({ version: 2, entries: [] }) as ResponseDoc;
    expect(v2r.entries).toEqual([]);
    const v1r = parseAnyResponse({ items: { i1: { text: "hi" } } }) as { items: Record<string, unknown> };
    expect(v1r.items.i1).toBeDefined();
  });
});
