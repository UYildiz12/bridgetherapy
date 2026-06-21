import { z } from "zod";
import { prisma } from "@exhale/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { parseBody } from "@/lib/validation";
import { json, withErrorHandling } from "@/lib/http";
import { parseResponse } from "@/lib/homework/schema";
import { asJson } from "@/lib/homework/server";

type Ctx = { params: Promise<{ id: string }> };

const Review = z.object({ feedback: z.string().max(4000) });

export const PUT = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;
  const { id } = await ctx.params;

  const parsed = await parseBody(req, Review);
  if (!parsed.ok) return parsed.response;

  const a = await prisma.homeworkAssignment.findFirst({
    where: { id, homework: { createdById: t.user.therapistProfile!.id } },
    select: { id: true, response: true },
  });
  if (!a) return json({ error: "Not found" }, 404);

  const response = parseResponse(a.response);
  const reviewedAt = new Date().toISOString();
  response.feedback = parsed.data.feedback;
  response.reviewedAt = reviewedAt;

  await prisma.homeworkAssignment.update({
    where: { id },
    data: { response: asJson(response) },
  });
  return json({ data: { id, reviewedAt } }, 200);
});
