import { describe, it, expect, vi, beforeEach } from "vitest";

const requirePatient = vi.fn();
const requireApprovedTherapist = vi.fn();
const ptFindFirst = vi.fn();
const ptUpsert = vi.fn();
const ptUpdate = vi.fn();
const tpFindFirst = vi.fn();
const ppUpdate = vi.fn();
const userFindUnique = vi.fn();

vi.mock("@/lib/patient", () => ({ requirePatient }));
vi.mock("@/lib/authz", () => ({ requireApprovedTherapist }));
vi.mock("@exhale/db", () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    patientTherapist: { findFirst: ptFindFirst, upsert: ptUpsert, update: ptUpdate, findMany: vi.fn() },
    therapistProfile: { findFirst: tpFindFirst },
    patientProfile: { update: ppUpdate },
  },
}));

import { json } from "@/lib/http";

describe("/api/connections POST (patient request)", () => {
  const ok = { ok: true, patientId: "pp1" };
  const body = (b: unknown) =>
    new Request("http://t/api/connections", { method: "POST", body: JSON.stringify(b) });

  beforeEach(() => {
    vi.resetModules();
    [requirePatient, ptFindFirst, ptUpsert, tpFindFirst].forEach((f) => f.mockReset());
  });

  it("409 when the patient already has an active therapist", async () => {
    requirePatient.mockResolvedValue(ok);
    ptFindFirst.mockResolvedValue({ id: "active" });
    const { POST } = await import("../connections/route");
    expect((await POST(body({ therapistId: "tp1" }))).status).toBe(409);
    expect(ptUpsert).not.toHaveBeenCalled();
  });

  it("404 when the therapist is not available", async () => {
    requirePatient.mockResolvedValue(ok);
    ptFindFirst.mockResolvedValue(null);
    tpFindFirst.mockResolvedValue(null);
    const { POST } = await import("../connections/route");
    expect((await POST(body({ therapistId: "tp1" }))).status).toBe(404);
    expect(ptUpsert).not.toHaveBeenCalled();
  });

  it("201 pending on a valid request", async () => {
    requirePatient.mockResolvedValue(ok);
    ptFindFirst.mockResolvedValue(null);
    tpFindFirst.mockResolvedValue({ id: "tp1" });
    ptUpsert.mockResolvedValue({});
    const { POST } = await import("../connections/route");
    const res = await POST(body({ therapistId: "tp1", note: "hi" }));
    expect(res.status).toBe(201);
    expect(ptUpsert).toHaveBeenCalled();
    expect((await res.json()).data.status).toBe("pending");
  });

  it("401 when not a patient", async () => {
    requirePatient.mockResolvedValue({ ok: false, response: json({ error: "Unauthorized" }, 401) });
    const { POST } = await import("../connections/route");
    expect((await POST(body({ therapistId: "tp1" }))).status).toBe(401);
  });
});

describe("/api/therapist/requests/[id] PUT (accept/decline)", () => {
  const t = { ok: true, user: { therapistProfile: { id: "tpp1" } } };
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const body = (b: unknown) => new Request("http://t/x", { method: "PUT", body: JSON.stringify(b) });

  beforeEach(() => {
    vi.resetModules();
    [requireApprovedTherapist, ptFindFirst, ptUpdate].forEach((f) => f.mockReset());
  });

  it("accept activates the connection", async () => {
    requireApprovedTherapist.mockResolvedValue(t);
    ptFindFirst.mockResolvedValue({ id: "l1" });
    ptUpdate.mockResolvedValue({});
    const { PUT } = await import("../therapist/requests/[id]/route");
    const res = await PUT(body({ accept: true }), ctx("l1"));
    expect(res.status).toBe(200);
    expect(ptUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ACTIVE", isActive: true }) }),
    );
  });

  it("decline marks the connection declined", async () => {
    requireApprovedTherapist.mockResolvedValue(t);
    ptFindFirst.mockResolvedValue({ id: "l1" });
    ptUpdate.mockResolvedValue({});
    const { PUT } = await import("../therapist/requests/[id]/route");
    const res = await PUT(body({ accept: false }), ctx("l1"));
    expect(res.status).toBe(200);
    expect(ptUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "DECLINED", isActive: false }) }),
    );
  });

  it("404 when the request is not the therapist's pending one", async () => {
    requireApprovedTherapist.mockResolvedValue(t);
    ptFindFirst.mockResolvedValue(null);
    const { PUT } = await import("../therapist/requests/[id]/route");
    expect((await PUT(body({ accept: true }), ctx("l1"))).status).toBe(404);
    expect(ptUpdate).not.toHaveBeenCalled();
  });
});

describe("/api/therapist/patients POST (invite by email)", () => {
  const t = { ok: true, user: { therapistProfile: { id: "tpp1" } } };
  const body = (b: unknown) =>
    new Request("http://t/api/therapist/patients", { method: "POST", body: JSON.stringify(b) });

  beforeEach(() => {
    vi.resetModules();
    [requireApprovedTherapist, userFindUnique, ptUpsert].forEach((f) => f.mockReset());
  });

  it("creates a pending inactive connection so the patient must consent", async () => {
    requireApprovedTherapist.mockResolvedValue(t);
    userFindUnique.mockResolvedValue({
      firstName: "Pat",
      lastName: "Client",
      email: "patient@example.com",
      patientProfile: { id: "pp1" },
    });
    ptUpsert.mockResolvedValue({ startDate: new Date("2026-01-01T00:00:00.000Z") });

    const { POST } = await import("../therapist/patients/route");
    const res = await POST(body({ email: "PATIENT@example.com" }));

    expect(res.status).toBe(201);
    expect(userFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "patient@example.com" } }),
    );
    expect(ptUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: "PENDING", isActive: false }),
        update: expect.objectContaining({ status: "PENDING", isActive: false }),
      }),
    );
    expect((await res.json()).data.status).toBe("pending");
  });
});

describe("/api/intake PUT (validation)", () => {
  beforeEach(() => {
    vi.resetModules();
    [requirePatient, ppUpdate].forEach((f) => f.mockReset());
  });

  it("drops unknown concern ids before saving", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    ppUpdate.mockResolvedValue({
      concerns: ["anxiety"],
      availability: [],
      goals: null,
      intakeCompletedAt: new Date(),
    });
    const { PUT } = await import("../intake/route");
    const res = await PUT(
      new Request("http://t/api/intake", {
        method: "PUT",
        body: JSON.stringify({ concerns: ["anxiety", "bogus"], availability: [], goals: "" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(ppUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ concerns: ["anxiety"] }) }),
    );
  });
});
