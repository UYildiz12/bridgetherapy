import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addSessionNote,
  createSession,
  ensureSessionVideo,
  fetchPatientSessions,
  fetchPatientSessionWorkspace,
  fetchSession,
  fetchSessions,
  fetchTherapistSessionWorkspace,
  generateSessionSummary,
  updateSession,
  updatePatientSessionWorkspace,
  updateTherapistSessionWorkspace,
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

  it("fetchPatientSessions returns the patient data array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "s1" }] }), { status: 200 })),
    );

    const sessions = await fetchPatientSessions();

    expect(sessions[0].id).toBe("s1");
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

  it("ensureSessionVideo posts to the video route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "s1", videoRoomId: "bridge-room" } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await ensureSessionVideo("s1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/therapist/sessions/s1/video",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("reads and updates patient session workspace", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { sessionId: "s1", patientNote: "Remember breathing." } }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { sessionId: "s1", patientNote: "Practice breathing." } }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPatientSessionWorkspace("s1")).resolves.toMatchObject({ patientNote: "Remember breathing." });
    await updatePatientSessionWorkspace("s1", {
      patientNote: "Practice breathing.",
      whiteboard: { strokes: [] },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/sessions/s1/workspace");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/sessions/s1/workspace",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ patientNote: "Practice breathing.", whiteboard: { strokes: [] } }),
      }),
    );
  });

  it("reads and updates therapist session workspace", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { sessionId: "s1", patientNote: "Exposure ladder." } }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { sessionId: "s1", patientNote: "Updated ladder." } }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTherapistSessionWorkspace("s1")).resolves.toMatchObject({ patientNote: "Exposure ladder." });
    await updateTherapistSessionWorkspace("s1", {
      patientNote: "Updated ladder.",
      whiteboard: { strokes: [] },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/therapist/sessions/s1/workspace");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/therapist/sessions/s1/workspace",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ patientNote: "Updated ladder.", whiteboard: { strokes: [] } }),
      }),
    );
  });
});
