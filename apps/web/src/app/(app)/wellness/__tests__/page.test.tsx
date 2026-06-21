// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import WellnessPage from "../page";

describe("WellnessPage", () => {
  afterEach(cleanup);

  it("opens with breathwork tools and switches breathing patterns", () => {
    render(<WellnessPage />);

    expect(screen.getByRole("heading", { name: /wellness/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: /4-7-8 breathing/i })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /box breathing/i }));

    expect(screen.getByText(/4 seconds in/i)).toBeDefined();
    expect(screen.getAllByText(/4 seconds hold/i).length).toBe(2);
  });

  it("shows grounding and meditation support", () => {
    render(<WellnessPage />);

    fireEvent.click(screen.getByRole("button", { name: /meditation/i }));

    expect(screen.getByText(/grounding scan/i)).toBeDefined();
    expect(screen.getByText(/5 things you can see/i)).toBeDefined();
    expect(screen.getByText(/soft attention/i)).toBeDefined();
  });

  it("shows crisis support with direct emergency and 988 options", () => {
    render(<WellnessPage />);

    fireEvent.click(screen.getByRole("button", { name: /crisis/i }));

    expect(screen.getByText(/immediate danger/i)).toBeDefined();
    expect(screen.getByText(/call or text 988/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /chat with 988/i })).toBeDefined();
  });
});
