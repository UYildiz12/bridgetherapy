import type { z } from "zod";
import { json } from "./http";

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

export async function parseBody<T>(
  req: Request,
  schema: z.ZodSchema<T>,
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: json({ error: "Invalid JSON body" }, 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: json({ error: "Validation failed", issues: parsed.error.issues }, 400),
    };
  }
  return { ok: true, data: parsed.data };
}
