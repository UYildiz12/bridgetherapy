import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "../rate-limit";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows calls up to the limit and counts remaining down", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });

    expect(limiter.check("u1")).toEqual({ allowed: true, remaining: 2, retryAfterMs: 0 });
    expect(limiter.check("u1")).toEqual({ allowed: true, remaining: 1, retryAfterMs: 0 });
    expect(limiter.check("u1")).toEqual({ allowed: true, remaining: 0, retryAfterMs: 0 });
  });

  it("blocks over-limit calls and points retryAfterMs at the oldest hit's expiry", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });

    limiter.check("u1");
    vi.advanceTimersByTime(10_000);
    limiter.check("u1");
    vi.advanceTimersByTime(5_000);

    const blocked = limiter.check("u1");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    // First hit was 15s ago; a slot frees when it leaves the 60s window.
    expect(blocked.retryAfterMs).toBe(45_000);
  });

  it("frees capacity once old hits slide out of the window", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });

    limiter.check("u1");
    limiter.check("u1");
    expect(limiter.check("u1").allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(limiter.check("u1").allowed).toBe(true);
  });

  it("does not count blocked attempts against the window", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });

    limiter.check("u1");
    // Hammering while blocked must not extend the lockout.
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(10_000);
      expect(limiter.check("u1").allowed).toBe(false);
    }

    vi.advanceTimersByTime(10_001); // 60s after the single accepted hit
    expect(limiter.check("u1").allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });

    expect(limiter.check("u1").allowed).toBe(true);
    expect(limiter.check("u2").allowed).toBe(true);
    expect(limiter.check("u1").allowed).toBe(false);
    expect(limiter.check("u2").allowed).toBe(false);
  });
});
