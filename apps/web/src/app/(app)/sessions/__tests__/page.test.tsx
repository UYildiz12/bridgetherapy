// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { fetchPatientSessions, fetchPatientSessionWorkspace, updatePatientSessionWorkspace } = vi.hoisted(() => ({
  fetchPatientSessions: vi.fn(),
  fetchPatientSessionWorkspace: vi.fn(),
  updatePatientSessionWorkspace: vi.fn(),
}));

vi.mock("@/lib/sessions-client", () => ({
  fetchPatientSessions,
  fetchPatientSessionWorkspace,
  updatePatientSessionWorkspace,
}));
vi.mock("@/components/sessions/session-whiteboard", () => ({
  SessionWhiteboard: ({ onSave }: { onSave: (state: { strokes: unknown[] }) => void }) => (
    <button type="button" onClick={() => onSave({ strokes: [] })}>
      Save whiteboard
    </button>
  ),
}));

import PatientSessionsPage from "../page";

describe("PatientSessionsPage", () => {
  beforeEach(() => {
    fetchPatientSessions.mockReset().mockResolvedValue([
      {
        id: "s1",
        scheduledAt: "2026-06-22T15:00:00.000Z",
        startedAt: null,
        endedAt: null,
        status: "SCHEDULED",
        videoProvider: "jitsi",
        videoRoomId: "exhale-room",
        videoUrl: "https://meet.jit.si/exhale-room",
        summary: {
          id: "sum1",
          sessionId: "s1",
          summary: "Practice paced breathing before sleep.",
          keyPoints: ["Breathing helped"],
          nextSteps: ["Practice nightly"],
          createdAt: "2026-06-22T16:00:00.000Z",
        },
      },
    ]);
    fetchPatientSessionWorkspace.mockReset().mockResolvedValue({
      id: "sw1",
      sessionId: "s1",
      patientNote: "Ask about sleep homework.",
      whiteboard: { strokes: [] },
      createdAt: "2026-06-22T15:00:00.000Z",
      updatedAt: "2026-06-22T15:00:00.000Z",
    });
    updatePatientSessionWorkspace.mockReset().mockResolvedValue({
      id: "sw1",
      sessionId: "s1",
      patientNote: "Bring up exposure plan.",
      whiteboard: { strokes: [] },
      createdAt: "2026-06-22T15:00:00.000Z",
      updatedAt: "2026-06-22T15:10:00.000Z",
    });
  });

  afterEach(cleanup);

  it("shows patient video session join links", async () => {
    render(<PatientSessionsPage />);

    await waitFor(() => screen.getByRole("heading", { name: /sessions/i }));

    expect(screen.getByText(/next session/i)).toBeDefined();
    expect(screen.getByText("scheduled")).toBeDefined();
    expect(screen.getByRole("link", { name: /join video/i }).getAttribute("href")).toBe(
      "https://meet.jit.si/exhale-room",
    );
    expect(screen.getByText(/practice paced breathing before sleep/i)).toBeDefined();
    expect(screen.getByDisplayValue(/ask about sleep homework/i)).toBeDefined();
  });

  it("saves patient session notes and whiteboard state", async () => {
    render(<PatientSessionsPage />);

    await waitFor(() => screen.getByDisplayValue(/ask about sleep homework/i));

    fireEvent.change(screen.getByRole("textbox", { name: /patient session note/i }), {
      target: { value: "Bring up exposure plan." },
    });
    fireEvent.click(screen.getByRole("button", { name: /save session note/i }));

    await waitFor(() =>
      expect(updatePatientSessionWorkspace).toHaveBeenCalledWith(
        "s1",
        expect.objectContaining({ patientNote: "Bring up exposure plan." }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: /save whiteboard/i }));
    await waitFor(() =>
      expect(updatePatientSessionWorkspace).toHaveBeenCalledWith(
        "s1",
        expect.objectContaining({ whiteboard: { strokes: [] } }),
      ),
    );
  });

  it("shows an empty state when no sessions are scheduled", async () => {
    fetchPatientSessions.mockResolvedValueOnce([]);

    render(<PatientSessionsPage />);

    await waitFor(() => screen.getByText(/no sessions scheduled/i));
  });
});
