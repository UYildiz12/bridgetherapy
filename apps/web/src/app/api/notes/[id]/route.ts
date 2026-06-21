import { z } from "zod";
import { prisma } from "@exhale/db";
import { requirePatient } from "@/lib/patient";
import { json, withErrorHandling } from "@/lib/http";
import { parseBody } from "@/lib/validation";
import { serializeNote } from "@/lib/notes-server";

type Ctx = { params: Promise<{ id: string }> };

const WITH_COUNT = { _count: { select: { lumenMessages: true } } } as const;

const UpdateNote = z.object({
  title: z.string().trim().max(140).nullable().optional(),
  content: z.string().trim().max(8000).optional(),
  visibility: z.enum(["PRIVATE", "SHARED"]).optional(),
});

export const PATCH = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

  const parsed = await parseBody(req, UpdateNote);
  if (!parsed.ok) return parsed.response;

  const { id } = await ctx.params;
  const existing = await prisma.patientNote.findFirst({
    where: { id, patientId: p.patientId },
    select: { id: true, sharedAt: true },
  });
  if (!existing) return json({ error: "Entry not found" }, 404);

  const { title, content, visibility } = parsed.data;
  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title || null;
  if (content !== undefined) data.content = content;
  if (visibility !== undefined) {
    data.visibility = visibility;
    // Stamp the first time it becomes shared; clear if it goes private again.
    if (visibility === "SHARED") {
      if (!existing.sharedAt) data.sharedAt = new Date();
    } else {
      data.sharedAt = null;
    }
  }

  const note = await prisma.patientNote.update({ where: { id }, data, include: WITH_COUNT });
  return json({ data: serializeNote(note) }, 200);
});

export const DELETE = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

  const { id } = await ctx.params;
  const existing = await prisma.patientNote.findFirst({
    where: { id, patientId: p.patientId },
    select: { id: true },
  });
  if (!existing) return json({ error: "Entry not found" }, 404);

  await prisma.patientNote.delete({ where: { id } });
  return json({ data: { id } }, 200);
});
