import { z } from "zod";
import { prisma } from "@exhale/db";
import { getAuthUser } from "@/lib/auth";
import { json, withErrorHandling } from "@/lib/http";
import { parseBody } from "@/lib/validation";

const TokenBody = z.object({
  token: z.string().trim().min(8).max(4000),
  platform: z.enum(["web", "ios", "android"]).default("web"),
});

const DeleteToken = z.object({
  token: z.string().trim().min(8).max(4000),
});

export const POST = withErrorHandling(async (req: Request) => {
  const auth = await getAuthUser(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const parsed = await parseBody(req, TokenBody);
  if (!parsed.ok) return parsed.response;

  const token = await prisma.pushToken.upsert({
    where: { token: parsed.data.token },
    create: { userId: auth.authId, token: parsed.data.token, platform: parsed.data.platform },
    update: { userId: auth.authId, platform: parsed.data.platform },
  });

  return json({ data: token }, 201);
});

export const DELETE = withErrorHandling(async (req: Request) => {
  const auth = await getAuthUser(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const parsed = await parseBody(req, DeleteToken);
  if (!parsed.ok) return parsed.response;

  const result = await prisma.pushToken.deleteMany({
    where: { userId: auth.authId, token: parsed.data.token },
  });

  return json({ data: { deleted: result.count } }, 200);
});
