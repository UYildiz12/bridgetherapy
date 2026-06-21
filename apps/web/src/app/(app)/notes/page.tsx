"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, PenLine, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPatientNote, fetchPatientNotes, type PatientNote } from "@/lib/notes-client";

const STARTERS = [
  {
    title: "Thought record",
    detail: "Situation, thought, feeling, evidence, next response.",
    body: "Situation:\nAutomatic thought:\nFeeling and body signal:\nEvidence for and against:\nA more balanced response I want to try:",
  },
  {
    title: "Pattern loop",
    detail: "Trigger, urge, behavior, short-term relief, long-term cost.",
    body: "Trigger:\nWhat I felt pulled to do:\nWhat happened next:\nWhat helped, even a little:\nWhat I want to ask about in session:",
  },
  {
    title: "Session question",
    detail: "Bring one exact moment into therapy.",
    body: "The moment I want to discuss:\nWhat felt confusing:\nWhat I tried:\nWhat I want help understanding:",
  },
];

function formatNoteDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function PatientNotesPage() {
  const [notes, setNotes] = useState<PatientNote[] | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCount = useMemo(
    () => notes?.filter((note) => !note.isResolved).length ?? 0,
    [notes],
  );
  const resolvedCount = useMemo(
    () => notes?.filter((note) => note.isResolved).length ?? 0,
    [notes],
  );
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  useEffect(() => {
    fetchPatientNotes()
      .then(setNotes)
      .catch(() => setError("Couldn't load your notes."));
  }, []);

  function addStarter(body: string) {
    setContent((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${body}` : body));
    const focusNote = () => document.getElementById("note")?.focus();
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(focusNote);
    } else {
      focusNote();
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const note = await createPatientNote(content);
      setNotes((prev) => [note, ...(prev ?? [])]);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <section className="relative overflow-hidden border-y border-border py-8 md:py-12">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(16,185,129,0.12),transparent_42%,rgba(245,158,11,0.08))]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <PenLine className="size-4" aria-hidden="true" />
              Reflections
            </div>
            <h1 className="max-w-4xl text-[clamp(2.35rem,6vw,4.75rem)] font-semibold leading-[0.98] tracking-tight">
              Write the moment you want to bring into therapy.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Notes are one shared stream for questions, reflective notes, and session topics.
            </p>
          </div>
          <div className="self-end border-l border-border pl-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-5xl font-semibold tracking-tight">{openCount}</p>
                <p className="mt-2 text-sm text-muted-foreground">Open</p>
              </div>
              <div>
                <p className="text-5xl font-semibold tracking-tight">{resolvedCount}</p>
                <p className="mt-2 text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-10 py-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)]">
        <form onSubmit={submit} className="relative border-l border-border pl-5 md:pl-8">
          <div className="absolute left-0 top-0 h-16 w-px bg-emerald-300" />
          <label htmlFor="note" className="text-sm font-medium text-foreground">
            New reflection
          </label>
          <textarea
            id="note"
            className="mt-3 min-h-72 w-full resize-y border-0 border-b border-border bg-transparent px-0 py-4 text-lg leading-8 outline-none placeholder:text-muted-foreground focus-visible:border-emerald-300"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start with the exact moment, thought, feeling, or question."
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{wordCount} words</p>
            <Button type="submit" className="gap-2 sm:w-auto" disabled={saving || !content.trim()}>
              <Send className="size-4" aria-hidden="true" />
              {saving ? "Saving" : "Save reflection"}
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </form>

        <div className="space-y-3">
          {STARTERS.map((starter) => (
            <button
              key={starter.title}
              type="button"
              onClick={() => addStarter(starter.body)}
              className="group w-full border-l border-border py-4 pl-5 text-left transition-colors hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block text-sm font-medium text-foreground">{starter.title}</span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">{starter.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-8 border-t border-border pt-10 lg:grid-cols-[12rem_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-xl font-semibold tracking-tight">Reflection stream</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your therapist can resolve items after they are covered.
          </p>
        </div>

        {notes === null && !error && (
          <div className="grid gap-4 border-y border-border py-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="grid gap-3 py-3 md:grid-cols-[8rem_1fr]">
                <div className="h-4 w-24 animate-pulse bg-foreground/10" />
                <div className="space-y-3">
                  <div className="h-4 w-2/3 animate-pulse bg-foreground/10" />
                  <div className="h-4 w-full animate-pulse bg-foreground/10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {notes && notes.length === 0 && (
          <div className="border-y border-dashed border-border py-12">
            <p className="text-sm font-medium">No reflections yet</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Start with one concrete moment you want to remember in your next session.
            </p>
          </div>
        )}

        {notes && notes.length > 0 && (
          <ol className="border-y border-border">
            {notes.map((note) => (
              <li key={note.id} className="grid gap-4 border-b border-border/70 py-6 last:border-b-0 md:grid-cols-[8rem_1fr]">
                <div className="flex items-center gap-2 text-sm text-muted-foreground md:block">
                  <Clock3 className="size-4 md:mb-2" aria-hidden="true" />
                  <time dateTime={note.createdAt}>{formatNoteDate(note.createdAt)}</time>
                </div>
                <article className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium">
                    {note.isResolved ? (
                      <>
                        <CheckCircle2 className="size-4 text-emerald-300" aria-hidden="true" />
                        Resolved
                      </>
                    ) : (
                      <>
                        <PenLine className="size-4 text-amber-200" aria-hidden="true" />
                        Open for session
                      </>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-base leading-7 text-muted-foreground">{note.content}</p>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
