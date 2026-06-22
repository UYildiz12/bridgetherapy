import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { ITEM_KINDS, setContentSchema, type HomeworkSetContent } from "./schema";

export const HOMEWORK_DRAFT_MODEL = process.env.GEMINI_HOMEWORK_MODEL?.trim() || "gemini-3.1-flash-lite";

export const homeworkDraftRequestSchema = z.object({
  prompt: z.string().trim().min(12).max(2000),
  patientContext: z.string().trim().max(1000).optional(),
});
export type HomeworkDraftRequest = z.infer<typeof homeworkDraftRequestSchema>;

export interface HomeworkSetDraft {
  title: string;
  description?: string;
  content: HomeworkSetContent;
}

const draftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  content: setContentSchema,
});

const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z.array(z.object({ text: z.string().optional() })).optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

const riskyPatterns = [
  /\bsuicid(?:e|al)\b/i,
  /\bself[-\s]?harm\b/i,
  /\bkill myself\b/i,
  /\bkill themselves\b/i,
  /\boverdose\b/i,
  /\bemergency\b/i,
  /\bcrisis plan\b/i,
];

export function isRiskyHomeworkPrompt(prompt: string) {
  return riskyPatterns.some((pattern) => pattern.test(prompt));
}

export function buildHomeworkDraftPrompt(input: HomeworkDraftRequest) {
  const context = input.patientContext?.trim()
    ? `\nPatient/context notes from therapist:\n${input.patientContext.trim()}\n`
    : "";

  return `You are drafting CBT-informed homework for a licensed therapist to review.

Guardrails:
- Output must be therapist-reviewed before assignment.
- Do not diagnose, prescribe medication, create crisis plans, or give emergency instructions.
- Keep tasks modest, concrete, and between-session appropriate.
- Prefer CBT skills such as situation-thought-feeling-response mapping, behavioral activation, exposure planning when therapist-led, psychoeducation, or reflection.

Return JSON only with this shape:
{
  "title": "short set title",
  "description": "patient-facing description",
  "content": {
    "items": [
      { "id": "item-1", "kind": "task|reading|writing|quiz|voice|drawing", "title": "..." }
    ]
  }
}

Valid item kinds: ${ITEM_KINDS.join(", ")}.
${context}
Therapist brief:
${input.prompt.trim()}`;
}

function stripCodeFence(text: string) {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

export function parseGeminiHomeworkDraft(raw: unknown): HomeworkSetDraft {
  if (typeof raw === "string") {
    return parseDraftJson(raw);
  }

  const parsed = geminiResponseSchema.parse(raw);
  const text = parsed.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text)
    .find((partText): partText is string => Boolean(partText?.trim()));

  if (!text) throw new Error("Gemini returned no draft text.");

  return parseDraftJson(text);
}

function parseDraftJson(text: string): HomeworkSetDraft {
  const json = JSON.parse(stripCodeFence(text)) as unknown;
  const draft = draftSchema.parse(json);

  return {
    title: draft.title,
    description: draft.description?.trim() || undefined,
    content: draft.content,
  };
}

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "content"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    content: {
      type: "object",
      required: ["items"],
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: true,
            required: ["id", "kind", "title"],
            properties: {
              id: { type: "string" },
              kind: { type: "string", enum: ITEM_KINDS },
              title: { type: "string" },
              detail: { type: "string" },
              body: { type: "string" },
              prompt: { type: "string" },
              question: { type: "string" },
              choices: { type: "array", items: { type: "string" } },
              answerIndex: { type: "integer" },
            },
          },
        },
      },
    },
  },
};

const responseFormat = {
  type: "json_schema",
  json_schema: {
    name: "homework_draft",
    schema: jsonSchema,
  },
};

export async function draftHomeworkWithGemini(
  input: HomeworkDraftRequest,
  apiKey: string,
): Promise<HomeworkSetDraft> {
  const ai = new GoogleGenAI({ apiKey });
  const interaction = await ai.interactions.create({
    model: HOMEWORK_DRAFT_MODEL,
    input: buildHomeworkDraftPrompt(input),
    system_instruction:
      "You draft CBT-informed homework sets for therapist review. Return valid JSON only. Do not diagnose, prescribe, create crisis plans, or give emergency instructions.",
    response_format: responseFormat,
    response_modalities: ["text"],
    generation_config: {
      temperature: 0.35,
      max_output_tokens: 1400,
    },
    store: false,
  });

  return parseGeminiHomeworkDraft(interaction.output_text ?? "");
}
