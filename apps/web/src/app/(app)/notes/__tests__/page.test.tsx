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

vi.mock("@/components/homework/voice-recorder", () => ({
  VoiceRecorder: ({ onChange }: { onChange: (mediaId: string) => void }) => (
    <button type="button" onClick={() => onChange("voice-1")}>
      Record voice
    </button>
  ),
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
      voiceMediaId: null,
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

  it("asks for confirmation before deleting a reflection", async () => {
    fetchEntries.mockResolvedValue([
      {
        id: "n1",
        title: "Morning walk",
        content: "Felt lighter after the walk.",
        voiceMediaId: null,
        visibility: "PRIVATE",
        sharedAt: null,
        lumenCount: 2,
        createdAt: "2026-06-21T12:00:00Z",
        updatedAt: "2026-06-21T12:00:00Z",
      },
    ]);
    deleteEntry.mockResolvedValue(undefined);

    render(<NotesPage />);
    fireEvent.click(await screen.findByRole("button", { name: /morning walk/i }));

    // First tap only opens the confirm step — nothing is deleted yet.
    fireEvent.click(screen.getByRole("button", { name: /delete reflection/i }));
    expect(deleteEntry).not.toHaveBeenCalled();
    expect(screen.getByText(/delete this reflection and its private lumen conversation/i)).toBeDefined();

    // Changing your mind keeps the entry.
    fireEvent.click(screen.getByRole("button", { name: /keep it/i }));
    expect(screen.queryByText(/delete this reflection and its private lumen conversation/i)).toBeNull();
    expect(deleteEntry).not.toHaveBeenCalled();

    // Confirming actually deletes.
    fireEvent.click(screen.getByRole("button", { name: /delete reflection/i }));
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    await waitFor(() => expect(deleteEntry).toHaveBeenCalledWith("n1"));
    await waitFor(() => expect(screen.queryByRole("button", { name: /morning walk/i })).toBeNull());
  });

  it("creates a voice-only reflection from the composer", async () => {
    createEntry.mockResolvedValue({
      id: "n1",
      title: "Voice note",
      content: "",
      voiceMediaId: "voice-1",
      visibility: "PRIVATE",
      sharedAt: null,
      lumenCount: 0,
      createdAt: "2026-06-21T12:00:00Z",
      updatedAt: "2026-06-21T12:00:00Z",
    });

    render(<NotesPage />);
    await waitFor(() => screen.getByText(/no reflections yet/i));

    fireEvent.click(screen.getByRole("button", { name: /new/i }));
    fireEvent.change(screen.getByLabelText("Reflection title"), {
      target: { value: "Voice note" },
    });
    fireEvent.click(screen.getByRole("button", { name: /record voice/i }));
    fireEvent.click(screen.getByRole("button", { name: /save reflection/i }));

    await waitFor(() =>
      expect(createEntry).toHaveBeenCalledWith({
        title: "Voice note",
        content: "",
        voiceMediaId: "voice-1",
      }),
    );
  });
});
