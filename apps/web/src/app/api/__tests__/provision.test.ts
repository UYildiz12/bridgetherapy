import { describe, it, expect, vi, beforeEach } from "vitest";

const getAuthUser = vi.fn();
const upsert = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@exhale/db", () => ({ prisma: { user: { upsert } } }));
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));

function post(body: unknown) {
  return new Request("http://t/api/auth/provision", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/provision", () => {
  beforeEach(() => { getAuthUser.mockReset(); upsert.mockReset(); });

  it("401 when unauthenticated", async () => {
    getAuthUser.mockResolvedValue(null);
    const { POST } = await import("../auth/provision/route");
    expect((await POST(post({ firstName: "A", lastName: "B", role: "PATIENT" }))).status).toBe(401);
  });

  it("400 on invalid role", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    const { POST } = await import("../auth/provision/route");
    expect((await POST(post({ firstName: "A", lastName: "B", role: "WIZARD" }))).status).toBe(400);
  });

  it("201 and creates the user + profile", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    upsert.mockResolvedValue({ id: "uid-1", email: "a@b.co", role: "PATIENT" });
    const { POST } = await import("../auth/provision/route");
    const res = await POST(post({ firstName: "A", lastName: "B", role: "PATIENT" }));
    expect(res.status).toBe(201);
    expect(upsert).toHaveBeenCalledOnce();

    const callArg = upsert.mock.calls[0][0];
    expect(callArg.select).toBeDefined();
    expect(callArg.select.passwordHash).toBeFalsy();
  });
});
