import { z } from "zod";
import { prisma } from "@bridge/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { parseBody } from "@/lib/validation";
import { json, withErrorHandling } from "@/lib/http";
import { setContentSchema } from "@/lib/homework/schema";
import { docSchema } from "@/lib/homework/blocks";
import { toSetDTO, asJson } from "@/lib/homework/server";

/** New sets are v2 block documents; v1 item sets stay accepted for legacy clients. */
const contentSchema = z.union([docSchema, setContentSchema]);

const CreateSet = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  content: contentSchema,
});

export const GET = withErrorHandling(async (req: Request) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const sets = await prisma.homework.findMany({
    where: { createdById: t.user.therapistProfile!.id },
    orderBy: { updatedAt: "desc" },
  });
  return json({ data: sets.map(toSetDTO) }, 200);
});

export const POST = withErrorHandling(async (req: Request) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const parsed = await parseBody(req, CreateSet);
  if (!parsed.ok) return parsed.response;

  const set = await prisma.homework.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      type: "CUSTOM",
      content: asJson(parsed.data.content),
      isTemplate: true,
      createdById: t.user.therapistProfile!.id,
    },
  });
  return json({ data: toSetDTO(set) }, 201);
});
