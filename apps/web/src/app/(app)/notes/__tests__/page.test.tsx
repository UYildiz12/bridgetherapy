// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { createPatientNote, fetchPatientNotes } = vi.hoisted(() => ({
  createPatientNote: vi.fn(),
  fetchPatientNotes: vi.fn(),
}));

vi.mock("@/lib/notes-client", () => ({ createPatientNote, fetchPatientNotes }));

import PatientNotesPage from "../page";

describe("PatientNotesPage", () => {
  beforeEach(() => {
    fetchPatientNotes.mockReset().mockResolvedValue([]);
    createPatientNote.mockReset();
  });

  afterEach(cleanup);

  it("renders one reflections surface without a journal passphrase", async () => {
    render(<PatientNotesPage />);

    await waitFor(() => screen.getByText(/no reflections yet/i));

    expect(screen.getByRole("heading", { name: /write the moment/i })).toBeDefined();
    expect(screen.queryByText(/passphrase/i)).toBeNull();
  });

  it("adds CBT-style starter text to the composer", async () => {
    render(<PatientNotesPage />);
    await waitFor(() => screen.getByText(/no reflections yet/i));

    fireEvent.click(screen.getByRole("button", { name: /thought record/i }));

    const composer = screen.getByRole("textbox", { name: /new reflection/i }) as HTMLTextAreaElement;
    expect(composer.value).toContain("Automatic thought:");
    expect(composer.value).toContain("A more balanced response");
  });

  it("saves a reflection into the stream", async () => {
    createPatientNote.mockResolvedValue({
      id: "n1",
      content: "Can we discuss the sleep spiral?",
      isResolved: false,
      createdAt: "2026-06-21T12:00:00Z",
    });

    render(<PatientNotesPage />);
    await waitFor(() => screen.getByText(/no reflections yet/i));

    fireEvent.change(screen.getByRole("textbox", { name: /new reflection/i }), {
      target: { value: "Can we discuss the sleep spiral?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save reflection/i }));

    await waitFor(() => expect(createPatientNote).toHaveBeenCalledWith("Can we discuss the sleep spiral?"));
    await waitFor(() => screen.getByText(/sleep spiral/i));
  });
});
