import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "@exhale/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { json, withErrorHandling } from "@/lib/http";
import { parseBody } from "@/lib/validation";
import { sessionInclude, toSessionListItem } from "@/lib/sessions/server";
import { VIDEO_PROVIDER } from "@/lib/video";

const CreateSession = z.object({
  patientId: z.string().min(1),
  scheduledAt: z.string().datetime(),
});

export const GET = withErrorHandling(async (req: Request) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const therapistId = t.user.therapistProfile!.id;
  const sessions = await prisma.session.findMany({
    where: {
      patient: {
        therapists: {
          some: { therapistId, isActive: true, status: "ACTIVE" },
        },
      },
    },
    orderBy: { scheduledAt: "desc" },
    include: sessionInclude(therapistId),
  });

  return json({ data: sessions.map(toSessionListItem) }, 200);
});

export const POST = withErrorHandling(async (req: Request) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const parsed = await parseBody(req, CreateSession);
  if (!parsed.ok) return parsed.response;

  const therapistId = t.user.therapistProfile!.id;
  const link = await prisma.patientTherapist.findFirst({
    where: {
      patientId: parsed.data.patientId,
      therapistId,
      isActive: true,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!link) return json({ error: "That patient is not linked to you." }, 403);

  const session = await prisma.session.create({
    data: {
      patientId: parsed.data.patientId,
      scheduledAt: new Date(parsed.data.scheduledAt),
      status: "SCHEDULED",
      videoProvider: VIDEO_PROVIDER,
      videoRoomId: `exhale-${randomUUID().replaceAll("-", "")}`,
    },
    include: sessionInclude(therapistId),
  });

  return json({ data: toSessionListItem(session) }, 201);
});
