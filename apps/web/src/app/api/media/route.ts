import { prisma } from "@bridge/db";
import { getAuthUser } from "@/lib/auth";
import { json, withErrorHandling } from "@/lib/http";
import { createRateLimiter } from "@/lib/rate-limit";
import { uploadMedia } from "@/lib/storage";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Uploads are up to 10 MB each; cap them per user (best-effort, per instance).
const uploadLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

const KIND_CONFIG = {
  voice: { type: "VOICE_NOTE", ext: "webm", mimePrefix: "audio/" },
  drawing: { type: "DRAWING", ext: "png", mimePrefix: "image/" },
} as const;

export const POST = withErrorHandling(async (req: Request) => {
  const auth = await getAuthUser(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const limit = uploadLimiter.check(auth.authId);
  if (!limit.allowed) {
    return json(
      { error: "Too many uploads at once. Wait a moment and try again.", retryAfterMs: limit.retryAfterMs },
      429,
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "");
  if (!(kind in KIND_CONFIG)) return json({ error: "Invalid media kind" }, 400);
  if (!(file instanceof Blob)) return json({ error: "Missing file" }, 400);

  const cfg = KIND_CONFIG[kind as keyof typeof KIND_CONFIG];
  if (file.size === 0 || file.size > MAX_BYTES) {
    return json({ error: "File must be between 1 byte and 10 MB" }, 400);
  }
  const mime = file.type || `${cfg.mimePrefix}${cfg.ext}`;
  if (!mime.startsWith(cfg.mimePrefix)) {
    return json({ error: "Unexpected file type for this item" }, 400);
  }

  const id = crypto.randomUUID();
  const path = `${auth.authId}/${id}.${cfg.ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  await uploadMedia(path, bytes, mime);

  const media = await prisma.media.create({
    data: {
      id,
      uploaderId: auth.authId,
      type: cfg.type,
      filename: `${kind}.${cfg.ext}`,
      s3Key: path,
      mimeType: mime,
      sizeBytes: file.size,
    },
    select: { id: true },
  });
  return json({ data: { mediaId: media.id } }, 201);
});
