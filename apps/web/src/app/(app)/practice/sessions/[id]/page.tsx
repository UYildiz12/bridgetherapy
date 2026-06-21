"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addSessionNote,
  fetchSession,
  generateSessionSummary,
  updateSession,
  type SessionDetail,
  type SessionNote,
  type SessionStatus,
  type SessionSummary,
} from "@/lib/sessions-client";

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSession(sessionId)
      .then(setSession)
      .catch(() => setError("Couldn't load that session."));
  }, [sessionId]);

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!noteDraft.trim()) return;
    setSavingNote(true);
    setError(null);
    try {
      const note = await addSessionNote(sessionId, noteDraft.trim());
      setSession((prev) => (prev ? { ...prev, notes: [...prev.notes, note as SessionNote], noteCount: prev.noteCount + 1 } : prev));
      setNoteDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that note.");
    } finally {
      setSavingNote(false);
    }
  }

  async function generateSummary() {
    setGenerating(true);
    setError(null);
    try {
      const summary = await generateSessionSummary(sessionId);
      setSession((prev) => (prev ? { ...prev, summary: summary as SessionSummary, hasSummary: true } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate a summary.");
    } finally {
      setGenerating(false);
    }
  }

  async function changeStatus(status: SessionStatus) {
    setUpdatingStatus(true);
    setError(null);
    try {
      const updated = await updateSession(sessionId, { status });
      setSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the session.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (!session && !error) {
    return (
      <div className="grid gap-5">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (!session) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <section className="border-y border-border py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="size-4" aria-hidden="true" />
              Session workspace
            </div>
            <h1 className="max-w-4xl text-[clamp(2.35rem,6vw,4.75rem)] font-semibold leading-[0.98] tracking-tight">
              {session.patientName}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              {formatSessionDate(session.scheduledAt)} · {session.patientEmail}
            </p>
          </div>
          <div className="self-end border-l border-border pl-6">
            <p className="text-sm text-muted-foreground">Status</p>
            <select
              className="mt-3 h-10 w-full border border-input bg-background px-3 text-sm"
              value={session.status}
              disabled={updatingStatus}
              onChange={(e) => changeStatus(e.target.value as SessionStatus)}
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No show</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-10 py-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)]">
        <form onSubmit={addNote} className="relative border-l border-border pl-5 md:pl-8">
          <div className="absolute left-0 top-0 h-16 w-px bg-emerald-300" />
          <label htmlFor="session-note" className="text-sm font-medium text-foreground">
            Session note
          </label>
          <textarea
            id="session-note"
            className="mt-3 min-h-72 w-full resize-y border-0 border-b border-border bg-transparent px-0 py-4 text-lg leading-8 outline-none placeholder:text-muted-foreground focus-visible:border-emerald-300"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Write the clinical facts, interventions, homework decisions, and patient language you want summarized."
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{session.notes.length} saved notes</p>
            <Button type="submit" className="gap-2 sm:w-auto" disabled={savingNote || !noteDraft.trim()}>
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {savingNote ? "Adding..." : "Add note"}
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          <Button
            type="button"
            className="w-full gap-2"
            onClick={generateSummary}
            disabled={generating || session.notes.length === 0}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {generating ? "Generating..." : "Generate summary"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {session.summary && (
            <div className="border-y border-border py-5">
              <p className="text-sm font-medium">Summary</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{session.summary.summary}</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-xs font-medium text-foreground">Key points</p>
                  <ul className="mt-2 grid gap-2 text-sm text-muted-foreground">
                    {session.summary.keyPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Next steps</p>
                  <ul className="mt-2 grid gap-2 text-sm text-muted-foreground">
                    {session.summary.nextSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-8 border-t border-border pt-10 lg:grid-cols-[12rem_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-xl font-semibold tracking-tight">Notes</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Summaries are generated from these therapist notes.
          </p>
        </div>
        {session.notes.length === 0 ? (
          <div className="border-y border-dashed border-border py-12">
            <p className="text-sm font-medium">No session notes yet</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Add at least one note before generating a summary.
            </p>
          </div>
        ) : (
          <ol className="border-y border-border">
            {session.notes.map((note) => (
              <li key={note.id} className="border-b border-border/70 py-5 last:border-b-0">
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{note.content}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
