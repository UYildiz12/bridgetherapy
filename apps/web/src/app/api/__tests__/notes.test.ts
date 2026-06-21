import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePatient = vi.fn();
const requireApprovedTherapist = vi.fn();
const noteCreate = vi.fn();
const noteFindMany = vi.fn();
const noteFindFirst = vi.fn();
const noteUpdate = vi.fn();

vi.mock("@/lib/patient", () => ({ requirePatient }));
vi.mock("@/lib/authz", () => ({ requireApprovedTherapist }));
vi.mock("@exhale/db", () => ({
  prisma: {
    patientNote: {
      create: noteCreate,
      findMany: noteFindMany,
      findFirst: noteFindFirst,
      update: noteUpdate,
    },
  },
}));

import { json } from "@/lib/http";

function req(path: string, body?: unknown) {
  return new Request(`http://t${path}`, {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
  });
}

function patch(body: unknown) {
  return new Request("http://t/api/therapist/notes/n1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("/api/notes", () => {
  beforeEach(() => {
    vi.resetModules();
    [requirePatient, noteCreate, noteFindMany].forEach((f) => f.mockReset());
  });

  it("GET propagates the patient auth response", async () => {
    requirePatient.mockResolvedValue({ ok: false, response: json({ error: "Unauthorized" }, 401) });

    const { GET } = await import("../notes/route");
    const res = await GET(req("/api/notes"));

    expect(res.status).toBe(401);
    expect(noteFindMany).not.toHaveBeenCalled();
  });

  it("GET returns only the patient's notes newest-first", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    noteFindMany.mockResolvedValue([{ id: "n1", content: "Question", isResolved: false }]);

    const { GET } = await import("../notes/route");
    const res = await GET(req("/api/notes"));

    expect(res.status).toBe(200);
    expect((await res.json()).data[0].id).toBe("n1");
    expect(noteFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId: "pp1" },
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("POST creates a trimmed unresolved note for the patient", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    noteCreate.mockResolvedValue({ id: "n2", content: "Can we discuss sleep?", isResolved: false });

    const { POST } = await import("../notes/route");
    const res = await POST(req("/api/notes", { content: "  Can we discuss sleep?  " }));

    expect(res.status).toBe(201);
    expect(noteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { patientId: "pp1", content: "Can we discuss sleep?" },
      }),
    );
  });

  it("POST rejects empty notes", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });

    const { POST } = await import("../notes/route");
    const res = await POST(req("/api/notes", { content: "   " }));

    expect(res.status).toBe(400);
    expect(noteCreate).not.toHaveBeenCalled();
  });
});

describe("/api/therapist/notes", () => {
  const therapist = { ok: true, user: { therapistProfile: { id: "tp1" } } };

  beforeEach(() => {
    vi.resetModules();
    [requireApprovedTherapist, noteFindMany, noteFindFirst, noteUpdate].forEach((f) => f.mockReset());
  });

  it("GET propagates the approved therapist auth response", async () => {
    requireApprovedTherapist.mockResolvedValue({
      ok: false,
      response: json({ error: "Forbidden" }, 403),
    });

    const { GET } = await import("../therapist/notes/route");
    const res = await GET(req("/api/therapist/notes"));

    expect(res.status).toBe(403);
    expect(noteFindMany).not.toHaveBeenCalled();
  });

  it("GET returns notes for active linked patients with patient labels", async () => {
    requireApprovedTherapist.mockResolvedValue(therapist);
    noteFindMany.mockResolvedValue([
      {
        id: "n1",
        patientId: "pp1",
        content: "Question",
        isResolved: false,
        createdAt: new Date("2026-06-21T00:00:00.000Z"),
        patient: {
          user: { firstName: "Sam", lastName: "Lee", email: "sam@example.com" },
        },
      },
    ]);

    const { GET } = await import("../therapist/notes/route");
    const res = await GET(req("/api/therapist/notes"));

    expect(res.status).toBe(200);
    expect(noteFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          patient: {
            therapists: {
              some: { therapistId: "tp1", isActive: true, status: "ACTIVE" },
            },
          },
        },
      }),
    );
    expect((await res.json()).data[0]).toMatchObject({
      id: "n1",
      patientId: "pp1",
      patientName: "Sam Lee",
      patientEmail: "sam@example.com",
    });
  });

  it("PATCH resolves a linked patient's note", async () => {
    requireApprovedTherapist.mockResolvedValue(therapist);
    noteFindFirst.mockResolvedValue({ id: "n1" });
    noteUpdate.mockResolvedValue({ id: "n1", isResolved: true });

    const { PATCH } = await import("../therapist/notes/[id]/route");
    const res = await PATCH(patch({ isResolved: true }), ctx("n1"));

    expect(res.status).toBe(200);
    expect(noteFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "n1",
          patient: {
            therapists: {
              some: { therapistId: "tp1", isActive: true, status: "ACTIVE" },
            },
          },
        },
      }),
    );
    expect(noteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "n1" },
        data: { isResolved: true },
      }),
    );
  });

  it("PATCH returns 404 for a note outside the therapist's active patients", async () => {
    requireApprovedTherapist.mockResolvedValue(therapist);
    noteFindFirst.mockResolvedValue(null);

    const { PATCH } = await import("../therapist/notes/[id]/route");
    const res = await PATCH(patch({ isResolved: true }), ctx("n1"));

    expect(res.status).toBe(404);
    expect(noteUpdate).not.toHaveBeenCalled();
  });
});
