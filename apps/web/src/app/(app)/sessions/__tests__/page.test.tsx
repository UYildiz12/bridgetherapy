// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const { fetchPatientSessions } = vi.hoisted(() => ({
  fetchPatientSessions: vi.fn(),
}));

vi.mock("@/lib/sessions-client", () => ({ fetchPatientSessions }));

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
      },
    ]);
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
  });

  it("shows an empty state when no sessions are scheduled", async () => {
    fetchPatientSessions.mockResolvedValueOnce([]);

    render(<PatientSessionsPage />);

    await waitFor(() => screen.getByText(/no sessions scheduled/i));
  });
});
