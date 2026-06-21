import { prisma } from "@exhale/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { json, withErrorHandling } from "@/lib/http";
import { toSetDTO, toTherapistAssignmentDTO } from "@/lib/homework/server";
import { parseResponse } from "@/lib/homework/schema";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;
  const { id } = await ctx.params;

  const a = await prisma.homeworkAssignment.findFirst({
    where: { id, homework: { createdById: t.user.therapistProfile!.id } },
    include: {
      homework: true,
      patient: {
        select: { id: true, user: { select: { firstName: true, lastName: true, email: true } } },
      },
    },
  });
  if (!a) return json({ error: "Not found" }, 404);

  const patientName =
    [a.patient.user.firstName, a.patient.user.lastName].filter(Boolean).join(" ").trim() ||
    a.patient.user.email;

  return json(
    {
      data: {
        assignment: toTherapistAssignmentDTO(a),
        set: toSetDTO(a.homework),
        response: parseResponse(a.response),
        patientName,
      },
    },
    200,
  );
});
