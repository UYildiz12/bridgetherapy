import { describe, it, expect, vi, beforeEach } from "vitest";

const getAuthUser = vi.fn();
const findUnique = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@exhale/db", () => ({ prisma: { user: { findUnique } } }));

describe("GET /api/me", () => {
  beforeEach(() => { getAuthUser.mockReset(); findUnique.mockReset(); });

  it("401 when unauthenticated", async () => {
    getAuthUser.mockResolvedValue(null);
    const { GET } = await import("../me/route");
    const res = await GET(new Request("http://t/api/me"));
    expect(res.status).toBe(401);
  });

  it("404 when authenticated but not provisioned", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue(null);
    const { GET } = await import("../me/route");
    const res = await GET(new Request("http://t/api/me"));
    expect(res.status).toBe(404);
  });

  it("200 with the user when provisioned", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue({ id: "uid-1", email: "a@b.co", role: "PATIENT" });
    const { GET } = await import("../me/route");
    const res = await GET(new Request("http://t/api/me"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("uid-1");
  });
});
