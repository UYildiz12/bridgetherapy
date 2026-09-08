import { prisma } from "@bridge/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { json, withErrorHandling } from "@/lib/http";

export const GET = withErrorHandling(async (req: Request) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  // Only patient-initiated requests are acceptable here. Therapist-created
  // invites await the PATIENT's consent and must never be self-acceptable.
  const requests = await prisma.patientTherapist.findMany({
    where: { therapistId: t.user.therapistProfile!.id, status: "PENDING", initiatedBy: "PATIENT" },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      requestNote: true,
      startDate: true,
      patient: {
        select: {
          concerns: true,
          goals: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  const data = requests.map((r) => ({
    id: r.id,
    patientName:
      [r.patient.user.firstName, r.patient.user.lastName].filter(Boolean).join(" ").trim() ||
      r.patient.user.email,
    concerns: r.patient.concerns,
    goals: r.patient.goals,
    requestNote: r.requestNote,
    requestedAt: r.startDate,
  }));
  return json({ data }, 200);
});
