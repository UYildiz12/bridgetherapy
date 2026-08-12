import { z } from "zod";
import { prisma } from "@exhale/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { json, withErrorHandling } from "@/lib/http";
import { parseBody } from "@/lib/validation";
import { linkedSessionWhere, sessionInclude, toSessionDetail } from "@/lib/sessions/server";

type Ctx = { params: Promise<{ id: string }> };

const UpdateSession = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const GET = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const { id } = await ctx.params;
  const therapistId = t.user.therapistProfile!.id;
  const session = await prisma.session.findFirst({
    where: linkedSessionWhere(id, therapistId),
    include: sessionInclude(therapistId),
  });

  if (!session) return json({ error: "Session not found" }, 404);

  const history = await prisma.session.findMany({
    where: {
      patientId: session.patientId,
      id: { not: id },
      patient: {
        therapists: {
          some: { therapistId, isActive: true, status: "ACTIVE" },
        },
      },
    },
    orderBy: { scheduledAt: "desc" },
    take: 5,
    include: sessionInclude(therapistId),
  });

  return json({ data: toSessionDetail(session, history) }, 200);
});

export const PATCH = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const { id } = await ctx.params;
  const therapistId = t.user.therapistProfile!.id;
  const session = await prisma.session.findFirst({
    where: linkedSessionWhere(id, therapistId),
    select: { id: true },
  });
  if (!session) return json({ error: "Session not found" }, 404);

  const parsed = await parseBody(req, UpdateSession);
  if (!parsed.ok) return parsed.response;

  const data = {
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(parsed.data.scheduledAt ? { scheduledAt: new Date(parsed.data.scheduledAt) } : {}),
  };
  const updated = await prisma.session.update({
    where: { id },
    data,
    include: sessionInclude(therapistId),
  });

  return json({ data: toSessionDetail(updated) }, 200);
});
