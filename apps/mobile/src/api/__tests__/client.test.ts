import { beforeEach, describe, expect, it, vi } from "vitest";
import { BridgeApiClient } from "../client";

describe("BridgeApiClient", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("sends bearer tokens when fetching the current user", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "u1", email: "sam@example.com", role: "PATIENT" } }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new BridgeApiClient({ baseUrl: "https://api.bridge.test", token: "jwt" });
    const me = await client.me();

    expect(me.email).toBe("sam@example.com");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bridge.test/api/me",
      expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer jwt" }) }),
    );
  });

  it("creates mood check-ins through the existing API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "m1", moodScore: 8.4 } }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new BridgeApiClient({ baseUrl: "https://api.bridge.test", token: "jwt" });
    const mood = await client.createMood({ moodScore: 8.4, notes: "Steady", tags: ["calm"] });

    expect(mood.moodScore).toBe(8.4);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bridge.test/api/mood",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ moodScore: 8.4, notes: "Steady", tags: ["calm"] }),
      }),
    );
  });
});
