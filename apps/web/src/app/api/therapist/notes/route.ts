import { prisma } from "@exhale/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { json, withErrorHandling } from "@/lib/http";

function displayName(user: { firstName: string; lastName: string; email: string }) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
}

export const GET = withErrorHandling(async (req: Request) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const therapistId = t.user.therapistProfile!.id;
  const notes = await prisma.patientNote.findMany({
    where: {
      patient: {
        therapists: {
          some: { therapistId, isActive: true, status: "ACTIVE" },
        },
      },
    },
    orderBy: [{ isResolved: "asc" }, { createdAt: "desc" }],
    include: {
      patient: {
        select: { id: true, user: { select: { firstName: true, lastName: true, email: true } } },
      },
    },
  });

  const data = notes.map((note) => ({
    id: note.id,
    patientId: note.patientId,
    patientName: displayName(note.patient.user),
    patientEmail: note.patient.user.email,
    content: note.content,
    isResolved: note.isResolved,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }));
  return json({ data }, 200);
});
