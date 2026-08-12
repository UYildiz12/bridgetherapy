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

  // Therapists may only respond to PATIENT-initiated requests. Their own
  // invites await the patient's consent and must never be self-acceptable.
  const link = await prisma.patientTherapist.findFirst({
    where: { id, therapistId: t.user.therapistProfile!.id, status: "PENDING", initiatedBy: "PATIENT" },
    select: { id: true, patientId: true },
  });
  if (!link) return json({ error: "Request not found" }, 404);

  if (!parsed.data.accept) {
    await prisma.patientTherapist.update({
      where: { id },
      data: { status: "DECLINED", isActive: false, endDate: new Date() },
    });
    return json({ data: { status: "declined" } }, 200);
  }

  // v1: one active therapist per patient — check and activate atomically.
  const activated = await prisma.$transaction(async (tx) => {
    const otherActive = await tx.patientTherapist.findFirst({
      where: { patientId: link.patientId, status: "ACTIVE", id: { not: id } },
      select: { id: true },
    });
    if (otherActive) return false;
    await tx.patientTherapist.update({
      where: { id },
      data: { status: "ACTIVE", isActive: true, startDate: new Date(), endDate: null },
    });
    return true;
  });
  if (!activated) return json({ error: "This patient already has an active therapist." }, 409);
  return json({ data: { status: "active" } }, 200);
});
