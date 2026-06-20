import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { createSupabaseServerClient } from "./supabase/server";

export interface AuthUser {
  authId: string;
  email: string;
}

export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization");

  // Mobile / API clients: bearer token
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    const { data, error } = await supabaseAdmin().auth.getUser(token);
    if (error || !data.user?.email) return null;
    return { authId: data.user.id, email: data.user.email };
  }

  // Web client: cookie session
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  return { authId: data.user.id, email: data.user.email };
}
