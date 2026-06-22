// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const {
  addSessionNote,
  ensureSessionVideo,
  fetchSession,
  fetchTherapistSessionWorkspace,
  generateSessionSummary,
  updateSession,
  updateTherapistSessionWorkspace,
  useParams,
} = vi.hoisted(() => ({
  addSessionNote: vi.fn(),
  ensureSessionVideo: vi.fn(),
  fetchSession: vi.fn(),
  fetchTherapistSessionWorkspace: vi.fn(),
  generateSessionSummary: vi.fn(),
  updateSession: vi.fn(),
  updateTherapistSessionWorkspace: vi.fn(),
  useParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useParams }));
vi.mock("@/lib/sessions-client", () => ({
  addSessionNote,
  ensureSessionVideo,
  fetchSession,
  fetchTherapistSessionWorkspace,
  generateSessionSummary,
  updateSession,
  updateTherapistSessionWorkspace,
}));
vi.mock("@/components/sessions/jitsi-meeting", () => ({
  JitsiMeeting: () => <div>Embedded video room</div>,
}));
vi.mock("@/components/sessions/session-whiteboard", () => ({
  SessionWhiteboard: ({ onSave }: { onSave: (state: { strokes: unknown[] }) => void }) => (
    <button type="button" onClick={() => onSave({ strokes: [] })}>
      Save whiteboard
    </button>
  ),
}));

import SessionDetailPage from "../page";

const DETAIL = {
  id: "s1",
  patientId: "pp1",
  patientName: "Sam Lee",
  patientEmail: "sam@example.com",
  scheduledAt: "2026-06-22T15:00:00.000Z",
  startedAt: null,
  endedAt: null,
  status: "SCHEDULED",
  videoProvider: "jitsi",
  videoRoomId: "exhale-room",
  videoUrl: "https://meet.jit.si/exhale-room",
  history: [
    {
      id: "s0",
      scheduledAt: "2026-06-15T15:00:00.000Z",
      status: "COMPLETED",
      noteCount: 1,
      notes: [{ id: "n0", content: "Reviewed exposure hierarchy." }],
      summary: {
        id: "sum0",
        sessionId: "s0",
        summary: "Client reviewed exposure hierarchy.",
        keyPoints: ["Avoidance dropped"],
        nextSteps: ["Repeat step one"],
        createdAt: "2026-06-15T16:00:00.000Z",
      },
    },
  ],
  notes: [],
  summary: null,
};

describe("SessionDetailPage", () => {
  beforeEach(() => {
    useParams.mockReturnValue({ id: "s1" });
    fetchSession.mockReset().mockResolvedValue(DETAIL);
    fetchTherapistSessionWorkspace.mockReset().mockResolvedValue({
      id: "sw1",
      sessionId: "s1",
      patientNote: "Patient wants to revisit homework.",
      whiteboard: { strokes: [] },
      createdAt: "2026-06-22T15:00:00.000Z",
      updatedAt: "2026-06-22T15:05:00.000Z",
    });
    addSessionNote.mockReset();
    ensureSessionVideo.mockReset();
    generateSessionSummary.mockReset();
    updateSession.mockReset();
    updateTherapistSessionWorkspace.mockReset().mockResolvedValue({
      id: "sw1",
      sessionId: "s1",
      patientNote: "Patient wants to revisit homework.",
      whiteboard: { strokes: [] },
      createdAt: "2026-06-22T15:00:00.000Z",
      updatedAt: "2026-06-22T15:10:00.000Z",
    });
  });

  afterEach(cleanup);

  it("shows the session note editor", async () => {
    render(<SessionDetailPage />);

    await waitFor(() => screen.getByText(/sam lee/i));

    expect(screen.getByRole("textbox", { name: /^session note$/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /join video/i }).getAttribute("href")).toBe(
      "https://meet.jit.si/exhale-room",
    );
    expect(screen.getByText(/embedded video room/i)).toBeDefined();
    expect(screen.getByText(/previous sessions/i)).toBeDefined();
    expect(screen.getByText(/client reviewed exposure hierarchy/i)).toBeDefined();
    expect(screen.getByDisplayValue(/patient wants to revisit homework/i)).toBeDefined();
    const addButton = screen.getByRole("button", { name: /add note/i }) as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
  });

  it("saves therapist-visible workspace updates", async () => {
    render(<SessionDetailPage />);
    await waitFor(() => screen.getByDisplayValue(/patient wants to revisit homework/i));

    fireEvent.change(screen.getByRole("textbox", { name: /patient session note/i }), {
      target: { value: "Patient wants to revisit sleep homework." },
    });
    fireEvent.click(screen.getByRole("button", { name: /save workspace note/i }));

    await waitFor(() =>
      expect(updateTherapistSessionWorkspace).toHaveBeenCalledWith(
        "s1",
        expect.objectContaining({ patientNote: "Patient wants to revisit sleep homework." }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: /save whiteboard/i }));
    await waitFor(() =>
      expect(updateTherapistSessionWorkspace).toHaveBeenCalledWith(
        "s1",
        expect.objectContaining({ whiteboard: { strokes: [] } }),
      ),
    );
  });

  it("creates a free video room when an older session does not have one", async () => {
    fetchSession.mockResolvedValueOnce({
      ...DETAIL,
      videoProvider: null,
      videoRoomId: null,
      videoUrl: null,
    });
    ensureSessionVideo.mockResolvedValue({
      ...DETAIL,
      history: [],
      videoProvider: "jitsi",
      videoRoomId: "exhale-new",
      videoUrl: "https://meet.jit.si/exhale-new",
    });

    render(<SessionDetailPage />);
    await waitFor(() => screen.getByText(/no video room yet/i));

    fireEvent.click(screen.getByRole("button", { name: /create free video room/i }));

    await waitFor(() => expect(ensureSessionVideo).toHaveBeenCalledWith("s1"));
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /join video/i }).getAttribute("href")).toBe(
        "https://meet.jit.si/exhale-new",
      ),
    );
    expect(screen.getByText(/client reviewed exposure hierarchy/i)).toBeDefined();
  });

  it("adds a note and can generate a summary", async () => {
    addSessionNote.mockResolvedValue({
      id: "n1",
      content: "Client practiced grounding.",
      createdAt: "2026-06-21T00:00:00.000Z",
      updatedAt: "2026-06-21T00:00:00.000Z",
    });
    generateSessionSummary.mockResolvedValue({
      id: "sum1",
      sessionId: "s1",
      summary: "Client practiced grounding.",
      keyPoints: ["Grounding helped"],
      nextSteps: ["Practice daily"],
      createdAt: "2026-06-21T00:00:00.000Z",
    });

    render(<SessionDetailPage />);
    await waitFor(() => screen.getByText(/sam lee/i));

    fireEvent.change(screen.getByRole("textbox", { name: /^session note$/i }), {
      target: { value: "Client practiced grounding." },
    });
    fireEvent.click(screen.getByRole("button", { name: /add note/i }));

    await waitFor(() => expect(addSessionNote).toHaveBeenCalledWith("s1", "Client practiced grounding."));
    fireEvent.click(screen.getByRole("button", { name: /generate summary/i }));

    await waitFor(() => expect(generateSessionSummary).toHaveBeenCalledWith("s1"));
    await waitFor(() => screen.getByText(/grounding helped/i));
  });
});
