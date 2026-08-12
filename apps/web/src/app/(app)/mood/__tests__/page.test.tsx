// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const { fetchMoodHistory, createMoodEntry } = vi.hoisted(() => ({
  fetchMoodHistory: vi.fn(),
  createMoodEntry: vi.fn(),
}));

vi.mock("@/lib/mood-client", () => ({ fetchMoodHistory, createMoodEntry }));

import MoodPage from "../page";

describe("MoodPage", () => {
  beforeEach(() => {
    fetchMoodHistory.mockReset().mockResolvedValue({ entries: [], total: 0 });
    createMoodEntry.mockReset();
  });
  afterEach(cleanup);

  it("shows the empty state when there is no history", async () => {
    render(<MoodPage />);
    await waitFor(() => screen.getByText(/no check-ins yet/i));
  });

  it("submits the selected score and shows the new entry", async () => {
    createMoodEntry.mockResolvedValue({ id: "m1", moodScore: 7, tags: [], createdAt: "2026-06-21T00:00:00Z" });
    render(<MoodPage />);
    await waitFor(() => screen.getByText(/no check-ins yet/i));

    fireEvent.click(screen.getByRole("button", { name: "7" }));
    fireEvent.click(screen.getByRole("button", { name: /log mood/i }));

    await waitFor(() => expect(createMoodEntry).toHaveBeenCalledWith(
      expect.objectContaining({ moodScore: 7 }),
    ));
    await waitFor(() => screen.getByText(/mood 7\/10/i));
  });

  it("disables the submit button until a score is chosen", async () => {
    render(<MoodPage />);
    await waitFor(() => screen.getByText(/no check-ins yet/i));
    const submit = screen.getByRole("button", { name: /log mood/i }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("shows the server-side count for the all-time stat, not the capped list length", async () => {
    fetchMoodHistory.mockResolvedValue({
      entries: [{ id: "m1", moodScore: 6, tags: [], createdAt: new Date().toISOString() }],
      total: 250,
    });
    render(<MoodPage />);
    await waitFor(() => screen.getByText("250"));
    expect(screen.getByText(/all time/i)).toBeDefined();
  });
});
