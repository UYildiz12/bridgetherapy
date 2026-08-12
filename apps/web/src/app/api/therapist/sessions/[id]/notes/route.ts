import { z } from "zod";
import { prisma } from "@exhale/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { json, withErrorHandling } from "@/lib/http";
import { parseBody } from "@/lib/validation";
import { linkedSessionWhere } from "@/lib/sessions/server";

type Ctx = { params: Promise<{ id: string }> };

const CreateNote = z.object({
  content: z.string().trim().min(1).max(8000),
});

export const POST = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const { id } = await ctx.params;
  const therapistId = t.user.therapistProfile!.id;
  const session = await prisma.session.findFirst({
    where: linkedSessionWhere(id, therapistId),
    select: { id: true },
  });
  if (!session) return json({ error: "Session not found" }, 404);

  const parsed = await parseBody(req, CreateNote);
  if (!parsed.ok) return parsed.response;

  const note = await prisma.sessionNote.create({
    data: {
      sessionId: id,
      therapistId,
      content: parsed.data.content,
    },
  });

  return json({ data: note }, 201);
});
