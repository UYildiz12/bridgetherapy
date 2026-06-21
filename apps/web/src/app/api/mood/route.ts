import { z } from "zod";
import { prisma } from "@exhale/db";
import { requirePatient } from "@/lib/patient";
import { parseBody } from "@/lib/validation";
import { json, withErrorHandling } from "@/lib/http";

const CreateMood = z.object({
  moodScore: z.number().int().min(1).max(10),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});

export const GET = withErrorHandling(async (req: Request) => {
  const patient = await requirePatient(req);
  if (!patient.ok) return patient.response;

  const entries = await prisma.moodEntry.findMany({
    where: { patientId: patient.patientId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return json({ data: entries }, 200);
});

export const POST = withErrorHandling(async (req: Request) => {
  const patient = await requirePatient(req);
  if (!patient.ok) return patient.response;

  const parsed = await parseBody(req, CreateMood);
  if (!parsed.ok) return parsed.response;
  const { moodScore, notes, tags } = parsed.data;

  const entry = await prisma.moodEntry.create({
    data: { patientId: patient.patientId, moodScore, notes, tags: tags ?? [] },
  });
  return json({ data: entry }, 201);
});
