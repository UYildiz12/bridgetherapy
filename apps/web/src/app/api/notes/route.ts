import { z } from "zod";
import { prisma } from "@exhale/db";
import { requirePatient } from "@/lib/patient";
import { json, withErrorHandling } from "@/lib/http";
import { parseBody } from "@/lib/validation";
import { serializeNote } from "@/lib/notes-server";

const WITH_COUNT = { _count: { select: { lumenMessages: true } } } as const;

const CreateNote = z.object({
  title: z.string().trim().max(140).optional(),
  content: z.string().trim().min(1).max(8000),
});

export const GET = withErrorHandling(async (req: Request) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

  const notes = await prisma.patientNote.findMany({
    where: { patientId: p.patientId },
    orderBy: { updatedAt: "desc" },
    include: WITH_COUNT,
  });
  return json({ data: notes.map(serializeNote) }, 200);
});

export const POST = withErrorHandling(async (req: Request) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

  const parsed = await parseBody(req, CreateNote);
  if (!parsed.ok) return parsed.response;

  const note = await prisma.patientNote.create({
    data: {
      patientId: p.patientId,
      title: parsed.data.title || null,
      content: parsed.data.content,
    },
    include: WITH_COUNT,
  });
  return json({ data: serializeNote(note) }, 201);
});
