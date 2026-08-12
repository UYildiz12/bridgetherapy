import { describe, it, expect, vi, beforeEach } from "vitest";

const getAuthUser = vi.fn();
const findUnique = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@exhale/db", () => ({ prisma: { user: { findUnique } } }));

function req() {
  return new Request("http://t/api/therapist/whatever");
}

async function load() {
  return (await import("../authz")).requireApprovedTherapist;
}

describe("requireApprovedTherapist", () => {
  beforeEach(() => { vi.resetModules(); getAuthUser.mockReset(); findUnique.mockReset(); });

  it("401 when unauthenticated", async () => {
    getAuthUser.mockResolvedValue(null);
    const guard = await load();
    const result = await guard(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("404 when authenticated but not provisioned", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue(null);
    const guard = await load();
    const result = await guard(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(404);
  });

  it("403 when the user is not a therapist", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue({ id: "uid-1", email: "a@b.co", role: "PATIENT", therapistProfile: null });
    const guard = await load();
    const result = await guard(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("403 when role is THERAPIST but therapistProfile is absent", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue({ id: "uid-1", email: "a@b.co", role: "THERAPIST", therapistProfile: null });
    const guard = await load();
    const result = await guard(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("403 when the therapist is pending (approvedAt null)", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue({
      id: "uid-1", email: "a@b.co", role: "THERAPIST",
      therapistProfile: { id: "tp-1", approvedAt: null },
    });
    const guard = await load();
    const result = await guard(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("ok with the user when the therapist is approved", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue({
      id: "uid-1", email: "a@b.co", role: "THERAPIST",
      therapistProfile: { id: "tp-1", approvedAt: new Date("2026-01-01") },
    });
    const guard = await load();
    const result = await guard(req());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.id).toBe("uid-1");
  });
});
