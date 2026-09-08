import { randomUUID } from "node:crypto";
import { prisma } from "@bridge/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { json, withErrorHandling } from "@/lib/http";
import { linkedSessionWhere, sessionInclude, toSessionDetail } from "@/lib/sessions/server";
import { VIDEO_PROVIDER } from "@/lib/video";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t.response;

  const { id } = await ctx.params;
  const therapistId = t.user.therapistProfile!.id;
  const session = await prisma.session.findFirst({
    where: linkedSessionWhere(id, therapistId),
    select: { id: true, videoProvider: true, videoRoomId: true },
  });
  if (!session) return json({ error: "Session not found" }, 404);

  const hasJitsiRoom = session.videoProvider === VIDEO_PROVIDER && Boolean(session.videoRoomId);
  const updated = await prisma.session.update({
    where: { id },
    data: hasJitsiRoom
      ? {}
      : {
          videoProvider: VIDEO_PROVIDER,
          videoRoomId: `bridge-${randomUUID().replaceAll("-", "")}`,
        },
    include: sessionInclude(therapistId),
  });

  return json({ data: toSessionDetail(updated) }, 200);
});
