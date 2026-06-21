"use client";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Mail, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchTherapistNotes,
  updateTherapistNote,
  type TherapistNote,
} from "@/lib/notes-client";

type NoteFilter = "open" | "all" | "resolved";

const FILTERS: { value: NoteFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "all", label: "All" },
  { value: "resolved", label: "Resolved" },
];

function formatNoteDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function TherapistNotesPage() {
  const [notes, setNotes] = useState<TherapistNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<NoteFilter>("open");

  const counts = useMemo(() => {
    const list = notes ?? [];
    return {
      all: list.length,
      open: list.filter((note) => !note.isResolved).length,
      resolved: list.filter((note) => note.isResolved).length,
      patients: new Set(list.map((note) => note.patientEmail || note.patientName)).size,
    };
  }, [notes]);

  const visibleNotes = useMemo(() => {
    if (!notes) return null;
    if (filter === "open") return notes.filter((note) => !note.isResolved);
    if (filter === "resolved") return notes.filter((note) => note.isResolved);
    return notes;
  }, [filter, notes]);

  useEffect(() => {
    fetchTherapistNotes()
      .then(setNotes)
      .catch(() => setError("Couldn't load patient notes."));
  }, []);

  async function toggle(note: TherapistNote) {
    setUpdatingId(note.id);
    setError(null);
    try {
      const updated = await updateTherapistNote(note.id, !note.isResolved);
      setNotes((prev) =>
        (prev ?? []).map((n) => (n.id === note.id ? { ...n, isResolved: updated.isResolved } : n)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that note.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <section className="relative overflow-hidden border-y border-border py-8 md:py-12">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(245,158,11,0.10),transparent_44%,rgba(16,185,129,0.11))]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 className="size-4" aria-hidden="true" />
              Patient reflections
            </div>
            <h1 className="max-w-4xl text-[clamp(2.35rem,6vw,4.75rem)] font-semibold leading-[0.98] tracking-tight">
              Review the notes patients want carried into session.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Open items stay visible until you mark them resolved after review or discussion.
            </p>
          </div>
          <div className="self-end border-l border-border pl-6">
            <div className="grid grid-cols-3 gap-5">
              <div>
                <p className="text-4xl font-semibold tracking-tight">{counts.open}</p>
                <p className="mt-2 text-sm text-muted-foreground">Open</p>
              </div>
              <div>
                <p className="text-4xl font-semibold tracking-tight">{counts.resolved}</p>
                <p className="mt-2 text-sm text-muted-foreground">Done</p>
              </div>
              <div>
                <p className="text-4xl font-semibold tracking-tight">{counts.patients}</p>
                <p className="mt-2 text-sm text-muted-foreground">Patients</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 py-10 lg:grid-cols-[13rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="grid gap-2" role="tablist" aria-label="Filter patient notes">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={`border-l py-3 pl-4 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  filter === item.value
                    ? "border-emerald-300 text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/60 hover:text-foreground"
                }`}
              >
                <span className="block font-medium">{item.label}</span>
                <span className="mt-1 block text-xs">
                  {item.value === "all" ? counts.all : counts[item.value]}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

          {notes === null && !error && (
            <div className="grid gap-4 border-y border-border py-4">
              {[0, 1, 2].map((row) => (
                <div key={row} className="grid gap-4 py-4 md:grid-cols-[12rem_1fr_8rem]">
                  <div className="h-4 w-28 animate-pulse bg-foreground/10" />
                  <div className="space-y-3">
                    <div className="h-4 w-3/4 animate-pulse bg-foreground/10" />
                    <div className="h-4 w-full animate-pulse bg-foreground/10" />
                  </div>
                  <div className="h-8 w-24 animate-pulse bg-foreground/10" />
                </div>
              ))}
            </div>
          )}

          {visibleNotes && visibleNotes.length === 0 && (
            <div className="border-y border-dashed border-border py-12">
              <p className="text-sm font-medium">
                {filter === "open" ? "No open reflections" : "No reflections in this view"}
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Patient questions and reflective notes appear here once active patients share them.
              </p>
            </div>
          )}

          {visibleNotes && visibleNotes.length > 0 && (
            <div className="border-y border-border">
              {visibleNotes.map((note) => (
                <article
                  key={note.id}
                  className="grid gap-5 border-b border-border/70 py-6 last:border-b-0 md:grid-cols-[13rem_1fr_auto]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{note.patientName}</p>
                    <p className="mt-2 flex items-center gap-2 truncate text-xs text-muted-foreground">
                      <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                      {note.patientEmail}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatNoteDate(note.createdAt)}</p>
                  </div>

                  <div className="min-w-0">
                    <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium">
                      {note.isResolved ? (
                        <>
                          <CheckCircle2 className="size-4 text-emerald-300" aria-hidden="true" />
                          Resolved
                        </>
                      ) : (
                        <>
                          <Clock3 className="size-4 text-amber-200" aria-hidden="true" />
                          Open for review
                        </>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-base leading-7 text-muted-foreground">
                      {note.content}
                    </p>
                  </div>

                  <div className="flex items-start md:justify-end">
                    <Button
                      type="button"
                      variant={note.isResolved ? "outline" : "default"}
                      size="sm"
                      className="gap-2 whitespace-nowrap"
                      onClick={() => toggle(note)}
                      disabled={updatingId === note.id}
                    >
                      {note.isResolved ? (
                        <RotateCcw className="size-4" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                      )}
                      {note.isResolved ? "Reopen" : "Resolve"}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
