// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { fetchMyAssignment, saveMyEntry, saveMyResponse } = vi.hoisted(() => ({
  fetchMyAssignment: vi.fn(),
  saveMyEntry: vi.fn(),
  saveMyResponse: vi.fn(),
}));
vi.mock("@/lib/homework/client", () => ({ fetchMyAssignment, saveMyEntry, saveMyResponse }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "a1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

import HomeworkDoPage from "../[id]/page";
import { formatDate } from "@/lib/format";

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

const v2doc = {
  version: 2,
  schedule: { cadence: "daily" },
  blocks: [
    { type: "text", id: "intro", body: "Each evening, note one thing." },
    { type: "input.text", id: "note", label: "Tonight's note", multiline: true },
    { type: "input.scale", id: "mood", label: "Mood", min: 1, max: 10 },
  ],
};

function assignment(overrides: Record<string, unknown> = {}) {
  return {
    id: "a1",
    status: "IN_PROGRESS",
    dueDate: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    set: { id: "s1", title: "Evening notes", description: "Small and daily.", content: v2doc, isTemplate: false, createdAt: "", updatedAt: "" },
    response: { version: 2, entries: [] },
    ...overrides,
  };
}

describe("HomeworkDoPage (v2 block runner)", () => {
  beforeEach(() => {
    fetchMyAssignment.mockReset();
    saveMyEntry.mockReset();
    saveMyResponse.mockReset();
  });
  afterEach(cleanup);

  it("renders blocks and the entry strip for a daily doc", async () => {
    fetchMyAssignment.mockResolvedValue(assignment());
    render(<HomeworkDoPage />);
    await waitFor(() => screen.getByText("Evening notes"));
    expect(screen.getByText(/each evening, note one thing/i)).toBeDefined();
    expect(screen.getByLabelText("Tonight's note")).toBeDefined();
    expect(screen.getByRole("tablist", { name: /entries/i })).toBeDefined();
    expect(screen.getByText(/daily · 0 of ongoing entries complete/i)).toBeDefined();
  });

  it("shows the due date in the shared month-short dialect", async () => {
    const due = new Date(Date.now() + 3 * 86_400_000).toISOString();
    fetchMyAssignment.mockResolvedValue(assignment({ dueDate: due }));
    render(<HomeworkDoPage />);
    await waitFor(() => screen.getByText("Evening notes"));
    const dueLabel = `· due ${formatDate(due)}`;
    expect(screen.getByText((text) => text.includes(dueLabel))).toBeDefined();
  });

  it("saves the active entry through saveMyEntry", async () => {
    fetchMyAssignment.mockResolvedValue(assignment());
    saveMyEntry.mockResolvedValue(assignment());
    render(<HomeworkDoPage />);
    await waitFor(() => screen.getByLabelText("Tonight's note"));

    fireEvent.change(screen.getByLabelText("Tonight's note"), { target: { value: "Went for a walk" } });
    fireEvent.click(screen.getByRole("button", { name: /save progress/i }));

    await waitFor(() =>
      expect(saveMyEntry).toHaveBeenCalledWith(
        "a1",
        { date: today, blocks: { note: { text: "Went for a walk" } } },
        false,
      ),
    );
  });

  it("keeps Submit disabled until the doc is complete and shows the revision banner", async () => {
    fetchMyAssignment.mockResolvedValue(
      assignment({
        response: {
          version: 2,
          entries: [],
          revisionRequestedAt: new Date().toISOString(),
          comments: { note: "Try adding a bit more detail." },
        },
      }),
    );
    render(<HomeworkDoPage />);
    await waitFor(() => screen.getByText("Evening notes"));
    expect((screen.getByRole("button", { name: /^resubmit$/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/changes requested/i)).toBeDefined();
    expect(screen.getByText(/try adding a bit more detail/i)).toBeDefined();
  });

  it("locks a submitted assignment, but reopens it when changes are requested", async () => {
    fetchMyAssignment.mockResolvedValue(assignment({ status: "COMPLETED" }));
    render(<HomeworkDoPage />);
    await waitFor(() => screen.getByText("Evening notes"));
    expect((screen.getByLabelText("Tonight's note") as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /submitted/i }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();

    fetchMyAssignment.mockResolvedValue(
      assignment({
        status: "COMPLETED",
        response: { version: 2, entries: [], revisionRequestedAt: new Date().toISOString() },
      }),
    );
    render(<HomeworkDoPage />);
    await waitFor(() => screen.getByText("Evening notes"));
    expect((screen.getByLabelText("Tonight's note") as HTMLTextAreaElement).disabled).toBe(false);
    expect(screen.getByRole("button", { name: /^resubmit$/i })).toBeDefined();
  });

  it("still renders legacy v1 assignments through the item flow", async () => {
    fetchMyAssignment.mockResolvedValue(
      assignment({
        set: {
          id: "s1",
          title: "Old set",
          description: null,
          content: { items: [{ id: "i1", kind: "writing", title: "Reflect", prompt: "How was it?" }] },
          isTemplate: false,
          createdAt: "",
          updatedAt: "",
        },
        response: { items: {} },
      }),
    );
    render(<HomeworkDoPage />);
    await waitFor(() => screen.getByText("Old set"));
    expect(screen.getByText(/0 of 1 done/i)).toBeDefined();
  });
});
