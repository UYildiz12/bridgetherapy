import { describe, it, expect, vi, beforeEach } from "vitest";
import { provisionUser } from "../provision-client";

describe("provisionUser", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("POSTs to /api/auth/provision with the bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "uid-1" } }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const out = await provisionUser("tok", { firstName: "A", lastName: "B", role: "PATIENT" });

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/provision", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ authorization: "Bearer tok" }),
    }));
    expect(out.id).toBe("uid-1");
  });

  it("throws on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 400 })));
    await expect(provisionUser("tok", { firstName: "A", lastName: "B", role: "PATIENT" })).rejects.toThrow();
  });
});
