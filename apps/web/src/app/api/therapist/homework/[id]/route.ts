import { z } from "zod";
import { prisma } from "@bridge/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { parseBody } from "@/lib/validation";
import { json, withErrorHandling } from "@/lib/http";
import { setContentSchema } from "@/lib/homework/schema";
import { docSchema } from "@/lib/homework/blocks";
import { toSetDTO, asJson } from "@/lib/homework/server";

type Ctx = { params: Promise<{ id: string }> };

const UpdateSet = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(1000).nullable().optional(),
  /** v2 block documents preferred; v1 item sets stay accepted for legacy clients. */
  content: z.union([docSchema, setContentSchema]).optional(),
});

export const GET = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;
  const { id } = await ctx.params;

  const set = await prisma.homework.findFirst({
    where: { id, createdById: t.user.therapistProfile!.id },
  });
  if (!set) return json({ error: "Not found" }, 404);
  return json({ data: toSetDTO(set) }, 200);
});

export const PUT = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;
  const { id } = await ctx.params;

  const parsed = await parseBody(req, UpdateSet);
  if (!parsed.ok) return parsed.response;

  const existing = await prisma.homework.findFirst({
    where: { id, createdById: t.user.therapistProfile!.id },
    select: { id: true },
  });
  if (!existing) return json({ error: "Not found" }, 404);

  const updated = await prisma.homework.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      content: parsed.data.content ? asJson(parsed.data.content) : undefined,
    },
  });
  return json({ data: toSetDTO(updated) }, 200);
});
