import { beforeEach, describe, expect, it, vi } from "vitest";
import { json } from "@/lib/http";

const requireApprovedTherapist = vi.fn();
const sessionFindFirst = vi.fn();
const summaryUpsert = vi.fn();
const summarizeSessionNotes = vi.fn();

vi.mock("@/lib/authz", () => ({ requireApprovedTherapist }));
vi.mock("@/lib/ai/session-summary", () => ({ summarizeSessionNotes }));
vi.mock("@exhale/db", () => ({
  prisma: {
    session: { findFirst: sessionFindFirst },
    sessionSummary: { upsert: summaryUpsert },
  },
}));

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("/api/therapist/sessions/[id]/summary POST", () => {
  beforeEach(() => {
    vi.resetModules();
    [requireApprovedTherapist, sessionFindFirst, summaryUpsert, summarizeSessionNotes].forEach((f) =>
      f.mockReset(),
    );
  });

  it("401 when not an approved therapist", async () => {
    requireApprovedTherapist.mockResolvedValue({
      ok: false,
      response: json({ error: "Unauthorized" }, 401),
    });

    const { POST } = await import("../therapist/sessions/[id]/summary/route");
    const res = await POST(new Request("http://t/api/therapist/sessions/s1/summary"), ctx("s1"));

    expect(res.status).toBe(401);
    expect(sessionFindFirst).not.toHaveBeenCalled();
  });

  it("404 when the session is not connected to the therapist", async () => {
    requireApprovedTherapist.mockResolvedValue({
      ok: true,
      user: { therapistProfile: { id: "tp1" } },
    });
    sessionFindFirst.mockResolvedValue(null);

    const { POST } = await import("../therapist/sessions/[id]/summary/route");
    const res = await POST(new Request("http://t/api/therapist/sessions/s1/summary"), ctx("s1"));

    expect(res.status).toBe(404);
    expect(sessionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "s1",
          patient: {
            therapists: {
              some: { therapistId: "tp1", isActive: true, status: "ACTIVE" },
            },
          },
        }),
      }),
    );
  });

  it("400 when there are no session notes to summarize", async () => {
    requireApprovedTherapist.mockResolvedValue({
      ok: true,
      user: { therapistProfile: { id: "tp1" } },
    });
    sessionFindFirst.mockResolvedValue({ id: "s1", notes: [{ content: "  " }] });

    const { POST } = await import("../therapist/sessions/[id]/summary/route");
    const res = await POST(new Request("http://t/api/therapist/sessions/s1/summary"), ctx("s1"));

    expect(res.status).toBe(400);
    expect(summarizeSessionNotes).not.toHaveBeenCalled();
  });

  it("generates and upserts the summary for linked sessions", async () => {
    requireApprovedTherapist.mockResolvedValue({
      ok: true,
      user: { therapistProfile: { id: "tp1" } },
    });
    sessionFindFirst.mockResolvedValue({
      id: "s1",
      notes: [{ content: "Client practiced grounding." }, { content: "Plan daily practice." }],
    });
    summarizeSessionNotes.mockResolvedValue({
      summary: "Client practiced grounding and agreed to daily practice.",
      keyPoints: ["Grounding helped"],
      nextSteps: ["Practice daily"],
    });
    summaryUpsert.mockResolvedValue({
      id: "sum1",
      sessionId: "s1",
      summary: "Client practiced grounding and agreed to daily practice.",
      keyPoints: ["Grounding helped"],
      nextSteps: ["Practice daily"],
      createdAt: new Date("2026-06-21T00:00:00.000Z"),
    });

    const { POST } = await import("../therapist/sessions/[id]/summary/route");
    const res = await POST(new Request("http://t/api/therapist/sessions/s1/summary"), ctx("s1"));

    expect(res.status).toBe(200);
    expect(summarizeSessionNotes).toHaveBeenCalledWith([
      "Client practiced grounding.",
      "Plan daily practice.",
    ]);
    expect(summaryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: "s1" },
        create: expect.objectContaining({ sessionId: "s1" }),
        update: expect.objectContaining({ keyPoints: ["Grounding helped"] }),
      }),
    );
    expect((await res.json()).data.id).toBe("sum1");
  });
});
