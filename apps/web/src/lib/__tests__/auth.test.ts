import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
vi.mock("../supabase/admin", () => ({
  supabaseAdmin: () => ({ auth: { getUser } }),
}));
vi.mock("../supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser } }),
}));

describe("getAuthUser", () => {
  beforeEach(() => getUser.mockReset());

  it("returns null when there is no bearer token and no cookie session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("no session") });
    const { getAuthUser } = await import("../auth");
    const req = new Request("http://t/api/me");
    expect(await getAuthUser(req)).toBeNull();
  });

  it("returns the user from a valid bearer token", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "uid-1", email: "a@b.co" } }, error: null });
    const { getAuthUser } = await import("../auth");
    const req = new Request("http://t/api/me", { headers: { authorization: "Bearer tok" } });
    expect(await getAuthUser(req)).toEqual({ authId: "uid-1", email: "a@b.co" });
    expect(getUser).toHaveBeenCalledWith("tok");
  });
});
