import { timingSafeEqual } from "node:crypto";
import { prisma } from "@exhale/db";
import { json, withErrorHandling } from "@/lib/http";
import { parseDoc } from "@/lib/homework/adapt";
import { deliverPushNotification, type PushDeliveryResult } from "@/lib/push";

/** Constant-time comparison so header probing can't leak the secret byte by byte. */
function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Fails closed: a missing CRON_SECRET disables the endpoint rather than opening it. */
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`);
}

function tomorrow() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

const runReminders = withErrorHandling(async (req: Request) => {
  if (!authorized(req)) return json({ error: "Unauthorized" }, 401);

  const now = new Date();
  const until = tomorrow();
  const [homework, sessions] = await Promise.all([
    prisma.homeworkAssignment.findMany({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { gte: now, lte: until },
        patient: { user: { notifyHomeworkNudges: true } },
      },
      select: {
        id: true,
        dueDate: true,
        homework: { select: { title: true, content: true } },
        patient: {
          select: {
            user: { select: { id: true, notifyHomeworkNudges: true, pushTokens: true } },
          },
        },
      },
    }),
    prisma.session.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { gte: now, lte: until },
        patient: { user: { notifySessionReminders: true } },
      },
      select: {
        id: true,
        scheduledAt: true,
        patient: {
          select: {
            user: { select: { id: true, notifySessionReminders: true, pushTokens: true } },
          },
        },
      },
    }),
  ]);

  // The where clauses already exclude opted-out users; the filters below keep
  // preference enforcement visible (and testable) at the delivery boundary too.
  const deliveries = [
    ...homework
      .filter((assignment) => assignment.patient.user.notifyHomeworkNudges)
      .flatMap((assignment) => {
        // Recurring block documents nudge toward the current entry, not the deadline.
        const cadence = parseDoc(assignment.homework.content).schedule.cadence;
        const title =
          cadence === "daily"
            ? "Today's entry is waiting"
            : cadence === "weekly"
              ? "This week's entry is waiting"
              : "Homework due soon";
        return assignment.patient.user.pushTokens.map((token) =>
          deliverPushNotification({
            token: token.token,
            platform: token.platform,
            title,
            body: assignment.homework.title,
            url: `/homework/${assignment.id}`,
          }),
        );
      }),
    ...sessions
      .filter((session) => session.patient.user.notifySessionReminders)
      .flatMap((session) =>
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

  // allSettled so one rejected delivery can't 500 the run after partial sends.
  const settled = await Promise.allSettled(deliveries);
  const results: PushDeliveryResult[] = settled.map((outcome) =>
    outcome.status === "fulfilled"
      ? outcome.value
      : { delivered: false, error: String(outcome.reason) },
  );

  return json(
    {
      data: {
        homework: homework.length,
        sessions: sessions.length,
        attempted: results.length,
        delivered: results.filter((result) => result.delivered).length,
        failed: results.filter((result) => !result.delivered && !result.skipped).length,
      },
    },
    200,
  );
});

// Vercel Cron invokes scheduled jobs over GET (sending the CRON_SECRET as a
// bearer token); expose both verbs so the same guarded handler runs either way.
export const GET = runReminders;
export const POST = runReminders;
