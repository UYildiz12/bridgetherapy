import "server-only";
import { prisma } from "@exhale/db";
import { writeAuditLog } from "@/lib/audit";

const PROVISIONED_SELECT = { id: true, firstName: true, role: true } as const;

export interface ProvisionedUser {
  id: string;
  firstName: string;
  role: string;
}

interface AuthLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

/**
 * Guarantee an app `User` row exists for an authenticated Supabase user, creating
 * it from auth metadata if missing. Idempotent and race-safe (create + catch P2002).
 *
 * This is what makes auth self-healing: provisioning no longer depends on `signUp`
 * returning an immediate session, so the email-confirmation flow (and any retry)
 * still ends up provisioned — and the (app) layout never has to bounce an
 * authenticated user back to /signup.
 */
export async function ensureProvisioned(authUser: AuthLike): Promise<ProvisionedUser> {
  const existing = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: PROVISIONED_SELECT,
  });
  if (existing) return existing;

  const meta = authUser.user_metadata ?? {};
  const role: "PATIENT" | "THERAPIST" = meta.role === "THERAPIST" ? "THERAPIST" : "PATIENT";
  const firstName = typeof meta.first_name === "string" ? meta.first_name : "";
  const lastName = typeof meta.last_name === "string" ? meta.last_name : "";

  try {
    const user = await prisma.user.create({
      data: {
        id: authUser.id,
        email: authUser.email ?? "",
        firstName,
        lastName,
        role,
        ...(role === "THERAPIST"
          ? { therapistProfile: { create: {} } }
          : { patientProfile: { create: {} } }),
      },
      select: PROVISIONED_SELECT,
    });
    // Fire-and-forget: an audit failure must not block first sign-in.
    void writeAuditLog({
      userId: user.id,
      action: "PROVISION_USER",
      resourceType: "User",
      resourceId: user.id,
    }).catch(() => {});
    return user;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    // Concurrent provision won the race — return the row it created.
    return prisma.user.findUniqueOrThrow({
      where: { id: authUser.id },
      select: PROVISIONED_SELECT,
    });
  }
}
