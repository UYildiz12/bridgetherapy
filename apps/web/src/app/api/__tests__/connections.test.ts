import { describe, it, expect, vi, beforeEach } from "vitest";

const requirePatient = vi.fn();
const requireApprovedTherapist = vi.fn();
const ptFindFirst = vi.fn();
const ptFindMany = vi.fn();
const ptUpdate = vi.fn();
const txFindFirst = vi.fn();
const txUpdate = vi.fn();
const $transaction = vi.fn();

vi.mock("@/lib/patient", () => ({ requirePatient }));
vi.mock("@/lib/authz", () => ({ requireApprovedTherapist }));
vi.mock("@exhale/db", () => ({
  prisma: {
    patientTherapist: { findFirst: ptFindFirst, findMany: ptFindMany, update: ptUpdate },
    $transaction,
  },
}));

import { json } from "@/lib/http";

const therapistUser = { firstName: "Thera", lastName: "Pist", email: "thera@example.com" };

beforeEach(() => {
  vi.resetModules();
  [requirePatient, requireApprovedTherapist, ptFindFirst, ptFindMany, ptUpdate, txFindFirst, txUpdate, $transaction].forEach(
    (f) => f.mockReset(),
  );
  $transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ patientTherapist: { findFirst: txFindFirst, update: txUpdate } }),
  );
});

describe("/api/connections GET (patient view)", () => {
  const get = () => new Request("http://t/api/connections");

  it("surfaces therapist-initiated invites separately from the patient's own request", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    ptFindMany.mockResolvedValue([
      {
        id: "inv1",
        status: "PENDING",
        initiatedBy: "THERAPIST",
        startDate: new Date("2026-01-02T00:00:00.000Z"),
        therapist: { user: therapistUser },
      },
      {
        id: "req1",
        status: "PENDING",
        initiatedBy: "PATIENT",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        therapist: { user: { firstName: "Other", lastName: "Doc", email: "other@example.com" } },
      },
    ]);
    const { GET } = await import("../connections/route");
    const res = await GET(get());
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.status).toBe("pending");
    expect(data.therapistName).toBe("Other Doc");
    expect(data.invites).toEqual([
      { id: "inv1", therapistName: "Thera Pist", invitedAt: "2026-01-02T00:00:00.000Z" },
    ]);
  });

  it("does not present a lone therapist invite as the patient's own pending request", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    ptFindMany.mockResolvedValue([
      {
        id: "inv1",
        status: "PENDING",
        initiatedBy: "THERAPIST",
        startDate: new Date("2026-01-02T00:00:00.000Z"),
        therapist: { user: therapistUser },
      },
    ]);
    const { GET } = await import("../connections/route");
    const { data } = await (await GET(get())).json();
    expect(data.status).toBe("none");
    expect(data.invites).toHaveLength(1);
  });
});

describe("/api/therapist/requests GET (incoming requests)", () => {
  it("excludes therapist-initiated invites from the acceptable list", async () => {
    requireApprovedTherapist.mockResolvedValue({ ok: true, user: { therapistProfile: { id: "tpp1" } } });
    ptFindMany.mockResolvedValue([]);
    const { GET } = await import("../therapist/requests/route");
    const res = await GET(new Request("http://t/api/therapist/requests"));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual([]);
    expect(ptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { therapistId: "tpp1", status: "PENDING", initiatedBy: "PATIENT" },
      }),
    );
  });
});

describe("/api/therapist/requests/[id] PUT (consent guard)", () => {
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const body = (b: unknown) => new Request("http://t/x", { method: "PUT", body: JSON.stringify(b) });

  it("a therapist cannot accept their own invite", async () => {
    requireApprovedTherapist.mockResolvedValue({ ok: true, user: { therapistProfile: { id: "tpp1" } } });
    // The scoped lookup (initiatedBy: PATIENT) finds nothing for a THERAPIST-initiated invite.
    ptFindFirst.mockResolvedValue(null);
    const { PUT } = await import("../therapist/requests/[id]/route");
    const res = await PUT(body({ accept: true }), ctx("inv1"));
    expect(res.status).toBe(404);
    expect(ptFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv1", therapistId: "tpp1", status: "PENDING", initiatedBy: "PATIENT" },
      }),
    );
    expect($transaction).not.toHaveBeenCalled();
    expect(ptUpdate).not.toHaveBeenCalled();
  });
});

describe("/api/connections/[id] PUT (patient accepts or declines an invite)", () => {
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const body = (b: unknown) => new Request("http://t/x", { method: "PUT", body: JSON.stringify(b) });

  it("the patient can accept a therapist-initiated invite", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    ptFindFirst.mockResolvedValue({ id: "inv1" });
    txFindFirst.mockResolvedValue(null);
    txUpdate.mockResolvedValue({});
    const { PUT } = await import("../connections/[id]/route");
    const res = await PUT(body({ accept: true }), ctx("inv1"));
    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe("active");
    expect(ptFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv1", patientId: "pp1", status: "PENDING", initiatedBy: "THERAPIST" },
      }),
    );
    expect(txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv1" },
        data: expect.objectContaining({ status: "ACTIVE", isActive: true, endDate: null }),
      }),
    );
  });

  it("409 when the patient already has an active therapist", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    ptFindFirst.mockResolvedValue({ id: "inv1" });
    txFindFirst.mockResolvedValue({ id: "other-active-link" });
    const { PUT } = await import("../connections/[id]/route");
    const res = await PUT(body({ accept: true }), ctx("inv1"));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("You already have an active therapist.");
    expect(txUpdate).not.toHaveBeenCalled();
  });

  it("decline marks the invite declined without a transaction", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    ptFindFirst.mockResolvedValue({ id: "inv1" });
    ptUpdate.mockResolvedValue({});
    const { PUT } = await import("../connections/[id]/route");
    const res = await PUT(body({ accept: false }), ctx("inv1"));
    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe("declined");
    expect(ptUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "DECLINED", isActive: false }) }),
    );
    expect($transaction).not.toHaveBeenCalled();
  });

  it("404 when the link is not a pending therapist invite for this patient", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    // Patient-initiated requests and other patients' invites never match the scoped lookup.
    ptFindFirst.mockResolvedValue(null);
    const { PUT } = await import("../connections/[id]/route");
    const res = await PUT(body({ accept: true }), ctx("req1"));
    expect(res.status).toBe(404);
    expect($transaction).not.toHaveBeenCalled();
    expect(ptUpdate).not.toHaveBeenCalled();
  });

  it("401 when not a patient", async () => {
    requirePatient.mockResolvedValue({ ok: false, response: json({ error: "Unauthorized" }, 401) });
    const { PUT } = await import("../connections/[id]/route");
    expect((await PUT(body({ accept: true }), ctx("inv1"))).status).toBe(401);
    expect(ptFindFirst).not.toHaveBeenCalled();
  });
});
