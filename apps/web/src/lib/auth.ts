import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { createSupabaseServerClient } from "./supabase/server";

export interface AuthUser {
  authId: string;
  email: string;
}

// Short-lived in-process cache of validated tokens. A browsing session fires many
// API calls with the same access token; only the first per minute pays for real
// validation. Worst case after a forced sign-out elsewhere: one stale minute.
const VALIDATION_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 1000;
const validated = new Map<string, { user: AuthUser; until: number }>();

function fromCache(token: string): AuthUser | null {
  const hit = validated.get(token);
  if (!hit) return null;
  if (hit.until < Date.now()) {
    validated.delete(token);
    return null;
  }
  return hit.user;
}

function remember(token: string, user: AuthUser) {
  if (validated.size >= MAX_CACHE_ENTRIES) {
    const oldest = validated.keys().next().value;
    if (oldest) validated.delete(oldest);
  }
  validated.set(token, { user, until: Date.now() + VALIDATION_TTL_MS });
}

/**
 * Validate a bearer token. getClaims verifies the JWT locally when the project
 * publishes signing keys and falls back to a network check otherwise.
 */
async function validateToken(token: string): Promise<AuthUser | null> {
  const { data, error } = await supabaseAdmin().auth.getClaims(token);
  const claims = data?.claims;
  if (error || !claims?.sub || typeof claims.email !== "string" || !claims.email) return null;
  return { authId: claims.sub, email: claims.email };
}

export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization");

  // Mobile / API clients: bearer token (scheme is case-insensitive per RFC 7235)
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(header.indexOf(" ") + 1).trim();
    const cached = fromCache(token);
    if (cached) return cached;
    const user = await validateToken(token);
    if (user) remember(token, user);
    return user;
  }

  // Web client: cookie session. Read the token locally, then validate on cache miss.
  const supabase = await createSupabaseServerClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return null;

  const cached = fromCache(token);
  if (cached) return cached;

  const user = await validateToken(token);
  if (user) remember(token, user);
  return user;
}
