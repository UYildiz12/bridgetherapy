import { prisma } from "@bridge/db";
import { getAuthUser } from "@/lib/auth";
import { json, withErrorHandling } from "@/lib/http";
import { videoRoomUrl } from "@/lib/video";

export const GET = withErrorHandling(async (req: Request) => {
  const auth = await getAuthUser(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const user = await prisma.user.findUnique({
    where: { id: auth.authId },
    select: { patientProfile: { select: { id: true } } },
  });
  if (!user?.patientProfile) return json({ error: "Patient profile not found" }, 404);

  const sessions = await prisma.session.findMany({
    where: { patientId: user.patientProfile.id },
    orderBy: { scheduledAt: "desc" },
    select: {
      id: true,
      scheduledAt: true,
      startedAt: true,
      endedAt: true,
      status: true,
      videoProvider: true,
      videoRoomId: true,
      summary: true,
    },
  });

  return json(
    {
      data: sessions.map((session) => ({
        ...session,
        videoUrl: videoRoomUrl(session.videoProvider, session.videoRoomId),
      })),
    },
    200,
  );
});
