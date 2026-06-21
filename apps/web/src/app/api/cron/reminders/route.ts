import { prisma } from "@exhale/db";
import { json, withErrorHandling } from "@/lib/http";
import { deliverPushNotification } from "@/lib/push";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function tomorrow() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export const POST = withErrorHandling(async (req: Request) => {
  if (!authorized(req)) return json({ error: "Unauthorized" }, 401);

  const now = new Date();
  const until = tomorrow();
  const [homework, sessions] = await Promise.all([
    prisma.homeworkAssignment.findMany({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { gte: now, lte: until },
      },
      select: {
        id: true,
        dueDate: true,
        homework: { select: { title: true } },
        patient: { select: { user: { select: { id: true, pushTokens: true } } } },
      },
    }),
    prisma.session.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { gte: now, lte: until },
      },
      select: {
        id: true,
        scheduledAt: true,
        patient: { select: { user: { select: { id: true, pushTokens: true } } } },
      },
    }),
  ]);

  const deliveries = [
    ...homework.flatMap((assignment) =>
      assignment.patient.user.pushTokens.map((token) =>
        deliverPushNotification({
          token: token.token,
          platform: token.platform,
          title: "Homework due soon",
          body: assignment.homework.title,
          url: `/homework/${assignment.id}`,
        }),
      ),
    ),
    ...sessions.flatMap((session) =>
      session.patient.user.pushTokens.map((token) =>
        deliverPushNotification({
          token: token.token,
          platform: token.platform,
          title: "Upcoming session",
          body: "You have a session scheduled in the next 24 hours.",
          url: "/dashboard",
        }),
      ),
    ),
  ];

  const results = await Promise.all(deliveries);
  return json(
    {
      data: {
        homework: homework.length,
        sessions: sessions.length,
        attempted: results.length,
        delivered: results.filter((result) => result.delivered).length,
      },
    },
    200,
  );
});
