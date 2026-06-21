import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePatient = vi.fn();
const requireApprovedTherapist = vi.fn();
const lumenConfigured = vi.fn();
const askLumen = vi.fn();
const noteCreate = vi.fn();
const noteFindMany = vi.fn();
const noteFindFirst = vi.fn();
const noteUpdate = vi.fn();
const lumenCreate = vi.fn();
const lumenFindMany = vi.fn();
const moodFindMany = vi.fn();
const profileFindUnique = vi.fn();

vi.mock("@/lib/patient", () => ({ requirePatient }));
vi.mock("@/lib/authz", () => ({ requireApprovedTherapist }));
vi.mock("@/lib/lumen", () => ({ lumenConfigured, askLumen }));
vi.mock("@exhale/db", () => ({
  prisma: {
    patientNote: {
      create: noteCreate,
      findMany: noteFindMany,
      findFirst: noteFindFirst,
      update: noteUpdate,
    },
    lumenMessage: { create: lumenCreate, findMany: lumenFindMany },
    moodEntry: { findMany: moodFindMany },
    patientProfile: { findUnique: profileFindUnique },
  },
}));

import { json } from "@/lib/http";

function req(path: string, body?: unknown) {
  return new Request(`http://t${path}`, {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
  });
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}
const row = (over: Record<string, unknown> = {}) => ({
  id: "n1",
  title: null,
  content: "Question",
  visibility: "PRIVATE",
  sharedAt: null,
  createdAt: new Date("2026-06-21T00:00:00.000Z"),
  updatedAt: new Date("2026-06-21T00:00:00.000Z"),
  _count: { lumenMessages: 0 },
  ...over,
});

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

  it("GET returns the patient's entries newest-first with a Lumen count", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    noteFindMany.mockResolvedValue([row({ _count: { lumenMessages: 3 } })]);
    const { GET } = await import("../notes/route");
    const res = await GET(req("/api/notes"));
    expect(res.status).toBe(200);
    const data = (await res.json()).data;
    expect(data[0].id).toBe("n1");
    expect(data[0].lumenCount).toBe(3);
    expect(noteFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: "pp1" }, orderBy: { updatedAt: "desc" } }),
    );
  });

  it("POST creates a trimmed private entry", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    noteCreate.mockResolvedValue(row({ id: "n2", content: "Can we discuss sleep?" }));
    const { POST } = await import("../notes/route");
    const res = await POST(req("/api/notes", { content: "  Can we discuss sleep?  " }));
    expect(res.status).toBe(201);
    expect(noteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { patientId: "pp1", title: null, content: "Can we discuss sleep?" },
      }),
    );
  });

  it("POST rejects empty entries", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    const { POST } = await import("../notes/route");
    const res = await POST(req("/api/notes", { content: "   " }));
    expect(res.status).toBe(400);
    expect(noteCreate).not.toHaveBeenCalled();
  });
});

describe("/api/notes/[id] PATCH", () => {
  beforeEach(() => {
    vi.resetModules();
    [requirePatient, noteFindFirst, noteUpdate].forEach((f) => f.mockReset());
  });

  it("shares an entry and stamps sharedAt the first time", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    noteFindFirst.mockResolvedValue({ id: "n1", sharedAt: null });
    noteUpdate.mockResolvedValue(row({ visibility: "SHARED", sharedAt: new Date() }));
    const { PATCH } = await import("../notes/[id]/route");
    const res = await PATCH(
      new Request("http://t/api/notes/n1", { method: "PATCH", body: JSON.stringify({ visibility: "SHARED" }) }),
      ctx("n1"),
    );
    expect(res.status).toBe(200);
    expect(noteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "n1" },
        data: expect.objectContaining({ visibility: "SHARED", sharedAt: expect.any(Date) }),
      }),
    );
  });

  it("404s when the entry is not the patient's", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    noteFindFirst.mockResolvedValue(null);
    const { PATCH } = await import("../notes/[id]/route");
    const res = await PATCH(
      new Request("http://t/api/notes/n1", { method: "PATCH", body: JSON.stringify({ visibility: "SHARED" }) }),
      ctx("n1"),
    );
    expect(res.status).toBe(404);
    expect(noteUpdate).not.toHaveBeenCalled();
  });
});

describe("/api/notes/[id]/lumen POST", () => {
  beforeEach(() => {
    vi.resetModules();
    [requirePatient, noteFindFirst, lumenConfigured, lumenCreate].forEach((f) => f.mockReset());
  });

  it("503s when Lumen has no API key configured", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    noteFindFirst.mockResolvedValue({ id: "n1", title: null, content: "x" });
    lumenConfigured.mockReturnValue(false);
    const { POST } = await import("../notes/[id]/lumen/route");
    const res = await POST(
      new Request("http://t/api/notes/n1/lumen", { method: "POST", body: JSON.stringify({ message: "help" }) }),
      ctx("n1"),
    );
    expect(res.status).toBe(503);
    expect(lumenCreate).not.toHaveBeenCalled();
  });
});

describe("/api/therapist/notes", () => {
  const therapist = { ok: true, user: { therapistProfile: { id: "tp1" } } };

  beforeEach(() => {
    vi.resetModules();
    [requireApprovedTherapist, noteFindMany].forEach((f) => f.mockReset());
  });

  it("GET propagates the approved-therapist auth response", async () => {
    requireApprovedTherapist.mockResolvedValue({ ok: false, response: json({ error: "Forbidden" }, 403) });
    const { GET } = await import("../therapist/notes/route");
    const res = await GET(req("/api/therapist/notes"));
    expect(res.status).toBe(403);
    expect(noteFindMany).not.toHaveBeenCalled();
  });

  it("GET returns only SHARED entries for active patients, with labels", async () => {
    requireApprovedTherapist.mockResolvedValue(therapist);
    noteFindMany.mockResolvedValue([
      {
        id: "n1",
        patientId: "pp1",
        title: "Panic loop",
        content: "Question",
        sharedAt: new Date("2026-06-21T00:00:00.000Z"),
        createdAt: new Date("2026-06-21T00:00:00.000Z"),
        updatedAt: new Date("2026-06-21T00:00:00.000Z"),
        patient: { user: { firstName: "Sam", lastName: "Lee", email: "sam@example.com" } },
      },
    ]);
    const { GET } = await import("../therapist/notes/route");
    const res = await GET(req("/api/therapist/notes"));
    expect(res.status).toBe(200);
    expect(noteFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visibility: "SHARED",
          patient: { therapists: { some: { therapistId: "tp1", isActive: true, status: "ACTIVE" } } },
        }),
      }),
    );
    expect((await res.json()).data[0]).toMatchObject({
      id: "n1",
      patientName: "Sam Lee",
      patientEmail: "sam@example.com",
      title: "Panic loop",
    });
  });
});
