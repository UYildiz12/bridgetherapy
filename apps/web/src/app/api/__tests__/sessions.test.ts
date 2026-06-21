import { beforeEach, describe, expect, it, vi } from "vitest";
import { json } from "@/lib/http";

const requireApprovedTherapist = vi.fn();
const sessionFindMany = vi.fn();
const sessionFindFirst = vi.fn();
const sessionCreate = vi.fn();
const sessionUpdate = vi.fn();
const linkFindFirst = vi.fn();
const noteCreate = vi.fn();

vi.mock("@/lib/authz", () => ({ requireApprovedTherapist }));
vi.mock("@exhale/db", () => ({
  prisma: {
    session: {
      findMany: sessionFindMany,
      findFirst: sessionFindFirst,
      create: sessionCreate,
      update: sessionUpdate,
    },
    patientTherapist: { findFirst: linkFindFirst },
    sessionNote: { create: noteCreate },
  },
}));

const okTherapist = { ok: true, user: { therapistProfile: { id: "tp1" } } };

function req(url: string, body?: unknown, method = body ? "POST" : "GET") {
  return new Request(`http://t${url}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const linkedWhere = {
  patient: {
    therapists: {
      some: { therapistId: "tp1", isActive: true, status: "ACTIVE" },
    },
  },
};

describe("/api/therapist/sessions", () => {
  beforeEach(() => {
    vi.resetModules();
    [requireApprovedTherapist, sessionFindMany, sessionCreate, linkFindFirst].forEach((f) => f.mockReset());
  });

  it("GET requires an approved therapist", async () => {
    requireApprovedTherapist.mockResolvedValue({ ok: false, response: json({ error: "Unauthorized" }, 401) });

    const { GET } = await import("../therapist/sessions/route");
    const res = await GET(req("/api/therapist/sessions"));

    expect(res.status).toBe(401);
    expect(sessionFindMany).not.toHaveBeenCalled();
  });

  it("GET lists linked patient sessions with patient labels", async () => {
    requireApprovedTherapist.mockResolvedValue(okTherapist);
    sessionFindMany.mockResolvedValue([
      {
        id: "s1",
        patientId: "pp1",
        scheduledAt: new Date("2026-06-22T15:00:00.000Z"),
        startedAt: null,
        endedAt: null,
        status: "SCHEDULED",
        patient: { user: { firstName: "Sam", lastName: "Lee", email: "sam@example.com" } },
        notes: [{ id: "n1" }],
        summary: null,
      },
    ]);

    const { GET } = await import("../therapist/sessions/route");
    const res = await GET(req("/api/therapist/sessions"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(sessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: linkedWhere,
        orderBy: { scheduledAt: "desc" },
      }),
    );
    expect(body.data[0]).toMatchObject({
      id: "s1",
      patientName: "Sam Lee",
      patientEmail: "sam@example.com",
      noteCount: 1,
      hasSummary: false,
    });
  });

  it("POST refuses to create sessions for unlinked patients", async () => {
    requireApprovedTherapist.mockResolvedValue(okTherapist);
    linkFindFirst.mockResolvedValue(null);

    const { POST } = await import("../therapist/sessions/route");
    const res = await POST(
      req("/api/therapist/sessions", {
        patientId: "pp1",
        scheduledAt: "2026-06-22T15:00:00.000Z",
      }),
    );

    expect(res.status).toBe(403);
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("POST creates a scheduled session for an active linked patient", async () => {
    requireApprovedTherapist.mockResolvedValue(okTherapist);
    linkFindFirst.mockResolvedValue({ id: "link1" });
    sessionCreate.mockResolvedValue({
      id: "s1",
      patientId: "pp1",
      scheduledAt: new Date("2026-06-22T15:00:00.000Z"),
      startedAt: null,
      endedAt: null,
      status: "SCHEDULED",
      patient: { user: { firstName: "Sam", lastName: "Lee", email: "sam@example.com" } },
      notes: [],
      summary: null,
    });

    const { POST } = await import("../therapist/sessions/route");
    const res = await POST(
      req("/api/therapist/sessions", {
        patientId: "pp1",
        scheduledAt: "2026-06-22T15:00:00.000Z",
      }),
    );

    expect(res.status).toBe(201);
    expect(linkFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId: "pp1", therapistId: "tp1", isActive: true, status: "ACTIVE" },
      }),
    );
    expect(sessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ patientId: "pp1", status: "SCHEDULED" }),
      }),
    );
  });
});

describe("/api/therapist/sessions/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    [requireApprovedTherapist, sessionFindFirst, sessionUpdate].forEach((f) => f.mockReset());
  });

  it("GET returns 404 for sessions outside the active panel", async () => {
    requireApprovedTherapist.mockResolvedValue(okTherapist);
    sessionFindFirst.mockResolvedValue(null);

    const { GET } = await import("../therapist/sessions/[id]/route");
    const res = await GET(req("/api/therapist/sessions/s1"), ctx("s1"));

    expect(res.status).toBe(404);
    expect(sessionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "s1", ...linkedWhere }),
      }),
    );
  });

  it("PATCH updates status only for linked sessions", async () => {
    requireApprovedTherapist.mockResolvedValue(okTherapist);
    sessionFindFirst.mockResolvedValue({ id: "s1" });
    sessionUpdate.mockResolvedValue({
      id: "s1",
      patientId: "pp1",
      scheduledAt: new Date("2026-06-22T15:00:00.000Z"),
      startedAt: null,
      endedAt: null,
      status: "COMPLETED",
      patient: { user: { firstName: "Sam", lastName: "Lee", email: "sam@example.com" } },
      notes: [],
      summary: null,
    });

    const { PATCH } = await import("../therapist/sessions/[id]/route");
    const res = await PATCH(req("/api/therapist/sessions/s1", { status: "COMPLETED" }, "PATCH"), ctx("s1"));

    expect(res.status).toBe(200);
    expect(sessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s1" },
        data: { status: "COMPLETED" },
      }),
    );
  });
});

describe("/api/therapist/sessions/[id]/notes", () => {
  beforeEach(() => {
    vi.resetModules();
    [requireApprovedTherapist, sessionFindFirst, noteCreate].forEach((f) => f.mockReset());
  });

  it("POST creates a therapist session note for a linked session", async () => {
    requireApprovedTherapist.mockResolvedValue(okTherapist);
    sessionFindFirst.mockResolvedValue({ id: "s1" });
    noteCreate.mockResolvedValue({
      id: "note1",
      sessionId: "s1",
      therapistId: "tp1",
      content: "Client practiced grounding.",
      createdAt: new Date("2026-06-21T00:00:00.000Z"),
      updatedAt: new Date("2026-06-21T00:00:00.000Z"),
    });

    const { POST } = await import("../therapist/sessions/[id]/notes/route");
    const res = await POST(
      req("/api/therapist/sessions/s1/notes", { content: "  Client practiced grounding.  " }),
      ctx("s1"),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(noteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { sessionId: "s1", therapistId: "tp1", content: "Client practiced grounding." },
      }),
    );
    expect(body.data.content).toBe("Client practiced grounding.");
  });
});
