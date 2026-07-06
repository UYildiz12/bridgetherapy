/**
 * Minimal in-process sliding-window rate limiter.
 *
 * Best-effort by design: counters live in this Node process's memory, so each
 * server instance enforces its own window and everything resets on restart or
 * redeploy. That is enough to stop one user from hammering the paid AI and
 * media endpoints; move the state to a shared store (e.g. Redis) if the app
 * ever runs across several instances and needs hard guarantees.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Requests left in the current window (0 when blocked). */
  remaining: number;
  /** How long a blocked caller should wait before retrying (0 when allowed). */
  retryAfterMs: number;
}

export interface RateLimiter {
  /** Record and check one hit for `key` (typically a user id). */
  check(key: string): RateLimitResult;
}

/** Sweep every key once the map grows past this, so idle keys cannot leak forever. */
const SWEEP_THRESHOLD = 10_000;

export function createRateLimiter(options: { limit: number; windowMs: number }): RateLimiter {
  const { limit, windowMs } = options;
  /** Per-key timestamps (ms) of accepted hits, oldest first. */
  const hits = new Map<string, number[]>();

  function insideWindow(timestamps: number[], now: number): number[] {
    const cutoff = now - windowMs;
    let start = 0;
    while (start < timestamps.length && timestamps[start] <= cutoff) start++;
    return start === 0 ? timestamps : timestamps.slice(start);
  }

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();

      if (hits.size > SWEEP_THRESHOLD) {
        for (const [k, stamps] of hits) {
          const alive = insideWindow(stamps, now);
          if (alive.length === 0) hits.delete(k);
          else hits.set(k, alive);
        }
      }

      const current = insideWindow(hits.get(key) ?? [], now);
      if (current.length >= limit) {
        hits.set(key, current);
        // A slot frees up when the oldest in-window hit ages out.
        return { allowed: false, remaining: 0, retryAfterMs: Math.max(1, current[0] + windowMs - now) };
      }

      current.push(now);
      hits.set(key, current);
      return { allowed: true, remaining: limit - current.length, retryAfterMs: 0 };
    },
  };
}
