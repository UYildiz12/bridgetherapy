import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const update = vi.fn();
const writeAuditLog = vi.fn();
vi.mock("@exhale/db", () => ({
  prisma: { user: { findUnique }, therapistProfile: { update } },
}));
// Mock the exact specifier the module under test imports (it uses "./audit").
vi.mock("../audit", () => ({ writeAuditLog }));

async function load() {
  const mod = await import("../approve-therapist");
  return mod;
}

describe("approveTherapist", () => {
  beforeEach(() => { vi.resetModules(); findUnique.mockReset(); update.mockReset(); writeAuditLog.mockReset(); });

  it("throws when no user has that email", async () => {
    findUnique.mockResolvedValue(null);
    const { approveTherapist, TherapistApprovalError } = await load();
    await expect(approveTherapist("ghost@b.co")).rejects.toBeInstanceOf(TherapistApprovalError);
    expect(update).not.toHaveBeenCalled();
  });

  it("looks the user up by email", async () => {
    findUnique.mockResolvedValue({
      id: "u1", email: "t@b.co", role: "THERAPIST",
      therapistProfile: { id: "tp1", approvedAt: new Date("2026-01-01") },
    });
    const { approveTherapist } = await load();
    await approveTherapist("t@b.co");
    expect(findUnique.mock.calls[0][0].where).toEqual({ email: "t@b.co" });
  });

  it("throws when the user is not a therapist", async () => {
    findUnique.mockResolvedValue({ id: "u1", email: "p@b.co", role: "PATIENT", therapistProfile: null });
    const { approveTherapist, TherapistApprovalError } = await load();
    await expect(approveTherapist("p@b.co")).rejects.toBeInstanceOf(TherapistApprovalError);
    expect(update).not.toHaveBeenCalled();
  });

  it("throws when a THERAPIST has no therapist profile", async () => {
    findUnique.mockResolvedValue({ id: "u1", email: "t@b.co", role: "THERAPIST", therapistProfile: null });
    const { approveTherapist, TherapistApprovalError } = await load();
    await expect(approveTherapist("t@b.co")).rejects.toBeInstanceOf(TherapistApprovalError);
    expect(update).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("is idempotent when already approved (no write, no audit)", async () => {
    findUnique.mockResolvedValue({
      id: "u1", email: "t@b.co", role: "THERAPIST",
      therapistProfile: { id: "tp1", approvedAt: new Date("2026-01-01") },
    });
    const { approveTherapist } = await load();
    const result = await approveTherapist("t@b.co");
    expect(result.status).toBe("already-approved");
    expect(update).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("approves a pending therapist: sets approvedAt + writes audit", async () => {
    findUnique.mockResolvedValue({
      id: "u1", email: "t@b.co", role: "THERAPIST",
      therapistProfile: { id: "tp1", approvedAt: null },
    });
    update.mockResolvedValue({ id: "tp1" });
    const { approveTherapist } = await load();
    const result = await approveTherapist("t@b.co");

    expect(result.status).toBe("approved");
    expect(result.userId).toBe("u1");
    expect(result.email).toBe("t@b.co");
    expect(update).toHaveBeenCalledOnce();
    const updateArg = update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: "tp1" });
    expect(updateArg.data.approvedAt).toBeInstanceOf(Date);

    expect(writeAuditLog).toHaveBeenCalledOnce();
    const auditArg = writeAuditLog.mock.calls[0][0];
    expect(auditArg.action).toBe("APPROVE_THERAPIST");
    expect(auditArg.userId).toBe("u1");
    expect(auditArg.resourceId).toBe("tp1");
    expect(auditArg.metadata).toEqual({ via: "cli" });
  });
});
