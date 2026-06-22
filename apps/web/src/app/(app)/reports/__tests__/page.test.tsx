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
      sessions: { attended: 2, missed: 0, scheduled: 1, total: 3, attendanceRate: 67 },
      measures: [
        {
          name: "Daily mood rating",
          current: 7,
          baseline: 4,
          average: 5.5,
          changeFromBaseline: 3,
          trend: "Improving",
        },
      ],
      exportRows: [
        { metric: "Mood average", value: "5.5" },
        { metric: "Homework completion", value: "50%" },
        { metric: "Session attendance", value: "67%" },
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
    expect(screen.getByText(/session attendance/i)).toBeDefined();
    expect(screen.getByText("67%")).toBeDefined();
    expect(screen.getByText(/daily mood rating/i)).toBeDefined();
    expect(screen.getByText(/improving/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /export csv/i })).toBeDefined();
  });
});
