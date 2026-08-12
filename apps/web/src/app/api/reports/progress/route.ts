import { prisma } from "@exhale/db";
import { getAuthUser } from "@/lib/auth";
import { json, withErrorHandling } from "@/lib/http";

type MoodPoint = { moodScore: number; createdAt: Date; tags?: string[] };
type Assignment = { status: string };
type SessionPoint = { status: string };
type UserLabel = { firstName: string; lastName: string; email: string };

function displayName(user: UserLabel) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function moodSummary(entries: MoodPoint[]) {
  const average = entries.length
    ? round1(entries.reduce((sum, entry) => sum + entry.moodScore, 0) / entries.length)
    : null;
  const current = entries.at(-1)?.moodScore ?? null;
  const previous = entries.length > 1 ? entries.at(-2)?.moodScore ?? null : null;
  const delta = current !== null && previous !== null ? round1(current - previous) : null;

  return { average, current, previous, delta, entries };
}

function homeworkSummary(assignments: Assignment[]) {
  const total = assignments.length;
  const completed = assignments.filter((assignment) => assignment.status === "COMPLETED").length;
  return {
    completed,
    total,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
  };
}

function sessionSummary(sessions: SessionPoint[]) {
  const total = sessions.length;
  const attended = sessions.filter((session) => session.status === "COMPLETED" || session.status === "IN_PROGRESS").length;
  const missed = sessions.filter((session) => session.status === "NO_SHOW").length;
  const scheduled = sessions.filter((session) => session.status === "SCHEDULED").length;

  return {
    attended,
    missed,
    scheduled,
    total,
    attendanceRate: total ? Math.round((attended / total) * 100) : 0,
  };
}

function trendLabel(delta: number | null) {
  if (delta === null) return "Needs more data";
  if (delta > 0) return "Improving";
  if (delta < 0) return "Declining";
  return "Stable";
}

function measureSummary(mood: ReturnType<typeof moodSummary>) {
  const baseline = mood.entries.at(0)?.moodScore ?? null;
  const changeFromBaseline = mood.current !== null && baseline !== null ? round1(mood.current - baseline) : null;

  return [
    {
      name: "Daily mood rating",
      current: mood.current,
      baseline,
      average: mood.average,
      changeFromBaseline,
      trend: trendLabel(changeFromBaseline),
    },
  ];
}

export const GET = withErrorHandling(async (req: Request) => {
  const auth = await getAuthUser(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const user = await prisma.user.findUnique({
    where: { id: auth.authId },
    select: {
      id: true,
      role: true,
      patientProfile: { select: { id: true } },
      therapistProfile: { select: { id: true, approvedAt: true } },
    },
  });
  if (!user) return json({ error: "Not provisioned" }, 404);

  if (user.role === "PATIENT" && user.patientProfile) {
    const patientId = user.patientProfile.id;
    const [moods, assignments, reflectionCount, sessions] = await Promise.all([
      prisma.moodEntry.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { moodScore: true, tags: true, createdAt: true },
      }),
      prisma.homeworkAssignment.findMany({
        where: { patientId },
        select: { status: true },
      }),
      prisma.patientNote.count({ where: { patientId } }),
      prisma.session.findMany({
        where: { patientId },
        select: { status: true },
      }),
    ]);
    // The query grabs the newest 30 check-ins; the summary reads chronologically.
    const mood = moodSummary(moods.reverse());
    const homework = homeworkSummary(assignments);
    const session = sessionSummary(sessions);
    const measures = measureSummary(mood);
    return json(
      {
        data: {
          role: "PATIENT",
          mood,
          homework,
          reflections: { total: reflectionCount },
          sessions: session,
          measures,
          exportRows: [
            { metric: "Mood average", value: mood.average === null ? "n/a" : String(mood.average) },
            { metric: "Mood change", value: mood.delta === null ? "n/a" : String(mood.delta) },
            { metric: "Homework completion", value: `${homework.completionRate}%` },
            { metric: "Reflections", value: String(reflectionCount) },
            { metric: "Session attendance", value: `${session.attendanceRate}%` },
            {
              metric: "Daily mood rating change",
              value: measures[0].changeFromBaseline === null ? "n/a" : String(measures[0].changeFromBaseline),
            },
          ],
        },
      },
      200,
    );
  }

  if (user.role === "THERAPIST" && user.therapistProfile?.approvedAt) {
    const links = await prisma.patientTherapist.findMany({
      where: { therapistId: user.therapistProfile.id, isActive: true, status: "ACTIVE" },
      orderBy: { startDate: "desc" },
      select: {
        patient: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true, email: true } },
            moodEntries: {
              orderBy: { createdAt: "desc" },
              take: 30,
              select: { moodScore: true, createdAt: true },
            },
            homeworkAssignments: { select: { status: true } },
            sessions: { select: { status: true } },
            _count: { select: { patientNotes: true } },
          },
        },
      },
    });

    const patients = links.map((link) => {
      // Same idea as the patient branch: newest 30, flipped back to chronological.
      const mood = moodSummary([...link.patient.moodEntries].reverse());
      const homework = homeworkSummary(link.patient.homeworkAssignments);
      const sessions = sessionSummary(link.patient.sessions);
      const measures = measureSummary(mood);
      return {
        patientId: link.patient.id,
        patientName: displayName(link.patient.user),
        patientEmail: link.patient.user.email,
        moodAverage: mood.average,
        moodDelta: mood.delta,
        homeworkCompletionRate: homework.completionRate,
        sessionAttendanceRate: sessions.attendanceRate,
        measureTrend: measures[0].trend,
        reflectionCount: link.patient._count.patientNotes,
      };
    });

    return json({ data: { role: "THERAPIST", patients } }, 200);
  }

  return json({ error: "Forbidden" }, 403);
});
