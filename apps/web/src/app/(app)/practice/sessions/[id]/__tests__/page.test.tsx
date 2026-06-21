// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const {
  addSessionNote,
  fetchSession,
  generateSessionSummary,
  updateSession,
  useParams,
} = vi.hoisted(() => ({
  addSessionNote: vi.fn(),
  fetchSession: vi.fn(),
  generateSessionSummary: vi.fn(),
  updateSession: vi.fn(),
  useParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useParams }));
vi.mock("@/lib/sessions-client", () => ({
  addSessionNote,
  fetchSession,
  generateSessionSummary,
  updateSession,
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
  notes: [],
  summary: null,
};

describe("SessionDetailPage", () => {
  beforeEach(() => {
    useParams.mockReturnValue({ id: "s1" });
    fetchSession.mockReset().mockResolvedValue(DETAIL);
    addSessionNote.mockReset();
    generateSessionSummary.mockReset();
    updateSession.mockReset();
  });

  afterEach(cleanup);

  it("shows the session note editor", async () => {
    render(<SessionDetailPage />);

    await waitFor(() => screen.getByText(/sam lee/i));

    expect(screen.getByRole("textbox", { name: /session note/i })).toBeDefined();
    const addButton = screen.getByRole("button", { name: /add note/i }) as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
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

    fireEvent.change(screen.getByRole("textbox", { name: /session note/i }), {
      target: { value: "Client practiced grounding." },
    });
    fireEvent.click(screen.getByRole("button", { name: /add note/i }));

    await waitFor(() => expect(addSessionNote).toHaveBeenCalledWith("s1", "Client practiced grounding."));
    fireEvent.click(screen.getByRole("button", { name: /generate summary/i }));

    await waitFor(() => expect(generateSessionSummary).toHaveBeenCalledWith("s1"));
    await waitFor(() => screen.getByText(/grounding helped/i));
  });
});
