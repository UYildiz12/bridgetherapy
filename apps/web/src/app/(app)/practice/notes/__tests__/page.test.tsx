// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { fetchTherapistNotes, updateTherapistNote } = vi.hoisted(() => ({
  fetchTherapistNotes: vi.fn(),
  updateTherapistNote: vi.fn(),
}));

vi.mock("@/lib/notes-client", () => ({ fetchTherapistNotes, updateTherapistNote }));

import TherapistNotesPage from "../page";

const NOTES = [
  {
    id: "n1",
    content: "I want to talk about the panic loop.",
    isResolved: false,
    createdAt: "2026-06-21T12:00:00Z",
    patientName: "Sam Lee",
    patientEmail: "sam@example.com",
  },
  {
    id: "n2",
    content: "We covered the sleep plan.",
    isResolved: true,
    createdAt: "2026-06-20T12:00:00Z",
    patientName: "Mira Chen",
    patientEmail: "mira@example.com",
  },
];

describe("TherapistNotesPage", () => {
  beforeEach(() => {
    fetchTherapistNotes.mockReset().mockResolvedValue(NOTES);
    updateTherapistNote.mockReset();
  });

  afterEach(cleanup);

  it("shows open patient reflections first", async () => {
    render(<TherapistNotesPage />);

    await waitFor(() => screen.getByText(/panic loop/i));

    expect(screen.getByText("Sam Lee")).toBeDefined();
    expect(screen.queryByText("Mira Chen")).toBeNull();
  });

  it("can switch to all reflections", async () => {
    render(<TherapistNotesPage />);
    await waitFor(() => screen.getByText(/panic loop/i));

    fireEvent.click(screen.getByRole("tab", { name: /all/i }));

    expect(screen.getByText("Sam Lee")).toBeDefined();
    expect(screen.getByText("Mira Chen")).toBeDefined();
  });

  it("resolves an open note", async () => {
    updateTherapistNote.mockResolvedValue({ id: "n1", isResolved: true });

    render(<TherapistNotesPage />);
    await waitFor(() => screen.getByText(/panic loop/i));

    fireEvent.click(screen.getByRole("button", { name: /resolve/i }));

    await waitFor(() => expect(updateTherapistNote).toHaveBeenCalledWith("n1", true));
    await waitFor(() => screen.getByText(/no open reflections/i));
  });
});
