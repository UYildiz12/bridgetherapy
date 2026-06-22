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

  it("parses Gemini JSON into a homework set draft", () => {
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
                    items: [
                      {
                        id: "item-1",
                        kind: "writing",
                        title: "Catch the automatic thought",
                        prompt: "Write the thought and one alternative response.",
                      },
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
    expect(draft.content.items[0]).toMatchObject({ kind: "writing", title: "Catch the automatic thought" });
  });
});
