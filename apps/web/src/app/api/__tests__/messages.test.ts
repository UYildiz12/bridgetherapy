import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthUser = vi.fn();
const userFindUnique = vi.fn();
const linkFindMany = vi.fn();
const linkFindFirst = vi.fn();
const conversationFindMany = vi.fn();
const conversationFindFirst = vi.fn();
const conversationUpsert = vi.fn();
const conversationUpdate = vi.fn();
const messageCreate = vi.fn();
const messageUpdateMany = vi.fn();

vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@exhale/db", () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    patientTherapist: { findMany: linkFindMany, findFirst: linkFindFirst },
    conversation: {
      findMany: conversationFindMany,
      findFirst: conversationFindFirst,
      upsert: conversationUpsert,
      update: conversationUpdate,
    },
    message: { create: messageCreate, updateMany: messageUpdateMany },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  },
}));

function req(url: string, body?: unknown, method = body ? "POST" : "GET") {
  return new Request(`http://t${url}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const patientUser = {
  id: "u-patient",
  role: "PATIENT",
  email: "sam@example.com",
  patientProfile: { id: "pp1" },
  therapistProfile: null,
};

const therapistUser = {
  id: "u-therapist",
  role: "THERAPIST",
  email: "dr@example.com",
  patientProfile: null,
  therapistProfile: { id: "tp1", approvedAt: new Date("2026-06-21T00:00:00.000Z") },
};

describe("/api/messages/conversations", () => {
  beforeEach(() => {
    vi.resetModules();
    [
      getAuthUser,
      userFindUnique,
      linkFindMany,
      linkFindFirst,
      conversationFindMany,
      conversationUpsert,
    ].forEach((f) => f.mockReset());
  });

  it("GET lists a patient's active therapist conversations with unread counts", async () => {
    getAuthUser.mockResolvedValue({ authId: "u-patient", email: "sam@example.com" });
    userFindUnique.mockResolvedValue(patientUser);
    linkFindMany.mockResolvedValue([
      {
        patientId: "pp1",
        therapistId: "tp1",
        startDate: new Date("2026-06-20T00:00:00.000Z"),
        therapist: {
          user: { firstName: "Maya", lastName: "Stone", email: "maya@example.com" },
        },
      },
    ]);
    conversationFindMany.mockResolvedValue([
      {
        id: "c1",
        patientId: "pp1",
        therapistId: "tp1",
        updatedAt: new Date("2026-06-21T09:00:00.000Z"),
        messages: [
          {
            id: "m2",
            body: "How did the grounding practice go?",
            senderId: "u-therapist",
            readAt: null,
            createdAt: new Date("2026-06-21T09:00:00.000Z"),
          },
        ],
        _count: { messages: 1 },
      },
    ]);

    const { GET } = await import("../messages/conversations/route");
    const res = await GET(req("/api/messages/conversations"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(linkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId: "pp1", isActive: true, status: "ACTIVE" },
      }),
    );
    expect(body.data[0]).toMatchObject({
      id: "c1",
      peerName: "Maya Stone",
      peerEmail: "maya@example.com",
      peerRole: "THERAPIST",
      lastMessage: "How did the grounding practice go?",
      unreadCount: 1,
    });
  });

  it("POST lets an approved therapist open a linked patient conversation", async () => {
    getAuthUser.mockResolvedValue({ authId: "u-therapist", email: "dr@example.com" });
    userFindUnique.mockResolvedValue(therapistUser);
    linkFindFirst.mockResolvedValue({ patientId: "pp1", therapistId: "tp1" });
    conversationUpsert.mockResolvedValue({
      id: "c1",
      patientId: "pp1",
      therapistId: "tp1",
      createdAt: new Date("2026-06-21T00:00:00.000Z"),
      updatedAt: new Date("2026-06-21T00:00:00.000Z"),
    });

    const { POST } = await import("../messages/conversations/route");
    const res = await POST(req("/api/messages/conversations", { patientId: "pp1" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(linkFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId: "pp1", therapistId: "tp1", isActive: true, status: "ACTIVE" },
      }),
    );
    expect(conversationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId_therapistId: { patientId: "pp1", therapistId: "tp1" } },
      }),
    );
    expect(body.data.id).toBe("c1");
  });

  it("POST refuses unlinked conversations", async () => {
    getAuthUser.mockResolvedValue({ authId: "u-patient", email: "sam@example.com" });
    userFindUnique.mockResolvedValue(patientUser);
    linkFindFirst.mockResolvedValue(null);

    const { POST } = await import("../messages/conversations/route");
    const res = await POST(req("/api/messages/conversations", { therapistId: "tp9" }));

    expect(res.status).toBe(403);
    expect(conversationUpsert).not.toHaveBeenCalled();
  });
});

describe("/api/messages/conversations/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    [
      getAuthUser,
      userFindUnique,
      conversationFindFirst,
      conversationUpdate,
      messageCreate,
      messageUpdateMany,
    ].forEach((f) => f.mockReset());
  });

  it("GET returns thread messages only for active linked participants", async () => {
    getAuthUser.mockResolvedValue({ authId: "u-patient", email: "sam@example.com" });
    userFindUnique.mockResolvedValue(patientUser);
    conversationFindFirst.mockResolvedValue({
      id: "c1",
      patientId: "pp1",
      therapistId: "tp1",
      patient: { user: { firstName: "Sam", lastName: "Lee", email: "sam@example.com" } },
      therapist: { user: { firstName: "Maya", lastName: "Stone", email: "maya@example.com" } },
      messages: [
        {
          id: "m1",
          senderId: "u-patient",
          body: "I practiced the breathing.",
          readAt: null,
          createdAt: new Date("2026-06-21T08:00:00.000Z"),
          sender: { firstName: "Sam", lastName: "Lee", email: "sam@example.com", role: "PATIENT" },
        },
      ],
    });

    const { GET } = await import("../messages/conversations/[id]/route");
    const res = await GET(req("/api/messages/conversations/c1"), ctx("c1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(conversationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "c1",
          patientId: "pp1",
          therapist: { patients: { some: { patientId: "pp1", isActive: true, status: "ACTIVE" } } },
        }),
      }),
    );
    expect(body.data.messages[0]).toMatchObject({
      id: "m1",
      body: "I practiced the breathing.",
      senderName: "Sam Lee",
      mine: true,
    });
  });

  it("POST adds a message from the current participant and bumps the conversation", async () => {
    getAuthUser.mockResolvedValue({ authId: "u-patient", email: "sam@example.com" });
    userFindUnique.mockResolvedValue(patientUser);
    conversationFindFirst.mockResolvedValue({ id: "c1", patientId: "pp1", therapistId: "tp1" });
    messageCreate.mockResolvedValue({
      id: "m2",
      conversationId: "c1",
      senderId: "u-patient",
      body: "  A little calmer today.  ",
      readAt: null,
      createdAt: new Date("2026-06-21T10:00:00.000Z"),
      sender: { firstName: "Sam", lastName: "Lee", email: "sam@example.com", role: "PATIENT" },
    });
    conversationUpdate.mockResolvedValue({ id: "c1" });

    const { POST } = await import("../messages/conversations/[id]/messages/route");
    const res = await POST(
      req("/api/messages/conversations/c1/messages", { body: "  A little calmer today.  " }),
      ctx("c1"),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(messageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { conversationId: "c1", senderId: "u-patient", body: "A little calmer today." },
      }),
    );
    expect(conversationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
      }),
    );
    expect(body.data.mine).toBe(true);
  });

  it("PATCH marks incoming unread messages as read", async () => {
    getAuthUser.mockResolvedValue({ authId: "u-therapist", email: "dr@example.com" });
    userFindUnique.mockResolvedValue(therapistUser);
    conversationFindFirst.mockResolvedValue({ id: "c1", patientId: "pp1", therapistId: "tp1" });
    messageUpdateMany.mockResolvedValue({ count: 2 });

    const { PATCH } = await import("../messages/conversations/[id]/read/route");
    const res = await PATCH(req("/api/messages/conversations/c1/read", {}, "PATCH"), ctx("c1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(messageUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId: "c1", senderId: { not: "u-therapist" }, readAt: null },
      }),
    );
    expect(body.data.updated).toBe(2);
  });
});
