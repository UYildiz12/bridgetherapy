import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addSessionNote,
  createSession,
  fetchSession,
  fetchSessions,
  generateSessionSummary,
  updateSession,
} from "../sessions-client";

describe("sessions-client", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetchSessions returns the data array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "s1" }] }), { status: 200 })),
    );

    const sessions = await fetchSessions();

    expect(sessions[0].id).toBe("s1");
  });

  it("createSession posts patient and schedule", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "s1", patientId: "pp1" } }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createSession({ patientId: "pp1", scheduledAt: "2026-06-22T15:00:00.000Z" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/therapist/sessions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ patientId: "pp1", scheduledAt: "2026-06-22T15:00:00.000Z" }),
      }),
    );
  });

  it("fetchSession reads one session detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: "s1" } }), { status: 200 })),
    );

    await expect(fetchSession("s1")).resolves.toMatchObject({ id: "s1" });
  });

  it("updateSession patches status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "s1", status: "COMPLETED" } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await updateSession("s1", { status: "COMPLETED" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/therapist/sessions/s1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "COMPLETED" }),
      }),
    );
  });

  it("addSessionNote posts note content", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "n1", content: "Note" } }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await addSessionNote("s1", "Note");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/therapist/sessions/s1/notes",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "Note" }),
      }),
    );
  });

  it("generateSessionSummary posts to the existing summary route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "sum1", summary: "Summary" } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateSessionSummary("s1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/therapist/sessions/s1/summary",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
