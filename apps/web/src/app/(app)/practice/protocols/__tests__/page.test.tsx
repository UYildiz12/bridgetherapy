// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ProtocolsPage from "../page";

describe("ProtocolsPage", () => {
  afterEach(cleanup);

  it("shows treatment-planning protocol templates", () => {
    render(<ProtocolsPage />);

    expect(screen.getByRole("heading", { name: /protocols/i })).toBeDefined();
    expect(screen.getByText(/^Behavioral activation$/)).toBeDefined();
    expect(screen.getByText(/^Exposure ladder$/)).toBeDefined();
    expect(screen.getAllByText(/^Homework sequence$/)).toHaveLength(3);
    expect(screen.getAllByText(/therapist-reviewed/i)).toHaveLength(3);
  });
});
