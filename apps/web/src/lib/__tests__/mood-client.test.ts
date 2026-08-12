import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchMoodHistory, createMoodEntry } from "../mood-client";

describe("mood-client", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetchMoodHistory returns the entries with the all-time total", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "m1", moodScore: 6, tags: [], createdAt: "2026-06-21T00:00:00Z" }], total: 240 }), { status: 200 }),
    ));
    const history = await fetchMoodHistory();
    expect(history.entries[0].id).toBe("m1");
    expect(history.total).toBe(240);
  });

  it("fetchMoodHistory falls back to the list length when total is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "m1", moodScore: 6, tags: [], createdAt: "2026-06-21T00:00:00Z" }] }), { status: 200 }),
    ));
    const history = await fetchMoodHistory();
    expect(history.total).toBe(1);
  });

  it("createMoodEntry POSTs the payload and returns the entry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "m2", moodScore: 8, tags: [], createdAt: "x" } }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const entry = await createMoodEntry({ moodScore: 8 });
    expect(entry.id).toBe("m2");
    expect(fetchMock).toHaveBeenCalledWith("/api/mood", expect.objectContaining({ method: "POST" }));
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 400 })));
    await expect(createMoodEntry({ moodScore: 5 })).rejects.toThrow();
  });
});
