import { z } from "zod";

/**
 * A homework "set" is a single `Homework` row (type = CUSTOM) whose `content`
 * column holds a `HomeworkSetContent`. Each item is one thing the patient works
 * through. Item shapes live in JSON so a set can mix any kinds ("homework can
 * be anything." The patient's per-item answers live in `HomeworkAssignment.response`
 * as a `HomeworkResponse`. No schema migration is needed; both columns are Json.
 */

export const ITEM_KINDS = ["task", "reading", "writing", "quiz", "voice", "drawing"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  task: "Action",
  reading: "Reading",
  writing: "Worksheet",
  quiz: "Quiz",
  voice: "Voice note",
  drawing: "Drawing",
};

const baseItem = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
});

export const taskItemSchema = baseItem.extend({
  kind: z.literal("task"),
  detail: z.string().max(500).optional(),
});

export const readingItemSchema = baseItem.extend({
  kind: z.literal("reading"),
  body: z.string().min(1).max(8000),
});

export const writingItemSchema = baseItem.extend({
  kind: z.literal("writing"),
  prompt: z.string().max(1000).optional(),
});

export const quizItemSchema = baseItem.extend({
  kind: z.literal("quiz"),
  question: z.string().min(1).max(1000),
  choices: z.array(z.string().min(1).max(300)).min(2).max(8),
  answerIndex: z.number().int().min(0),
});

export const voiceItemSchema = baseItem.extend({
  kind: z.literal("voice"),
  prompt: z.string().max(1000).optional(),
});

export const drawingItemSchema = baseItem.extend({
  kind: z.literal("drawing"),
  prompt: z.string().max(1000).optional(),
});

export const itemSchema = z.discriminatedUnion("kind", [
  taskItemSchema,
  readingItemSchema,
  writingItemSchema,
  quizItemSchema,
  voiceItemSchema,
  drawingItemSchema,
]);
export type HomeworkItem = z.infer<typeof itemSchema>;

export const setContentSchema = z
  .object({
    items: z.array(itemSchema).min(1).max(30),
  })
  .superRefine((val, ctx) => {
    const ids = new Set<string>();
    val.items.forEach((it, i) => {
      if (ids.has(it.id)) {
        ctx.addIssue({ code: "custom", message: "Duplicate item id", path: ["items", i, "id"] });
      }
      ids.add(it.id);
      if (it.kind === "quiz" && it.answerIndex >= it.choices.length) {
        ctx.addIssue({ code: "custom", message: "answerIndex out of range", path: ["items", i, "answerIndex"] });
      }
    });
  });
export type HomeworkSetContent = z.infer<typeof setContentSchema>;

// ---- Patient responses ----
export const itemResponseSchema = z.object({
  done: z.boolean().default(false),
  text: z.string().max(8000).optional(),
  choiceIndex: z.number().int().min(0).optional(),
  mediaId: z.string().optional(),
});
export type ItemResponse = z.infer<typeof itemResponseSchema>;

export const responseSchema = z.object({
  items: z.record(z.string(), itemResponseSchema).default({}),
  feedback: z.string().max(4000).optional(), // therapist feedback
  reviewedAt: z.string().optional(), // ISO timestamp, set when the therapist reviews
});
export type HomeworkResponse = z.infer<typeof responseSchema>;

/** Patient-submitted slice of a response (no therapist-only fields). */
export const responseSubmissionSchema = z.object({
  items: z.record(z.string(), itemResponseSchema),
  submit: z.boolean().optional(),
});

// ---- Completion logic (shared by API status transitions and UI progress) ----

/** An item is complete once the patient has done the required work for its kind. */
export function isItemComplete(item: HomeworkItem, r: ItemResponse | undefined): boolean {
  if (!r) return false;
  switch (item.kind) {
    case "task":
    case "reading":
      return r.done === true;
    case "writing":
      return typeof r.text === "string" && r.text.trim().length > 0;
    case "quiz":
      return typeof r.choiceIndex === "number";
    case "voice":
    case "drawing":
      return typeof r.mediaId === "string" && r.mediaId.length > 0;
  }
}

export function countComplete(content: HomeworkSetContent, response: HomeworkResponse): number {
  return content.items.filter((it) => isItemComplete(it, response.items[it.id])).length;
}

export function isSetComplete(content: HomeworkSetContent, response: HomeworkResponse): boolean {
  return content.items.length > 0 && countComplete(content, response) === content.items.length;
}

/** Safe parse helpers for the Json columns (never throw on legacy/garbled rows). */
export function parseContent(raw: unknown): HomeworkSetContent {
  const parsed = setContentSchema.safeParse(raw);
  return parsed.success ? parsed.data : { items: [] };
}

export function parseResponse(raw: unknown): HomeworkResponse {
  const parsed = responseSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : { items: {} };
}
