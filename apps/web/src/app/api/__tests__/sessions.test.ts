import { beforeEach, describe, expect, it, vi } from "vitest";
import { json } from "@/lib/http";

const requireApprovedTherapist = vi.fn();
const getAuthUser = vi.fn();
const userFindUnique = vi.fn();
const sessionFindMany = vi.fn();
const sessionFindFirst = vi.fn();
const sessionCreate = vi.fn();
const sessionUpdate = vi.fn();
const sessionWorkspaceFindUnique = vi.fn();
const sessionWorkspaceUpsert = vi.fn();
const linkFindFirst = vi.fn();
const noteCreate = vi.fn();

vi.mock("@/lib/authz", () => ({ requireApprovedTherapist }));
vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@exhale/db", () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    session: {
      findMany: sessionFindMany,
      findFirst: sessionFindFirst,
      create: sessionCreate,
      update: sessionUpdate,
    },
    sessionWorkspace: {
      findUnique: sessionWorkspaceFindUnique,
      upsert: sessionWorkspaceUpsert,
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
      videoProvider: "jitsi",
      videoRoomId: "exhale-room",
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
        data: expect.objectContaining({
          patientId: "pp1",
          status: "SCHEDULED",
          videoProvider: "jitsi",
          videoRoomId: expect.stringMatching(/^exhale-[a-f0-9]{32}$/),
        }),
      }),
    );
  });
});

describe("/api/therapist/sessions/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    [requireApprovedTherapist, sessionFindFirst, sessionFindMany, sessionUpdate].forEach((f) => f.mockReset());
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

  it("GET includes previous session history for quick review", async () => {
    requireApprovedTherapist.mockResolvedValue(okTherapist);
    sessionFindFirst.mockResolvedValue({
      id: "s1",
      patientId: "pp1",
      scheduledAt: new Date("2026-06-22T15:00:00.000Z"),
      startedAt: null,
      endedAt: null,
      status: "SCHEDULED",
      videoProvider: "jitsi",
      videoRoomId: "exhale-room",
      patient: { user: { firstName: "Sam", lastName: "Lee", email: "sam@example.com" } },
      notes: [],
      summary: null,
    });
    sessionFindMany.mockResolvedValue([
      {
        id: "s0",
        patientId: "pp1",
        scheduledAt: new Date("2026-06-15T15:00:00.000Z"),
        startedAt: null,
        endedAt: null,
        status: "COMPLETED",
        videoProvider: "jitsi",
        videoRoomId: "exhale-previous",
        patient: { user: { firstName: "Sam", lastName: "Lee", email: "sam@example.com" } },
        notes: [{ id: "n0", content: "Reviewed exposure hierarchy.", createdAt: new Date(), updatedAt: new Date() }],
        summary: {
          id: "sum0",
          sessionId: "s0",
          summary: "Client reviewed exposure hierarchy.",
          keyPoints: ["Avoidance dropped"],
          nextSteps: ["Repeat step one"],
          createdAt: new Date("2026-06-15T16:00:00.000Z"),
        },
      },
    ]);

    const { GET } = await import("../therapist/sessions/[id]/route");
    const res = await GET(req("/api/therapist/sessions/s1"), ctx("s1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(sessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ patientId: "pp1", id: { not: "s1" }, ...linkedWhere }),
        orderBy: { scheduledAt: "desc" },
        take: 5,
      }),
    );
    expect(body.data.history[0]).toMatchObject({
      id: "s0",
      noteCount: 1,
      notes: [{ content: "Reviewed exposure hierarchy." }],
      summary: { summary: "Client reviewed exposure hierarchy." },
    });
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

describe("/api/therapist/sessions/[id]/video", () => {
  beforeEach(() => {
    vi.resetModules();
    [requireApprovedTherapist, sessionFindFirst, sessionUpdate].forEach((f) => f.mockReset());
  });

  it("POST creates a Jitsi room for a linked session without video", async () => {
    requireApprovedTherapist.mockResolvedValue(okTherapist);
    sessionFindFirst.mockResolvedValue({ id: "s1", videoProvider: null, videoRoomId: null });
    sessionUpdate.mockResolvedValue({
      id: "s1",
      patientId: "pp1",
      scheduledAt: new Date("2026-06-22T15:00:00.000Z"),
      startedAt: null,
      endedAt: null,
      status: "SCHEDULED",
      videoProvider: "jitsi",
      videoRoomId: "exhale-room",
      patient: { user: { firstName: "Sam", lastName: "Lee", email: "sam@example.com" } },
      notes: [],
      summary: null,
    });

    const { POST } = await import("../therapist/sessions/[id]/video/route");
    const res = await POST(req("/api/therapist/sessions/s1/video"), ctx("s1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(sessionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "s1", ...linkedWhere }),
      }),
    );
    expect(sessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s1" },
        data: expect.objectContaining({
          videoProvider: "jitsi",
          videoRoomId: expect.stringMatching(/^exhale-[a-f0-9]{32}$/),
        }),
      }),
    );
    expect(body.data.videoUrl).toBe("https://meet.jit.si/exhale-room");
  });

  it("POST preserves an existing Jitsi room", async () => {
    requireApprovedTherapist.mockResolvedValue(okTherapist);
    sessionFindFirst.mockResolvedValue({ id: "s1", videoProvider: "jitsi", videoRoomId: "exhale-existing" });
    sessionUpdate.mockResolvedValue({
      id: "s1",
      patientId: "pp1",
      scheduledAt: new Date("2026-06-22T15:00:00.000Z"),
      startedAt: null,
      endedAt: null,
      status: "SCHEDULED",
      videoProvider: "jitsi",
      videoRoomId: "exhale-existing",
      patient: { user: { firstName: "Sam", lastName: "Lee", email: "sam@example.com" } },
      notes: [],
      summary: null,
    });

    const { POST } = await import("../therapist/sessions/[id]/video/route");
    const res = await POST(req("/api/therapist/sessions/s1/video"), ctx("s1"));

    expect(res.status).toBe(200);
    expect(sessionUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: {} }));
  });
});

describe("/api/therapist/sessions/[id]/workspace", () => {
  beforeEach(() => {
    vi.resetModules();
    [requireApprovedTherapist, sessionFindFirst, sessionWorkspaceFindUnique, sessionWorkspaceUpsert].forEach((f) =>
      f.mockReset(),
    );
  });

  it("PATCH saves whiteboard state for a linked therapist session", async () => {
    requireApprovedTherapist.mockResolvedValue(okTherapist);
    sessionFindFirst.mockResolvedValue({ id: "s1" });
    sessionWorkspaceUpsert.mockResolvedValue({
      id: "sw1",
      sessionId: "s1",
      patientNote: "Client wants to revisit exposure ladder.",
      whiteboard: { strokes: [{ points: [{ x: 1, y: 2 }], color: "#111827", size: 3 }] },
      createdAt: new Date("2026-06-22T15:00:00.000Z"),
      updatedAt: new Date("2026-06-22T15:05:00.000Z"),
    });

    const { PATCH } = await import("../therapist/sessions/[id]/workspace/route");
    const res = await PATCH(
      req(
        "/api/therapist/sessions/s1/workspace",
        {
          patientNote: "  Client wants to revisit exposure ladder.  ",
          whiteboard: { strokes: [{ points: [{ x: 1, y: 2 }], color: "#111827", size: 3 }] },
        },
        "PATCH",
      ),
      ctx("s1"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(sessionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "s1", ...linkedWhere }),
      }),
    );
    expect(sessionWorkspaceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: "s1" },
        update: expect.objectContaining({
          patientNote: "Client wants to revisit exposure ladder.",
          whiteboard: expect.objectContaining({ strokes: expect.any(Array) }),
        }),
        create: expect.objectContaining({
          sessionId: "s1",
          patientNote: "Client wants to revisit exposure ladder.",
        }),
      }),
    );
    expect(body.data).toMatchObject({
      sessionId: "s1",
      patientNote: "Client wants to revisit exposure ladder.",
      whiteboard: { strokes: [{ points: [{ x: 1, y: 2 }], color: "#111827", size: 3 }] },
    });
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

describe("/api/sessions", () => {
  beforeEach(() => {
    vi.resetModules();
    [getAuthUser, userFindUnique, sessionFindMany].forEach((f) => f.mockReset());
  });

  it("GET requires patient authentication", async () => {
    getAuthUser.mockResolvedValue(null);

    const { GET } = await import("../sessions/route");
    const res = await GET(req("/api/sessions"));

    expect(res.status).toBe(401);
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it("GET lists the patient's own video sessions", async () => {
    getAuthUser.mockResolvedValue({ authId: "u1", email: "sam@example.com" });
    userFindUnique.mockResolvedValue({ patientProfile: { id: "pp1" } });
    sessionFindMany.mockResolvedValue([
      {
        id: "s1",
        scheduledAt: new Date("2026-06-22T15:00:00.000Z"),
        startedAt: null,
        endedAt: null,
        status: "SCHEDULED",
        videoProvider: "jitsi",
        videoRoomId: "exhale-room",
        summary: {
          id: "sum1",
          sessionId: "s1",
          summary: "Practice paced breathing before sleep.",
          keyPoints: ["Breathing helped"],
          nextSteps: ["Practice nightly"],
          createdAt: new Date("2026-06-22T16:00:00.000Z"),
        },
      },
    ]);

    const { GET } = await import("../sessions/route");
    const res = await GET(req("/api/sessions"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(userFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
      }),
    );
    expect(sessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId: "pp1" },
        orderBy: { scheduledAt: "desc" },
        select: expect.objectContaining({ summary: true }),
      }),
    );
    expect(body.data[0]).toMatchObject({
      id: "s1",
      videoUrl: "https://meet.jit.si/exhale-room",
      summary: { summary: "Practice paced breathing before sleep." },
    });
  });
});

describe("/api/sessions/[id]/workspace", () => {
  beforeEach(() => {
    vi.resetModules();
    [getAuthUser, userFindUnique, sessionFindFirst, sessionWorkspaceFindUnique, sessionWorkspaceUpsert].forEach((f) =>
      f.mockReset(),
    );
  });

  it("PATCH saves a patient note and whiteboard only for the patient's own session", async () => {
    getAuthUser.mockResolvedValue({ authId: "u1", email: "sam@example.com" });
    userFindUnique.mockResolvedValue({ patientProfile: { id: "pp1" } });
    sessionFindFirst.mockResolvedValue({ id: "s1" });
    sessionWorkspaceUpsert.mockResolvedValue({
      id: "sw1",
      sessionId: "s1",
      patientNote: "I want to remember the breathing plan.",
      whiteboard: { strokes: [{ points: [{ x: 4, y: 8 }], color: "#0f766e", size: 4 }] },
      createdAt: new Date("2026-06-22T15:00:00.000Z"),
      updatedAt: new Date("2026-06-22T15:05:00.000Z"),
    });

    const { PATCH } = await import("../sessions/[id]/workspace/route");
    const res = await PATCH(
      req(
        "/api/sessions/s1/workspace",
        {
          patientNote: "  I want to remember the breathing plan.  ",
          whiteboard: { strokes: [{ points: [{ x: 4, y: 8 }], color: "#0f766e", size: 4 }] },
        },
        "PATCH",
      ),
      ctx("s1"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(sessionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s1", patientId: "pp1" },
        select: { id: true },
      }),
    );
    expect(sessionWorkspaceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: "s1" },
        update: expect.objectContaining({
          patientNote: "I want to remember the breathing plan.",
          whiteboard: expect.objectContaining({ strokes: expect.any(Array) }),
        }),
      }),
    );
    expect(body.data.patientNote).toBe("I want to remember the breathing plan.");
  });
});
