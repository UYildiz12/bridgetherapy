import "server-only";
import { getAuthUser } from "./auth";
import { json } from "./http";
import { prisma } from "@exhale/db";
import type { Prisma } from "@exhale/db";

const therapistSelect = {
  id: true,
  email: true,
  role: true,
  therapistProfile: { select: { id: true, approvedAt: true } },
} satisfies Prisma.UserSelect;

export type RequireTherapistResult =
  | { ok: true; user: Prisma.UserGetPayload<{ select: typeof therapistSelect }> }
  | { ok: false; response: Response };

/**
 * The therapist authorization gate. The THERAPIST role is self-assignable at
 * signup and therefore grants nothing on its own — every therapist-only route
 * MUST call this so access depends on `approvedAt`, which only an admin can set.
 */
export async function requireApprovedTherapist(req: Request): Promise<RequireTherapistResult> {
  const auth = await getAuthUser(req);
  if (!auth) return { ok: false, response: json({ error: "Unauthorized" }, 401) };

  const user = await prisma.user.findUnique({
    where: { id: auth.authId },
    select: therapistSelect,
  });
  if (!user) return { ok: false, response: json({ error: "Not provisioned" }, 404) };
  if (user.role !== "THERAPIST") return { ok: false, response: json({ error: "Forbidden" }, 403) };
  if (!user.therapistProfile?.approvedAt) {
    return { ok: false, response: json({ error: "Therapist account pending approval" }, 403) };
  }

  return { ok: true, user };
}
