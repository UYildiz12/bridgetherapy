import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { ACTIVITY_KINDS, docSchema, type HomeworkDoc } from "./blocks";

export const HOMEWORK_DRAFT_MODEL = process.env.GEMINI_HOMEWORK_MODEL?.trim() || "gemini-3.1-flash-lite";

export const homeworkDraftRequestSchema = z.object({
  prompt: z.string().trim().min(12).max(2000),
  patientContext: z.string().trim().max(1000).optional(),
});
export type HomeworkDraftRequest = z.infer<typeof homeworkDraftRequestSchema>;

export interface HomeworkSetDraft {
  title: string;
  description?: string;
  content: HomeworkDoc;
}

const draftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  content: docSchema,
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
- Prefer CBT skills such as thought records, behavioral activation, exposure practice logs, psychoeducation, and reflection.

Return JSON only: a homework document with "title", optional "description", and "content" = { "version": 2, "schedule": { "cadence": "once" | "daily" | "weekly" }, "blocks": [...] }.
Recurring homework (daily/weekly) means the patient fills the whole block list once per day/week until the due date.

Block types (every block needs a unique short "id"):
- { "type": "heading", "id", "text" } - section title.
- { "type": "text", "id", "body", "requireAck"? } - instructions/psychoeducation; requireAck makes the patient mark it read.
- { "type": "input.text", "id", "label", "multiline"?, "placeholder"?, "optional"? } - free writing.
- { "type": "input.scale", "id", "label", "min", "max", "step"?, "minLabel"?, "maxLabel"?, "optional"? } - ratings such as SUDS 0-100 or mood 1-10.
- { "type": "input.choice", "id", "label", "options": ["..."], "multi"?, "correctIndex"?, "scored"?, "optional"? } - single choice by default; scored means option order = points (measures); never combine scored with multi.
- { "type": "input.checklist", "id", "label"?, "items": [{ "id", "text" }], "optional"? } - steps to tick off.
- { "type": "input.table", "id", "label", "columns": [{ "id", "header", "kind": "text" | "scale", "min"?, "max"? }], "minRows"?, "optional"? } - logs the patient adds rows to (exposure logs, activity schedules); scale columns need min and max.
- { "type": "input.media", "id", "label", "mode": "voice" | "drawing", "prompt"?, "optional"? } - recordings or sketches.
- { "type": "input.activity", "id", "label", "activity": ${ACTIVITY_KINDS.map((k) => `"${k}"`).join(" | ")}, "count"?, "optional"? } - real in-app actions; use only these activity values.

Composition rules:
- 2 to 12 blocks. Lead with a short "text" intro in plain, warm language.
- Use scales for any rating, tables for repeated logs, headings to split long worksheets.
- Keep labels short; put explanation in a "text" block instead.
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

const blockJsonSchema = {
  type: "object",
  required: ["type", "id"],
  properties: {
    type: {
      type: "string",
      enum: [
        "heading",
        "text",
        "input.text",
        "input.scale",
        "input.choice",
        "input.checklist",
        "input.table",
        "input.media",
        "input.activity",
      ],
    },
    id: { type: "string" },
    text: { type: "string" },
    body: { type: "string" },
    requireAck: { type: "boolean" },
    label: { type: "string" },
    optional: { type: "boolean" },
    multiline: { type: "boolean" },
    placeholder: { type: "string" },
    min: { type: "integer" },
    max: { type: "integer" },
    step: { type: "number" },
    minLabel: { type: "string" },
    maxLabel: { type: "string" },
    options: { type: "array", items: { type: "string" } },
    multi: { type: "boolean" },
    correctIndex: { type: "integer" },
    scored: { type: "boolean" },
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "text"],
        properties: { id: { type: "string" }, text: { type: "string" } },
      },
    },
    columns: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "header", "kind"],
        properties: {
          id: { type: "string" },
          header: { type: "string" },
          kind: { type: "string", enum: ["text", "scale"] },
          min: { type: "integer" },
          max: { type: "integer" },
        },
      },
    },
    minRows: { type: "integer" },
    mode: { type: "string", enum: ["voice", "drawing"] },
    prompt: { type: "string" },
    activity: { type: "string", enum: [...ACTIVITY_KINDS] },
    count: { type: "integer" },
    target: { type: "string" },
  },
};

// The Interactions API takes a JSON Schema directly as response_format (root
// type "object"); wrapping it in { type: "json_schema" } is rejected with 400.
const responseFormat = {
  type: "object",
  required: ["title", "content"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    content: {
      type: "object",
      required: ["version", "blocks"],
      properties: {
        version: { type: "integer" },
        schedule: {
          type: "object",
          properties: { cadence: { type: "string", enum: ["once", "daily", "weekly"] } },
        },
        blocks: { type: "array", items: blockJsonSchema },
      },
    },
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
      "You draft CBT-informed homework block documents for therapist review. Return valid JSON only. Do not diagnose, prescribe, create crisis plans, or give emergency instructions.",
    response_format: responseFormat,
    response_modalities: ["text"],
    generation_config: {
      temperature: 0.35,
      max_output_tokens: 2200,
    },
    store: false,
  });

  return parseGeminiHomeworkDraft(interaction.output_text ?? "");
}
