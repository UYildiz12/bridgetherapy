import { prisma } from "@exhale/db";
import { z } from "zod";
import { requirePatient } from "@/lib/patient";
import { json, withErrorHandling } from "@/lib/http";
import {
  type HomeworkItem,
  responseSubmissionSchema,
  parseContent,
  parseResponse,
  isSetComplete,
  countComplete,
} from "@/lib/homework/schema";
import { docSchema, type HomeworkDoc } from "@/lib/homework/blocks";
import { parseResponseDoc } from "@/lib/homework/adapt";
import { docProgress, expectedEntries, isDocComplete } from "@/lib/homework/completion";
import {
  toPatientAssignmentDTO,
  asJson,
  entryPatchSchema,
  upsertEntry,
  verifyActivities,
  type EntryPatch,
} from "@/lib/homework/server";

const entrySubmissionSchema = z.object({
  entry: entryPatchSchema,
  submit: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

function expectedMediaType(item: HomeworkItem): "VOICE_NOTE" | "DRAWING" | null {
  if (item.kind === "voice") return "VOICE_NOTE";
  if (item.kind === "drawing") return "DRAWING";
  return null;
}

async function mediaReferencesBelongToPatient(
  userId: string,
  content: { items: HomeworkItem[] },
  submittedItems: Record<string, { mediaId?: string }>,
): Promise<boolean> {
  const expectedByMediaId = new Map<string, "VOICE_NOTE" | "DRAWING">();
  for (const item of content.items) {
    const expected = expectedMediaType(item);
    const mediaId = submittedItems[item.id]?.mediaId;
    if (expected && mediaId) expectedByMediaId.set(mediaId, expected);
  }
  if (expectedByMediaId.size === 0) return true;

  const rows = await prisma.media.findMany({
    where: { id: { in: [...expectedByMediaId.keys()] }, uploaderId: userId },
    select: { id: true, type: true },
  });
  if (rows.length !== expectedByMediaId.size) return false;
  return rows.every((row) => row.type === expectedByMediaId.get(row.id));
}

export const GET = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;
  const { id } = await ctx.params;

  const a = await prisma.homeworkAssignment.findFirst({
    where: { id, patientId: p.patientId },
    include: { homework: true },
  });
  if (!a) return json({ error: "Not found" }, 404);
  return json({ data: toPatientAssignmentDTO(a) }, 200);
});

/** v2: every mediaId in the patch must belong to this patient and match the block's mode. */
async function v2MediaBelongsToPatient(userId: string, doc: HomeworkDoc, patch: EntryPatch): Promise<boolean> {
  const expectedByMediaId = new Map<string, "VOICE_NOTE" | "DRAWING">();
  for (const block of doc.blocks) {
    if (block.type !== "input.media") continue;
    const mediaId = patch.blocks[block.id]?.mediaId;
    if (mediaId) expectedByMediaId.set(mediaId, block.mode === "voice" ? "VOICE_NOTE" : "DRAWING");
  }
  if (expectedByMediaId.size === 0) return true;
  const rows = await prisma.media.findMany({
    where: { id: { in: [...expectedByMediaId.keys()] }, uploaderId: userId },
    select: { id: true, type: true },
  });
  if (rows.length !== expectedByMediaId.size) return false;
  return rows.every((row) => row.type === expectedByMediaId.get(row.id));
}

/** The assignment fields the merge helpers need (a superset comes back from Prisma). */
type AssignmentRow = {
  response: unknown;
  createdAt: Date;
  dueDate: Date | null;
  completedAt: Date | null;
  homework: { content: unknown };
};

type PatientCtx = { patientId: string; userId: string };

type PreparedWrite = {
  response: ReturnType<typeof asJson>;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  completedAt: Date | null;
};

/** v2 branch: merge an entry patch into the response document. Returns a Response on validation failure. */
async function prepareV2Write(
  a: AssignmentRow,
  doc: HomeworkDoc,
  raw: unknown,
  p: PatientCtx,
): Promise<PreparedWrite | Response> {
  const parsed = entrySubmissionSchema.safeParse(raw);
  if (!parsed.success) return json({ error: "Invalid entry" }, 400);
  const patch = parsed.data.entry;

  if (!(await v2MediaBelongsToPatient(p.userId, doc, patch))) {
    return json({ error: "Media does not belong to this patient." }, 403);
  }

  let responseDoc = parseResponseDoc(a.homework.content, a.response);
  responseDoc = upsertEntry(doc, responseDoc, patch);
  responseDoc = await verifyActivities(doc, responseDoc, p.patientId, a.createdAt, a.dueDate ?? new Date());

  const expected = expectedEntries(doc, a.createdAt, a.dueDate);
  const complete = isDocComplete(doc, responseDoc.entries, expected);
  if (parsed.data.submit && !complete) {
    return json({ error: "Finish every entry before submitting." }, 400);
  }
  // A fresh edit clears any pending revision request.
  if (responseDoc.revisionRequestedAt) {
    responseDoc = { ...responseDoc, revisionRequestedAt: undefined };
  }

  let status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  if (parsed.data.submit && complete) status = "COMPLETED";
  else if (docProgress(doc, responseDoc.entries, expected).complete > 0 || responseDoc.entries.length > 0)
    status = "IN_PROGRESS";
  else status = "PENDING";

  return {
    response: asJson(responseDoc),
    status,
    completedAt: status === "COMPLETED" ? (a.completedAt ?? new Date()) : null,
  };
}

/** v1 branch: legacy six-kind sets, unchanged for mobile compatibility. */
async function prepareV1Write(a: AssignmentRow, raw: unknown, p: PatientCtx): Promise<PreparedWrite | Response> {
  const parsed = responseSubmissionSchema.safeParse(raw);
  if (!parsed.success) return json({ error: "Invalid request body" }, 400);

  const content = parseContent(a.homework.content);
  if (!(await mediaReferencesBelongToPatient(p.userId, content, parsed.data.items))) {
    return json({ error: "Media does not belong to this patient." }, 403);
  }

  const existing = parseResponse(a.response);
  // Merge the patient's item answers; preserve therapist-only fields (feedback / reviewedAt).
  const merged = { ...existing, items: { ...existing.items, ...parsed.data.items } };

  const complete = isSetComplete(content, merged);
  if (parsed.data.submit && !complete) {
    return json({ error: "Finish every item before submitting." }, 400);
  }

  let status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  if (parsed.data.submit && complete) status = "COMPLETED";
  else if (countComplete(content, merged) > 0) status = "IN_PROGRESS";
  else status = "PENDING";

  return {
    response: asJson(merged),
    status,
    completedAt: status === "COMPLETED" ? (a.completedAt ?? new Date()) : null,
  };
}

/**
 * Two devices saving at once race on the read-merge-write of the response
 * JSON, so each write is guarded by the `updatedAt` we merged against
 * (optimistic lock). A lost race re-reads and re-merges before giving up.
 */
const MAX_SAVE_ATTEMPTS = 3;

export const PUT = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;
  const { id } = await ctx.params;

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object") return json({ error: "Invalid request body" }, 400);

  for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt++) {
    const a = await prisma.homeworkAssignment.findFirst({
      where: { id, patientId: p.patientId },
      include: { homework: true },
    });
    if (!a) return json({ error: "Not found" }, 404);

    const v2doc = docSchema.safeParse(a.homework.content);
    const prepared = v2doc.success ? await prepareV2Write(a, v2doc.data, raw, p) : await prepareV1Write(a, raw, p);
    if (prepared instanceof Response) return prepared;

    // Optimistic lock: only write over the exact revision this merge was built on.
    const { count } = await prisma.homeworkAssignment.updateMany({
      where: { id, patientId: p.patientId, updatedAt: a.updatedAt },
      data: prepared,
    });
    if (count > 0) {
      // updateMany does not return the row; re-fetch it for the DTO.
      const updated = await prisma.homeworkAssignment.findFirst({
        where: { id, patientId: p.patientId },
        include: { homework: true },
      });
      if (!updated) return json({ error: "Not found" }, 404);
      return json({ data: toPatientAssignmentDTO(updated) }, 200);
    }
    // Someone else saved between our read and write; loop to re-read and re-merge.
  }

  return json({ error: "This assignment was updated on another device. Please retry." }, 409);
});
