import { z } from "zod";
import { prisma } from "@exhale/db";
import { requirePatient } from "@/lib/patient";
import { parseBody } from "@/lib/validation";
import { json, withErrorHandling } from "@/lib/http";
import { CONCERN_IDS, AVAILABILITY_IDS } from "@/lib/matching/taxonomy";

const SaveIntake = z.object({
  concerns: z.array(z.string()).max(20),
  availability: z.array(z.string()).max(10),
  goals: z.string().max(2000),
});

const onlyKnown = (ids: string[], allowed: string[]) => ids.filter((x) => allowed.includes(x));

function toIntake(p: {
  concerns: string[];
  availability: string[];
  goals: string | null;
  intakeCompletedAt: Date | null;
}) {
  return {
    concerns: p.concerns,
    availability: p.availability,
    goals: p.goals ?? "",
    completed: Boolean(p.intakeCompletedAt),
  };
}

const intakeSelect = {
  concerns: true,
  availability: true,
  goals: true,
  intakeCompletedAt: true,
} as const;

export const GET = withErrorHandling(async (req: Request) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

  const profile = await prisma.patientProfile.findUnique({
    where: { id: p.patientId },
    select: intakeSelect,
  });
  if (!profile) return json({ error: "Not found" }, 404);
  return json({ data: toIntake(profile) }, 200);
});

export const PUT = withErrorHandling(async (req: Request) => {
  const p = await requirePatient(req);
  if (!p.ok) return p.response;

  const parsed = await parseBody(req, SaveIntake);
  if (!parsed.ok) return parsed.response;

  const updated = await prisma.patientProfile.update({
    where: { id: p.patientId },
    data: {
      concerns: onlyKnown(parsed.data.concerns, CONCERN_IDS),
      availability: onlyKnown(parsed.data.availability, AVAILABILITY_IDS),
      goals: parsed.data.goals.trim() || null,
      intakeCompletedAt: new Date(),
    },
    select: intakeSelect,
  });
  return json({ data: toIntake(updated) }, 200);
});
