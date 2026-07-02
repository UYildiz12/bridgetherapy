"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Tiny stale-while-revalidate for client-fetched pages: the last good result is
// kept in sessionStorage and shown instantly on revisit while a fresh copy loads
// in the background. Scoped to the tab, cleared when the tab closes.

const PREFIX = "exhale:swr:";
const MAX_AGE_MS = 10 * 60 * 1000;

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw) as { t: number; v: T };
    if (Date.now() - t > MAX_AGE_MS) return null;
    return v;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    // storage full or unavailable: caching is best-effort
  }
}

/** Drop everything cached for this tab. Call on sign-out so no data outlives the account. */
export function clearSwrCache() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // storage unavailable: nothing to clear
  }
}

export function useSwrLite<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(() =>
    typeof window === "undefined" ? null : read<T>(key),
  );
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  // Latest-ref pattern: sync in an effect (declared first so it runs before the
  // fetch effect below), never during render.
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    fetcherRef
      .current()
      .then((fresh) => {
        if (cancelled) return;
        setData(fresh);
        write(key, fresh);
      })
      .catch((err) => {
        if (cancelled) return;
        // Keep showing cached data if we have it; only surface hard failures.
        setError(err instanceof Error ? err.message : "Couldn't load.");
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // For optimistic updates: set state and keep the cache in sync.
  const update = useCallback(
    (updater: (prev: T | null) => T) => {
      setData((prev) => {
        const next = updater(prev);
        write(key, next);
        return next;
      });
    },
    [key],
  );

  return { data, error, update };
}
