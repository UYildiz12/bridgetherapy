import { z } from "zod";
import { prisma } from "@bridge/db";
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

/**
 * Reviews rewrite the whole response JSON, so a patient submission landing
 * mid-review would be clobbered without the `updatedAt` guard (optimistic
 * lock). A lost race re-reads and re-merges before giving up.
 */
const MAX_SAVE_ATTEMPTS = 3;

export const PUT = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;
  const { id } = await ctx.params;

  const parsed = await parseBody(req, Review);
  if (!parsed.ok) return parsed.response;

  const now = new Date().toISOString();

  for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt++) {
    const a = await prisma.homeworkAssignment.findFirst({
      where: { id, homework: { createdById: t.user.therapistProfile!.id } },
      select: { id: true, response: true, updatedAt: true, homework: { select: { content: true } } },
    });
    if (!a) return json({ error: "Not found" }, 404);

    let next: unknown;
    if (docSchema.safeParse(a.homework.content).success) {
      // v2 documents: merge review fields into the entries doc without clobbering entries.
      const rd = parseResponseDoc(a.homework.content, a.response);
      next = {
        ...rd,
        feedback: parsed.data.feedback ?? rd.feedback,
        comments: parsed.data.comments ? { ...rd.comments, ...parsed.data.comments } : rd.comments,
        reviewedAt: now,
        revisionRequestedAt: parsed.data.requestRevision ? now : rd.revisionRequestedAt,
      };
    } else {
      // v1 legacy sets: unchanged behavior.
      const response = parseResponse(a.response);
      response.feedback = parsed.data.feedback ?? response.feedback;
      response.reviewedAt = now;
      next = response;
    }

    // Optimistic lock: only write over the exact revision this merge was built on.
    const { count } = await prisma.homeworkAssignment.updateMany({
      where: { id, updatedAt: a.updatedAt },
      data: { response: asJson(next) },
    });
    if (count > 0) return json({ data: { id, reviewedAt: now } }, 200);
    // The patient saved between our read and write; loop to re-read and re-merge.
  }

  return json({ error: "This assignment was updated while you were reviewing. Please retry." }, 409);
});
