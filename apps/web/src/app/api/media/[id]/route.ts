import { prisma } from "@exhale/db";
import { getAuthUser } from "@/lib/auth";
import { json, withErrorHandling } from "@/lib/http";
import { signedMediaUrl } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

/** A therapist may read a patient's media only if they are actively linked to that patient. */
async function therapistLinkedToUploader(
  requesterUserId: string,
  uploaderUserId: string,
): Promise<boolean> {
  const [therapist, patient] = await Promise.all([
    prisma.user.findUnique({
      where: { id: requesterUserId },
      select: { therapistProfile: { select: { id: true, approvedAt: true } } },
    }),
    prisma.user.findUnique({
      where: { id: uploaderUserId },
      select: { patientProfile: { select: { id: true } } },
    }),
  ]);
  const tid = therapist?.therapistProfile?.id;
  const pid = patient?.patientProfile?.id;
  if (!tid || !therapist.therapistProfile?.approvedAt || !pid) return false;

  const link = await prisma.patientTherapist.findUnique({
    where: { patientId_therapistId: { patientId: pid, therapistId: tid } },
    select: { isActive: true },
  });
  return Boolean(link?.isActive);
}

export const GET = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const auth = await getAuthUser(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);
  const { id } = await ctx.params;

  const media = await prisma.media.findUnique({
    where: { id },
    select: { s3Key: true, uploaderId: true },
  });
  if (!media) return json({ error: "Not found" }, 404);

  const allowed =
    media.uploaderId === auth.authId ||
    (await therapistLinkedToUploader(auth.authId, media.uploaderId));
  if (!allowed) return json({ error: "Forbidden" }, 403);

  const url = await signedMediaUrl(media.s3Key);
  return Response.redirect(url, 302);
});
