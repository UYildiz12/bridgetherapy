import { z } from "zod";
import { prisma } from "@bridge/db";
import { requirePatient } from "@/lib/patient";
import { parseBody } from "@/lib/validation";
import { json, withErrorHandling } from "@/lib/http";

const CreateMood = z.object({
  moodScore: z.number().min(1).max(10),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});

// Store at most one decimal place (e.g. 8.6) so the slider's fine values stay tidy.
const round1 = (n: number) => Math.round(n * 10) / 10;

export const GET = withErrorHandling(async (req: Request) => {
  const patient = await requirePatient(req);
  if (!patient.ok) return patient.response;

  // The list is capped for the chart; `total` carries the real all-time count.
  const [entries, total] = await Promise.all([
    prisma.moodEntry.findMany({
      where: { patientId: patient.patientId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.moodEntry.count({ where: { patientId: patient.patientId } }),
  ]);
  return json({ data: entries, total }, 200);
});

export const POST = withErrorHandling(async (req: Request) => {
  const patient = await requirePatient(req);
  if (!patient.ok) return patient.response;

  const parsed = await parseBody(req, CreateMood);
  if (!parsed.ok) return parsed.response;
  const { moodScore, notes, tags } = parsed.data;

  const entry = await prisma.moodEntry.create({
    data: { patientId: patient.patientId, moodScore: round1(moodScore), notes, tags: tags ?? [] },
  });
  return json({ data: entry }, 201);
});
