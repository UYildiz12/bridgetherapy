import { describe, expect, it } from "vitest";
import { isBlockComplete, isEntryComplete, expectedEntries, docProgress, isDocComplete, choiceScore, maxChoiceScore } from "../completion";
import type { Block, HomeworkDoc, HomeworkEntry } from "../blocks";

const D = (blocks: Block[], cadence: "once" | "daily" | "weekly" = "once"): HomeworkDoc => ({
  version: 2,
  schedule: { cadence },
  blocks,
});
const E = (blocks: HomeworkEntry["blocks"]): HomeworkEntry => ({ id: "e1", date: "2026-07-02", blocks });

describe("isBlockComplete", () => {
  it("applies per-type rules", () => {
    expect(isBlockComplete({ type: "text", id: "t", body: "x", requireAck: true }, { done: true })).toBe(true);
    expect(isBlockComplete({ type: "text", id: "t", body: "x" }, undefined)).toBe(true); // no ack required
    expect(isBlockComplete({ type: "input.text", id: "w", label: "W" }, { text: "  " })).toBe(false);
    expect(isBlockComplete({ type: "input.scale", id: "s", label: "S", min: 0, max: 10 }, { value: 7 })).toBe(true);
    expect(isBlockComplete({ type: "input.choice", id: "c", label: "C", options: ["a", "b"] }, { selected: [] })).toBe(false);
    expect(
      isBlockComplete(
        { type: "input.checklist", id: "k", items: [{ id: "k1", text: "a" }, { id: "k2", text: "b" }] },
        { checked: ["k1"] },
      ),
    ).toBe(false);
    expect(
      isBlockComplete(
        { type: "input.table", id: "tb", label: "T", columns: [{ id: "c1", header: "H", kind: "text" }], minRows: 2 },
        { rows: [{ c1: "x" }, { c1: "y" }] },
      ),
    ).toBe(true);
    expect(isBlockComplete({ type: "input.media", id: "m", label: "M", mode: "voice" }, { mediaId: "x" })).toBe(true);
    expect(
      isBlockComplete(
        { type: "input.activity", id: "a", label: "A", activity: "mood-checkin", count: 2 },
        { verifiedIds: ["1"] },
      ),
    ).toBe(false);
    expect(
      isBlockComplete({ type: "input.activity", id: "a", label: "A", activity: "breathing" }, { selfDone: true }),
    ).toBe(true);
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
  it("is inclusive weeks for weekly and null without a due date", () => {
    expect(expectedEntries(doc("weekly"), new Date("2026-07-01"), new Date("2026-07-15"))).toBe(3);
    expect(expectedEntries(doc("daily"), new Date("2026-07-01"), null)).toBeNull();
  });
});

describe("docProgress + isDocComplete + choiceScore", () => {
  it("counts complete entries and sums scored choices", () => {
    const doc = D([{ type: "input.choice", id: "c", label: "C", options: ["0", "1", "2"], scored: true }], "daily");
    const entries: HomeworkEntry[] = [E({ c: { selected: [2] } }), { id: "e2", date: "2026-07-03", blocks: {} }];
    expect(docProgress(doc, entries, 5)).toEqual({ complete: 1, expected: 5 });
    expect(isDocComplete(doc, entries, 5)).toBe(false);
    expect(isDocComplete(doc, [entries[0]], 1)).toBe(true);
    expect(isDocComplete(doc, [entries[0]], null)).toBe(true); // open-ended: any complete entry counts
    expect(choiceScore(doc, entries[0])).toBe(2);
  });
});

describe("maxChoiceScore", () => {
  it("sums the top option index of each scored choice, ignoring unscored blocks", () => {
    const doc = D([
      { type: "input.choice", id: "a", label: "A", options: ["0", "1", "2", "3"], scored: true },
      { type: "input.choice", id: "b", label: "B", options: ["0", "1", "2"], scored: true },
      { type: "input.choice", id: "c", label: "C", options: ["x", "y"] },
      { type: "input.text", id: "t", label: "T" },
    ]);
    expect(maxChoiceScore(doc)).toBe(5);
    expect(maxChoiceScore(D([{ type: "input.text", id: "t", label: "T" }]))).toBe(0);
  });
});
