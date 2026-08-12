import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  fetchLumen,
  sendLumen,
  fetchSharedEntries,
} from "../notes-client";

const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ data }), { status });

describe("notes-client", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetchEntries returns the data array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok([{ id: "n1" }])));
    expect((await fetchEntries())[0].id).toBe("n1");
  });

  it("createEntry POSTs the body and returns the entry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ id: "n2" }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const e = await createEntry({ content: "Hi" });
    expect(e.id).toBe("n2");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notes",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ content: "Hi" }) }),
    );
  });

  it("createEntry can POST a voice-only reflection", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ id: "n2", voiceMediaId: "m1" }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const e = await createEntry({ content: "", voiceMediaId: "m1" });
    expect(e.voiceMediaId).toBe("m1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notes",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ content: "", voiceMediaId: "m1" }) }),
    );
  });

  it("updateEntry PATCHes visibility", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ id: "n1", visibility: "SHARED" }));
    vi.stubGlobal("fetch", fetchMock);
    const e = await updateEntry("n1", { visibility: "SHARED" });
    expect(e.visibility).toBe("SHARED");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notes/n1",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ visibility: "SHARED" }) }),
    );
  });

  it("deleteEntry DELETEs without a body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ id: "n1" }));
    vi.stubGlobal("fetch", fetchMock);
    await deleteEntry("n1");
    expect(fetchMock).toHaveBeenCalledWith("/api/notes/n1", expect.objectContaining({ method: "DELETE" }));
  });

  it("sendLumen POSTs the message and returns both turns", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ user: { id: "u" }, lumen: { id: "l" } }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const r = await sendLumen("n1", "help");
    expect(r.lumen.id).toBe("l");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notes/n1/lumen",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ message: "help" }) }),
    );
  });

  it("fetchLumen returns the configured flag and messages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ configured: true, messages: [] })));
    expect((await fetchLumen("n1")).configured).toBe(true);
  });

  it("fetchSharedEntries returns shared entries", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok([{ id: "n1", patientName: "Sam" }])));
    expect((await fetchSharedEntries())[0].patientName).toBe("Sam");
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 400 })));
    await expect(createEntry({ content: "x" })).rejects.toThrow();
  });
});
