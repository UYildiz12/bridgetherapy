import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// How much remaining token lifetime counts as "fresh". Tokens live ~1h, so most
// navigations skip the network hop entirely and only the occasional request
// pays for a refresh.
const FRESH_WINDOW_SECONDS = 120;

function base64UrlDecode(input: string): string {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  return atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

/**
 * Read the Supabase auth cookie (possibly chunked) and return the access
 * token's exp claim, or null when anything about the shape is unexpected.
 * Decode-only: no verification here. This only decides whether to refresh;
 * actual authorization happens in layouts and API routes via getUser().
 */
function accessTokenExp(request: NextRequest): number | null {
  try {
    const all = request.cookies.getAll();
    const base = all.find((c) => /^sb-.*-auth-token$/.test(c.name));
    let raw: string | null = null;
    if (base) {
      raw = base.value;
    } else {
      const chunks = all
        .filter((c) => /^sb-.*-auth-token\.\d+$/.test(c.name))
        .sort((a, b) => Number(a.name.split(".").pop()) - Number(b.name.split(".").pop()));
      if (chunks.length === 0) return null;
      raw = chunks.map((c) => c.value).join("");
    }
    if (!raw) return null;
    const json = raw.startsWith("base64-") ? base64UrlDecode(raw.slice(7)) : raw;
    const session = JSON.parse(json) as { access_token?: string };
    if (!session.access_token) return null;
    const payload = JSON.parse(base64UrlDecode(session.access_token.split(".")[1])) as {
      exp?: number;
    };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  // Fast path: token still comfortably valid, nothing to refresh. Skipping the
  // Supabase round trip here is what keeps page-to-page navigation snappy.
  const exp = accessTokenExp(request);
  if (exp !== null && exp - Math.floor(Date.now() / 1000) > FRESH_WINDOW_SECONDS) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser(); // refreshes the session cookie if needed
  return response;
}
