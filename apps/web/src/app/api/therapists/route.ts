import { prisma } from "@bridge/db";
import { requirePatient } from "@/lib/patient";
import { json, withErrorHandling } from "@/lib/http";
import { computeFit } from "@/lib/matching/taxonomy";

type ConnState = "none" | "pending" | "active" | "declined";

function connState(status?: string): ConnState {
  if (status === "ACTIVE") return "active";
  if (status === "PENDING") return "pending";
  if (status === "DECLINED") return "declined";
  return "none";
}

export const GET = withErrorHandling(async (req: Request) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

  const [patient, therapists, links] = await Promise.all([
    prisma.patientProfile.findUnique({
      where: { id: p.patientId },
      select: { concerns: true, availability: true },
    }),
    prisma.therapistProfile.findMany({
      where: { approvedAt: { not: null }, acceptingPatients: true },
      select: {
        id: true,
        specialty: true,
        bio: true,
        specialties: true,
        availability: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.patientTherapist.findMany({
      where: { patientId: p.patientId },
      select: { therapistId: true, status: true },
    }),
  ]);

  const statusByTherapist = new Map(links.map((l) => [l.therapistId, l.status as string]));
  const patientConcerns = patient?.concerns ?? [];
  const patientAvailability = patient?.availability ?? [];

  const cards = therapists
    .map((t) => {
      const fit = computeFit({
        patientConcerns,
        patientAvailability,
        therapistSpecialties: t.specialties,
        therapistAvailability: t.availability,
      });
      const name =
        [t.user.firstName, t.user.lastName].filter(Boolean).join(" ").trim() || t.user.email;
      return {
        therapistId: t.id,
        name,
        specialty: t.specialty,
        bio: t.bio,
        specialties: t.specialties,
        availability: t.availability,
        fitScore: fit.score,
        reason: fit.reason,
        connection: connState(statusByTherapist.get(t.id)),
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore);

  return json({ data: cards }, 200);
});
