"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Sparkles, ArrowUp } from "lucide-react";
import { fetchLumen, sendLumen, type LumenMessage } from "@/lib/notes-client";

const PROMPTS = [
  "Help me unpack what I wrote.",
  "What might be the thought underneath this?",
  "What could I bring to my next session?",
];

interface LumenSeed {
  prompts: string[] | null;
  prefill: string;
}

function takeSeed(noteId: string): LumenSeed | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `bridge:lumen-seed:${noteId}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    const seed = JSON.parse(raw) as { prompts?: unknown; prefill?: unknown };
    const prompts = Array.isArray(seed.prompts)
      ? seed.prompts.filter((p): p is string => typeof p === "string")
      : [];
    return {
      prompts: prompts.length ? prompts : null,
      prefill: typeof seed.prefill === "string" ? seed.prefill : "",
    };
  } catch {
    return null;
  }
}

export function LumenPanel({ noteId, hasVoiceNote = false }: { noteId: string; hasVoiceNote?: boolean }) {
  const [seed] = useState<LumenSeed | null>(() => takeSeed(noteId));
  const [messages, setMessages] = useState<LumenMessage[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [input, setInput] = useState(seed?.prefill ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLumen(noteId)
      .then((d) => {
        if (cancelled) return;
        setMessages(d.messages);
        setConfigured(d.configured);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this conversation.");
      });
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  useEffect(() => {
    const el = threadRef.current;
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, sending]);

  async function submit(text: string, e?: FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const optimistic: LumenMessage = {
      id: `tmp-${messages?.length ?? 0}-${body.length}`,
      noteId,
      role: "USER",
      content: body,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...(m ?? []), optimistic]);
    setInput("");
    try {
      const { user, lumen } = await sendLumen(noteId, body);
      setMessages((m) => [...(m ?? []).filter((x) => x.id !== optimistic.id), user, lumen]);
    } catch (err) {
      setMessages((m) => (m ?? []).filter((x) => x.id !== optimistic.id));
      setInput(body);
      setError(err instanceof Error ? err.message : "Lumen could not respond.");
    } finally {
      setSending(false);
    }
  }

  const empty = messages !== null && messages.length === 0;
  const prompts =
    seed?.prompts ??
    (hasVoiceNote ? ["Help me reflect on the voice note.", ...PROMPTS] : PROMPTS);

  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles size={15} strokeWidth={2} className="text-foreground" aria-hidden />
        <span className="text-sm font-medium">Lumen</span>
        <span className="ml-auto text-xs text-muted-foreground">your reflection companion</span>
      </div>

      <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" style={{ maxHeight: "26rem" }}>
        {messages === null && !error && (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        {empty && (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Talk it through. Lumen reads this entry{hasVoiceNote ? " and listens to the attached voice note" : ""} (and your recent check-ins) to help you go deeper. It stays private to you.
            </p>
            <div className="flex flex-wrap gap-2">
              {prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={!configured || sending}
                  onClick={() => submit(p)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages?.map((m) => (
          <div key={m.id} className={m.role === "USER" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "USER"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-foreground/10 px-3.5 py-2 text-sm"
                  : "max-w-[90%] text-sm leading-relaxed text-foreground/90"
              }
            >
              {m.role === "LUMEN" && (
                <span className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles size={12} strokeWidth={2} aria-hidden /> Lumen
                </span>
              )}
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles size={12} strokeWidth={2} aria-hidden /> Lumen is thinking...
          </div>
        )}
      </div>

      <form onSubmit={(e) => submit(input, e)} className="border-t border-border p-3">
        {!configured ? (
          <p className="px-1 py-1 text-xs text-muted-foreground">
            Lumen isn&apos;t set up on this server yet. Add an API key to enable the conversation.
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) submit(input, e);
              }}
              rows={1}
              placeholder="Reply to Lumen..."
              className="max-h-32 min-h-9 flex-1 resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              aria-label="Send to Lumen"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
