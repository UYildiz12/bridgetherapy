import { z } from "zod";
import { prisma } from "@exhale/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { parseBody } from "@/lib/validation";
import { json, withErrorHandling } from "@/lib/http";

const AddPatient = z.object({ email: z.string().email() });

function displayName(u: { firstName: string; lastName: string; email: string }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email;
}

export const GET = withErrorHandling(async (req: Request) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const links = await prisma.patientTherapist.findMany({
    where: { therapistId: t.user.therapistProfile!.id, isActive: true },
    orderBy: { startDate: "desc" },
    select: {
      startDate: true,
      patient: {
        select: { id: true, user: { select: { firstName: true, lastName: true, email: true } } },
      },
    },
  });

  const data = links.map((l) => ({
    patientId: l.patient.id,
    name: displayName(l.patient.user),
    email: l.patient.user.email,
    linkedAt: l.startDate,
  }));
  return json({ data }, 200);
});

export const POST = withErrorHandling(async (req: Request) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const parsed = await parseBody(req, AddPatient);
  if (!parsed.ok) return parsed.response;

  const patientUser = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      patientProfile: { select: { id: true } },
    },
  });
  if (!patientUser?.patientProfile) {
    return json({ error: "No patient account is registered with that email." }, 404);
  }

  const therapistId = t.user.therapistProfile!.id;
  const patientId = patientUser.patientProfile.id;

  // Re-inviting an already-linked patient must not sever the care relationship.
  const existing = await prisma.patientTherapist.findUnique({
    where: { patientId_therapistId: { patientId, therapistId } },
    select: { status: true },
  });
  if (existing?.status === "ACTIVE") {
    return json({ error: "You're already connected with this patient." }, 409);
  }

  // Therapist-initiated links are invitations, not active care relationships.
  // The patient must consent before homework, media, and patient data access are unlocked.
  const link = await prisma.patientTherapist.upsert({
    where: { patientId_therapistId: { patientId, therapistId } },
    create: {
      patientId,
      therapistId,
      status: "PENDING",
      isActive: false,
      initiatedBy: "THERAPIST",
      requestNote: "Therapist invited patient by email.",
    },
    update: {
      status: "PENDING",
      isActive: false,
      initiatedBy: "THERAPIST",
      endDate: null,
      requestNote: "Therapist invited patient by email.",
    },
    select: { startDate: true },
  });

  return json(
    {
      data: {
        patientId,
        name: displayName(patientUser),
        email: patientUser.email,
        linkedAt: link.startDate,
        status: "pending",
      },
    },
    201,
  );
});
