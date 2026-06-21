import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPatientNote,
  fetchPatientNotes,
  fetchTherapistNotes,
  updateTherapistNote,
} from "../notes-client";

describe("notes-client", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetchPatientNotes returns the data array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [{ id: "n1", content: "Question" }] }), {
          status: 200,
        }),
      ),
    );

    const notes = await fetchPatientNotes();

    expect(notes[0].id).toBe("n1");
  });

  it("createPatientNote POSTs content and returns the note", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "n2", content: "Question" } }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const note = await createPatientNote("Question");

    expect(note.id).toBe("n2");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notes",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "Question" }),
      }),
    );
  });

  it("fetchTherapistNotes returns the therapist note data array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [{ id: "n1", patientName: "Sam Lee" }] }), {
          status: 200,
        }),
      ),
    );

    const notes = await fetchTherapistNotes();

    expect(notes[0].patientName).toBe("Sam Lee");
  });

  it("updateTherapistNote PATCHes resolution status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "n1", isResolved: true } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const note = await updateTherapistNote("n1", true);

    expect(note.isResolved).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/therapist/notes/n1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ isResolved: true }),
      }),
    );
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 400 })));

    await expect(createPatientNote("Question")).rejects.toThrow();
  });
});
