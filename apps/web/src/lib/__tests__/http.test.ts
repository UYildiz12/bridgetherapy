import { describe, it, expect, vi, afterEach } from "vitest";
import { json, withErrorHandling } from "../http";

describe("withErrorHandling", () => {
  afterEach(() => vi.restoreAllMocks());

  it("passes through the handler's response when it succeeds", async () => {
    const handler = withErrorHandling(async () => json({ data: "ok" }, 201));
    const res = await handler();
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ data: "ok" });
  });

  it("returns a 500 JSON error when the handler throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withErrorHandling(async () => {
      throw new Error("boom");
    });
    const res = await handler();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });

  it("logs the thrown error so observability tooling can hook in", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("boom");
    const handler = withErrorHandling(async () => {
      throw err;
    });
    await handler();
    expect(errorSpy).toHaveBeenCalledWith(err);
  });

  it("forwards all arguments (e.g. Next.js route context) to the handler", async () => {
    const handler = withErrorHandling(
      async (_req: Request, ctx: { params: { id: string } }) =>
        json({ id: ctx.params.id }),
    );
    const res = await handler(new Request("http://t/"), { params: { id: "42" } });
    expect(await res.json()).toEqual({ id: "42" });
  });
});
