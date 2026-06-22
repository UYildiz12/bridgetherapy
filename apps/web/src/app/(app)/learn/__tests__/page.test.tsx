// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import LearnPage from "../page";

describe("LearnPage", () => {
  afterEach(cleanup);

  it("shows CBT education and psychoeducation modules", () => {
    render(<LearnPage />);

    expect(screen.getByRole("heading", { name: /learn/i })).toBeDefined();
    expect(screen.getByText(/^Situation$/)).toBeDefined();
    expect(screen.getByText(/^Automatic thought$/)).toBeDefined();
    expect(screen.getByText(/^Psychoeducation modules$/)).toBeDefined();
    expect(screen.getByText(/^Sleep and routines$/)).toBeDefined();
    expect(screen.getByText(/^Anxiety cycle$/)).toBeDefined();
  });
});
