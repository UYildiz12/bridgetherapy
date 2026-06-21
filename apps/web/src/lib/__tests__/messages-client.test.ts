import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchConversation,
  fetchConversations,
  markConversationRead,
  openConversation,
  sendMessage,
} from "../messages-client";

describe("messages-client", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetchConversations returns the data array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "c1" }] }), { status: 200 })),
    );

    const conversations = await fetchConversations();

    expect(conversations[0].id).toBe("c1");
  });

  it("openConversation posts the selected profile id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: "c1" } }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await openConversation({ therapistId: "tp1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/messages/conversations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ therapistId: "tp1" }),
      }),
    );
  });

  it("fetchConversation reads a thread", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: "c1" } }), { status: 200 })),
    );

    await expect(fetchConversation("c1")).resolves.toMatchObject({ id: "c1" });
  });

  it("sendMessage posts body content", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "m1", body: "Hi" } }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendMessage("c1", "Hi");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/messages/conversations/c1/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ body: "Hi" }),
      }),
    );
  });

  it("markConversationRead patches the read route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { updated: 1 } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await markConversationRead("c1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/messages/conversations/c1/read",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
