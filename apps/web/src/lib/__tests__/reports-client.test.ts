import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchProgressReport } from "../reports-client";

describe("reports-client", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetchProgressReport returns progress report data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { role: "PATIENT", mood: { average: 5.5 } } }), { status: 200 }),
      ),
    );

    const report = await fetchProgressReport();

    expect(report.role).toBe("PATIENT");
  });
});
