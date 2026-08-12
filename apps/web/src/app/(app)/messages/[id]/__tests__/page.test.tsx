// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { fetchConversation, markConversationRead, sendMessage } = vi.hoisted(() => ({
  fetchConversation: vi.fn(),
  markConversationRead: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock("@/lib/messages-client", () => ({ fetchConversation, markConversationRead, sendMessage }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "c1" }) }));

import MessageThreadPage from "../page";

describe("MessageThreadPage", () => {
  beforeEach(() => {
    fetchConversation.mockReset().mockResolvedValue({
      id: "c1",
      peerName: "Maya Stone",
      peerEmail: "maya@example.com",
      peerRole: "THERAPIST",
      messages: [
        {
          id: "m1",
          body: "I practiced the breathing.",
          senderName: "Sam Lee",
          mine: true,
          readAt: null,
          createdAt: "2026-06-21T08:00:00.000Z",
        },
        {
          id: "m2",
          body: "How did the grounding practice go?",
          senderName: "Maya Stone",
          mine: false,
          readAt: null,
          createdAt: "2026-06-21T09:00:00.000Z",
        },
      ],
    });
    markConversationRead.mockReset().mockResolvedValue({ updated: 1 });
    sendMessage.mockReset().mockResolvedValue({
      id: "m3",
      body: "A little calmer today.",
      senderName: "Sam Lee",
      mine: true,
      readAt: null,
      createdAt: "2026-06-21T10:00:00.000Z",
    });
  });

  afterEach(cleanup);

  it("loads a thread and marks it read", async () => {
    render(<MessageThreadPage />);

    await waitFor(() => screen.getByRole("heading", { name: "Maya Stone" }));

    expect(screen.getByText("I practiced the breathing.")).toBeDefined();
    expect(screen.getByText("How did the grounding practice go?")).toBeDefined();
    expect(markConversationRead).toHaveBeenCalledWith("c1");
  });

  it("sends a reply and appends it locally", async () => {
    render(<MessageThreadPage />);
    await waitFor(() => screen.getByRole("heading", { name: "Maya Stone" }));

    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "A little calmer today." } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith("c1", "A little calmer today."));
    expect(screen.getByText("A little calmer today.")).toBeDefined();
  });
});
