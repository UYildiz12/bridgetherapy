import { describe, expect, it } from "vitest";
import { normalizeCbtIntake } from "../schema";

describe("normalizeCbtIntake", () => {
  it("trims free text lists and drops empty values", () => {
    const intake = normalizeCbtIntake({
      primaryProblems: ["  Panic before meetings  ", "", "   "],
      recentSituation: "  Yesterday at work  ",
      automaticThoughts: "  I will fail  ",
      emotions: ["fear", "unknown"],
      bodySensations: ["tight_chest", "bogus"],
      behaviors: ["avoidance", "bogus"],
      strengths: ["  walking  ", ""],
      screening: {
        lowMood: 1,
        worry: 2,
        panic: 3,
        sleep: 0,
        avoidance: 2,
        concentration: 1,
        functionalImpact: "very",
      },
      safety: {
        selfHarmThoughts: "none",
        urgentSupportRequested: false,
        notes: "  no current risk  ",
      },
      preferences: { therapistStyle: ["structured", "invalid"], homeworkComfort: "high" },
    });

    expect(intake.primaryProblems).toEqual(["Panic before meetings"]);
    expect(intake.recentSituation).toBe("Yesterday at work");
    expect(intake.automaticThoughts).toBe("I will fail");
    expect(intake.emotions).toEqual(["fear"]);
    expect(intake.bodySensations).toEqual(["tight_chest"]);
    expect(intake.behaviors).toEqual(["avoidance"]);
    expect(intake.strengths).toEqual(["walking"]);
    expect(intake.safety.notes).toBe("no current risk");
    expect(intake.preferences.therapistStyle).toEqual(["structured"]);
  });

  it("truncates over-long free text instead of throwing", () => {
    const intake = normalizeCbtIntake({
      recentSituation: "a".repeat(5000),
      automaticThoughts: `  ${"b".repeat(2400)}  `,
      safety: {
        selfHarmThoughts: "passive",
        urgentSupportRequested: true,
        notes: "c".repeat(3000),
      },
    });

    expect(intake.recentSituation).toBe("a".repeat(1200));
    expect(intake.automaticThoughts).toBe("b".repeat(1200));
    expect(intake.safety.notes).toBe("c".repeat(1000));
    // The rest of the safety answers survive intact.
    expect(intake.safety.selfHarmThoughts).toBe("passive");
    expect(intake.safety.urgentSupportRequested).toBe(true);
  });

  it("truncates list items and caps list length instead of throwing", () => {
    const intake = normalizeCbtIntake({
      primaryProblems: Array.from({ length: 14 }, (_, i) => `problem ${i} ${"x".repeat(400)}`),
      strengths: ["y".repeat(500), `${"y".repeat(240)}tail`],
    });

    expect(intake.primaryProblems).toHaveLength(10);
    for (const item of intake.primaryProblems) {
      expect(item.length).toBeLessThanOrEqual(240);
    }
    // Items that collide after truncation are de-duplicated.
    expect(intake.strengths).toEqual(["y".repeat(240)]);
  });

  it("fills a safe empty structure when no CBT intake is provided", () => {
    const intake = normalizeCbtIntake(undefined);

    expect(intake.primaryProblems).toEqual([]);
    expect(intake.screening).toMatchObject({
      lowMood: 0,
      worry: 0,
      panic: 0,
      sleep: 0,
      avoidance: 0,
      concentration: 0,
      functionalImpact: "not",
    });
    expect(intake.safety).toMatchObject({
      selfHarmThoughts: "none",
      urgentSupportRequested: false,
    });
  });
});
