// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { fetchEntries, createEntry, updateEntry, deleteEntry, fetchLumen, sendLumen } = vi.hoisted(
  () => ({
    fetchEntries: vi.fn(),
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    fetchLumen: vi.fn(),
    sendLumen: vi.fn(),
  }),
);

vi.mock("@/lib/notes-client", () => ({
  fetchEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  fetchLumen,
  sendLumen,
}));

import NotesPage from "../page";

describe("NotesPage (reflections workspace)", () => {
  beforeEach(() => {
    fetchEntries.mockReset().mockResolvedValue([]);
    createEntry.mockReset();
    fetchLumen.mockReset().mockResolvedValue({ configured: true, messages: [] });
  });
  afterEach(cleanup);

  it("shows the empty state when there are no entries", async () => {
    render(<NotesPage />);
    await waitFor(() => screen.getByText(/no reflections yet/i));
  });

  it("creates a private reflection from the composer", async () => {
    createEntry.mockResolvedValue({
      id: "n1",
      title: null,
      content: "Sleep spiral again.",
      visibility: "PRIVATE",
      sharedAt: null,
      lumenCount: 0,
      createdAt: "2026-06-21T12:00:00Z",
      updatedAt: "2026-06-21T12:00:00Z",
    });

    render(<NotesPage />);
    await waitFor(() => screen.getByText(/no reflections yet/i));

    fireEvent.click(screen.getByRole("button", { name: /new/i }));
    fireEvent.change(screen.getByLabelText("Reflection"), {
      target: { value: "Sleep spiral again." },
    });
    fireEvent.click(screen.getByRole("button", { name: /save reflection/i }));

    await waitFor(() =>
      expect(createEntry).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Sleep spiral again." }),
      ),
    );
    await waitFor(() => screen.getByRole("button", { name: /sleep spiral/i }));
  });
});
