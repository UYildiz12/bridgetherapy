import { z } from "zod";
import { prisma } from "@bridge/db";
import { requirePatient } from "@/lib/patient";
import { json, withErrorHandling } from "@/lib/http";
import { parseBody } from "@/lib/validation";
import { serializeNote } from "@/lib/notes-server";

const WITH_COUNT = { _count: { select: { lumenMessages: true } } } as const;

const CreateNote = z.object({
  title: z.string().trim().max(140).optional(),
  content: z.string().trim().max(8000).optional().default(""),
  voiceMediaId: z.string().trim().min(1).optional(),
}).refine((v) => v.content.length > 0 || Boolean(v.voiceMediaId), {
  message: "Add text or record a voice note before saving.",
});

async function ownsVoiceMedia(mediaId: string, userId: string) {
  const media = await prisma.media.findFirst({
    where: { id: mediaId, uploaderId: userId, type: "VOICE_NOTE" },
    select: { id: true },
  });
  return Boolean(media);
}

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

  if (parsed.data.voiceMediaId && !(await ownsVoiceMedia(parsed.data.voiceMediaId, p.userId))) {
    return json({ error: "Voice note not found" }, 403);
  }

  const note = await prisma.patientNote.create({
    data: {
      patientId: p.patientId,
      title: parsed.data.title || null,
      content: parsed.data.content,
      voiceMediaId: parsed.data.voiceMediaId ?? null,
    },
    include: WITH_COUNT,
  });
  return json({ data: serializeNote(note) }, 201);
});
