// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { fetchConversations, openConversation, push } = vi.hoisted(() => ({
  fetchConversations: vi.fn(),
  openConversation: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/lib/messages-client", () => ({ fetchConversations, openConversation }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import MessagesPage from "../page";

describe("MessagesPage", () => {
  beforeEach(() => {
    fetchConversations.mockReset().mockResolvedValue([
      {
        id: "c1",
        patientId: "pp1",
        therapistId: "tp1",
        peerName: "Maya Stone",
        peerEmail: "maya@example.com",
        peerRole: "THERAPIST",
        lastMessage: "How did the grounding practice go?",
        lastMessageAt: "2026-06-21T09:00:00.000Z",
        unreadCount: 2,
      },
      {
        id: null,
        patientId: "pp1",
        therapistId: "tp2",
        peerName: "Jon Chen",
        peerEmail: "jon@example.com",
        peerRole: "THERAPIST",
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
      },
    ]);
    openConversation.mockReset().mockResolvedValue({ id: "c2" });
    push.mockReset();
  });

  afterEach(cleanup);

  it("renders linked conversation rows and unread counts", async () => {
    render(<MessagesPage />);

    await waitFor(() => screen.getByText("Maya Stone"));

    expect(screen.getByRole("heading", { name: /messages/i })).toBeDefined();
    expect(screen.getByText("How did the grounding practice go?")).toBeDefined();
    expect(screen.getAllByText(/2 unread/i).length).toBe(2);
    expect(screen.getByText("Jon Chen")).toBeDefined();
  });

  it("opens a new conversation before navigating when no id exists yet", async () => {
    render(<MessagesPage />);
    await waitFor(() => screen.getByText("Jon Chen"));

    fireEvent.click(screen.getByRole("button", { name: /open jon chen/i }));

    await waitFor(() =>
      expect(openConversation).toHaveBeenCalledWith({ patientId: "pp1", therapistId: "tp2" }),
    );
    expect(push).toHaveBeenCalledWith("/messages/c2");
  });
});
