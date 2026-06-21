import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const GEMINI_SESSION_SUMMARY_MODEL = "gemini-3.1-flash-lite";

const SessionSummary = z.object({
  summary: z.string().min(1).max(4000),
  keyPoints: z.array(z.string().min(1).max(240)).min(1).max(8),
  nextSteps: z.array(z.string().min(1).max(240)).min(1).max(8),
});

export type AiSessionSummary = z.infer<typeof SessionSummary>;

const responseFormat = {
  type: "json_schema",
  json_schema: {
    name: "session_summary",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "keyPoints", "nextSteps"],
      properties: {
        summary: {
          type: "string",
          description: "A concise clinical session summary in 2-4 sentences.",
        },
        keyPoints: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: { type: "string" },
        },
        nextSteps: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: { type: "string" },
        },
      },
    },
  },
};

export async function summarizeSessionNotes(notes: string[]): Promise<AiSessionSummary> {
  const apiKey = process.env.AI_key;
  if (!apiKey) throw new Error("AI_key is not configured");

  const ai = new GoogleGenAI({ apiKey });
  const interaction = await ai.interactions.create({
    model: GEMINI_SESSION_SUMMARY_MODEL,
    input: buildPrompt(notes),
    system_instruction:
      "You draft concise therapy session summaries from therapist notes. Do not diagnose, invent facts, or add treatment claims not present in the notes.",
    response_format: responseFormat,
    response_modalities: ["text"],
    generation_config: {
      temperature: 0.2,
      max_output_tokens: 700,
    },
    store: false,
  });

  return parseSummaryResponse(interaction.output_text ?? "");
}

function buildPrompt(notes: string[]): string {
  return [
    "Summarize the following therapist session notes as JSON with summary, keyPoints, and nextSteps.",
    "Keep wording factual and suitable for a therapist to review before saving.",
    "",
    "Session notes:",
    ...notes.map((note, i) => `${i + 1}. ${note}`),
  ].join("\n");
}

export function parseSummaryResponse(text: string): AiSessionSummary {
  const parsed = parseJson(text);
  const result = SessionSummary.safeParse(parsed);
  if (!result.success) {
    throw new Error("Gemini did not return a valid session summary JSON shape");
  }
  return result.data;
}

function parseJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim();

  try {
    return JSON.parse(fenced ?? trimmed);
  } catch {
    throw new Error("Gemini did not return valid JSON");
  }
}
