import { z } from "zod";
import { prisma } from "@bridge/db";
import { requirePatient } from "@/lib/patient";
import { parseBody } from "@/lib/validation";
import { json, withErrorHandling } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

const Respond = z.object({ accept: z.boolean() });

export const PUT = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;
  const { id } = await ctx.params;

  const parsed = await parseBody(req, Respond);
  if (!parsed.ok) return parsed.response;

  // Patients may only respond to THERAPIST-initiated invites addressed to
  // them. Their own outgoing requests await the therapist's consent.
  const invite = await prisma.patientTherapist.findFirst({
    where: { id, patientId: p.patientId, status: "PENDING", initiatedBy: "THERAPIST" },
    select: { id: true },
  });
  if (!invite) return json({ error: "Invite not found" }, 404);

  if (!parsed.data.accept) {
    await prisma.patientTherapist.update({
      where: { id },
      data: { status: "DECLINED", isActive: false, endDate: new Date() },
    });
    return json({ data: { status: "declined" } }, 200);
  }

  // v1: one active therapist at a time — check and activate atomically.
  const activated = await prisma.$transaction(async (tx) => {
    const otherActive = await tx.patientTherapist.findFirst({
      where: { patientId: p.patientId, status: "ACTIVE", id: { not: id } },
      select: { id: true },
    });
    if (otherActive) return false;
    await tx.patientTherapist.update({
      where: { id },
      data: { status: "ACTIVE", isActive: true, startDate: new Date(), endDate: null },
    });
    return true;
  });
  if (!activated) return json({ error: "You already have an active therapist." }, 409);
  return json({ data: { status: "active" } }, 200);
});
