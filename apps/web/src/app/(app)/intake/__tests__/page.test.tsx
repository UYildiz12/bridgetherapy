// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { fetchIntake, saveIntake, push } = vi.hoisted(() => ({
  fetchIntake: vi.fn(),
  saveIntake: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/matching/client", () => ({ fetchIntake, saveIntake }));

import IntakePage from "../page";

const EMPTY_INTAKE = {
  concerns: [],
  availability: [],
  goals: "",
  cbtIntake: undefined,
  completed: false,
};

describe("IntakePage", () => {
  beforeEach(() => {
    fetchIntake.mockReset().mockResolvedValue(EMPTY_INTAKE);
    saveIntake.mockReset().mockResolvedValue(EMPTY_INTAKE);
    push.mockReset();
  });

  afterEach(cleanup);

  it("opens as a guided matching flow with a blueprint visual", async () => {
    render(<IntakePage />);

    await waitFor(() => screen.getByText(/step 1 of/i));

    expect(screen.getByRole("heading", { name: /start with what brings you here/i })).toBeDefined();
    expect(screen.getByRole("img", { name: /therapy match blueprint/i })).toBeDefined();
    const continueButton = screen.getByRole("button", { name: /continue/i }) as HTMLButtonElement;
    expect(continueButton.disabled).toBe(true);
  });

  it("moves one chapter at a time after a focus area is selected", async () => {
    render(<IntakePage />);
    await waitFor(() => screen.getByText(/step 1 of/i));

    fireEvent.click(screen.getByRole("button", { name: "Anxiety" }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText(/step 2 of/i)).toBeDefined();
    expect(screen.getByRole("heading", { name: /fit therapy into your week/i })).toBeDefined();
    expect(screen.queryByRole("heading", { name: /start with what brings you here/i })).toBeNull();
  });

  it("saves the complete existing intake payload from the final step", async () => {
    render(<IntakePage />);
    await waitFor(() => screen.getByText(/step 1 of/i));

    fireEvent.click(screen.getByRole("button", { name: "Anxiety" }));
    for (let step = 1; step < 8; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    }
    fireEvent.change(screen.getByLabelText(/anything your therapist should know/i), {
      target: { value: "I want help with panic before sleep." },
    });
    fireEvent.click(screen.getByRole("button", { name: /find matching therapists/i }));

    await waitFor(() =>
      expect(saveIntake).toHaveBeenCalledWith(
        expect.objectContaining({
          concerns: ["anxiety"],
          goals: "I want help with panic before sleep.",
          cbtIntake: expect.objectContaining({
            preferences: expect.objectContaining({ homeworkComfort: "medium" }),
          }),
        }),
      ),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/find"));
  });
});
