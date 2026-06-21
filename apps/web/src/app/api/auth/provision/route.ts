import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@exhale/db";
import { parseBody } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { json, withErrorHandling } from "@/lib/http";
import { publicUserSelect } from "@/lib/user-select";

const ProvisionBody = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["PATIENT", "THERAPIST"]),
});

/**
 * Prisma raises P2002 on a unique-constraint violation. Duck-typing the code
 * (rather than `instanceof PrismaClientKnownRequestError`) survives the bundling
 * realm boundaries that can break `instanceof` in serverless builds.
 */
function isUniqueConstraintViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

export const POST = withErrorHandling(async (req: Request) => {
  const auth = await getAuthUser(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const parsed = await parseBody(req, ProvisionBody);
  if (!parsed.ok) return parsed.response;
  const { firstName, lastName, role } = parsed.data;

  try {
    const user = await prisma.user.create({
      data: {
        id: auth.authId,
        email: auth.email,
        firstName,
        lastName,
        role,
        ...(role === "THERAPIST"
          ? { therapistProfile: { create: {} } }
          : { patientProfile: { create: {} } }),
      },
      select: publicUserSelect,
    });

    // Fire-and-forget: a failing audit write must not fail a successful
    // provision. The .catch keeps the rejection from leaking as unhandled.
    void writeAuditLog({
      userId: user.id,
      action: "PROVISION_USER",
      resourceType: "User",
      resourceId: user.id,
    }).catch(console.error);

    return json({ data: user }, 201);
  } catch (err) {
    if (!isUniqueConstraintViolation(err)) throw err;

    // The row already exists — an idempotent re-call or a race with a
    // concurrent provision. Return the existing user rather than 201.
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: auth.authId },
      select: publicUserSelect,
    });

    // Re-provisioning never mutates an existing role; surface the mismatch
    // instead of silently ignoring it.
    if (user.role !== role) {
      return json(
        { error: "Already provisioned with a different role", data: user },
        409,
      );
    }

    return json({ data: user }, 200);
  }
});
