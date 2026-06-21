import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthUser = vi.fn();
const userFindUnique = vi.fn();
const moodFindMany = vi.fn();
const assignmentFindMany = vi.fn();
const noteCount = vi.fn();
const linkFindMany = vi.fn();

vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@exhale/db", () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    moodEntry: { findMany: moodFindMany },
    homeworkAssignment: { findMany: assignmentFindMany },
    patientNote: { count: noteCount },
    patientTherapist: { findMany: linkFindMany },
  },
}));

function req(url: string) {
  return new Request(`http://t${url}`);
}

describe("/api/reports/progress", () => {
  beforeEach(() => {
    vi.resetModules();
    [getAuthUser, userFindUnique, moodFindMany, assignmentFindMany, noteCount, linkFindMany].forEach((f) =>
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
    moodFindMany.mockResolvedValue([
      { moodScore: 4, tags: ["anxious"], createdAt: new Date("2026-06-19T00:00:00.000Z") },
      { moodScore: 7, tags: ["steady"], createdAt: new Date("2026-06-21T00:00:00.000Z") },
    ]);
    assignmentFindMany.mockResolvedValue([{ status: "COMPLETED" }, { status: "PENDING" }]);
    noteCount.mockResolvedValue(3);

    const { GET } = await import("../reports/progress/route");
    const res = await GET(req("/api/reports/progress"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.role).toBe("PATIENT");
    expect(body.data.mood.average).toBe(5.5);
    expect(body.data.mood.delta).toBe(3);
    expect(body.data.homework.completionRate).toBe(50);
    expect(body.data.reflections.total).toBe(3);
    expect(body.data.exportRows[0]).toMatchObject({ metric: "Mood average", value: "5.5" });
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
            { moodScore: 5, createdAt: new Date("2026-06-20T00:00:00.000Z") },
            { moodScore: 8, createdAt: new Date("2026-06-21T00:00:00.000Z") },
          ],
          homeworkAssignments: [{ status: "COMPLETED" }, { status: "COMPLETED" }],
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
    expect(body.data.role).toBe("THERAPIST");
    expect(body.data.patients[0]).toMatchObject({
      patientName: "Sam Lee",
      moodAverage: 6.5,
      moodDelta: 3,
      homeworkCompletionRate: 100,
      reflectionCount: 4,
    });
  });
});
