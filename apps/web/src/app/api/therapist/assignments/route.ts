import { z } from "zod";
import { prisma } from "@exhale/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { parseBody } from "@/lib/validation";
import { json, withErrorHandling } from "@/lib/http";
import { isLinked, toTherapistAssignmentDTO, asJson } from "@/lib/homework/server";
import { docSchema } from "@/lib/homework/blocks";

const Assign = z.object({
  homeworkId: z.string().min(1),
  patientId: z.string().min(1),
  dueDate: z.string().datetime().optional(),
});

const assignmentInclude = {
  homework: true,
  patient: {
    select: { id: true, user: { select: { firstName: true, lastName: true, email: true } } },
  },
} as const;

export const GET = withErrorHandling(async (req: Request) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const assignments = await prisma.homeworkAssignment.findMany({
    where: { homework: { createdById: t.user.therapistProfile!.id } },
    orderBy: { createdAt: "desc" },
    include: assignmentInclude,
  });
  return json({ data: assignments.map(toTherapistAssignmentDTO) }, 200);
});

export const POST = withErrorHandling(async (req: Request) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const parsed = await parseBody(req, Assign);
  if (!parsed.ok) return parsed.response;
  const therapistId = t.user.therapistProfile!.id;

  const set = await prisma.homework.findFirst({
    where: { id: parsed.data.homeworkId, createdById: therapistId },
    select: { id: true, content: true },
  });
  if (!set) return json({ error: "Homework set not found" }, 404);

  if (!(await isLinked(therapistId, parsed.data.patientId))) {
    return json({ error: "That patient is not linked to you." }, 403);
  }

  // Seed the response in the same version as the document so the first save
  // and the DTO progress math never cross versions.
  const emptyResponse = docSchema.safeParse(set.content).success
    ? { version: 2, entries: [] }
    : { items: {} };

  const created = await prisma.homeworkAssignment.create({
    data: {
      homeworkId: parsed.data.homeworkId,
      patientId: parsed.data.patientId,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      status: "PENDING",
      response: asJson(emptyResponse),
    },
    include: assignmentInclude,
  });
  return json({ data: toTherapistAssignmentDTO(created) }, 201);
});
