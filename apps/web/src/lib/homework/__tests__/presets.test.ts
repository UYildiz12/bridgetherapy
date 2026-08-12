import { describe, expect, it } from "vitest";
import { PRESETS } from "../presets";
import { docSchema } from "../blocks";

describe("PRESETS", () => {
  it("ships six presets that all validate against the v2 schema", () => {
    expect(PRESETS).toHaveLength(6);
    for (const p of PRESETS) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
      const parsed = docSchema.safeParse(p.doc);
      expect(parsed.success, `${p.id}: ${JSON.stringify(parsed.success ? "" : parsed.error.issues[0])}`).toBe(true);
    }
  });

  it("has unique preset ids", () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
  });

  it("includes a daily-cadence diary and a scored measure", () => {
    expect(PRESETS.some((p) => p.doc.schedule.cadence === "daily")).toBe(true);
    expect(PRESETS.some((p) => p.doc.blocks.some((b) => b.type === "input.choice" && b.scored))).toBe(true);
  });

  it("includes a table-based exposure log and an app-linked activity", () => {
    expect(PRESETS.some((p) => p.doc.blocks.some((b) => b.type === "input.table"))).toBe(true);
    expect(PRESETS.some((p) => p.doc.blocks.some((b) => b.type === "input.activity"))).toBe(true);
  });
});
