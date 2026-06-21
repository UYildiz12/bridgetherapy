"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Lock, Share2, Trash2 } from "lucide-react";
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
import { LumenPanel } from "@/components/notes/lumen-panel";

function preview(e: JournalEntry) {
  return e.title?.trim() || e.content.split("\n").find((l) => l.trim()) || "Untitled reflection";
}
function shortDate(s: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(s));
}

export default function NotesPage() {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries()
      .then(setEntries)
      .catch(() => setError("Couldn't load your reflections."));
  }, []);

  const selected = useMemo(
    () => entries?.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  );

  function onSaved(saved: JournalEntry, isNew: boolean) {
    setEntries((list) => [saved, ...(list ?? []).filter((e) => e.id !== saved.id)]);
    if (isNew) {
      setComposing(false);
      setSelectedId(saved.id);
    }
  }
  function onDeleted(id: string) {
    setEntries((list) => (list ?? []).filter((e) => e.id !== id));
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
  const [visibility, setVisibility] = useState<NoteVisibility>(entry?.visibility ?? "PRIVATE");
  const [saving, setSaving] = useState(false);
  const [busyVis, setBusyVis] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = isNew
    ? content.trim().length > 0 || title.trim().length > 0
    : title !== (entry?.title ?? "") || content !== entry?.content;

  async function save(e?: FormEvent) {
    e?.preventDefault();
    if (!content.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const created = await createEntry({ title: title.trim() || undefined, content: content.trim() });
        onSaved(created, true);
      } else {
        const updated = await updateEntry(entry.id, {
          title: title.trim() || null,
          content: content.trim(),
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
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={!content.trim() || saving || (!isNew && !dirty)}>
            {saving ? "Saving…" : isNew ? "Save reflection" : "Save"}
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
            Your therapist can read this entry. Your Lumen conversation always stays private to you.
          </p>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>

      {isNew ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          Save this entry to start thinking it through with Lumen.
        </p>
      ) : (
        <LumenPanel noteId={entry.id} />
      )}
    </div>
  );
}
