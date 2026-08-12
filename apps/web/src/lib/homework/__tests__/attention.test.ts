import { describe, expect, it } from "vitest";
import {
  byAttention,
  currentUnit,
  dailyStreak,
  entryParts,
  localDate,
  patientHomeworkInfo,
  reviewBucket,
} from "../attention";
import type { Block, HomeworkDoc, HomeworkEntry } from "../blocks";

const D = (blocks: Block[], cadence: "once" | "daily" | "weekly" = "once"): HomeworkDoc => ({
  version: 2,
  schedule: { cadence },
  blocks,
});
const E = (date: string, blocks: HomeworkEntry["blocks"]): HomeworkEntry => ({ id: date, date, blocks });

const NOW = new Date("2026-07-06T12:00:00"); // a Monday, local time
const daysAgo = (n: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return localDate(d);
};

const dailyDoc = D([{ type: "input.text", id: "w", label: "W" }], "daily");
const doneEntry = (date: string) => E(date, { w: { text: "x" } });

describe("entryParts", () => {
  it("counts required blocks only, done vs total", () => {
    const doc = D([
      { type: "heading", id: "h", text: "T" },
      { type: "text", id: "t", body: "b", requireAck: true },
      { type: "input.text", id: "w", label: "W" },
      { type: "input.scale", id: "s", label: "S", min: 0, max: 10, optional: true },
    ]);
    expect(entryParts(doc, E("2026-07-06", { t: { done: true } }))).toEqual({ done: 1, total: 2 });
    expect(entryParts(doc, undefined)).toEqual({ done: 0, total: 2 });
  });
});

describe("dailyStreak", () => {
  it("counts consecutive complete days ending today", () => {
    const entries = [doneEntry(daysAgo(2)), doneEntry(daysAgo(1)), doneEntry(daysAgo(0))];
    expect(dailyStreak(dailyDoc, entries, NOW)).toBe(3);
  });

  it("tolerates today being still open, but breaks on a missed day", () => {
    expect(dailyStreak(dailyDoc, [doneEntry(daysAgo(2)), doneEntry(daysAgo(1))], NOW)).toBe(2);
    expect(dailyStreak(dailyDoc, [doneEntry(daysAgo(3)), doneEntry(daysAgo(1))], NOW)).toBe(1);
    expect(dailyStreak(dailyDoc, [doneEntry(daysAgo(3)), doneEntry(daysAgo(2))], NOW)).toBe(0);
  });

  it("ignores incomplete entries and non-daily docs", () => {
    expect(dailyStreak(dailyDoc, [E(daysAgo(0), { w: { text: " " } })], NOW)).toBe(0);
    expect(dailyStreak(D([{ type: "input.text", id: "w", label: "W" }], "weekly"), [doneEntry(daysAgo(0))], NOW)).toBe(0);
  });
});

describe("currentUnit", () => {
  it("is null for one-shot docs", () => {
    expect(currentUnit(D([{ type: "input.text", id: "w", label: "W" }]), [], NOW)).toBeNull();
  });

  it("tracks today's entry for daily docs", () => {
    expect(currentUnit(dailyDoc, [], NOW)).toEqual({ unit: "day", done: false });
    expect(currentUnit(dailyDoc, [doneEntry(daysAgo(0))], NOW)).toEqual({ unit: "day", done: true });
    expect(currentUnit(dailyDoc, [doneEntry(daysAgo(1))], NOW)).toEqual({ unit: "day", done: false });
  });

  it("tracks this week's entry for weekly docs", () => {
    const weekly = D([{ type: "input.text", id: "w", label: "W" }], "weekly");
    // NOW is Monday 2026-07-06; last Friday is the previous week.
    expect(currentUnit(weekly, [doneEntry("2026-07-03")], NOW)).toEqual({ unit: "week", done: false });
    expect(currentUnit(weekly, [doneEntry("2026-07-06")], NOW)).toEqual({ unit: "week", done: true });
  });
});

describe("patientHomeworkInfo + byAttention", () => {
  const base = {
    status: "IN_PROGRESS",
    dueDate: null as string | null,
    createdAt: "2026-07-01T00:00:00Z",
    response: { version: 2, entries: [] },
  };
  const oneShot = { ...base, set: { content: D([{ type: "input.text", id: "w", label: "W" }]) } };

  it("ranks revision requests above overdue above today's entry above the rest", () => {
    const revision = patientHomeworkInfo(
      { ...oneShot, status: "COMPLETED", response: { version: 2, entries: [], revisionRequestedAt: "2026-07-05T00:00:00Z" } },
      NOW,
    );
    const overdue = patientHomeworkInfo({ ...oneShot, status: "OVERDUE" }, NOW);
    const todayDue = patientHomeworkInfo({ ...base, set: { content: dailyDoc } }, NOW);
    const plain = patientHomeworkInfo(oneShot, NOW);
    const waiting = patientHomeworkInfo({ ...oneShot, status: "COMPLETED" }, NOW);
    const reviewed = patientHomeworkInfo(
      { ...oneShot, status: "COMPLETED", response: { version: 2, entries: [], reviewedAt: "2026-07-05T00:00:00Z", feedback: "Nice" } },
      NOW,
    );
    const order = [reviewed, waiting, plain, todayDue, overdue, revision].sort(byAttention);
    expect(order.map((i) => i.priority)).toEqual([0, 1, 2, 3, 5, 6]);
    expect(reviewed.hasFeedback).toBe(true);
    expect(reviewed.reviewed).toBe(true);
  });

  it("breaks ties by nearest due date, undated last", () => {
    const soon = patientHomeworkInfo({ ...oneShot, dueDate: "2026-07-08T00:00:00Z" }, NOW);
    const later = patientHomeworkInfo({ ...oneShot, dueDate: "2026-07-20T00:00:00Z" }, NOW);
    const undated = patientHomeworkInfo(oneShot, NOW);
    expect([undated, later, soon].sort(byAttention).map((i) => i.dueAt)).toEqual([
      new Date("2026-07-08T00:00:00Z").getTime(),
      new Date("2026-07-20T00:00:00Z").getTime(),
      null,
    ]);
  });

  it("computes percent for bounded work and leaves open-ended recurring null", () => {
    const bounded = patientHomeworkInfo(
      {
        ...base,
        set: { content: dailyDoc },
        createdAt: "2026-07-04T00:00:00",
        dueDate: "2026-07-07T00:00:00",
        response: { version: 2, entries: [doneEntry(daysAgo(1)), doneEntry(daysAgo(0))] },
      },
      NOW,
    );
    expect(bounded.expected).toBe(4);
    expect(bounded.pct).toBe(50);
    const openEnded = patientHomeworkInfo({ ...base, set: { content: dailyDoc } }, NOW);
    expect(openEnded.pct).toBeNull();
    const half = patientHomeworkInfo(
      {
        ...base,
        set: {
          content: D([
            { type: "input.text", id: "w", label: "W" },
            { type: "input.scale", id: "s", label: "S", min: 0, max: 10 },
          ]),
        },
        response: { version: 2, entries: [E("2026-07-06", { w: { text: "hello" } })] },
      },
      NOW,
    );
    expect(half.parts).toEqual({ done: 1, total: 2 });
    expect(half.pct).toBe(50);
  });
});

describe("reviewBucket", () => {
  it("sorts assignments into therapist queues", () => {
    expect(reviewBucket({ status: "COMPLETED", reviewedAt: null, completedAt: "2026-07-05T00:00:00Z" })).toBe("needs-review");
    expect(
      reviewBucket({ status: "COMPLETED", reviewedAt: "2026-07-04T00:00:00Z", completedAt: "2026-07-05T00:00:00Z" }),
    ).toBe("needs-review"); // resubmitted after the last review
    expect(
      reviewBucket({ status: "COMPLETED", reviewedAt: "2026-07-06T00:00:00Z", completedAt: "2026-07-05T00:00:00Z" }),
    ).toBe("reviewed");
    expect(
      reviewBucket({ status: "IN_PROGRESS", reviewedAt: null, completedAt: null, revisionRequestedAt: "2026-07-05T00:00:00Z" }),
    ).toBe("changes-requested");
    expect(reviewBucket({ status: "PENDING", reviewedAt: null, completedAt: null })).toBe("not-started");
    expect(reviewBucket({ status: "OVERDUE", reviewedAt: null, completedAt: null })).toBe("in-progress");
  });
});
