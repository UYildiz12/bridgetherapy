"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Lock, Share2, Trash2, Mic } from "lucide-react";
import {
  fetchEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  type JournalEntry,
  type NoteVisibility,
} from "@/lib/notes-client";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSwrLite } from "@/lib/swr-lite";
import { LumenPanel } from "@/components/notes/lumen-panel";
import { VoiceRecorder } from "@/components/homework/voice-recorder";
import { mediaUrl } from "@/lib/homework/client";

function preview(e: JournalEntry) {
  return e.title?.trim() || e.content.split("\n").find((l) => l.trim()) || (e.voiceMediaId ? "Voice reflection" : "Untitled reflection");
}
function shortDate(s: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(s));
}

export default function NotesPage() {
  const { data: entries, error: loadError, update } = useSwrLite<JournalEntry[]>(
    "reflections",
    fetchEntries,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const error = entries === null && loadError ? "Couldn't load your reflections." : null;

  // Open a specific entry when arriving from a seeded hand-off (e.g. a quick practice).
  useEffect(() => {
    if (!entries) return;
    try {
      const open = sessionStorage.getItem("exhale:notes-open");
      if (open && entries.some((e) => e.id === open)) {
        setSelectedId(open);
        setComposing(false);
        sessionStorage.removeItem("exhale:notes-open");
      }
    } catch {
      // ignore storage access errors
    }
  }, [entries]);

  const selected = useMemo(
    () => entries?.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  );

  function onSaved(saved: JournalEntry, isNew: boolean) {
    update((list) => [saved, ...(list ?? []).filter((e) => e.id !== saved.id)]);
    if (isNew) {
      setComposing(false);
      setSelectedId(saved.id);
    }
  }
  function onDeleted(id: string) {
    update((list) => (list ?? []).filter((e) => e.id !== id));
    setSelectedId(null);
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Reflections"
        sub="A private journaling space. Think out loud with Lumen, and share an entry with your therapist whenever you choose."
        action={
          <Button
            onClick={() => {
              setComposing(true);
              setSelectedId(null);
            }}
            className="gap-1.5"
          >
            <Plus size={16} aria-hidden /> New
          </Button>
        }
      />

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <aside className="grid content-start gap-1">
          {entries === null && !error && (
            <div className="grid gap-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          )}
          {entries && entries.length === 0 && !composing && (
            <p className="px-1 text-sm text-muted-foreground">
              No reflections yet. Start your first one.
            </p>
          )}
          {entries?.map((e) => {
            const active = e.id === selectedId && !composing;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  setSelectedId(e.id);
                  setComposing(false);
                }}
                className={`grid gap-1 rounded-lg border-l-2 px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "border-foreground bg-foreground/[0.06]"
                    : "border-transparent hover:bg-foreground/[0.04]"
                }`}
              >
                <span className="truncate text-sm font-medium">{preview(e)}</span>
                <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span>{e.visibility === "SHARED" ? "Shared" : "Private"}</span>
                  <span aria-hidden>·</span>
                  <span>{shortDate(e.updatedAt)}</span>
                  {e.lumenCount > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span>Lumen {e.lumenCount}</span>
                    </>
                  )}
                  {e.voiceMediaId && (
                    <>
                      <span aria-hidden>Â·</span>
                      <span className="inline-flex items-center gap-1">
                        <Mic size={11} aria-hidden /> Voice
                      </span>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </aside>

        <section className="min-w-0">
          {composing || selected ? (
            <Editor
              key={selected?.id ?? "new"}
              entry={composing ? null : selected}
              onSaved={onSaved}
              onDeleted={onDeleted}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
              <p className="text-sm font-medium">Pick a reflection, or start a new one</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Capture a moment, a thought, or a question. Keep it to yourself, think it through with
                Lumen, or share it with your therapist.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Editor({
  entry,
  onSaved,
  onDeleted,
}: {
  entry: JournalEntry | null;
  onSaved: (e: JournalEntry, isNew: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  const isNew = entry === null;
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [voiceMediaId, setVoiceMediaId] = useState(entry?.voiceMediaId ?? undefined);
  const [visibility, setVisibility] = useState<NoteVisibility>(entry?.visibility ?? "PRIVATE");
  const [saving, setSaving] = useState(false);
  const [busyVis, setBusyVis] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = isNew
    ? content.trim().length > 0 || title.trim().length > 0 || Boolean(voiceMediaId)
    : title !== (entry?.title ?? "") || content !== entry?.content || voiceMediaId !== (entry?.voiceMediaId ?? undefined);
  const canSave = content.trim().length > 0 || Boolean(voiceMediaId);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const created = await createEntry({
          title: title.trim() || undefined,
          content: content.trim(),
          ...(voiceMediaId ? { voiceMediaId } : {}),
        });
        onSaved(created, true);
      } else {
        const updated = await updateEntry(entry.id, {
          title: title.trim() || null,
          content: content.trim(),
          voiceMediaId: voiceMediaId ?? null,
        });
        onSaved(updated, false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this reflection.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleShare() {
    if (isNew || busyVis) return;
    const next: NoteVisibility = visibility === "SHARED" ? "PRIVATE" : "SHARED";
    const prev = visibility;
    setVisibility(next);
    setBusyVis(true);
    setError(null);
    try {
      const updated = await updateEntry(entry.id, { visibility: next });
      onSaved(updated, false);
    } catch (err) {
      setVisibility(prev);
      setError(err instanceof Error ? err.message : "Couldn't change sharing.");
    } finally {
      setBusyVis(false);
    }
  }

  async function remove() {
    if (isNew || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteEntry(entry.id);
      onDeleted(entry.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this reflection.");
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={save} className="grid gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          aria-label="Reflection title"
          className="w-full bg-transparent text-2xl leading-tight outline-none placeholder:text-muted-foreground/50"
          style={{ fontFamily: "var(--font-instrument-serif), serif" }}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write the moment, thought, feeling, or question you want to hold onto."
          aria-label="Reflection"
          className="min-h-64 w-full resize-y border-0 border-t border-border bg-transparent pt-4 text-base leading-7 outline-none placeholder:text-muted-foreground"
        />
        <div className="grid gap-2 rounded-2xl border border-border/80 bg-foreground/[0.025] p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Mic size={15} aria-hidden /> Voice note
          </div>
          <VoiceRecorder value={voiceMediaId} onChange={setVoiceMediaId} />
          <p className="text-xs text-muted-foreground">
            Voice reflections can be shared with your therapist and are included when Lumen helps you follow up.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={!canSave || saving || (!isNew && !dirty)}>
            {saving ? "Saving..." : isNew ? "Save reflection" : "Save"}
          </Button>
          {!isNew && (
            <>
              <Button
                type="button"
                variant={visibility === "SHARED" ? "default" : "outline"}
                onClick={toggleShare}
                disabled={busyVis}
                className="gap-1.5"
              >
                {visibility === "SHARED" ? (
                  <>
                    <Share2 size={15} aria-hidden /> Shared with therapist
                  </>
                ) : (
                  <>
                    <Lock size={15} aria-hidden /> Private
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={remove}
                disabled={deleting}
                aria-label="Delete reflection"
                className="ml-auto text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={16} aria-hidden />
              </Button>
            </>
          )}
        </div>
        {!isNew && visibility === "SHARED" && (
          <p className="text-xs text-muted-foreground">
            Your therapist can read this entry{entry.voiceMediaId ? " and play its voice note" : ""}. Your Lumen conversation always stays private to you.
          </p>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>

      {isNew ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          Save this entry to start thinking it through with Lumen.
        </p>
      ) : (
        <div className="grid gap-4">
          {entry.voiceMediaId && (
            <div className="grid gap-2 rounded-2xl border border-border/80 bg-foreground/[0.025] p-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Mic size={15} aria-hidden /> Saved voice reflection
              </p>
              <audio controls src={mediaUrl(entry.voiceMediaId)} className="w-full" />
            </div>
          )}
          <LumenPanel
            key={entry.id}
            noteId={entry.id}
            hasVoiceNote={Boolean(entry.voiceMediaId)}
          />
        </div>
      )}
    </div>
  );
}
