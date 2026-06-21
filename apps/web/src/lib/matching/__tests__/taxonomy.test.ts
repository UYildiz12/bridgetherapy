import { describe, it, expect } from "vitest";
import { computeFit, concernLabel, CONCERN_IDS, AVAILABILITY_IDS } from "../taxonomy";

describe("computeFit", () => {
  it("scores full concern + availability overlap at 100 with a reason", () => {
    const f = computeFit({
      patientConcerns: ["anxiety", "sleep"],
      patientAvailability: ["evenings"],
      therapistSpecialties: ["anxiety", "sleep", "stress"],
      therapistAvailability: ["evenings"],
    });
    expect(f.score).toBe(100);
    expect(f.sharedConcerns).toEqual(["anxiety", "sleep"]);
    expect(f.reason).toMatch(/Anxiety and Sleep/);
    expect(f.reason).toMatch(/Evenings/);
  });

  it("weights concerns 0.8 and availability 0.2", () => {
    const f = computeFit({
      patientConcerns: ["anxiety", "self_esteem"],
      patientAvailability: ["weekends"],
      therapistSpecialties: ["anxiety"],
      therapistAvailability: ["evenings"],
    });
    expect(f.score).toBe(40); // 0.5*0.8 + 0*0.2
    expect(f.sharedConcerns).toEqual(["anxiety"]);
    expect(f.sharedAvailability).toEqual([]);
  });

  it("falls back to a generic reason with no overlap", () => {
    const f = computeFit({
      patientConcerns: ["ocd"],
      patientAvailability: [],
      therapistSpecialties: ["relationships"],
      therapistAvailability: [],
    });
    expect(f.score).toBe(0);
    expect(f.reason).toMatch(/Suggested/);
  });

  it("gives partial credit when a therapist specialty is clinically related", () => {
    const f = computeFit({
      patientConcerns: ["panic"],
      patientAvailability: [],
      therapistSpecialties: ["anxiety"],
      therapistAvailability: [],
    });
    expect(f.score).toBe(40);
    expect(f.sharedConcerns).toEqual([]);
    expect(f.relatedConcerns).toEqual([{ concern: "panic", matchedBy: "anxiety" }]);
    expect(f.reason).toMatch(/related experience with Panic through Anxiety/);
  });

  it("deduplicates intake values before scoring and explaining", () => {
    const f = computeFit({
      patientConcerns: ["anxiety", "anxiety"],
      patientAvailability: ["evenings", "evenings"],
      therapistSpecialties: ["anxiety"],
      therapistAvailability: ["evenings"],
    });
    expect(f.score).toBe(100);
    expect(f.sharedConcerns).toEqual(["anxiety"]);
    expect(f.sharedAvailability).toEqual(["evenings"]);
    expect(f.reason.match(/Anxiety/g)).toHaveLength(1);
  });

  it("scores 0 when the patient has no intake", () => {
    expect(
      computeFit({
        patientConcerns: [],
        patientAvailability: [],
        therapistSpecialties: ["anxiety"],
        therapistAvailability: ["evenings"],
      }).score,
    ).toBe(0);
  });

  it("exposes taxonomy ids and labels", () => {
    expect(CONCERN_IDS).toContain("anxiety");
    expect(AVAILABILITY_IDS).toContain("evenings");
    expect(concernLabel("anxiety")).toBe("Anxiety");
    expect(concernLabel("unknown")).toBe("unknown");
  });
});
