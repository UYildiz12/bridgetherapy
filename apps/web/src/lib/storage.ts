import "server-only";
import { supabaseAdmin } from "./supabase/admin";

const BUCKET = "homework-media";
let ensured = false;

/** Create the private media bucket on first use; safe to call repeatedly. */
async function ensureBucket(): Promise<void> {
  if (ensured) return;
  const admin = supabaseAdmin();
  const { data } = await admin.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: "10MB",
    });
    if (error && !/exist/i.test(error.message)) throw error;
  }
  ensured = true;
}

export async function uploadMedia(
  path: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await ensureBucket();
  const { error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (error) throw error;
}

export async function signedMediaUrl(path: string, expiresIn = 120): Promise<string> {
  const { data, error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data) throw error ?? new Error("Could not sign media URL");
  return data.signedUrl;
}

export async function downloadMedia(path: string): Promise<Uint8Array> {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(path);
  if (error || !data) throw error ?? new Error("Could not download media");
  return new Uint8Array(await data.arrayBuffer());
}
