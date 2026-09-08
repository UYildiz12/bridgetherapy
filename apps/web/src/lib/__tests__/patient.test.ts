import { describe, it, expect, vi, beforeEach } from "vitest";

const getAuthUser = vi.fn();
const findUnique = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@bridge/db", () => ({ prisma: { user: { findUnique } } }));

describe("requirePatient", () => {
  beforeEach(() => { vi.resetModules(); getAuthUser.mockReset(); findUnique.mockReset(); });

  it("401 when unauthenticated", async () => {
    getAuthUser.mockResolvedValue(null);
    const { requirePatient } = await import("../patient");
    const result = await requirePatient(new Request("http://t/api/mood"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("403 when the user has no patient profile", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue({ patientProfile: null });
    const { requirePatient } = await import("../patient");
    const result = await requirePatient(new Request("http://t/api/mood"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("returns the patientProfile id when present", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    findUnique.mockResolvedValue({ patientProfile: { id: "pp-1" } });
    const { requirePatient } = await import("../patient");
    const result = await requirePatient(new Request("http://t/api/mood"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.patientId).toBe("pp-1");
  });
});
