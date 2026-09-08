import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requirePatient = vi.fn();
const requireApprovedTherapist = vi.fn();
const aFindFirst = vi.fn();
const aUpdateMany = vi.fn();
const aCreate = vi.fn();
const hwFindFirst = vi.fn();
const hwCreate = vi.fn();
const ptFindUnique = vi.fn();
const mediaFindMany = vi.fn();
const interactionsCreate = vi.fn();
const googleGenAI = vi.fn(function GoogleGenAI() {
  return { interactions: { create: interactionsCreate } };
});

vi.mock("@/lib/patient", () => ({ requirePatient }));
vi.mock("@/lib/authz", () => ({ requireApprovedTherapist }));
vi.mock("@google/genai", () => ({ GoogleGenAI: googleGenAI }));
vi.mock("@bridge/db", () => ({
  prisma: {
    homeworkAssignment: { findFirst: aFindFirst, updateMany: aUpdateMany, create: aCreate },
    homework: { findFirst: hwFindFirst, create: hwCreate },
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
  createdAt: new Date("2026-06-20T00:00:00.000Z"),
  updatedAt: new Date("2026-06-21T00:00:00.000Z"),
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
function draftReq(body: unknown) {
  return new Request("http://t/api/therapist/homework/draft", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("/api/homework/[id] PUT (patient)", () => {
  // The route writes via a guarded updateMany, then re-fetches the row for the
  // DTO; mirror that by replaying the last written data through findFirst.
  let lastWrite: Record<string, unknown>;

  beforeEach(() => {
    vi.resetModules();
    [requirePatient, aFindFirst, aUpdateMany, mediaFindMany].forEach((f) => f.mockReset());
    lastWrite = {};
    aUpdateMany.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      lastWrite = data;
      return { count: 1 };
    });
    aFindFirst.mockImplementation(() => ({
      ...baseAssignment,
      ...lastWrite,
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
    const { PUT } = await import("../homework/[id]/route");
    const res = await PUT(putReq({ items: { a: { done: false } }, submit: true }), ctx("as1"));
    expect(res.status).toBe(400);
    expect(aUpdateMany).not.toHaveBeenCalled();
  });

  it("marks COMPLETED when submitting a fully-done set", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    const { PUT } = await import("../homework/[id]/route");
    const res = await PUT(putReq({ items: { a: { done: true } }, submit: true }), ctx("as1"));
    expect(res.status).toBe(200);
    expect(aUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "as1", updatedAt: baseAssignment.updatedAt }),
        data: expect.objectContaining({ status: "COMPLETED" }),
      }),
    );
    expect((await res.json()).data.status).toBe("COMPLETED");
  });

  it("marks IN_PROGRESS on a partial save", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    const { PUT } = await import("../homework/[id]/route");
    const res = await PUT(putReq({ items: { a: { done: true } }, submit: false }), ctx("as1"));
    expect(res.status).toBe(200);
    expect(aUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "IN_PROGRESS" }) }),
    );
  });

  it("re-reads and re-merges when another device saved first", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    aUpdateMany
      .mockResolvedValueOnce({ count: 0 }) // lost the race once
      .mockImplementationOnce(({ data }: { data: Record<string, unknown> }) => {
        lastWrite = data;
        return { count: 1 };
      });
    const { PUT } = await import("../homework/[id]/route");
    const res = await PUT(putReq({ items: { a: { done: true } }, submit: false }), ctx("as1"));
    expect(res.status).toBe(200);
    expect(aUpdateMany).toHaveBeenCalledTimes(2);
    // read, re-read after the lost race, and the final re-fetch for the DTO
    expect(aFindFirst).toHaveBeenCalledTimes(3);
  });

  it("409s when the assignment keeps changing underneath the save", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp1" });
    aUpdateMany.mockResolvedValue({ count: 0 });
    const { PUT } = await import("../homework/[id]/route");
    const res = await PUT(putReq({ items: { a: { done: true } }, submit: false }), ctx("as1"));
    expect(res.status).toBe(409);
    expect(aUpdateMany).toHaveBeenCalledTimes(3);
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
    expect(aUpdateMany).not.toHaveBeenCalled();
  });
});

describe("/api/therapist/assignments/[id]/review PUT", () => {
  const ok = { ok: true, user: { therapistProfile: { id: "tp1" } } };
  function reviewReq(body: unknown) {
    return new Request("http://t/api/therapist/assignments/as1/review", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
  const reviewRow = {
    id: "as1",
    response: { items: { a: { done: true } } },
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    homework: { content: setContent },
  };

  beforeEach(() => {
    vi.resetModules();
    [requireApprovedTherapist, aFindFirst, aUpdateMany].forEach((f) => f.mockReset());
  });

  it("writes feedback with an optimistic lock and keeps the patient's items", async () => {
    requireApprovedTherapist.mockResolvedValue(ok);
    aFindFirst.mockResolvedValue(reviewRow);
    aUpdateMany.mockResolvedValue({ count: 1 });

    const { PUT } = await import("../therapist/assignments/[id]/review/route");
    const res = await PUT(reviewReq({ feedback: "Nice work" }), ctx("as1"));

    expect(res.status).toBe(200);
    expect(aUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "as1", updatedAt: reviewRow.updatedAt }),
        data: expect.objectContaining({
          response: expect.objectContaining({
            feedback: "Nice work",
            items: { a: { done: true } },
          }),
        }),
      }),
    );
  });

  it("re-reads when a patient submission lands mid-review, then 409s if it keeps racing", async () => {
    requireApprovedTherapist.mockResolvedValue(ok);
    aFindFirst.mockResolvedValue(reviewRow);
    aUpdateMany.mockResolvedValue({ count: 0 });

    const { PUT } = await import("../therapist/assignments/[id]/review/route");
    const res = await PUT(reviewReq({ feedback: "Nice work" }), ctx("as1"));

    expect(res.status).toBe(409);
    expect(aFindFirst).toHaveBeenCalledTimes(3);
    expect(aUpdateMany).toHaveBeenCalledTimes(3);
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

  it("seeds a v2 empty response when the set is a block document", async () => {
    requireApprovedTherapist.mockResolvedValue(ok);
    const v2content = {
      version: 2,
      schedule: { cadence: "once" },
      blocks: [{ type: "input.text", id: "note", label: "Note" }],
    };
    hwFindFirst.mockResolvedValue({ id: "hw1", content: v2content });
    ptFindUnique.mockResolvedValue({ isActive: true });
    aCreate.mockResolvedValue({
      id: "as2",
      status: "PENDING",
      dueDate: null,
      completedAt: null,
      response: { version: 2, entries: [] },
      homework: { ...baseAssignment.homework, content: v2content },
      patient: { id: "pp1", user: { firstName: "Sam", lastName: "Lee", email: "s@x.com" } },
    });
    const { POST } = await import("../therapist/assignments/route");
    const res = await POST(assignReq({ homeworkId: "hw1", patientId: "pp1" }));
    expect(res.status).toBe(201);
    expect(aCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ response: { version: 2, entries: [] } }),
      }),
    );
  });
});

describe("/api/therapist/homework POST (create set)", () => {
  const ok = { ok: true, user: { therapistProfile: { id: "tp1" } } };
  const v2doc = {
    version: 2,
    schedule: { cadence: "daily" },
    blocks: [{ type: "input.text", id: "note", label: "Tonight's note", multiline: true }],
  };
  function createReq(body: unknown) {
    return new Request("http://t/api/therapist/homework", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    vi.resetModules();
    [requireApprovedTherapist, hwCreate].forEach((f) => f.mockReset());
    hwCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      id: "hw9",
      isTemplate: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      description: null,
      ...data,
    }));
  });

  it("accepts a v2 block document", async () => {
    requireApprovedTherapist.mockResolvedValue(ok);
    const { POST } = await import("../therapist/homework/route");
    const res = await POST(createReq({ title: "Evening notes", content: v2doc }));
    expect(res.status).toBe(201);
    expect((await res.json()).data.content.version).toBe(2);
  });

  it("still accepts a legacy v1 item set", async () => {
    requireApprovedTherapist.mockResolvedValue(ok);
    const { POST } = await import("../therapist/homework/route");
    const res = await POST(createReq({ title: "Old style", content: setContent }));
    expect(res.status).toBe(201);
  });

  it("rejects content that is neither shape", async () => {
    requireApprovedTherapist.mockResolvedValue(ok);
    const { POST } = await import("../therapist/homework/route");
    const res = await POST(createReq({ title: "Broken", content: { blocks: "nope" } }));
    expect(res.status).toBe(400);
    expect(hwCreate).not.toHaveBeenCalled();
  });
});

describe("/api/therapist/homework/draft POST", () => {
  const originalAIKey = process.env.AI_key;
  const okTherapist = { ok: true, user: { id: "u-tp1", therapistProfile: { id: "tp1" } } };

  beforeEach(() => {
    vi.resetModules();
    requireApprovedTherapist.mockReset();
    googleGenAI.mockClear();
    interactionsCreate.mockReset().mockResolvedValue({
      output_text: JSON.stringify({
        title: "CBT panic practice",
        description: "Therapist-reviewed practice for the week.",
        content: {
          version: 2,
          schedule: { cadence: "once" },
          blocks: [
            { type: "text", id: "intro", body: "Track one panic loop this week." },
            { type: "input.text", id: "loop", label: "Track one panic loop", multiline: true },
            { type: "input.scale", id: "suds", label: "How strong was it?", min: 0, max: 100 },
          ],
        },
      }),
    });
    process.env.AI_key = "test-google-key";
  });

  afterEach(() => {
    process.env.AI_key = originalAIKey;
  });

  it("401 when not an approved therapist", async () => {
    requireApprovedTherapist.mockResolvedValue({ ok: false, response: json({ error: "x" }, 401) });
    const { POST } = await import("../therapist/homework/draft/route");

    expect((await POST(draftReq({ prompt: "Create a thought record." }))).status).toBe(401);
  });

  it("requires AI_key before calling Gemini", async () => {
    requireApprovedTherapist.mockResolvedValue(okTherapist);
    delete process.env.AI_key;
    const { POST } = await import("../therapist/homework/draft/route");

    const res = await POST(draftReq({ prompt: "Create a simple thought record for panic practice." }));

    expect(res.status).toBe(503);
    expect(interactionsCreate).not.toHaveBeenCalled();
  });

  it("rejects crisis prompts instead of drafting AI homework", async () => {
    requireApprovedTherapist.mockResolvedValue(okTherapist);
    const { POST } = await import("../therapist/homework/draft/route");

    const res = await POST(draftReq({ prompt: "Create a suicide safety plan for tonight." }));

    expect(res.status).toBe(400);
    expect(interactionsCreate).not.toHaveBeenCalled();
  });

  it("uses Gemini Flash-Lite with AI_key and returns a review-required draft", async () => {
    requireApprovedTherapist.mockResolvedValue(okTherapist);
    const { POST } = await import("../therapist/homework/draft/route");

    const res = await POST(draftReq({ prompt: "Create a CBT panic practice for a patient who avoids driving." }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(googleGenAI).toHaveBeenCalledWith({ apiKey: "test-google-key" });
    expect(interactionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3.1-flash-lite",
        store: false,
        response_format: expect.any(Object),
      }),
    );
    expect(body.data).toMatchObject({
      title: "CBT panic practice",
      reviewRequired: true,
      model: "gemini-3.1-flash-lite",
    });
    expect(body.data.content.version).toBe(2);
    expect(body.data.content.blocks[1].label).toBe("Track one panic loop");
  });

  it("rate limits repeated draft requests per therapist", async () => {
    requireApprovedTherapist.mockResolvedValue(okTherapist);
    const { POST } = await import("../therapist/homework/draft/route");

    let res: Response | undefined;
    for (let i = 0; i < 11; i++) {
      res = await POST(draftReq({ prompt: "Create a CBT panic practice for sleep worries." }));
    }

    expect(res!.status).toBe(429);
    expect((await res!.json()).error).toMatch(/too many draft requests/i);
    expect(interactionsCreate).toHaveBeenCalledTimes(10);
  });
});
