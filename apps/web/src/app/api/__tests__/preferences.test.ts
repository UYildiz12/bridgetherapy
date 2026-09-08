import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getAuthUser = vi.fn();
const userFindUnique = vi.fn();
const userUpdate = vi.fn();

vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@bridge/db", () => ({
  prisma: { user: { findUnique: userFindUnique, update: userUpdate } },
}));

const prefsSelect = {
  notifySessionReminders: true,
  notifyHomeworkNudges: true,
  notifyWeeklyCheckin: true,
};

const prefs = {
  notifySessionReminders: true,
  notifyHomeworkNudges: false,
  notifyWeeklyCheckin: true,
};

async function loadRoute() {
  return await import("../me/preferences/route");
}

function putReq(body: unknown) {
  return new Request("http://t/api/me/preferences", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

describe("/api/me/preferences", () => {
  beforeEach(() => {
    vi.resetModules();
    [getAuthUser, userFindUnique, userUpdate].forEach((f) => f.mockReset());
  });
  afterEach(() => vi.restoreAllMocks());

  describe("GET", () => {
    it("401 when unauthenticated", async () => {
      getAuthUser.mockResolvedValue(null);
      const { GET } = await loadRoute();
      const res = await GET(new Request("http://t/api/me/preferences"));
      expect(res.status).toBe(401);
      expect(userFindUnique).not.toHaveBeenCalled();
    });

    it("404 when authenticated but not provisioned", async () => {
      getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
      userFindUnique.mockResolvedValue(null);
      const { GET } = await loadRoute();
      const res = await GET(new Request("http://t/api/me/preferences"));
      expect(res.status).toBe(404);
    });

    it("200 with only the notification preference fields", async () => {
      getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
      userFindUnique.mockResolvedValue(prefs);
      const { GET } = await loadRoute();
      const res = await GET(new Request("http://t/api/me/preferences"));

      expect(res.status).toBe(200);
      expect((await res.json()).data).toEqual(prefs);
      expect(userFindUnique).toHaveBeenCalledWith({
        where: { id: "uid-1" },
        select: prefsSelect,
      });
    });
  });

  describe("PUT", () => {
    it("401 when unauthenticated", async () => {
      getAuthUser.mockResolvedValue(null);
      const { PUT } = await loadRoute();
      const res = await PUT(putReq(prefs));
      expect(res.status).toBe(401);
      expect(userUpdate).not.toHaveBeenCalled();
    });

    it("400 when a field has the wrong type", async () => {
      getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
      const { PUT } = await loadRoute();
      const res = await PUT(putReq({ ...prefs, notifyHomeworkNudges: "no thanks" }));
      expect(res.status).toBe(400);
      expect(userUpdate).not.toHaveBeenCalled();
    });

    it("400 when a field is missing", async () => {
      getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
      const { PUT } = await loadRoute();
      const res = await PUT(putReq({ notifySessionReminders: true }));
      expect(res.status).toBe(400);
      expect(userUpdate).not.toHaveBeenCalled();
    });

    it("200 persists the three booleans for the authenticated user", async () => {
      getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
      userUpdate.mockResolvedValue(prefs);
      const { PUT } = await loadRoute();
      const res = await PUT(putReq(prefs));

      expect(res.status).toBe(200);
      expect((await res.json()).data).toEqual(prefs);
      expect(userUpdate).toHaveBeenCalledWith({
        where: { id: "uid-1" },
        data: prefs,
        select: prefsSelect,
      });
    });

    it("404 when the user row does not exist (P2025)", async () => {
      getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
      userUpdate.mockRejectedValue(Object.assign(new Error("Record not found"), { code: "P2025" }));
      const { PUT } = await loadRoute();
      const res = await PUT(putReq(prefs));
      expect(res.status).toBe(404);
    });

    it("500 when the database errors unexpectedly", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
      userUpdate.mockRejectedValue(new Error("connection reset"));
      const { PUT } = await loadRoute();
      const res = await PUT(putReq(prefs));
      expect(res.status).toBe(500);
    });
  });
});
