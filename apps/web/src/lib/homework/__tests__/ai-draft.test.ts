import { describe, expect, it } from "vitest";
import { buildHomeworkDraftPrompt, isRiskyHomeworkPrompt, parseGeminiHomeworkDraft } from "../ai-draft";

describe("homework AI draft helpers", () => {
  it("builds a therapist-review prompt with guardrails", () => {
    const prompt = buildHomeworkDraftPrompt({
      prompt: "Create a thought-record practice for panic symptoms.",
      patientContext: "Patient is practicing noticing automatic thoughts.",
    });

    expect(prompt).toContain("therapist-reviewed");
    expect(prompt).toContain("Return JSON only");
    expect(prompt).toContain("Create a thought-record practice");
  });

  it("flags crisis prompts so AI homework does not handle emergencies", () => {
    expect(isRiskyHomeworkPrompt("Make a suicide safety plan for tonight.")).toBe(true);
    expect(isRiskyHomeworkPrompt("Create a sleep routine worksheet.")).toBe(false);
  });

  it("mentions the v2 block palette and cadence semantics", () => {
    const prompt = buildHomeworkDraftPrompt({ prompt: "A week-long sleep diary with a morning rating." });
    for (const type of ["heading", "input.text", "input.scale", "input.choice", "input.checklist", "input.table", "input.media", "input.activity"]) {
      expect(prompt).toContain(type);
    }
    expect(prompt).toContain('"cadence": "once" | "daily" | "weekly"');
  });

  it("parses Gemini JSON into a v2 homework document draft", () => {
    const draft = parseGeminiHomeworkDraft({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  title: "Panic thought record",
                  description: "A brief between-session practice.",
                  content: {
                    version: 2,
                    schedule: { cadence: "once" },
                    blocks: [
                      { type: "text", id: "intro", body: "Catch one sticky thought." },
                      { type: "input.text", id: "thought", label: "Catch the automatic thought", multiline: true },
                      { type: "input.scale", id: "suds", label: "How strong?", min: 0, max: 100 },
                    ],
                  },
                }),
              },
            ],
          },
        },
      ],
    });

    expect(draft.title).toBe("Panic thought record");
    expect(draft.content.version).toBe(2);
    expect(draft.content.blocks.map((b) => b.type)).toEqual(["text", "input.text", "input.scale"]);
  });

  it("rejects drafts that fail the v2 schema", () => {
    expect(() =>
      parseGeminiHomeworkDraft(
        JSON.stringify({ title: "Bad", content: { version: 2, schedule: { cadence: "once" }, blocks: [] } }),
      ),
    ).toThrow();
  });

  it("repairs under-specified drafts: fills scale bounds, drops broken tables and invalid activities", () => {
    // Replicates a real Gemini reply: table without columns, scale without max,
    // activity with an invented kind.
    const draft = parseGeminiHomeworkDraft(
      JSON.stringify({
        title: "Sleep routine",
        content: {
          version: 2,
          schedule: { cadence: "daily" },
          blocks: [
            { type: "text", id: "intro", body: "Each morning, note how the night went." },
            { type: "input.text", id: "note", label: "Notes", multiline: true },
            { type: "input.table", id: "log", label: "Log" }, // no columns -> dropped
            { type: "input.scale", id: "rested", label: "Rested", min: 1 }, // no max -> defaulted
            { type: "input.activity", id: "walk", label: "Walk", activity: "exercise" }, // invalid -> dropped
          ],
        },
      }),
    );
    expect(draft.content.blocks.map((b) => b.id)).toEqual(["intro", "note", "rested"]);
    const scale = draft.content.blocks[2];
    expect(scale).toMatchObject({ type: "input.scale", min: 1, max: 10 });
    expect(draft.content.schedule.cadence).toBe("daily");
  });

  it("dedupes repeated block ids during repair", () => {
    const draft = parseGeminiHomeworkDraft(
      JSON.stringify({
        title: "Dupes",
        content: {
          version: 2,
          blocks: [
            { type: "input.text", id: "a", label: "One" },
            { type: "input.text", id: "a", label: "Two" },
          ],
        },
      }),
    );
    expect(new Set(draft.content.blocks.map((b) => b.id)).size).toBe(2);
  });
});
