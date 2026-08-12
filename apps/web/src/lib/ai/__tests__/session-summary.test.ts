import { beforeEach, describe, expect, it, vi } from "vitest";

const genai = vi.hoisted(() => ({
  create: vi.fn(),
  GoogleGenAI: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: genai.GoogleGenAI,
}));

describe("summarizeSessionNotes", () => {
  beforeEach(() => {
    vi.resetModules();
    genai.create.mockReset();
    genai.GoogleGenAI.mockReset();
    genai.GoogleGenAI.mockImplementation(function GoogleGenAITestDouble() {
      return {
      interactions: { create: genai.create },
      };
    });
    process.env.AI_key = "test-google-key";
  });

  it("uses AI_key, Gemini 3.1 Flash Lite, and disables provider storage", async () => {
    genai.create.mockResolvedValue({
      output_text: JSON.stringify({
        summary: "Client practiced paced breathing and reviewed stress triggers.",
        keyPoints: ["Paced breathing helped", "Stress rose before work"],
        nextSteps: ["Practice breathing daily", "Track work-triggered stress"],
      }),
    });

    const { summarizeSessionNotes } = await import("../session-summary");
    const summary = await summarizeSessionNotes(["Client practiced breathing.", "Plan: track stress."]);

    expect(genai.GoogleGenAI).toHaveBeenCalledWith({ apiKey: "test-google-key" });
    expect(genai.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3.1-flash-lite",
        store: false,
        response_modalities: ["text"],
      }),
    );
    expect(summary.keyPoints).toEqual(["Paced breathing helped", "Stress rose before work"]);
  });

  it("fails fast when AI_key is missing", async () => {
    delete process.env.AI_key;

    const { summarizeSessionNotes } = await import("../session-summary");

    await expect(summarizeSessionNotes(["note"])).rejects.toThrow(/AI_key/);
    expect(genai.create).not.toHaveBeenCalled();
  });

  it("rejects malformed AI output", async () => {
    genai.create.mockResolvedValue({ output_text: "not json" });

    const { summarizeSessionNotes } = await import("../session-summary");

    await expect(summarizeSessionNotes(["note"])).rejects.toThrow(/valid JSON/);
  });
});
