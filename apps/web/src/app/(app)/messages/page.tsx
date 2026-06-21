"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MailOpen, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchConversations,
  openConversation,
  type ConversationListItem,
} from "@/lib/messages-client";

function formatDate(value: string | null) {
  if (!value) return "No messages yet";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationListItem[] | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations()
      .then(setConversations)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load messages."));
  }, []);

  async function open(item: ConversationListItem) {
    setOpeningId(item.id ?? `${item.patientId}:${item.therapistId}`);
    setError(null);
    try {
      const conversation = item.id
        ? { id: item.id }
        : await openConversation({ patientId: item.patientId, therapistId: item.therapistId });
      router.push(`/messages/${conversation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open that conversation.");
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <section className="space-y-7">
      <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Care line</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Messages</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MailOpen className="h-4 w-4" />
          <span>{conversations?.reduce((sum, item) => sum + item.unreadCount, 0) ?? 0} unread</span>
        </div>
      </div>

      {error && <p className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>}

      {!conversations && <p className="text-sm text-muted-foreground">Loading conversations...</p>}
      {conversations?.length === 0 && (
        <div className="flex min-h-64 items-center justify-center border border-dashed border-border">
          <p className="text-sm text-muted-foreground">No active conversations yet.</p>
        </div>
      )}

      <div className="divide-y divide-border border-y border-border">
        {conversations?.map((item) => {
          const key = item.id ?? `${item.patientId}:${item.therapistId}`;
          const opening = openingId === key;
          return (
            <div key={key} className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <button
                type="button"
                onClick={() => open(item)}
                className="group grid gap-2 text-left"
                aria-label={`Open ${item.peerName}`}
              >
                <span className="flex flex-wrap items-center gap-3">
                  <span className="text-lg font-medium tracking-tight group-hover:text-primary">{item.peerName}</span>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.peerRole}</span>
                  {item.unreadCount > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      {item.unreadCount} unread
                    </span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">{item.peerEmail}</span>
                <span className="line-clamp-1 text-sm">
                  {item.lastMessage ?? "Start the conversation for this active care relationship."}
                </span>
              </button>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <span className="text-xs text-muted-foreground">{formatDate(item.lastMessageAt)}</span>
                <Button type="button" variant="outline" onClick={() => open(item)} disabled={opening}>
                  <MessageSquareText className="h-4 w-4" />
                  {opening ? "Opening" : "Open"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
