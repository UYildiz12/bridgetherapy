import "server-only";
import { prisma, type Homework, type Prisma } from "@bridge/db";
import { z } from "zod";
import { parseContent, parseResponse, countComplete, setContentSchema } from "./schema";
import {
  AUTO_VERIFIED,
  blockResponseSchema,
  docSchema,
  entrySchema,
  responseDocSchema,
  type Cadence,
  type HomeworkDoc,
  type ResponseDoc,
} from "./blocks";
import { parseResponseDoc } from "./adapt";
import { docProgress, expectedEntries } from "./completion";

export type DerivedStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";

/**
 * Version-preserving parsers for DTOs: v2 payloads pass through validated, v1
 * payloads keep their original shape (the client adapts at read time). This
 * keeps the wire format stable for the mobile app on legacy sets.
 */
export function parseAnyContent(raw: unknown): HomeworkDoc | ReturnType<typeof parseContent> {
  const v2 = docSchema.safeParse(raw);
  if (v2.success) return v2.data;
  return parseContent(raw);
}

export function parseAnyResponse(raw: unknown): ResponseDoc | ReturnType<typeof parseResponse> {
  const v2 = responseDocSchema.safeParse(raw ?? {});
  if (v2.success) return v2.data;
  return parseResponse(raw);
}

/** Map a Homework row to the client-facing set DTO (content parsed + validated). */
export function toSetDTO(h: Homework) {
  return {
    id: h.id,
    title: h.title,
    description: h.description,
    content: parseAnyContent(h.content),
    isTemplate: h.isTemplate,
    createdAt: h.createdAt,
    updatedAt: h.updatedAt,
  };
}

/** True when an active PatientTherapist link exists between this therapist and patient. */
export async function isLinked(therapistId: string, patientId: string): Promise<boolean> {
  const link = await prisma.patientTherapist.findUnique({
    where: { patientId_therapistId: { patientId, therapistId } },
    select: { isActive: true },
  });
  return Boolean(link?.isActive);
}

/** Cast a validated plain object to Prisma's Json input type without fighting the structural mismatch. */
export function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

type AssignmentRow = {
  id: string;
  status: string;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt?: Date;
  response: Prisma.JsonValue;
  homework: Homework;
};

type AssignmentRowWithPatient = AssignmentRow & {
  patient: { id: string; user: { firstName: string; lastName: string; email: string } };
};

function displayName(u: { firstName: string; lastName: string; email: string }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email;
}

/** Stored status, but surfaced as OVERDUE when past the due date and not yet completed. */
export function derivedStatus(a: { status: string; dueDate: Date | null }): DerivedStatus {
  if (a.status === "COMPLETED") return "COMPLETED";
  if (a.dueDate && a.dueDate.getTime() < Date.now()) return "OVERDUE";
  return (a.status as DerivedStatus) || "PENDING";
}

export function toPatientAssignmentDTO(a: AssignmentRow) {
  return {
    id: a.id,
    status: derivedStatus(a),
    dueDate: a.dueDate,
    completedAt: a.completedAt,
    createdAt: a.createdAt ?? null,
    set: toSetDTO(a.homework),
    response: parseAnyResponse(a.response),
  };
}

export function toTherapistAssignmentDTO(a: AssignmentRowWithPatient) {
  const base = {
    id: a.id,
    status: derivedStatus(a),
    dueDate: a.dueDate,
    completedAt: a.completedAt,
    patient: { patientId: a.patient.id, name: displayName(a.patient.user) },
    set: { id: a.homework.id, title: a.homework.title },
  };

  // v2 documents report entry progress; v1 keeps item counts.
  const v2 = docSchema.safeParse(a.homework.content);
  if (v2.success) {
    const rd = parseResponseDoc(a.homework.content, a.response);
    const expected = a.createdAt ? expectedEntries(v2.data, a.createdAt, a.dueDate) : null;
    const p = docProgress(v2.data, rd.entries, expected);
    return {
      ...base,
      reviewedAt: rd.reviewedAt ?? null,
      revisionRequestedAt: rd.revisionRequestedAt ?? null,
      completedCount: p.complete,
      itemCount: p.expected ?? Math.max(p.complete, rd.entries.length),
    };
  }

  const content = parseContent(a.homework.content);
  const response = parseResponse(a.response);
  return {
    ...base,
    reviewedAt: response.reviewedAt ?? null,
    revisionRequestedAt: null,
    completedCount: countComplete(content, response),
    itemCount: content.items.length,
  };
}

// ---- v2 entry merge (pure) ----

/** Entries collapse to one per cadence unit; this is the collapse key. */
export function entryKeyForDate(cadence: Cadence, date: string): string {
  if (cadence === "once") return "once";
  if (cadence === "daily") return date;
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  return `wk-${d.toISOString().slice(0, 10)}`;
}

export const entryPatchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  blocks: z.record(z.string(), blockResponseSchema),
});
export type EntryPatch = z.infer<typeof entryPatchSchema>;

/**
 * Pure merge: find (or create) the entry for the date's cadence key and merge
 * the patch's block responses into it. Unknown block ids are dropped and
 * patients can never write `verifiedIds` (server-owned).
 */
export function upsertEntry(doc: HomeworkDoc, current: ResponseDoc, patch: EntryPatch): ResponseDoc {
  const key = entryKeyForDate(doc.schedule.cadence, patch.date);
  const knownIds = new Set(doc.blocks.map((b) => b.id));

  const clean: ResponseDoc["entries"][number]["blocks"] = {};
  for (const [id, r] of Object.entries(patch.blocks)) {
    if (!knownIds.has(id)) continue;
    const rest = { ...r };
    delete rest.verifiedIds; // server-owned; patients cannot assert verification
    clean[id] = rest;
  }

  const entries = [...current.entries];
  const idx = entries.findIndex((e) => entryKeyForDate(doc.schedule.cadence, e.date) === key);
  if (idx === -1) {
    entries.push(entrySchema.parse({ id: key, date: patch.date, blocks: clean }));
  } else {
    const prev = entries[idx];
    const mergedBlocks = { ...prev.blocks };
    for (const [id, r] of Object.entries(clean)) {
      mergedBlocks[id] = { ...prev.blocks[id], ...r, verifiedIds: prev.blocks[id]?.verifiedIds };
    }
    entries[idx] = { ...prev, blocks: mergedBlocks };
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));
  return { ...current, entries };
}

/**
 * Server-side activity verification: for auto-verified activity kinds, count
 * the patient's real rows created inside the assignment window and write
 * `verifiedIds` onto every entry's activity responses.
 */
export async function verifyActivities(
  doc: HomeworkDoc,
  response: ResponseDoc,
  patientProfileId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<ResponseDoc> {
  const activityBlocks = doc.blocks.filter(
    (b): b is Extract<typeof b, { type: "input.activity" }> =>
      b.type === "input.activity" && AUTO_VERIFIED.has(b.activity),
  );
  if (activityBlocks.length === 0 || response.entries.length === 0) return response;

  const needsMood = activityBlocks.some((b) => b.activity === "mood-checkin");
  const needsNotes = activityBlocks.some((b) => b.activity === "reflection");
  const window = { gte: windowStart, lte: windowEnd };
  const [moods, notes] = await Promise.all([
    needsMood
      ? prisma.moodEntry.findMany({ where: { patientId: patientProfileId, createdAt: window }, select: { id: true } })
      : Promise.resolve([]),
    needsNotes
      ? prisma.patientNote.findMany({ where: { patientId: patientProfileId, createdAt: window }, select: { id: true } })
      : Promise.resolve([]),
  ]);
  const idsFor = (kind: string) => (kind === "mood-checkin" ? moods : notes).map((r) => r.id);

  const entries = response.entries.map((e) => {
    const blocks = { ...e.blocks };
    for (const b of activityBlocks) {
      blocks[b.id] = { ...blocks[b.id], verifiedIds: idsFor(b.activity) };
    }
    return { ...e, blocks };
  });
  return { ...response, entries };
}

/** True when the stored content is a v1 (legacy) set. Used to guard API branches. */
export function isLegacyContent(raw: unknown): boolean {
  return !docSchema.safeParse(raw).success && setContentSchema.safeParse(raw).success;
}
