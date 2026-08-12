import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const VALID = {
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  DATABASE_URL: "postgresql://x",
  DIRECT_URL: "postgresql://x",
};

describe("serverEnv", () => {
  const original = { ...process.env };
  beforeEach(() => { vi.resetModules(); Object.assign(process.env, VALID); });
  afterEach(() => { process.env = { ...original }; });

  it("parses a valid environment", async () => {
    const { serverEnv } = await import("../env");
    expect(serverEnv().SUPABASE_SERVICE_ROLE_KEY).toBe("service");
  });

  it("throws when a required var is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { serverEnv } = await import("../env");
    expect(() => serverEnv()).toThrow();
  });
});
