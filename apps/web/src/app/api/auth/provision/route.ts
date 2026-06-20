import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@exhale/db";
import { parseBody } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { json } from "@/lib/http";

const ProvisionBody = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["PATIENT", "THERAPIST"]),
});

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const parsed = await parseBody(req, ProvisionBody);
  if (!parsed.ok) return parsed.response;
  const { firstName, lastName, role } = parsed.data;

  const user = await prisma.user.upsert({
    where: { id: auth.authId },
    update: {},
    create: {
      id: auth.authId,
      email: auth.email,
      firstName,
      lastName,
      role,
      ...(role === "THERAPIST"
        ? { therapistProfile: { create: {} } }
        : { patientProfile: { create: {} } }),
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "PROVISION_USER",
    resourceType: "User",
    resourceId: user.id,
  });

  return json({ data: user }, 201);
}
