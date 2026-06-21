import { z } from "zod";
import { prisma } from "@exhale/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { json, withErrorHandling } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

const UpdateNote = z.object({
  isResolved: z.boolean(),
});

export const PATCH = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const parsed = await parseBody(req, UpdateNote);
  if (!parsed.ok) return parsed.response;

  const { id } = await ctx.params;
  const therapistId = t.user.therapistProfile!.id;
  const note = await prisma.patientNote.findFirst({
    where: {
      id,
      patient: {
        therapists: {
          some: { therapistId, isActive: true, status: "ACTIVE" },
        },
      },
    },
    select: { id: true },
  });
  if (!note) return json({ error: "Note not found" }, 404);

  const updated = await prisma.patientNote.update({
    where: { id },
    data: { isResolved: parsed.data.isResolved },
  });
  return json({ data: updated }, 200);
});
