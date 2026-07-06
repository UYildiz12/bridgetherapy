// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { createSession, fetchSessions, fetchPatients } = vi.hoisted(() => ({
  createSession: vi.fn(),
  fetchSessions: vi.fn(),
  fetchPatients: vi.fn(),
}));

vi.mock("@/lib/sessions-client", () => ({ createSession, fetchSessions }));
vi.mock("@/lib/homework/client", () => ({ fetchPatients }));

import TherapistSessionsPage from "../page";

describe("TherapistSessionsPage", () => {
  beforeEach(() => {
    fetchSessions.mockReset().mockResolvedValue([]);
    fetchPatients.mockReset().mockResolvedValue([
      { patientId: "pp1", name: "Sam Lee", email: "sam@example.com", linkedAt: "2026-06-21T00:00:00.000Z" },
    ]);
    createSession.mockReset();
  });

  afterEach(cleanup);

  it("shows an empty session planner with active patients", async () => {
    render(<TherapistSessionsPage />);

    await waitFor(() => screen.getByText(/no sessions scheduled/i));

    expect(screen.getByRole("heading", { name: /sessions/i })).toBeDefined();
    expect(screen.getByLabelText(/patient/i)).toBeDefined();
    expect(screen.getByText("Sam Lee")).toBeDefined();
  });

  it("creates a scheduled session", async () => {
    createSession.mockResolvedValue({
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
      noteCount: 0,
      hasSummary: false,
    });

    render(<TherapistSessionsPage />);
    await waitFor(() => screen.getByText(/no sessions scheduled/i));

    fireEvent.change(screen.getByLabelText(/patient/i), { target: { value: "pp1" } });
    fireEvent.change(screen.getByLabelText(/scheduled time/i), { target: { value: "2026-06-22T15:00" } });
    fireEvent.click(screen.getByRole("button", { name: /schedule session/i }));

    // The datetime-local value is local wall-clock time, so the stored instant
    // is that local time converted to UTC — not the digits stamped with "Z".
    await waitFor(() =>
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: "pp1",
          scheduledAt: new Date("2026-06-22T15:00").toISOString(),
        }),
      ),
    );
    await waitFor(() => {
      expect(screen.getAllByText("Sam Lee").length).toBe(2);
      expect(screen.getByText(/0 notes/i)).toBeDefined();
    });
  });
});
