// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const push = vi.fn();
const { createSet, draftSetWithAI } = vi.hoisted(() => ({
  createSet: vi.fn(),
  draftSetWithAI: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("@/lib/homework/client", () => ({
  createSet,
  draftSetWithAI,
  fetchSet: vi.fn(),
  updateSet: vi.fn(),
}));

import NewSetPage from "../page";

describe("NewSetPage", () => {
  beforeEach(() => {
    push.mockReset();
    createSet.mockReset();
    draftSetWithAI.mockReset().mockResolvedValue({
      title: "CBT panic practice",
      description: "Therapist-reviewed practice for the week.",
      content: {
        items: [
          {
            id: "item-1",
            kind: "task",
            title: "Track one panic loop",
            detail: "Note the situation, thought, body signal, and response.",
          },
        ],
      },
      reviewRequired: true,
    });
  });

  afterEach(cleanup);

  it("drafts a therapist-reviewed homework set with AI", async () => {
    render(<NewSetPage />);

    fireEvent.change(screen.getByLabelText(/draft brief/i), {
      target: { value: "Create a CBT panic practice for a patient who avoids driving." },
    });
    fireEvent.click(screen.getByRole("button", { name: /draft with ai/i }));

    await waitFor(() => expect(draftSetWithAI).toHaveBeenCalled());

    expect((screen.getByLabelText(/^title$/i) as HTMLInputElement).value).toBe("CBT panic practice");
    expect(screen.getByText(/therapist review required/i)).toBeDefined();
    expect(screen.getByDisplayValue("Track one panic loop")).toBeDefined();
  });
});
