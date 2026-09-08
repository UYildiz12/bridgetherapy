import { prisma } from "@bridge/db";
import { summarizeSessionNotes } from "@/lib/ai/session-summary";
import { requireApprovedTherapist } from "@/lib/authz";
import { json, withErrorHandling } from "@/lib/http";
import { createRateLimiter } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

// Each summary is a paid AI call; cap them per therapist (best-effort, per instance).
const summaryLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

export const POST = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const limit = summaryLimiter.check(t.user.id);
  if (!limit.allowed) {
    return json(
      { error: "Too many summary requests. Wait a minute before generating another one.", retryAfterMs: limit.retryAfterMs },
      429,
    );
  }

  const { id } = await ctx.params;
  const therapistId = t.user.therapistProfile!.id;

  const session = await prisma.session.findFirst({
    where: {
      id,
      patient: {
        therapists: {
          some: { therapistId, isActive: true, status: "ACTIVE" },
        },
      },
    },
    select: {
      id: true,
      notes: {
        where: { therapistId },
        orderBy: { createdAt: "asc" },
        select: { content: true },
      },
    },
  });

  if (!session) return json({ error: "Session not found" }, 404);

  const notes = session.notes.map((n) => n.content.trim()).filter(Boolean);
  if (!notes.length) {
    return json({ error: "Add session notes before generating a summary." }, 400);
  }

  const generated = await summarizeSessionNotes(notes);
  const data = await prisma.sessionSummary.upsert({
    where: { sessionId: session.id },
    create: {
      sessionId: session.id,
      summary: generated.summary,
      keyPoints: generated.keyPoints,
      nextSteps: generated.nextSteps,
    },
    update: {
      summary: generated.summary,
      keyPoints: generated.keyPoints,
      nextSteps: generated.nextSteps,
    },
  });

  return json({ data }, 200);
});
