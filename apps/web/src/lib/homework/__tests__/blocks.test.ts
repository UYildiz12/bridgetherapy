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
        {
          type: "input.table",
          id: "log",
          label: "Practice log",
          columns: [
            { id: "col1", header: "What happened", kind: "text" },
            { id: "col2", header: "SUDS", kind: "scale", min: 0, max: 100 },
          ],
          minRows: 2,
        },
        { type: "input.media", id: "m1", label: "Say it", mode: "voice" },
        { type: "input.activity", id: "a1", label: "Log your mood", activity: "mood-checkin", count: 3 },
      ]),
    );
    expect(parsed.success).toBe(true);
  });

  it("rejects duplicate block ids", () => {
    expect(
      docSchema.safeParse(
        doc([
          { type: "heading", id: "x", text: "A" },
          { type: "text", id: "x", body: "B" },
        ]),
      ).success,
    ).toBe(false);
  });

  it("rejects a scale with max <= min and a choice with correctIndex out of range", () => {
    expect(docSchema.safeParse(doc([{ type: "input.scale", id: "s", label: "S", min: 5, max: 5 }])).success).toBe(false);
    expect(
      docSchema.safeParse(doc([{ type: "input.choice", id: "c", label: "C", options: ["a", "b"], correctIndex: 2 }])).success,
    ).toBe(false);
  });

  it("rejects scored multi-choice", () => {
    expect(
      docSchema.safeParse(doc([{ type: "input.choice", id: "c", label: "C", options: ["a", "b"], multi: true, scored: true }]))
        .success,
    ).toBe(false);
  });

  it("rejects a table scale column without bounds", () => {
    expect(
      docSchema.safeParse(
        doc([{ type: "input.table", id: "t", label: "T", columns: [{ id: "c", header: "H", kind: "scale" }] }]),
      ).success,
    ).toBe(false);
  });
});

describe("responseDocSchema", () => {
  it("accepts entries with flat block responses and therapist fields", () => {
    const parsed = responseDocSchema.safeParse({
      version: 2,
      entries: [
        {
          id: "e1",
          date: "2026-07-02",
          blocks: {
            sit: { text: "Team meeting" },
            before: { value: 80 },
            q1: { selected: [1] },
            c1: { checked: ["c1a"] },
            log: { rows: [{ col1: "Bus ride", col2: 60 }] },
            m1: { mediaId: "med_1" },
            a1: { selfDone: true },
          },
        },
      ],
      feedback: "Well done",
      comments: { sit: "Good specificity" },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a malformed entry date", () => {
    expect(responseDocSchema.safeParse({ version: 2, entries: [{ id: "e1", date: "July 2", blocks: {} }] }).success).toBe(
      false,
    );
  });
});
