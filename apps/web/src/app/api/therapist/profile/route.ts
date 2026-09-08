import { z } from "zod";
import { prisma } from "@bridge/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { parseBody } from "@/lib/validation";
import { json, withErrorHandling } from "@/lib/http";
import { CONCERN_IDS, AVAILABILITY_IDS } from "@/lib/matching/taxonomy";

const SaveProfile = z.object({
  specialty: z.string().max(160).nullable(),
  bio: z.string().max(2000).nullable(),
  specialties: z.array(z.string()).max(20),
  availability: z.array(z.string()).max(10),
  acceptingPatients: z.boolean(),
});

const onlyKnown = (ids: string[], allowed: string[]) => ids.filter((x) => allowed.includes(x));

const profileSelect = {
  specialty: true,
  bio: true,
  specialties: true,
  availability: true,
  acceptingPatients: true,
} as const;

export const GET = withErrorHandling(async (req: Request) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const profile = await prisma.therapistProfile.findUnique({
    where: { id: t.user.therapistProfile!.id },
    select: profileSelect,
  });
  if (!profile) return json({ error: "Not found" }, 404);
  return json({ data: profile }, 200);
});

export const PUT = withErrorHandling(async (req: Request) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const parsed = await parseBody(req, SaveProfile);
  if (!parsed.ok) return parsed.response;

  const updated = await prisma.therapistProfile.update({
    where: { id: t.user.therapistProfile!.id },
    data: {
      specialty: parsed.data.specialty?.trim() || null,
      bio: parsed.data.bio?.trim() || null,
      specialties: onlyKnown(parsed.data.specialties, CONCERN_IDS),
      availability: onlyKnown(parsed.data.availability, AVAILABILITY_IDS),
      acceptingPatients: parsed.data.acceptingPatients,
    },
    select: profileSelect,
  });
  return json({ data: updated }, 200);
});
