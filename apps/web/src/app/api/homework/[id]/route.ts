import { prisma } from "@exhale/db";
import { requirePatient } from "@/lib/patient";
import { parseBody } from "@/lib/validation";
import { json, withErrorHandling } from "@/lib/http";
import {
  type HomeworkItem,
  responseSubmissionSchema,
  parseContent,
  parseResponse,
  isSetComplete,
  countComplete,
} from "@/lib/homework/schema";
import { toPatientAssignmentDTO, asJson } from "@/lib/homework/server";

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

export const PUT = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;
  const { id } = await ctx.params;

  const parsed = await parseBody(req, responseSubmissionSchema);
  if (!parsed.ok) return parsed.response;

  const a = await prisma.homeworkAssignment.findFirst({
    where: { id, patientId: p.patientId },
    include: { homework: true },
  });
  if (!a) return json({ error: "Not found" }, 404);

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

  const completedAt = status === "COMPLETED" ? (a.completedAt ?? new Date()) : null;

  const updated = await prisma.homeworkAssignment.update({
    where: { id },
    data: { response: asJson(merged), status, completedAt },
    include: { homework: true },
  });
  return json({ data: toPatientAssignmentDTO(updated) }, 200);
});
