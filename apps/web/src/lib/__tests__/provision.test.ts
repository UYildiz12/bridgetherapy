import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const create = vi.fn();
const findUniqueOrThrow = vi.fn();
const writeAuditLog = vi.fn();
vi.mock("@bridge/db", () => ({ prisma: { user: { findUnique, create, findUniqueOrThrow } } }));
vi.mock("@/lib/audit", () => ({ writeAuditLog }));

describe("ensureProvisioned", () => {
  beforeEach(() => {
    vi.resetModules();
    findUnique.mockReset();
    create.mockReset();
    findUniqueOrThrow.mockReset();
    writeAuditLog.mockReset().mockResolvedValue(undefined);
  });

  it("returns the existing user without creating one", async () => {
    findUnique.mockResolvedValue({ id: "u1", firstName: "A", role: "PATIENT" });
    const { ensureProvisioned } = await import("../provision");
    const u = await ensureProvisioned({ id: "u1", email: "a@b.co" });
    expect(u.id).toBe("u1");
    expect(create).not.toHaveBeenCalled();
  });

  it("creates from auth metadata when missing (patient default + profile)", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "u2", firstName: "Sam", role: "PATIENT" });
    const { ensureProvisioned } = await import("../provision");
    const u = await ensureProvisioned({
      id: "u2",
      email: "s@b.co",
      user_metadata: { first_name: "Sam", last_name: "Lee" },
    });
    expect(u.firstName).toBe("Sam");
    const arg = create.mock.calls[0][0];
    expect(arg.data.id).toBe("u2");
    expect(arg.data.email).toBe("s@b.co");
    expect(arg.data.firstName).toBe("Sam");
    expect(arg.data.role).toBe("PATIENT");
    expect(arg.data.patientProfile).toBeDefined();
  });

  it("creates a therapist profile when metadata role is THERAPIST", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "u3", firstName: "Dr", role: "THERAPIST" });
    const { ensureProvisioned } = await import("../provision");
    await ensureProvisioned({
      id: "u3",
      email: "d@b.co",
      user_metadata: { first_name: "Dr", role: "THERAPIST" },
    });
    const arg = create.mock.calls[0][0];
    expect(arg.data.role).toBe("THERAPIST");
    expect(arg.data.therapistProfile).toBeDefined();
  });

  it("defaults to empty names + PATIENT when metadata is absent", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "u5", firstName: "", role: "PATIENT" });
    const { ensureProvisioned } = await import("../provision");
    await ensureProvisioned({ id: "u5", email: "e@b.co" });
    const arg = create.mock.calls[0][0];
    expect(arg.data.firstName).toBe("");
    expect(arg.data.role).toBe("PATIENT");
    expect(arg.data.patientProfile).toBeDefined();
  });

  it("returns the existing row on a unique-constraint race (P2002)", async () => {
    findUnique.mockResolvedValue(null);
    create.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));
    findUniqueOrThrow.mockResolvedValue({ id: "u4", firstName: "X", role: "PATIENT" });
    const { ensureProvisioned } = await import("../provision");
    const u = await ensureProvisioned({ id: "u4", email: "x@b.co" });
    expect(u.id).toBe("u4");
  });
});
