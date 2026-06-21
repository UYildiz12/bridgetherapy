import { prisma } from "@exhale/db";
import { getAuthUser } from "@/lib/auth";
import { json, withErrorHandling } from "@/lib/http";

type MoodPoint = { moodScore: number; createdAt: Date; tags?: string[] };
type Assignment = { status: string };
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
    const [moods, assignments, reflectionCount] = await Promise.all([
      prisma.moodEntry.findMany({
        where: { patientId },
        orderBy: { createdAt: "asc" },
        take: 30,
        select: { moodScore: true, tags: true, createdAt: true },
      }),
      prisma.homeworkAssignment.findMany({
        where: { patientId },
        select: { status: true },
      }),
      prisma.patientNote.count({ where: { patientId } }),
    ]);
    const mood = moodSummary(moods);
    const homework = homeworkSummary(assignments);
    return json(
      {
        data: {
          role: "PATIENT",
          mood,
          homework,
          reflections: { total: reflectionCount },
          exportRows: [
            { metric: "Mood average", value: mood.average === null ? "n/a" : String(mood.average) },
            { metric: "Mood change", value: mood.delta === null ? "n/a" : String(mood.delta) },
            { metric: "Homework completion", value: `${homework.completionRate}%` },
            { metric: "Reflections", value: String(reflectionCount) },
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
              orderBy: { createdAt: "asc" },
              take: 30,
              select: { moodScore: true, createdAt: true },
            },
            homeworkAssignments: { select: { status: true } },
            _count: { select: { patientNotes: true } },
          },
        },
      },
    });

    const patients = links.map((link) => {
      const mood = moodSummary(link.patient.moodEntries);
      const homework = homeworkSummary(link.patient.homeworkAssignments);
      return {
        patientId: link.patient.id,
        patientName: displayName(link.patient.user),
        patientEmail: link.patient.user.email,
        moodAverage: mood.average,
        moodDelta: mood.delta,
        homeworkCompletionRate: homework.completionRate,
        reflectionCount: link.patient._count.patientNotes,
      };
    });

    return json({ data: { role: "THERAPIST", patients } }, 200);
  }

  return json({ error: "Forbidden" }, 403);
});
