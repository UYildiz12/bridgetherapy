import { z } from "zod";
import { prisma } from "@exhale/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { parseBody } from "@/lib/validation";
import { json, withErrorHandling } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

const Respond = z.object({ accept: z.boolean() });

export const PUT = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;
  const { id } = await ctx.params;

  const parsed = await parseBody(req, Respond);
  if (!parsed.ok) return parsed.response;

  const link = await prisma.patientTherapist.findFirst({
    where: { id, therapistId: t.user.therapistProfile!.id, status: "PENDING" },
    select: { id: true },
  });
  if (!link) return json({ error: "Request not found" }, 404);

  const accept = parsed.data.accept;
  await prisma.patientTherapist.update({
    where: { id },
    data: accept
      ? { status: "ACTIVE", isActive: true, startDate: new Date(), endDate: null }
      : { status: "DECLINED", isActive: false, endDate: new Date() },
  });
  return json({ data: { status: accept ? "active" : "declined" } }, 200);
});
