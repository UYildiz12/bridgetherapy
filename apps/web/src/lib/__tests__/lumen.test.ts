import { beforeEach, describe, expect, it, vi } from "vitest";

const genai = vi.hoisted(() => ({
  create: vi.fn(),
  GoogleGenAI: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: genai.GoogleGenAI,
}));

describe("lumen", () => {
  beforeEach(() => {
    vi.resetModules();
    genai.create.mockReset();
    genai.GoogleGenAI.mockReset();
    genai.GoogleGenAI.mockImplementation(function GoogleGenAITestDouble() {
      return { interactions: { create: genai.create } };
    });
    process.env.AI_key = "test-google-key";
  });

  it("uses AI_key and Gemini Flash Lite without provider storage", async () => {
    genai.create.mockResolvedValue({ output_text: "What feels most important to look at first?" });

    const { askLumen } = await import("../lumen");
    const reply = await askLumen(
      { entryTitle: "Sleep", entryContent: "I could not sleep.", concerns: ["anxiety"], recentMoods: [] },
      [{ role: "USER", content: "Help me unpack this." }],
    );

    expect(genai.GoogleGenAI).toHaveBeenCalledWith({ apiKey: "test-google-key" });
    expect(genai.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3.1-flash-lite",
        store: false,
        response_modalities: ["text"],
      }),
    );
    expect(reply).toBe("What feels most important to look at first?");
  });

  it("sends browser WebM voice notes to Gemini as WebM media input", async () => {
    genai.create.mockResolvedValue({ output_text: "What did you notice in your body while saying that?" });

    const { askLumen } = await import("../lumen");
    await askLumen(
      {
        entryTitle: "Voice note",
        entryContent: "",
        voiceNote: { mimeType: "audio/webm", dataBase64: "AQID" },
      },
      [{ role: "USER", content: "Please help me reflect on the recording." }],
    );

    expect(genai.create).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.arrayContaining([
          expect.objectContaining({ type: "text", text: expect.stringContaining("attached voice note") }),
          { type: "video", data: "AQID", mime_type: "video/webm" },
        ]),
      }),
    );
  });

  it("keeps supported audio voice notes as audio input", async () => {
    genai.create.mockResolvedValue({ output_text: "What feels useful to name from the recording?" });

    const { askLumen } = await import("../lumen");
    await askLumen(
      {
        entryContent: "",
        voiceNote: { mimeType: "audio/wav", dataBase64: "BAUG" },
      },
      [{ role: "USER", content: "Please help me reflect on the recording." }],
    );

    expect(genai.create).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.arrayContaining([
          expect.objectContaining({ type: "text" }),
          { type: "audio", data: "BAUG", mime_type: "audio/wav" },
        ]),
      }),
    );
  });

  it("reports unconfigured when AI_key is missing", async () => {
    delete process.env.AI_key;

    const { lumenConfigured, askLumen } = await import("../lumen");

    expect(lumenConfigured()).toBe(false);
    await expect(askLumen({ entryContent: "x" }, [])).rejects.toThrow(/AI_key/);
    expect(genai.create).not.toHaveBeenCalled();
  });
});
