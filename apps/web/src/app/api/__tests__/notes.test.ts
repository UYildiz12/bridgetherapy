import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePatient = vi.fn();
const requireApprovedTherapist = vi.fn();
const lumenConfigured = vi.fn();
const askLumen = vi.fn();
const noteCreate = vi.fn();
const noteFindMany = vi.fn();
const noteFindFirst = vi.fn();
const noteUpdate = vi.fn();
const mediaFindFirst = vi.fn();
const lumenCreate = vi.fn();
const lumenFindMany = vi.fn();
const moodFindMany = vi.fn();
const profileFindUnique = vi.fn();
const downloadMedia = vi.fn();

vi.mock("@/lib/patient", () => ({ requirePatient }));
vi.mock("@/lib/authz", () => ({ requireApprovedTherapist }));
vi.mock("@/lib/lumen", () => ({ lumenConfigured, askLumen }));
vi.mock("@/lib/storage", () => ({ downloadMedia }));
vi.mock("@exhale/db", () => ({
  prisma: {
    patientNote: {
      create: noteCreate,
      findMany: noteFindMany,
      findFirst: noteFindFirst,
      update: noteUpdate,
    },
    media: { findFirst: mediaFindFirst },
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
  voiceMediaId: null,
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
    [requirePatient, noteCreate, noteFindMany, mediaFindFirst].forEach((f) => f.mockReset());
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
    expect(data[0].voiceMediaId).toBeNull();
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
        data: expect.objectContaining({ patientId: "pp1", title: null, content: "Can we discuss sleep?" }),
      }),
    );
  });

  it("POST creates a voice-only reflection when the voice media belongs to the patient", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1", userId: "u1" });
    mediaFindFirst.mockResolvedValue({ id: "m1" });
    noteCreate.mockResolvedValue(row({ id: "n2", content: "", voiceMediaId: "m1" }));
    const { POST } = await import("../notes/route");
    const res = await POST(req("/api/notes", { title: "Morning check-in", voiceMediaId: "m1" }));
    expect(res.status).toBe(201);
    expect(mediaFindFirst).toHaveBeenCalledWith({
      where: { id: "m1", uploaderId: "u1", type: "VOICE_NOTE" },
      select: { id: true },
    });
    expect(noteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { patientId: "pp1", title: "Morning check-in", content: "", voiceMediaId: "m1" },
      }),
    );
  });

  it("POST rejects entries without text or voice media", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    const { POST } = await import("../notes/route");
    const res = await POST(req("/api/notes", { content: "   " }));
    expect(res.status).toBe(400);
    expect(noteCreate).not.toHaveBeenCalled();
  });

  it("POST rejects a voice media id the patient does not own", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1", userId: "u1" });
    mediaFindFirst.mockResolvedValue(null);
    const { POST } = await import("../notes/route");
    const res = await POST(req("/api/notes", { content: "Voice context", voiceMediaId: "other" }));
    expect(res.status).toBe(403);
    expect(noteCreate).not.toHaveBeenCalled();
  });
});

describe("/api/notes/[id] PATCH", () => {
  beforeEach(() => {
    vi.resetModules();
    [requirePatient, noteFindFirst, noteUpdate, mediaFindFirst].forEach((f) => f.mockReset());
  });

  it("shares an entry and stamps sharedAt the first time", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    noteFindFirst.mockResolvedValue({ id: "n1", sharedAt: null, content: "Question", voiceMediaId: null });
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

  it("updates the attached voice media when the media belongs to the patient", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1", userId: "u1" });
    noteFindFirst.mockResolvedValue({ id: "n1", sharedAt: null, content: "Question", voiceMediaId: null });
    mediaFindFirst.mockResolvedValue({ id: "m1" });
    noteUpdate.mockResolvedValue(row({ voiceMediaId: "m1" }));
    const { PATCH } = await import("../notes/[id]/route");
    const res = await PATCH(
      new Request("http://t/api/notes/n1", { method: "PATCH", body: JSON.stringify({ voiceMediaId: "m1" }) }),
      ctx("n1"),
    );
    expect(res.status).toBe(200);
    expect(noteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "n1" }, data: { voiceMediaId: "m1" } }),
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
    [
      requirePatient,
      noteFindFirst,
      lumenConfigured,
      lumenCreate,
      lumenFindMany,
      mediaFindFirst,
      moodFindMany,
      profileFindUnique,
      askLumen,
      downloadMedia,
    ].forEach((f) => f.mockReset());
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

  it("includes the reflection voice note when asking Lumen for follow-up", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1", userId: "u1" });
    noteFindFirst.mockResolvedValue({ id: "n1", title: "Morning", content: "", voiceMediaId: "m1" });
    lumenConfigured.mockReturnValue(true);
    lumenCreate.mockResolvedValueOnce({ id: "u", noteId: "n1", role: "USER", content: "help" });
    lumenCreate.mockResolvedValueOnce({ id: "l", noteId: "n1", role: "LUMEN", content: "reply" });
    lumenFindMany.mockResolvedValue([{ role: "USER", content: "help" }]);
    profileFindUnique.mockResolvedValue({ concerns: ["anxiety"] });
    moodFindMany.mockResolvedValue([]);
    mediaFindFirst.mockResolvedValue({
      id: "m1",
      uploaderId: "u1",
      type: "VOICE_NOTE",
      s3Key: "u1/m1.webm",
      mimeType: "audio/webm",
    });
    downloadMedia.mockResolvedValue(new Uint8Array([1, 2, 3]));
    askLumen.mockResolvedValue("reply");

    const { POST } = await import("../notes/[id]/lumen/route");
    const res = await POST(
      new Request("http://t/api/notes/n1/lumen", { method: "POST", body: JSON.stringify({ message: "help" }) }),
      ctx("n1"),
    );

    expect(res.status).toBe(201);
    expect(askLumen).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceNote: { mimeType: "audio/webm", dataBase64: "AQID" },
      }),
      expect.any(Array),
    );
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
        voiceMediaId: "m1",
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
      voiceMediaId: "m1",
    });
  });
});
