import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAccountSettings } from "../settings-client";

describe("settings-client", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetchAccountSettings returns the current user account", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              id: "u1",
              email: "sam@example.com",
              firstName: "Sam",
              lastName: "Lee",
              role: "PATIENT",
              isActive: true,
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const account = await fetchAccountSettings();

    expect(account.email).toBe("sam@example.com");
    expect(account.role).toBe("PATIENT");
  });
});
