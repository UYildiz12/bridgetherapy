import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseBody } from "../validation";

describe("parseBody", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("returns parsed data on success", async () => {
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ name: "x" }) });
    const result = await parseBody(req, schema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.name).toBe("x");
  });

  it("returns a 400 response on invalid input", async () => {
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ name: "" }) });
    const result = await parseBody(req, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("returns a 400 response on malformed JSON", async () => {
    const req = new Request("http://t", { method: "POST", body: "{not json" });
    const result = await parseBody(req, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });
});
