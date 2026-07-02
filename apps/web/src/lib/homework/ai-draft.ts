import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { ACTIVITY_KINDS, docSchema, type ActivityKind, type HomeworkDoc } from "./blocks";

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

Hard requirements (drafts violating these are rejected):
- Every input block needs a non-empty "label".
- Every "input.scale" MUST include integer "min" and "max" with max greater than min.
- Every "input.table" MUST include a non-empty "columns" array; scale columns MUST include "min" and "max".
- Every "input.choice" MUST include at least 2 non-empty "options".
- "input.activity" MUST use only the listed activity values; if none fits, use a checklist instead.
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
  const draft = draftSchema.parse(repairDraft(json));

  return {
    title: draft.title,
    description: draft.description?.trim() || undefined,
    content: draft.content,
  };
}

// ---- Draft repair ----
// Gemini treats response_format as guidance, not a guarantee: drafts arrive
// with missing scale bounds, tables without columns, or invented activity
// kinds. Repair what has safe defaults and drop what doesn't, then validate.

type Loose = Record<string, unknown>;
const isObj = (v: unknown): v is Loose => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const int = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined;

function repairBlock(raw: unknown, index: number): Loose | null {
  if (!isObj(raw)) return null;
  const type = raw.type;
  const id = str(raw.id) ?? `b${index + 1}`;
  const optional = raw.optional === true ? true : undefined;
  const label = str(raw.label);

  switch (type) {
    case "heading": {
      const text = str(raw.text) ?? label;
      return text ? { type, id, text: text.slice(0, 160) } : null;
    }
    case "text": {
      const body = str(raw.body) ?? str(raw.text);
      return body ? { type, id, body, ...(raw.requireAck === true ? { requireAck: true } : {}) } : null;
    }
    case "input.text": {
      if (!label) return null;
      return {
        type,
        id,
        label,
        optional,
        ...(raw.multiline === false ? {} : { multiline: true }),
        ...(str(raw.placeholder) ? { placeholder: str(raw.placeholder)!.slice(0, 200) } : {}),
      };
    }
    case "input.scale": {
      if (!label) return null;
      let min = int(raw.min) ?? 0;
      let max = int(raw.max) ?? 10;
      if (max <= min) [min, max] = [0, Math.max(10, min + 1)];
      const step = typeof raw.step === "number" && raw.step > 0 ? raw.step : undefined;
      return {
        type, id, label, optional, min, max,
        ...(step ? { step } : {}),
        ...(str(raw.minLabel) ? { minLabel: str(raw.minLabel)!.slice(0, 40) } : {}),
        ...(str(raw.maxLabel) ? { maxLabel: str(raw.maxLabel)!.slice(0, 40) } : {}),
      };
    }
    case "input.choice": {
      const options = Array.isArray(raw.options)
        ? raw.options.map(str).filter((o): o is string => Boolean(o)).slice(0, 10)
        : [];
      if (!label || options.length < 2) return null;
      const correctIndex = int(raw.correctIndex);
      const multi = raw.multi === true ? true : undefined;
      return {
        type, id, label, optional, options,
        ...(multi ? { multi } : {}),
        ...(correctIndex !== undefined && correctIndex >= 0 && correctIndex < options.length
          ? { correctIndex }
          : {}),
        ...(raw.scored === true && !multi ? { scored: true } : {}),
      };
    }
    case "input.checklist": {
      const items = Array.isArray(raw.items)
        ? raw.items
            .map((it, n) =>
              isObj(it) && str(it.text) ? { id: str(it.id) ?? `${id}-i${n + 1}`, text: str(it.text)! } : null,
            )
            .filter((it): it is { id: string; text: string } => it !== null)
            .slice(0, 20)
        : [];
      if (items.length === 0) return null;
      return { type, id, optional, ...(label ? { label } : {}), items };
    }
    case "input.table": {
      const columns = Array.isArray(raw.columns)
        ? raw.columns
            .map((c, n) => {
              if (!isObj(c) || !str(c.header)) return null;
              const kind = c.kind === "scale" ? "scale" : "text";
              if (kind === "scale") {
                let min = int(c.min) ?? 0;
                let max = int(c.max) ?? 10;
                if (max <= min) [min, max] = [0, 10];
                return { id: str(c.id) ?? `${id}-c${n + 1}`, header: str(c.header)!, kind, min, max };
              }
              return { id: str(c.id) ?? `${id}-c${n + 1}`, header: str(c.header)!, kind };
            })
            .filter((c): c is NonNullable<typeof c> => c !== null)
            .slice(0, 6)
        : [];
      if (!label || columns.length === 0) return null;
      const minRows = int(raw.minRows);
      return { type, id, label, optional, columns, ...(minRows && minRows >= 1 ? { minRows: Math.min(minRows, 50) } : {}) };
    }
    case "input.media": {
      if (!label) return null;
      return {
        type, id, label, optional,
        mode: raw.mode === "drawing" ? "drawing" : "voice",
        ...(str(raw.prompt) ? { prompt: str(raw.prompt)!.slice(0, 500) } : {}),
      };
    }
    case "input.activity": {
      if (!label || !ACTIVITY_KINDS.includes(raw.activity as ActivityKind)) return null;
      const count = int(raw.count);
      return { type, id, label, optional, activity: raw.activity, ...(count && count >= 1 ? { count: Math.min(count, 50) } : {}) };
    }
    default:
      return null;
  }
}

/** Best-effort normalization of a raw Gemini draft into a valid v2 document. */
export function repairDraft(json: unknown): unknown {
  if (!isObj(json)) return json;
  const content = isObj(json.content) ? json.content : {};
  const cadenceRaw = isObj(content.schedule) ? content.schedule.cadence : undefined;
  const cadence = cadenceRaw === "daily" || cadenceRaw === "weekly" ? cadenceRaw : "once";

  const seen = new Set<string>();
  const blocks = (Array.isArray(content.blocks) ? content.blocks : [])
    .map((b, i) => repairBlock(b, i))
    .filter((b): b is Loose => b !== null)
    .map((b) => {
      let id = b.id as string;
      while (seen.has(id)) id = `${id}x`;
      seen.add(id);
      return { ...b, id };
    })
    .slice(0, 40);

  return {
    title: str(json.title) ?? "Untitled homework",
    ...(str(json.description) ? { description: str(json.description) } : {}),
    content: { version: 2, schedule: { cadence }, blocks },
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
