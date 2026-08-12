import { z } from "zod";
import { prisma } from "@exhale/db";
import { requirePatient } from "@/lib/patient";
import { json, withErrorHandling } from "@/lib/http";
import { parseBody } from "@/lib/validation";
import { askLumen, lumenConfigured } from "@/lib/lumen";
import { createRateLimiter } from "@/lib/rate-limit";
import { downloadMedia } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

// Every turn is a paid Gemini call; cap them per user (best-effort, per instance).
const lumenLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

const SendMessage = z.object({
  message: z.string().trim().min(1).max(2000),
});

async function ownedNote(patientId: string, id: string) {
  return prisma.patientNote.findFirst({
    where: { id, patientId },
    select: { id: true, title: true, content: true, voiceMediaId: true },
  });
}

async function voiceContext(voiceMediaId: string | null, userId: string) {
  if (!voiceMediaId) return undefined;
  const media = await prisma.media.findFirst({
    where: { id: voiceMediaId, uploaderId: userId, type: "VOICE_NOTE" },
    select: { s3Key: true, mimeType: true },
  });
  if (!media) return undefined;
  const bytes = await downloadMedia(media.s3Key);
  return {
    mimeType: media.mimeType,
    dataBase64: Buffer.from(bytes).toString("base64"),
  };
}

export const GET = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

  const { id } = await ctx.params;
  const note = await ownedNote(p.patientId, id);
  if (!note) return json({ error: "Entry not found" }, 404);

  // The id tiebreaker keeps USER before LUMEN when both rows share a timestamp.
  const messages = await prisma.lumenMessage.findMany({
    where: { noteId: id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return json({ data: { configured: lumenConfigured(), messages } }, 200);
});

export const POST = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

  const limit = lumenLimiter.check(p.userId);
  if (!limit.allowed) {
    return json(
      { error: "You're sending messages very quickly. Give Lumen a moment, then try again.", retryAfterMs: limit.retryAfterMs },
      429,
    );
  }

  const parsed = await parseBody(req, SendMessage);
  if (!parsed.ok) return parsed.response;

  const { id } = await ctx.params;
  const note = await ownedNote(p.patientId, id);
  if (!note) return json({ error: "Entry not found" }, 404);

  if (!lumenConfigured()) {
    return json(
      { error: "Lumen is not set up yet. Add AI_key to the server to enable it." },
      503,
    );
  }

  // Gather context + history for Lumen. The patient's new message is only
  // persisted after Gemini answers, so a failed call can be retried without
  // writing a duplicate USER row.
  const [profile, moods, thread] = await Promise.all([
    prisma.patientProfile.findUnique({ where: { id: p.patientId }, select: { concerns: true } }),
    prisma.moodEntry.findMany({
      where: { patientId: p.patientId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { moodScore: true, tags: true },
    }),
    prisma.lumenMessage.findMany({ where: { noteId: id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
  ]);

  let reply: string;
  try {
    reply = await askLumen(
      {
        entryTitle: note.title,
        entryContent: note.content,
        voiceNote: await voiceContext(note.voiceMediaId, p.userId),
        concerns: profile?.concerns ?? [],
        recentMoods: moods.map((m) => ({ score: m.moodScore, tags: m.tags })),
      },
      [
        ...thread.map((t) => ({ role: t.role, content: t.content })),
        { role: "USER" as const, content: parsed.data.message },
      ],
    );
  } catch {
    // Nothing has been persisted; the client can resend the same message safely.
    return json({ error: "Lumen could not respond just now. Please try again." }, 502);
  }

  const userMsg = await prisma.lumenMessage.create({
    data: { noteId: id, role: "USER", content: parsed.data.message },
  });
  const lumenMsg = await prisma.lumenMessage.create({
    data: { noteId: id, role: "LUMEN", content: reply },
  });

  return json({ data: { user: userMsg, lumen: lumenMsg } }, 201);
});
