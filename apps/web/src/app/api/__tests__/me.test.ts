import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getAuthUser = vi.fn();
const findUnique = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@exhale/db", () => ({ prisma: { user: { findUnique } } }));

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
