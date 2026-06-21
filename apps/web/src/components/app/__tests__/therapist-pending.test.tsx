// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TherapistPending } from "../therapist-pending";

describe("TherapistPending", () => {
  afterEach(cleanup);

  it("shows the under-review message addressed to the user", () => {
    render(<TherapistPending firstName="Sam" />);
    expect(screen.getByText(/Sam.*under review/i)).toBeTruthy();
  });

  it("explains access is unlocked after approval", () => {
    render(<TherapistPending firstName="Sam" />);
    expect(screen.getByText(/approved/i)).toBeTruthy();
  });
});
