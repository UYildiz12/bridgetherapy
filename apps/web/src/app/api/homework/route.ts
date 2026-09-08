import { prisma } from "@bridge/db";
import { requirePatient } from "@/lib/patient";
import { json, withErrorHandling } from "@/lib/http";
import { toPatientAssignmentDTO } from "@/lib/homework/server";

export const GET = withErrorHandling(async (req: Request) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

  const assignments = await prisma.homeworkAssignment.findMany({
    where: { patientId: p.patientId },
    orderBy: { createdAt: "desc" },
    include: { homework: true },
  });
  return json({ data: assignments.map(toPatientAssignmentDTO) }, 200);
});
