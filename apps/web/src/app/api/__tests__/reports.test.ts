import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthUser = vi.fn();
const userFindUnique = vi.fn();
const moodFindMany = vi.fn();
const assignmentFindMany = vi.fn();
const noteCount = vi.fn();
const sessionFindMany = vi.fn();
const linkFindMany = vi.fn();

vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@exhale/db", () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    moodEntry: { findMany: moodFindMany },
    homeworkAssignment: { findMany: assignmentFindMany },
    patientNote: { count: noteCount },
    session: { findMany: sessionFindMany },
    patientTherapist: { findMany: linkFindMany },
  },
}));

function req(url: string) {
  return new Request(`http://t${url}`);
}

describe("/api/reports/progress", () => {
  beforeEach(() => {
    vi.resetModules();
    [getAuthUser, userFindUnique, moodFindMany, assignmentFindMany, noteCount, sessionFindMany, linkFindMany].forEach((f) =>
      f.mockReset(),
    );
  });

  it("returns a patient progress rollup", async () => {
    getAuthUser.mockResolvedValue({ authId: "u1", email: "sam@example.com" });
    userFindUnique.mockResolvedValue({
      id: "u1",
      role: "PATIENT",
      patientProfile: { id: "pp1" },
      therapistProfile: null,
    });
    // Prisma returns newest-first (the route asks for the latest 30).
    moodFindMany.mockResolvedValue([
      { moodScore: 7, tags: ["steady"], createdAt: new Date("2026-06-21T00:00:00.000Z") },
      { moodScore: 4, tags: ["anxious"], createdAt: new Date("2026-06-19T00:00:00.000Z") },
    ]);
    assignmentFindMany.mockResolvedValue([{ status: "COMPLETED" }, { status: "PENDING" }]);
    noteCount.mockResolvedValue(3);
    sessionFindMany.mockResolvedValue([{ status: "COMPLETED" }, { status: "NO_SHOW" }, { status: "SCHEDULED" }]);

    const { GET } = await import("../reports/progress/route");
    const res = await GET(req("/api/reports/progress"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.role).toBe("PATIENT");
    // The newest 30 entries are fetched, not the oldest 30 frozen forever.
    expect(moodFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" }, take: 30 }),
    );
    expect(body.data.mood.average).toBe(5.5);
    // The summary still reads chronologically: latest check-in is "current".
    expect(body.data.mood.current).toBe(7);
    expect(body.data.mood.delta).toBe(3);
    expect(body.data.mood.entries.map((e: { moodScore: number }) => e.moodScore)).toEqual([4, 7]);
    expect(body.data.homework.completionRate).toBe(50);
    expect(body.data.reflections.total).toBe(3);
    expect(body.data.sessions).toMatchObject({
      attended: 1,
      missed: 1,
      scheduled: 1,
      attendanceRate: 33,
    });
    expect(body.data.measures[0]).toMatchObject({
      name: "Daily mood rating",
      current: 7,
      baseline: 4,
      changeFromBaseline: 3,
      trend: "Improving",
    });
    expect(body.data.exportRows[0]).toMatchObject({ metric: "Mood average", value: "5.5" });
    expect(body.data.exportRows).toContainEqual({ metric: "Session attendance", value: "33%" });
    expect(body.data.exportRows).toContainEqual({ metric: "Daily mood rating change", value: "3" });
  });

  it("returns therapist patient outcome summaries for active links", async () => {
    getAuthUser.mockResolvedValue({ authId: "u2", email: "dr@example.com" });
    userFindUnique.mockResolvedValue({
      id: "u2",
      role: "THERAPIST",
      patientProfile: null,
      therapistProfile: { id: "tp1", approvedAt: new Date("2026-06-21T00:00:00.000Z") },
    });
    linkFindMany.mockResolvedValue([
      {
        patient: {
          id: "pp1",
          user: { firstName: "Sam", lastName: "Lee", email: "sam@example.com" },
          moodEntries: [
            { moodScore: 8, createdAt: new Date("2026-06-21T00:00:00.000Z") },
            { moodScore: 5, createdAt: new Date("2026-06-20T00:00:00.000Z") },
          ],
          homeworkAssignments: [{ status: "COMPLETED" }, { status: "COMPLETED" }],
          sessions: [{ status: "COMPLETED" }, { status: "NO_SHOW" }],
          _count: { patientNotes: 4 },
        },
      },
    ]);

    const { GET } = await import("../reports/progress/route");
    const res = await GET(req("/api/reports/progress"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(linkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { therapistId: "tp1", isActive: true, status: "ACTIVE" },
      }),
    );
    // The nested mood query also takes the newest 30.
    expect(linkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          patient: expect.objectContaining({
            select: expect.objectContaining({
              moodEntries: expect.objectContaining({ orderBy: { createdAt: "desc" }, take: 30 }),
            }),
          }),
        }),
      }),
    );
    expect(body.data.role).toBe("THERAPIST");
    expect(body.data.patients[0]).toMatchObject({
      patientName: "Sam Lee",
      moodAverage: 6.5,
      moodDelta: 3,
      homeworkCompletionRate: 100,
      reflectionCount: 4,
      sessionAttendanceRate: 50,
      measureTrend: "Improving",
    });
  });
});
