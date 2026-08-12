import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerPushToken, removePushToken } from "../push-client";

describe("push-client", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("registerPushToken posts token and platform", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { token: "tok1", platform: "web" } }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await registerPushToken("tok1", "web");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/push/tokens",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: "tok1", platform: "web" }),
      }),
    );
  });

  it("removePushToken sends a DELETE request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { deleted: 1 } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await removePushToken("tok1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/push/tokens",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ token: "tok1" }),
      }),
    );
  });
});
