// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const { fetchProgressReport } = vi.hoisted(() => ({
  fetchProgressReport: vi.fn(),
}));

vi.mock("@/lib/reports-client", () => ({ fetchProgressReport }));

import ReportsPage from "../page";

describe("ReportsPage", () => {
  beforeEach(() => {
    fetchProgressReport.mockReset().mockResolvedValue({
      role: "PATIENT",
      mood: { average: 5.5, current: 7, previous: 4, delta: 3, entries: [] },
      homework: { completed: 1, total: 2, completionRate: 50 },
      reflections: { total: 3 },
      exportRows: [
        { metric: "Mood average", value: "5.5" },
        { metric: "Homework completion", value: "50%" },
      ],
    });
  });

  afterEach(cleanup);

  it("renders patient progress metrics and export action", async () => {
    render(<ReportsPage />);

    await waitFor(() => screen.getByText(/mood average/i));

    expect(screen.getByRole("heading", { name: /progress reports/i })).toBeDefined();
    expect(screen.getByText("5.5")).toBeDefined();
    expect(screen.getByText("50%")).toBeDefined();
    expect(screen.getByRole("link", { name: /export csv/i })).toBeDefined();
  });
});
