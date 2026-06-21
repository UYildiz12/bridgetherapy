"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  fetchConversation,
  markConversationRead,
  sendMessage,
  type ConversationThread,
  type MessageItem,
} from "@/lib/messages-client";

function paramId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MessageThreadPage() {
  const params = useParams<{ id: string }>();
  const id = paramId(params.id);
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchConversation(id)
      .then((data) => {
        if (!alive) return;
        setThread(data);
        setMessages(data.messages);
        void markConversationRead(id);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : "Couldn't load that conversation.");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const grouped = useMemo(() => messages, [messages]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      const message = await sendMessage(id, body);
      setMessages((current) => [...current, message]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link href="/messages" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Messages
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{thread?.peerName ?? "Conversation"}</h1>
          {thread && <p className="text-sm text-muted-foreground">{thread.peerEmail}</p>}
        </div>
      </div>

      {error && <p className="mt-4 rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex-1 space-y-3 overflow-y-auto py-6">
        {!thread && !error && <p className="text-sm text-muted-foreground">Loading conversation...</p>}
        {grouped.map((message) => (
          <div key={message.id} className={`flex ${message.mine ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-md border px-4 py-3 ${
                message.mine
                  ? "border-primary/20 bg-primary text-primary-foreground"
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                <span>{message.senderName}</span>
                <span>{formatTime(message.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="sticky bottom-0 flex gap-3 border-t border-border bg-background py-4">
        <label htmlFor="message-body" className="sr-only">
          Message
        </label>
        <textarea
          id="message-body"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-12 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
          placeholder="Write a message"
          maxLength={2000}
        />
        <Button type="submit" disabled={sending || !draft.trim()}>
          <Send className="h-4 w-4" />
          Send
        </Button>
      </form>
    </section>
  );
}
