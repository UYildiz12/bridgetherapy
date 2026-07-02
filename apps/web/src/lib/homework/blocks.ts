import { z } from "zod";

/**
 * Homework v2: a document of blocks. Content blocks inform; input blocks
 * collect. Responses live per dated entry (one-shot = a single entry), keyed
 * by block id with one flat response shape. See
 * docs/superpowers/specs/2026-07-02-homework-blocks-design.md.
 */

const blockId = z.string().min(1).max(40);
const label = z.string().min(1).max(200);

export const ACTIVITY_KINDS = ["mood-checkin", "reflection", "breathing", "quick-practice", "lesson"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];
/** Kinds the server verifies against real DB rows; the rest are self-report. */
export const AUTO_VERIFIED: ReadonlySet<ActivityKind> = new Set(["mood-checkin", "reflection"]);

const headingBlock = z.object({
  type: z.literal("heading"),
  id: blockId,
  text: z.string().min(1).max(160),
});

const textBlock = z.object({
  type: z.literal("text"),
  id: blockId,
  body: z.string().min(1).max(8000),
  requireAck: z.boolean().optional(),
});

const inputBase = { id: blockId, label, optional: z.boolean().optional() };

const textInput = z.object({
  type: z.literal("input.text"),
  ...inputBase,
  multiline: z.boolean().optional(),
  placeholder: z.string().max(200).optional(),
});

const scaleInput = z
  .object({
    type: z.literal("input.scale"),
    ...inputBase,
    min: z.number().int(),
    max: z.number().int(),
    step: z.number().positive().optional(),
    minLabel: z.string().max(40).optional(),
    maxLabel: z.string().max(40).optional(),
  })
  .refine((b) => b.max > b.min, { message: "max must exceed min" });

const choiceInput = z
  .object({
    type: z.literal("input.choice"),
    ...inputBase,
    options: z.array(z.string().min(1).max(300)).min(2).max(10),
    multi: z.boolean().optional(),
    correctIndex: z.number().int().min(0).optional(),
    scored: z.boolean().optional(),
  })
  .refine((b) => b.correctIndex === undefined || b.correctIndex < b.options.length, {
    message: "correctIndex out of range",
  })
  .refine((b) => !(b.scored && b.multi), { message: "scored choices must be single-select" });

const checklistInput = z.object({
  type: z.literal("input.checklist"),
  id: blockId,
  label: label.optional(),
  optional: z.boolean().optional(),
  items: z.array(z.object({ id: blockId, text: z.string().min(1).max(300) })).min(1).max(20),
});

const tableColumn = z
  .object({
    id: blockId,
    header: z.string().min(1).max(80),
    kind: z.enum(["text", "scale"]),
    min: z.number().int().optional(),
    max: z.number().int().optional(),
  })
  .refine((c) => c.kind !== "scale" || (c.min !== undefined && c.max !== undefined && c.max > c.min), {
    message: "scale columns need min < max",
  });

const tableInput = z.object({
  type: z.literal("input.table"),
  ...inputBase,
  columns: z.array(tableColumn).min(1).max(6),
  minRows: z.number().int().min(1).max(50).optional(),
});

const mediaInput = z.object({
  type: z.literal("input.media"),
  ...inputBase,
  mode: z.enum(["voice", "drawing"]),
  prompt: z.string().max(500).optional(),
});

const activityInput = z.object({
  type: z.literal("input.activity"),
  ...inputBase,
  activity: z.enum(ACTIVITY_KINDS),
  target: z.string().max(80).optional(),
  count: z.number().int().min(1).max(50).optional(),
});

export const blockSchema = z.discriminatedUnion("type", [
  headingBlock,
  textBlock,
  textInput,
  scaleInput,
  choiceInput,
  checklistInput,
  tableInput,
  mediaInput,
  activityInput,
]);
export type Block = z.infer<typeof blockSchema>;
export type InputBlock = Extract<Block, { type: `input.${string}` }>;

export const scheduleSchema = z.object({ cadence: z.enum(["once", "daily", "weekly"]).default("once") });
export type Cadence = z.infer<typeof scheduleSchema>["cadence"];

export const docSchema = z
  .object({
    version: z.literal(2),
    schedule: scheduleSchema.default({ cadence: "once" }),
    blocks: z.array(blockSchema).min(1).max(40),
  })
  .superRefine((doc, ctx) => {
    const seen = new Set<string>();
    doc.blocks.forEach((b, i) => {
      if (seen.has(b.id)) {
        ctx.addIssue({ code: "custom", message: "Duplicate block id", path: ["blocks", i, "id"] });
      }
      seen.add(b.id);
    });
  });
export type HomeworkDoc = z.infer<typeof docSchema>;

// ---- Responses ----

/** One flat shape per block; the block's type decides which fields matter. */
export const blockResponseSchema = z.object({
  done: z.boolean().optional(),
  text: z.string().max(8000).optional(),
  value: z.number().optional(),
  selected: z.array(z.number().int().min(0)).max(10).optional(),
  checked: z.array(z.string()).max(20).optional(),
  rows: z.array(z.record(z.string(), z.union([z.string().max(2000), z.number()]))).max(100).optional(),
  mediaId: z.string().optional(),
  selfDone: z.boolean().optional(),
  verifiedIds: z.array(z.string()).max(100).optional(),
});
export type BlockResponse = z.infer<typeof blockResponseSchema>;

export const entrySchema = z.object({
  id: z.string().min(1).max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  blocks: z.record(z.string(), blockResponseSchema).default({}),
});
export type HomeworkEntry = z.infer<typeof entrySchema>;

export const responseDocSchema = z.object({
  version: z.literal(2),
  entries: z.array(entrySchema).max(120).default([]),
  feedback: z.string().max(4000).optional(),
  comments: z.record(z.string(), z.string().max(2000)).optional(),
  reviewedAt: z.string().optional(),
  revisionRequestedAt: z.string().optional(),
});
export type ResponseDoc = z.infer<typeof responseDocSchema>;

export const isInputBlock = (b: Block): b is InputBlock => b.type.startsWith("input.");
