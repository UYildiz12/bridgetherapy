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

    expect(screen.getByText(/answer in chapters/i)).toBeDefined();
    expect(screen.getByRole("heading", { name: /start with what brings you here/i })).toBeDefined();
    expect(screen.getByRole("img", { name: /therapy match blueprint/i })).toBeDefined();
    expect(screen.getByText(/generated blueprint artwork/i)).toBeDefined();
    expect(screen.getByText("Focus areas")).toBeDefined();
    expect(screen.getByText("CBT loop")).toBeDefined();
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

  it("shows crisis resources inline when self-harm thoughts are disclosed", async () => {
    render(<IntakePage />);
    await waitFor(() => screen.getByText(/step 1 of/i));

    fireEvent.click(screen.getByRole("button", { name: "Anxiety" }));
    for (let step = 1; step < 6; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    }
    expect(screen.getByRole("heading", { name: /add safety and support context/i })).toBeDefined();
    expect(screen.queryByRole("link", { name: /call 988/i })).toBeNull();

    fireEvent.change(screen.getByLabelText(/thoughts of harming yourself/i), {
      target: { value: "passive" },
    });

    expect(screen.getByText(/support is available right now/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /call 988/i }).getAttribute("href")).toBe("tel:988");
    expect(screen.getByRole("link", { name: /text home to 741741/i }).getAttribute("href")).toBe(
      "sms:741741",
    );
    expect(
      screen.getByRole("link", { name: /chat with 988/i }).getAttribute("href"),
    ).toContain("988lifeline.org");
    expect(screen.getByRole("link", { name: /see all crisis resources/i }).getAttribute("href")).toBe(
      "/wellness?tab=crisis",
    );

    fireEvent.change(screen.getByLabelText(/thoughts of harming yourself/i), {
      target: { value: "active" },
    });
    expect(screen.getByRole("link", { name: /call 988/i })).toBeDefined();

    fireEvent.change(screen.getByLabelText(/thoughts of harming yourself/i), {
      target: { value: "none" },
    });
    expect(screen.queryByRole("link", { name: /call 988/i })).toBeNull();
  });

  it("caps free-text answers at the lengths the schema accepts", async () => {
    render(<IntakePage />);
    await waitFor(() => screen.getByText(/step 1 of/i));

    fireEvent.click(screen.getByRole("button", { name: "Anxiety" }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(
      (screen.getByLabelText(/current problems or patterns/i) as HTMLTextAreaElement).maxLength,
    ).toBe(2400);
    expect(
      (screen.getByLabelText(/a recent situation/i) as HTMLTextAreaElement).maxLength,
    ).toBe(1200);
    expect(
      (screen.getByLabelText(/thoughts or images that showed up/i) as HTMLTextAreaElement).maxLength,
    ).toBe(1200);

    for (let step = 3; step < 6; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    }
    expect(
      (screen.getByLabelText(/support people, warning signs/i) as HTMLTextAreaElement).maxLength,
    ).toBe(1000);
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
