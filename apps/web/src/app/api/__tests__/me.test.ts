import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getAuthUser = vi.fn();
const findUnique = vi.fn();
const sessionFindMany = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@exhale/db", () => ({
  prisma: {
    user: { findUnique },
    session: { findMany: sessionFindMany },
  },
}));

async function loadRoute() {
  return (await import("../me/route")).GET;
}

describe("GET /api/me", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthUser.mockReset();
    findUnique.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it("401 when unauthenticated", async () => {
    getAuthUser.mockResolvedValue(null);
    const GET = await loadRoute();
    const res = await GET(new Request("http://t/api/me"));
    expect(res.status).toBe(401);
  });

  it("404 when authenticated but not provisioned", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue(null);
    const GET = await loadRoute();
    const res = await GET(new Request("http://t/api/me"));
    expect(res.status).toBe(404);
  });

  it("200 with the user when provisioned", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue({ id: "uid-1", email: "a@b.co", role: "PATIENT" });
    const GET = await loadRoute();
    const res = await GET(new Request("http://t/api/me"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("uid-1");

    const callArg = findUnique.mock.calls[0][0];
    expect(callArg.select).toBeDefined();
    expect(callArg.select.passwordHash).toBeFalsy();
    expect(callArg.select.id).toBe(true);
  });

  it("returns profile + session flow for a provisioned patient", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "patient@b.co" });
    findUnique.mockResolvedValue({
      id: "uid-1",
      email: "patient@b.co",
      role: "PATIENT",
      firstName: "Sam",
      lastName: "Lee",
      patientProfile: { id: "pp-1" },
    });
    sessionFindMany.mockResolvedValue([
      {
        id: "s-1",
        scheduledAt: new Date("2026-06-22T15:00:00.000Z"),
        startedAt: null,
        endedAt: null,
        status: "SCHEDULED",
        videoProvider: null,
        videoRoomId: null,
        summary: null,
      },
    ]);

    const GETMe = await loadRoute();
    const meRes = await GETMe(new Request("http://t/api/me"));
    const meBody = await meRes.json();

    expect(meRes.status).toBe(200);
    expect(meBody.data.role).toBe("PATIENT");
    expect(meBody.data.id).toBe("uid-1");

    const { GET: GETSessions } = await import("../sessions/route");
    const sessionsRes = await GETSessions(new Request("http://t/api/sessions"));
    const sessionsBody = await sessionsRes.json();

    expect(sessionsRes.status).toBe(200);
    expect(sessionsBody.data).toHaveLength(1);
    expect(sessionsBody.data[0].id).toBe("s-1");
    expect(sessionsBody.data[0].videoUrl).toBeNull();
  });

  it("500 when the database errors unexpectedly", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockRejectedValue(new Error("connection reset"));
    const GET = await loadRoute();
    const res = await GET(new Request("http://t/api/me"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});
