// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const { fetchSharedEntries } = vi.hoisted(() => ({ fetchSharedEntries: vi.fn() }));

vi.mock("@/lib/notes-client", () => ({ fetchSharedEntries }));

import TherapistNotesPage from "../page";

const ENTRIES = [
  {
    id: "n1",
    patientId: "p1",
    patientName: "Sam Lee",
    patientEmail: "sam@example.com",
    title: "Panic loop",
    content: "I want to talk about the panic loop.",
    sharedAt: "2026-06-21T12:00:00Z",
    createdAt: "2026-06-21T12:00:00Z",
    updatedAt: "2026-06-21T12:00:00Z",
  },
];

describe("TherapistNotesPage (shared reflections)", () => {
  beforeEach(() => fetchSharedEntries.mockReset().mockResolvedValue(ENTRIES));
  afterEach(cleanup);

  it("lists shared reflections read-only (no resolve action)", async () => {
    render(<TherapistNotesPage />);
    await waitFor(() => screen.getByText("Panic loop"));
    expect(screen.getByText("Sam Lee")).toBeDefined();
    expect(screen.queryByRole("button", { name: /resolve/i })).toBeNull();
  });

  it("shows an empty state when nothing is shared", async () => {
    fetchSharedEntries.mockResolvedValue([]);
    render(<TherapistNotesPage />);
    await waitFor(() => screen.getByText(/no shared reflections/i));
  });
});
