import { z } from "zod";
import { prisma } from "@exhale/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { parseBody } from "@/lib/validation";
import { json, withErrorHandling } from "@/lib/http";
import { parseResponse } from "@/lib/homework/schema";
import { docSchema } from "@/lib/homework/blocks";
import { parseResponseDoc } from "@/lib/homework/adapt";
import { asJson } from "@/lib/homework/server";

type Ctx = { params: Promise<{ id: string }> };

const Review = z.object({
  feedback: z.string().max(4000).optional(),
  comments: z.record(z.string(), z.string().max(2000)).optional(),
  requestRevision: z.boolean().optional(),
});

export const PUT = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;
  const { id } = await ctx.params;

  const parsed = await parseBody(req, Review);
  if (!parsed.ok) return parsed.response;

  const a = await prisma.homeworkAssignment.findFirst({
    where: { id, homework: { createdById: t.user.therapistProfile!.id } },
    select: { id: true, response: true, homework: { select: { content: true } } },
  });
  if (!a) return json({ error: "Not found" }, 404);

  const now = new Date().toISOString();

  // v2 documents: merge review fields into the entries doc without clobbering entries.
  if (docSchema.safeParse(a.homework.content).success) {
    const rd = parseResponseDoc(a.homework.content, a.response);
    const next = {
      ...rd,
      feedback: parsed.data.feedback ?? rd.feedback,
      comments: parsed.data.comments ? { ...rd.comments, ...parsed.data.comments } : rd.comments,
      reviewedAt: now,
      revisionRequestedAt: parsed.data.requestRevision ? now : rd.revisionRequestedAt,
    };
    await prisma.homeworkAssignment.update({ where: { id }, data: { response: asJson(next) } });
    return json({ data: { id, reviewedAt: now } }, 200);
  }

  // v1 legacy sets: unchanged behavior.
  const response = parseResponse(a.response);
  response.feedback = parsed.data.feedback ?? response.feedback;
  response.reviewedAt = now;

  await prisma.homeworkAssignment.update({
    where: { id },
    data: { response: asJson(response) },
  });
  return json({ data: { id, reviewedAt: now } }, 200);
});
