import "server-only";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@exhale/db";
import { json } from "@/lib/http";

type PatientResult =
  | { ok: true; patientId: string; userId: string }
  | { ok: false; response: Response };

/** Resolve the authenticated user's PatientProfile id, or the correct error response. */
export async function requirePatient(req: Request): Promise<PatientResult> {
  const auth = await getAuthUser(req);
  if (!auth) return { ok: false, response: json({ error: "Unauthorized" }, 401) };

  const user = await prisma.user.findUnique({
    where: { id: auth.authId },
    select: { id: true, patientProfile: { select: { id: true } } },
  });
  if (!user?.patientProfile) {
    return { ok: false, response: json({ error: "Not a patient" }, 403) };
  }
  return { ok: true, patientId: user.patientProfile.id, userId: user.id };
}
