import { describe, it, expect, vi, beforeEach } from "vitest";

const getClaims = vi.fn();
const getSession = vi.fn();
vi.mock("../supabase/admin", () => ({
  supabaseAdmin: () => ({ auth: { getClaims } }),
}));
vi.mock("../supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getSession } }),
}));

describe("getAuthUser", () => {
  beforeEach(() => {
    getClaims.mockReset();
    getSession.mockReset();
    vi.resetModules(); // fresh module = fresh validation cache per test
  });

  it("returns null when there is no bearer token and no cookie session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { getAuthUser } = await import("../auth");
    const req = new Request("http://t/api/me");
    expect(await getAuthUser(req)).toBeNull();
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("returns the user from a valid bearer token", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "uid-1", email: "a@b.co" } }, error: null });
    const { getAuthUser } = await import("../auth");
    const req = new Request("http://t/api/me", { headers: { authorization: "Bearer tok" } });
    expect(await getAuthUser(req)).toEqual({ authId: "uid-1", email: "a@b.co" });
    expect(getClaims).toHaveBeenCalledWith("tok");
  });

  it("accepts a lowercase bearer scheme and extracts the token", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "uid-2", email: "c@d.co" } }, error: null });
    const { getAuthUser } = await import("../auth");
    const req = new Request("http://t/api/me", { headers: { authorization: "bearer tok2" } });
    expect(await getAuthUser(req)).toEqual({ authId: "uid-2", email: "c@d.co" });
    expect(getClaims).toHaveBeenCalledWith("tok2");
  });

  it("validates a cookie session and caches repeat calls", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "cookie-tok" } } });
    getClaims.mockResolvedValue({ data: { claims: { sub: "uid-3", email: "e@f.co" } }, error: null });
    const { getAuthUser } = await import("../auth");
    const req = new Request("http://t/api/me");
    expect(await getAuthUser(req)).toEqual({ authId: "uid-3", email: "e@f.co" });
    expect(await getAuthUser(req)).toEqual({ authId: "uid-3", email: "e@f.co" });
    expect(getClaims).toHaveBeenCalledTimes(1); // second call served from the cache
  });

  it("returns null for an invalid token and does not cache it", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("bad token") });
    const { getAuthUser } = await import("../auth");
    const req = new Request("http://t/api/me", { headers: { authorization: "Bearer bad" } });
    expect(await getAuthUser(req)).toBeNull();
    expect(await getAuthUser(req)).toBeNull();
    expect(getClaims).toHaveBeenCalledTimes(2); // failures are never remembered
  });
});
