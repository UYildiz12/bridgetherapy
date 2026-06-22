// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import WellnessPage from "../page";

describe("WellnessPage", () => {
  afterEach(cleanup);

  it("opens with a video library", () => {
    render(<WellnessPage />);

    expect(screen.getByRole("heading", { name: /wellness/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: /calm anxiety/i })).toBeDefined();
    expect(screen.getByText(/how to break the anxiety cycle/i)).toBeDefined();
  });

  it("shows guided breathing and switches breathing patterns", () => {
    render(<WellnessPage />);

    fireEvent.click(screen.getByRole("button", { name: /practice/i }));
    expect(screen.getByRole("heading", { name: /guided breathing/i })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /4-7-8 breathing/i }));

    expect(screen.getByText(/long exhale signals/i)).toBeDefined();
    expect(screen.getByText(/Breathe out - 8s/i)).toBeDefined();
  });

  it("shows CBT learning support", () => {
    render(<WellnessPage />);

    fireEvent.click(screen.getByRole("button", { name: /learn/i }));

    expect(screen.getByText(/the CBT loop/i)).toBeDefined();
    expect(screen.getByText(/thinking traps/i)).toBeDefined();
    expect(screen.getByText(/thought records/i)).toBeDefined();
  });

  it("shows crisis support with direct emergency and 988 options", () => {
    render(<WellnessPage />);

    fireEvent.click(screen.getByRole("button", { name: /crisis/i }));

    expect(screen.getByText(/immediate danger/i)).toBeDefined();
    expect(screen.getByText(/call or text 988/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /chat with 988/i })).toBeDefined();
  });
});
