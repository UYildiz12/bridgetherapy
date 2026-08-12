import {
  docSchema,
  responseDocSchema,
  type Block,
  type HomeworkDoc,
  type ResponseDoc,
} from "./blocks";
import { setContentSchema, responseSchema, type HomeworkItem } from "./schema";

/**
 * Version-aware parsers. Legacy (v1) six-kind sets adapt to v2 block documents
 * at read time, so nothing downstream ever sees a v1 shape and no data
 * migration is needed. New writes are always v2.
 */

/** v1 item -> v2 block, preserving the item id so responses keep their key. */
function adaptItem(item: HomeworkItem): Block {
  switch (item.kind) {
    case "task":
      return {
        type: "input.checklist",
        id: item.id,
        label: item.title,
        items: [{ id: `${item.id}.do`, text: item.detail?.trim() || item.title }],
      };
    case "reading":
      return { type: "text", id: item.id, body: `${item.title}\n\n${item.body}`, requireAck: true };
    case "writing":
      return { type: "input.text", id: item.id, label: item.title, multiline: true, placeholder: item.prompt };
    case "quiz":
      return {
        type: "input.choice",
        id: item.id,
        label: item.question,
        options: item.choices,
        correctIndex: item.answerIndex,
      };
    case "voice":
      return { type: "input.media", id: item.id, label: item.title, mode: "voice", prompt: item.prompt };
    case "drawing":
      return { type: "input.media", id: item.id, label: item.title, mode: "drawing", prompt: item.prompt };
  }
}

const emptyDoc = (): HomeworkDoc => ({ version: 2, schedule: { cadence: "once" }, blocks: [] });

/** Version-aware content parser: v2 passthrough, v1 adapted, garbage -> empty. */
export function parseDoc(raw: unknown): HomeworkDoc {
  const v2 = docSchema.safeParse(raw);
  if (v2.success) return v2.data;
  const v1 = setContentSchema.safeParse(raw);
  if (v1.success) return { version: 2, schedule: { cadence: "once" }, blocks: v1.data.items.map(adaptItem) };
  return emptyDoc();
}

/** Version-aware response parser. Non-empty v1 responses become entry #0. */
export function parseResponseDoc(rawContent: unknown, rawResponse: unknown): ResponseDoc {
  const v2 = responseDocSchema.safeParse(rawResponse ?? {});
  if (v2.success) return v2.data;
  const v1r = responseSchema.safeParse(rawResponse ?? {});
  if (!v1r.success || Object.keys(v1r.data.items).length === 0) {
    return {
      version: 2,
      entries: [],
      feedback: v1r.success ? v1r.data.feedback : undefined,
      reviewedAt: v1r.success ? v1r.data.reviewedAt : undefined,
    };
  }
  const v1c = setContentSchema.safeParse(rawContent);
  const kinds = new Map((v1c.success ? v1c.data.items : []).map((i) => [i.id, i.kind] as const));
  const blocks: ResponseDoc["entries"][number]["blocks"] = {};
  for (const [id, r] of Object.entries(v1r.data.items)) {
    const kind = kinds.get(id);
    blocks[id] = {
      ...(kind === "task" && r.done ? { checked: [`${id}.do`] } : {}),
      ...(kind === "reading" && r.done !== undefined ? { done: r.done } : {}),
      ...(r.text !== undefined ? { text: r.text } : {}),
      ...(r.choiceIndex !== undefined ? { selected: [r.choiceIndex] } : {}),
      ...(r.mediaId !== undefined ? { mediaId: r.mediaId } : {}),
    };
  }
  return {
    version: 2,
    entries: [{ id: "legacy", date: "1970-01-01", blocks }],
    feedback: v1r.data.feedback,
    reviewedAt: v1r.data.reviewedAt,
  };
}
