import { z } from "zod";
import { prisma } from "@exhale/db";
import { requirePatient } from "@/lib/patient";
import { json, withErrorHandling } from "@/lib/http";
import { parseBody } from "@/lib/validation";

const CreateNote = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const GET = withErrorHandling(async (req: Request) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

  const notes = await prisma.patientNote.findMany({
    where: { patientId: p.patientId },
    orderBy: { createdAt: "desc" },
  });
  return json({ data: notes }, 200);
});

export const POST = withErrorHandling(async (req: Request) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

  const parsed = await parseBody(req, CreateNote);
  if (!parsed.ok) return parsed.response;

  const note = await prisma.patientNote.create({
    data: { patientId: p.patientId, content: parsed.data.content },
  });
  return json({ data: note }, 201);
});
