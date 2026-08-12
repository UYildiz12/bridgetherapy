import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "../env";

export function supabaseAdmin() {
  const env = serverEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
