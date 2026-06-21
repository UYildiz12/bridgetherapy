import { z } from "zod";
import { prisma } from "@exhale/db";
import { requirePatient } from "@/lib/patient";
import { json, withErrorHandling } from "@/lib/http";
import { parseBody } from "@/lib/validation";
import { askLumen, lumenConfigured } from "@/lib/lumen";

type Ctx = { params: Promise<{ id: string }> };

const SendMessage = z.object({
  message: z.string().trim().min(1).max(2000),
});

async function ownedNote(patientId: string, id: string) {
  return prisma.patientNote.findFirst({
    where: { id, patientId },
    select: { id: true, title: true, content: true },
  });
}

export const GET = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

  const { id } = await ctx.params;
  const note = await ownedNote(p.patientId, id);
  if (!note) return json({ error: "Entry not found" }, 404);

  const messages = await prisma.lumenMessage.findMany({
    where: { noteId: id },
    orderBy: { createdAt: "asc" },
  });
  return json({ data: { configured: lumenConfigured(), messages } }, 200);
});

export const POST = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

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

  // Persist the patient's message, then gather context + history for Lumen.
  const userMsg = await prisma.lumenMessage.create({
    data: { noteId: id, role: "USER", content: parsed.data.message },
  });

  const [profile, moods, thread] = await Promise.all([
    prisma.patientProfile.findUnique({ where: { id: p.patientId }, select: { concerns: true } }),
    prisma.moodEntry.findMany({
      where: { patientId: p.patientId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { moodScore: true, tags: true },
    }),
    prisma.lumenMessage.findMany({ where: { noteId: id }, orderBy: { createdAt: "asc" } }),
  ]);

  let reply: string;
  try {
    reply = await askLumen(
      {
        entryTitle: note.title,
        entryContent: note.content,
        concerns: profile?.concerns ?? [],
        recentMoods: moods.map((m) => ({ score: m.moodScore, tags: m.tags })),
      },
      thread.map((t) => ({ role: t.role, content: t.content })),
    );
  } catch {
    // Keep the patient's message; surface a soft failure so they can retry.
    return json({ error: "Lumen could not respond just now. Please try again." }, 502);
  }

  const lumenMsg = await prisma.lumenMessage.create({
    data: { noteId: id, role: "LUMEN", content: reply },
  });

  return json({ data: { user: userMsg, lumen: lumenMsg } }, 201);
});
