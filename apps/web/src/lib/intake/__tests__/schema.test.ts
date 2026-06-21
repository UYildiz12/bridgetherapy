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
