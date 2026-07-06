import type { Block, BlockResponse, HomeworkDoc, HomeworkEntry } from "./blocks";
import { AUTO_VERIFIED, isInputBlock } from "./blocks";

/** Per-type completion. Content blocks are complete unless they require an ack. */
export function isBlockComplete(block: Block, r: BlockResponse | undefined): boolean {
  switch (block.type) {
    case "heading":
      return true;
    case "text":
      return block.requireAck ? r?.done === true : true;
    case "input.text":
      return typeof r?.text === "string" && r.text.trim().length > 0;
    case "input.scale":
      return typeof r?.value === "number";
    case "input.choice":
      return (r?.selected?.length ?? 0) > 0;
    case "input.checklist":
      return block.items.every((it) => r?.checked?.includes(it.id));
    case "input.table":
      return (r?.rows?.length ?? 0) >= (block.minRows ?? 1);
    case "input.media":
      return typeof r?.mediaId === "string" && r.mediaId.length > 0;
    case "input.activity": {
      const need = block.count ?? 1;
      if (AUTO_VERIFIED.has(block.activity)) return (r?.verifiedIds?.length ?? 0) >= need;
      return r?.selfDone === true;
    }
  }
}

export function isEntryComplete(doc: HomeworkDoc, entry: HomeworkEntry): boolean {
  return doc.blocks.every((b) => {
    const requires = (isInputBlock(b) && !b.optional) || (b.type === "text" && b.requireAck);
    return !requires || isBlockComplete(b, entry.blocks[b.id]);
  });
}

const DAY = 86_400_000;
const dayFloor = (d: Date) => Math.floor(d.getTime() / DAY);

/** Expected entry count in [assignedAt, dueDate], or null when open-ended. */
export function expectedEntries(doc: HomeworkDoc, assignedAt: Date, dueDate: Date | null): number | null {
  if (doc.schedule.cadence === "once") return 1;
  if (!dueDate) return null;
  const days = Math.max(0, dayFloor(dueDate) - dayFloor(assignedAt)) + 1;
  return doc.schedule.cadence === "daily" ? days : Math.ceil(days / 7);
}

export function docProgress(doc: HomeworkDoc, entries: HomeworkEntry[], expected: number | null) {
  return { complete: entries.filter((e) => isEntryComplete(doc, e)).length, expected };
}

export function isDocComplete(doc: HomeworkDoc, entries: HomeworkEntry[], expected: number | null): boolean {
  const p = docProgress(doc, entries, expected);
  return expected === null ? p.complete > 0 : p.complete >= expected;
}

/** Sum of selected option indexes across scored single-select choices. */
export function choiceScore(doc: HomeworkDoc, entry: HomeworkEntry): number {
  return doc.blocks.reduce((sum, b) => {
    if (b.type !== "input.choice" || !b.scored) return sum;
    return sum + (entry.blocks[b.id]?.selected?.[0] ?? 0);
  }, 0);
}

/** True when the document has at least one scored choice block. */
export function isScoredDoc(doc: HomeworkDoc): boolean {
  return doc.blocks.some((b) => b.type === "input.choice" && b.scored);
}

/** Highest possible summed score across scored single-select choices. */
export function maxChoiceScore(doc: HomeworkDoc): number {
  return doc.blocks.reduce(
    (sum, b) => (b.type === "input.choice" && b.scored ? sum + b.options.length - 1 : sum),
    0,
  );
}
