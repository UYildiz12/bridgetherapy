import { z } from "zod";
import { prisma } from "@bridge/db";
import { getAuthUser } from "@/lib/auth";
import { json, withErrorHandling } from "@/lib/http";
import { parseBody } from "@/lib/validation";

const PreferencesBody = z.object({
  notifySessionReminders: z.boolean(),
  notifyHomeworkNudges: z.boolean(),
  notifyWeeklyCheckin: z.boolean(),
});

const preferencesSelect = {
  notifySessionReminders: true,
  notifyHomeworkNudges: true,
  notifyWeeklyCheckin: true,
} as const;

/**
 * Prisma raises P2025 when an update targets a missing row. Duck-typing the
 * code (rather than `instanceof PrismaClientKnownRequestError`) survives the
 * bundling realm boundaries that can break `instanceof` in serverless builds.
 */
function isRecordNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2025"
  );
}

export const GET = withErrorHandling(async (req: Request) => {
  const auth = await getAuthUser(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const prefs = await prisma.user.findUnique({
    where: { id: auth.authId },
    select: preferencesSelect,
  });
  if (!prefs) return json({ error: "Not provisioned" }, 404);

  return json({ data: prefs }, 200);
});

export const PUT = withErrorHandling(async (req: Request) => {
  const auth = await getAuthUser(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const parsed = await parseBody(req, PreferencesBody);
  if (!parsed.ok) return parsed.response;

  try {
    const prefs = await prisma.user.update({
      where: { id: auth.authId },
      data: parsed.data,
      select: preferencesSelect,
    });
    return json({ data: prefs }, 200);
  } catch (err) {
    if (isRecordNotFound(err)) return json({ error: "Not provisioned" }, 404);
    throw err;
  }
});
