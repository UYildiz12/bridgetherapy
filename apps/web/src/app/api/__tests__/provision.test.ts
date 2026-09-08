import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getAuthUser = vi.fn();
const create = vi.fn();
const findUniqueOrThrow = vi.fn();
const writeAuditLog = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@bridge/db", () => ({
  prisma: { user: { create, findUniqueOrThrow } },
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog }));

/** Mimics a Prisma unique-constraint violation (P2002). */
function uniqueViolation() {
  return Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
}

function post(body: unknown) {
  return new Request("http://t/api/auth/provision", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function loadRoute() {
  return (await import("../auth/provision/route")).POST;
}

describe("POST /api/auth/provision", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthUser.mockReset();
    create.mockReset();
    findUniqueOrThrow.mockReset();
    writeAuditLog.mockReset();
    // Audit writes are fire-and-forget; the real impl returns Promise<void>.
    writeAuditLog.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("401 when unauthenticated", async () => {
    getAuthUser.mockResolvedValue(null);
    const POST = await loadRoute();
    expect((await POST(post({ firstName: "A", lastName: "B", role: "PATIENT" }))).status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("400 on invalid role", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    const POST = await loadRoute();
    expect((await POST(post({ firstName: "A", lastName: "B", role: "WIZARD" }))).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("201 and creates the user + profile on first provision", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    create.mockResolvedValue({ id: "uid-1", email: "a@b.co", role: "PATIENT" });
    const POST = await loadRoute();
    const res = await POST(post({ firstName: "A", lastName: "B", role: "PATIENT" }));
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledOnce();

    const callArg = create.mock.calls[0][0];
    expect(callArg.select).toBeDefined();
    expect(callArg.select.passwordHash).toBeFalsy();
    expect(callArg.data.patientProfile).toBeDefined();
  });

  it("creates a THERAPIST as pending — no approval set, client cannot set it", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-2", email: "t@b.co" });
    create.mockResolvedValue({ id: "uid-2", email: "t@b.co", role: "THERAPIST" });
    const POST = await loadRoute();
    const res = await POST(post({ firstName: "T", lastName: "H", role: "THERAPIST" }));
    expect(res.status).toBe(201);

    const callArg = create.mock.calls[0][0];
    expect(callArg.data.role).toBe("THERAPIST");
    // Profile created empty → approvedAt defaults to null (pending).
    expect(callArg.data.therapistProfile).toEqual({ create: {} });
    // Defense in depth: nothing in the create payload sets approval.
    expect(JSON.stringify(callArg.data)).not.toContain("approvedAt");
  });

  it("200 (not 201) on idempotent re-call with the same role", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    create.mockRejectedValue(uniqueViolation());
    findUniqueOrThrow.mockResolvedValue({ id: "uid-1", email: "a@b.co", role: "PATIENT" });
    const POST = await loadRoute();
    const res = await POST(post({ firstName: "A", lastName: "B", role: "PATIENT" }));
    expect(res.status).toBe(200);
    expect(findUniqueOrThrow).toHaveBeenCalledOnce();
    const body = await res.json();
    expect(body.data.id).toBe("uid-1");
  });

  it("does not write an audit log on an idempotent re-call", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    create.mockRejectedValue(uniqueViolation());
    findUniqueOrThrow.mockResolvedValue({ id: "uid-1", email: "a@b.co", role: "PATIENT" });
    const POST = await loadRoute();
    await POST(post({ firstName: "A", lastName: "B", role: "PATIENT" }));
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("409 when re-provisioning with a different role", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    create.mockRejectedValue(uniqueViolation());
    findUniqueOrThrow.mockResolvedValue({ id: "uid-1", email: "a@b.co", role: "PATIENT" });
    const POST = await loadRoute();
    const res = await POST(post({ firstName: "A", lastName: "B", role: "THERAPIST" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    // The original role is preserved and surfaced to the caller.
    expect(body.data.role).toBe("PATIENT");
  });

  it("500 when the database errors unexpectedly", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    create.mockRejectedValue(new Error("connection reset"));
    const POST = await loadRoute();
    const res = await POST(post({ firstName: "A", lastName: "B", role: "PATIENT" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });

  it("still returns 201 when the audit-log write fails (non-blocking)", async () => {
    getAuthUser.mockResolvedValue({ authId: "uid-1", email: "a@b.co" });
    create.mockResolvedValue({ id: "uid-1", email: "a@b.co", role: "PATIENT" });
    writeAuditLog.mockRejectedValue(new Error("audit sink down"));
    const POST = await loadRoute();
    const res = await POST(post({ firstName: "A", lastName: "B", role: "PATIENT" }));
    expect(res.status).toBe(201);
    // Let the swallowed rejection settle so it does not leak as unhandled.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
