import { prisma } from "@exhale/db";
import { getAuthUser } from "@/lib/auth";
import { json, withErrorHandling } from "@/lib/http";
import { createRateLimiter } from "@/lib/rate-limit";
import { signedMediaUrl } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

// Downloads are cheap-ish but signed-URL minting is abusable; keep a loose
// per-user cap (best-effort, per instance).
const downloadLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 });

/**
 * A therapist may read a patient's media only when the patient actually shared
 * it with them: an active link alone is not enough, otherwise a private-journal
 * voice note would be readable by any linked therapist. Access requires the
 * media to be referenced by a SHARED journal entry or by a homework response
 * for a set this therapist created.
 */
async function therapistMayAccessMedia(
  requesterUserId: string,
  mediaId: string,
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
  if (!link?.isActive) return false;

  // Shared journal entry whose voice note is this media.
  const sharedNote = await prisma.patientNote.findFirst({
    where: { patientId: pid, voiceMediaId: mediaId, visibility: "SHARED" },
    select: { id: true },
  });
  if (sharedNote) return true;

  // Homework response for a set this therapist created that references the
  // media. Media ids live at arbitrary depths inside the response JSON (v1
  // items / v2 entry blocks), so scan the patient's few assignments here
  // rather than fighting JSON-path filters.
  const assignments = await prisma.homeworkAssignment.findMany({
    where: { patientId: pid, homework: { createdById: tid } },
    select: { response: true },
  });
  return assignments.some(
    (a) => a.response !== null && JSON.stringify(a.response).includes(`"${mediaId}"`),
  );
}

export const GET = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const auth = await getAuthUser(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);
  const { id } = await ctx.params;

  const limit = downloadLimiter.check(auth.authId);
  if (!limit.allowed) {
    return json(
      { error: "Too many media requests. Wait a moment and try again.", retryAfterMs: limit.retryAfterMs },
      429,
    );
  }

  const media = await prisma.media.findUnique({
    where: { id },
    select: { s3Key: true, uploaderId: true },
  });
  if (!media) return json({ error: "Not found" }, 404);

  const allowed =
    media.uploaderId === auth.authId ||
    (await therapistMayAccessMedia(auth.authId, id, media.uploaderId));
  if (!allowed) return json({ error: "Forbidden" }, 403);

  const url = await signedMediaUrl(media.s3Key);
  return Response.redirect(url, 302);
});
