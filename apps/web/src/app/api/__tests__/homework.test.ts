import { describe, it, expect, vi, beforeEach } from "vitest";

const requirePatient = vi.fn();
const requireApprovedTherapist = vi.fn();
const aFindFirst = vi.fn();
const aUpdate = vi.fn();
const aCreate = vi.fn();
const hwFindFirst = vi.fn();
const ptFindUnique = vi.fn();
const mediaFindMany = vi.fn();

vi.mock("@/lib/patient", () => ({ requirePatient }));
vi.mock("@/lib/authz", () => ({ requireApprovedTherapist }));
vi.mock("@exhale/db", () => ({
  prisma: {
    homeworkAssignment: { findFirst: aFindFirst, update: aUpdate, create: aCreate },
    homework: { findFirst: hwFindFirst },
    patientTherapist: { findUnique: ptFindUnique },
    media: { findMany: mediaFindMany },
  },
}));

import { json } from "@/lib/http";

const setContent = { items: [{ id: "a", kind: "task", title: "Walk" }] };
const baseAssignment = {
  id: "as1",
  status: "PENDING",
  dueDate: null,
  completedAt: null,
  response: { items: {} },
  homework: {
    id: "hw1",
    title: "Set",
    description: null,
    content: setContent,
    isTemplate: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}
function putReq(body: unknown) {
  return new Request("http://t/api/homework/as1", { method: "PUT", body: JSON.stringify(body) });
}

describe("/api/homework/[id] PUT (patient)", () => {
  beforeEach(() => {
    vi.resetModules();
    [requirePatient, aFindFirst, aUpdate, mediaFindMany].forEach((f) => f.mockReset());
    aUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      ...baseAssignment,
      ...data,
      homework: baseAssignment.homework,
    }));
  });

  it("401 when not a patient", async () => {
    requirePatient.mockResolvedValue({ ok: false, response: json({ error: "Unauthorized" }, 401) });
    const { PUT } = await import("../homework/[id]/route");
    expect((await PUT(putReq({ items: {} }), ctx("as1"))).status).toBe(401);
  });

  it("404 when the assignment is not the patient's", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    aFindFirst.mockResolvedValue(null);
    const { PUT } = await import("../homework/[id]/route");
    expect((await PUT(putReq({ items: {} }), ctx("as1"))).status).toBe(404);
  });

  it("400 when submitting before every item is complete", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    aFindFirst.mockResolvedValue(baseAssignment);
    const { PUT } = await import("../homework/[id]/route");
    const res = await PUT(putReq({ items: { a: { done: false } }, submit: true }), ctx("as1"));
    expect(res.status).toBe(400);
    expect(aUpdate).not.toHaveBeenCalled();
  });

  it("marks COMPLETED when submitting a fully-done set", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    aFindFirst.mockResolvedValue(baseAssignment);
    const { PUT } = await import("../homework/[id]/route");
    const res = await PUT(putReq({ items: { a: { done: true } }, submit: true }), ctx("as1"));
    expect(res.status).toBe(200);
    expect(aUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "COMPLETED" }) }),
    );
    expect((await res.json()).data.status).toBe("COMPLETED");
  });

  it("marks IN_PROGRESS on a partial save", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    aFindFirst.mockResolvedValue(baseAssignment);
    const { PUT } = await import("../homework/[id]/route");
    const res = await PUT(putReq({ items: { a: { done: true } }, submit: false }), ctx("as1"));
    expect(res.status).toBe(200);
    expect(aUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "IN_PROGRESS" }) }),
    );
  });

  it("403 when a submitted media id is not owned by the patient user", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1", userId: "user-1" });
    aFindFirst.mockResolvedValue({
      ...baseAssignment,
      homework: {
        ...baseAssignment.homework,
        content: { items: [{ id: "voice1", kind: "voice", title: "Record" }] },
      },
    });
    mediaFindMany.mockResolvedValue([]);

    const { PUT } = await import("../homework/[id]/route");
    const res = await PUT(
      putReq({ items: { voice1: { mediaId: "media-owned-by-someone-else" } }, submit: false }),
      ctx("as1"),
    );

    expect(res.status).toBe(403);
    expect(mediaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ["media-owned-by-someone-else"] },
          uploaderId: "user-1",
        }),
      }),
    );
    expect(aUpdate).not.toHaveBeenCalled();
  });
});

describe("/api/therapist/assignments POST (assign)", () => {
  const ok = { ok: true, user: { therapistProfile: { id: "tp1" } } };
  function assignReq(body: unknown) {
    return new Request("http://t/api/therapist/assignments", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    vi.resetModules();
    [requireApprovedTherapist, hwFindFirst, ptFindUnique, aCreate].forEach((f) => f.mockReset());
  });

  it("401 when not an approved therapist", async () => {
    requireApprovedTherapist.mockResolvedValue({ ok: false, response: json({ error: "x" }, 401) });
    const { POST } = await import("../therapist/assignments/route");
    expect((await POST(assignReq({ homeworkId: "hw1", patientId: "pp1" }))).status).toBe(401);
  });

  it("404 when the set is not the therapist's", async () => {
    requireApprovedTherapist.mockResolvedValue(ok);
    hwFindFirst.mockResolvedValue(null);
    const { POST } = await import("../therapist/assignments/route");
    expect((await POST(assignReq({ homeworkId: "hw1", patientId: "pp1" }))).status).toBe(404);
    expect(aCreate).not.toHaveBeenCalled();
  });

  it("403 when the patient is not linked", async () => {
    requireApprovedTherapist.mockResolvedValue(ok);
    hwFindFirst.mockResolvedValue({ id: "hw1" });
    ptFindUnique.mockResolvedValue(null);
    const { POST } = await import("../therapist/assignments/route");
    expect((await POST(assignReq({ homeworkId: "hw1", patientId: "pp1" }))).status).toBe(403);
    expect(aCreate).not.toHaveBeenCalled();
  });

  it("201 creates the assignment when the set is owned and the patient is linked", async () => {
    requireApprovedTherapist.mockResolvedValue(ok);
    hwFindFirst.mockResolvedValue({ id: "hw1" });
    ptFindUnique.mockResolvedValue({ isActive: true });
    aCreate.mockResolvedValue({
      id: "as1",
      status: "PENDING",
      dueDate: null,
      completedAt: null,
      response: { items: {} },
      homework: baseAssignment.homework,
      patient: { id: "pp1", user: { firstName: "Sam", lastName: "Lee", email: "s@x.com" } },
    });
    const { POST } = await import("../therapist/assignments/route");
    const res = await POST(assignReq({ homeworkId: "hw1", patientId: "pp1" }));
    expect(res.status).toBe(201);
    expect(aCreate).toHaveBeenCalled();
    expect((await res.json()).data.patient.name).toBe("Sam Lee");
  });
});
