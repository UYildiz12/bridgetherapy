import { z } from "zod";
import { prisma } from "@exhale/db";
import { requirePatient } from "@/lib/patient";
import { parseBody } from "@/lib/validation";
import { json, withErrorHandling } from "@/lib/http";

const RequestBody = z.object({
  therapistId: z.string().min(1),
  note: z.string().max(1000).optional(),
});

function displayName(u: { firstName: string; lastName: string; email: string }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email;
}

export const GET = withErrorHandling(async (req: Request) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

  const links = await prisma.patientTherapist.findMany({
    where: { patientId: p.patientId, status: { in: ["ACTIVE", "PENDING"] } },
    select: {
      status: true,
      therapist: { select: { user: { select: { firstName: true, lastName: true, email: true } } } },
    },
  });

  const chosen = links.find((l) => l.status === "ACTIVE") ?? links.find((l) => l.status === "PENDING");
  if (!chosen) return json({ data: { status: "none" } }, 200);
  return json(
    {
      data: {
        status: chosen.status === "ACTIVE" ? "active" : "pending",
        therapistName: displayName(chosen.therapist.user),
      },
    },
    200,
  );
});

export const POST = withErrorHandling(async (req: Request) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

  const parsed = await parseBody(req, RequestBody);
  if (!parsed.ok) return parsed.response;

  // v1: one active therapist at a time.
  const active = await prisma.patientTherapist.findFirst({
    where: { patientId: p.patientId, status: "ACTIVE" },
    select: { id: true },
  });
  if (active) return json({ error: "You already have an active therapist." }, 409);

  const therapist = await prisma.therapistProfile.findFirst({
    where: { id: parsed.data.therapistId, approvedAt: { not: null }, acceptingPatients: true },
    select: { id: true },
  });
  if (!therapist) return json({ error: "That therapist isn't available." }, 404);

  await prisma.patientTherapist.upsert({
    where: { patientId_therapistId: { patientId: p.patientId, therapistId: therapist.id } },
    create: {
      patientId: p.patientId,
      therapistId: therapist.id,
      status: "PENDING",
      isActive: false,
      requestNote: parsed.data.note,
    },
    update: {
      status: "PENDING",
      isActive: false,
      requestNote: parsed.data.note,
      endDate: null,
    },
  });
  return json({ data: { status: "pending" } }, 201);
});
