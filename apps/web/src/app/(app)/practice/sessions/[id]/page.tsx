"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, ExternalLink, FileText, History, Sparkles, Video } from "lucide-react";
import { JitsiMeeting } from "@/components/sessions/jitsi-meeting";
import { SessionWhiteboard, type WhiteboardSaveResult } from "@/components/sessions/session-whiteboard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAccountSettings, type AccountSettings } from "@/lib/settings-client";
import {
  addSessionNote,
  ensureSessionVideo,
  fetchSession,
  fetchTherapistSessionWorkspace,
  generateSessionSummary,
  isConflictError,
  updateSession,
  updateTherapistSessionWorkspace,
  type SessionDetail,
  type SessionNote,
  type SessionStatus,
  type SessionSummary,
  type SessionWorkspace,
  type WhiteboardState,
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
  const [account, setAccount] = useState<AccountSettings | null>(null);
  const [accountReady, setAccountReady] = useState(false);
  const [workspace, setWorkspace] = useState<SessionWorkspace | null>(null);
  const [workspaceNoteDraft, setWorkspaceNoteDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [creatingVideo, setCreatingVideo] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchSession(sessionId), fetchTherapistSessionWorkspace(sessionId)])
      .then(([sessionData, workspaceData]) => {
        setSession(sessionData);
        setWorkspace(workspaceData);
        setWorkspaceNoteDraft(workspaceData.patientNote);
      })
      .catch(() => setError("Couldn't load that session."));
  }, [sessionId]);

  // The embedded call needs the signed-in therapist's own identity — never the
  // patient's — so fetch it separately and fall back to a neutral label.
  useEffect(() => {
    fetchAccountSettings()
      .then(setAccount)
      .catch(() => {})
      .finally(() => setAccountReady(true));
  }, []);

  const therapistDisplayName = account
    ? [account.firstName, account.lastName].filter(Boolean).join(" ").trim() || account.email
    : "Therapist";

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

  async function createVideoRoom() {
    setCreatingVideo(true);
    setError(null);
    try {
      const updated = await ensureSessionVideo(sessionId);
      setSession((prev) => (prev ? { ...updated, history: updated.history?.length ? updated.history : prev.history } : updated));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the video room.");
    } finally {
      setCreatingVideo(false);
    }
  }

  async function saveWorkspaceNote() {
    setSavingWorkspace(true);
    setError(null);
    try {
      const updated = await updateTherapistSessionWorkspace(sessionId, { patientNote: workspaceNoteDraft });
      setWorkspace(updated);
      setWorkspaceNoteDraft(updated.patientNote);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the workspace note.");
    } finally {
      setSavingWorkspace(false);
    }
  }

  async function saveWhiteboard(whiteboard: WhiteboardState, baseUpdatedAt: string | null): Promise<WhiteboardSaveResult> {
    setSavingWorkspace(true);
    setError(null);
    try {
      const updated = await updateTherapistSessionWorkspace(sessionId, { whiteboard, baseUpdatedAt });
      setWorkspace(updated);
      return { ok: true, updatedAt: updated.updatedAt };
    } catch (err) {
      if (isConflictError(err)) {
        // The patient saved first; hand the fresh board back so the canvas
        // can quietly merge and retry instead of overwriting their strokes.
        try {
          const fresh = await fetchTherapistSessionWorkspace(sessionId);
          return { ok: false, conflict: { whiteboard: fresh.whiteboard, updatedAt: fresh.updatedAt } };
        } catch {
          // fall through to the generic error
        }
      }
      setError(err instanceof Error ? err.message : "Couldn't save the whiteboard.");
      return { ok: false };
    } finally {
      setSavingWorkspace(false);
    }
  }

  async function changeStatus(status: SessionStatus) {
    setUpdatingStatus(true);
    setError(null);
    try {
      const updated = await updateSession(sessionId, { status });
      setSession((prev) => (prev ? { ...updated, history: updated.history?.length ? updated.history : prev.history } : updated));
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
              {formatSessionDate(session.scheduledAt)} - {session.patientEmail}
            </p>
          </div>
          <div className="self-end lg:border-l lg:border-border lg:pl-6">
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

      <section className="grid gap-6 border-b border-border py-8 lg:grid-cols-[12rem_1fr]">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            <Video className="size-4" aria-hidden="true" />
            Video room
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Free Jitsi room for this session. Use only when that setup is appropriate for the appointment.
          </p>
        </div>
        {session.videoUrl && session.videoRoomId ? (
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Room ready</p>
                <p className="mt-1 text-sm text-muted-foreground">Shareable room ID: {session.videoRoomId}</p>
              </div>
              <Button asChild className="w-full gap-2 sm:w-auto">
                <a href={session.videoUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" aria-hidden="true" />
                  Join video
                </a>
              </Button>
            </div>
            <div className="hidden lg:block">
              {accountReady ? (
                <JitsiMeeting
                  roomId={session.videoRoomId}
                  displayName={therapistDisplayName}
                  email={account?.email ?? ""}
                />
              ) : (
                <Skeleton className="h-72 w-full rounded-xl" />
              )}
            </div>
          </div>
        ) : (
          <div className="border-y border-dashed border-border py-8">
            <p className="text-sm font-medium">No video room yet</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Create a free room for this session. New scheduled sessions get one automatically.
            </p>
            <Button type="button" className="mt-5 gap-2" onClick={createVideoRoom} disabled={creatingVideo}>
              <Video className="size-4" aria-hidden="true" />
              {creatingVideo ? "Creating..." : "Create free video room"}
            </Button>
          </div>
        )}
      </section>

      <section className="grid gap-6 border-b border-border py-8 lg:grid-cols-[12rem_1fr]">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            <FileText className="size-4" aria-hidden="true" />
            Shared workspace
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Patient-visible session note and whiteboard for agenda setting, diagrams, and homework planning.
          </p>
        </div>
        <div className="grid gap-5">
          <div className="grid gap-2">
            <label htmlFor="patient-session-note" className="text-sm font-medium">
              Patient session note
            </label>
            <textarea
              id="patient-session-note"
              aria-label="Patient session note"
              className="min-h-28 w-full resize-y border border-input bg-background p-3 text-sm leading-6"
              value={workspaceNoteDraft}
              onChange={(e) => setWorkspaceNoteDraft(e.target.value)}
              placeholder="Keep a patient-visible agenda note or between-session reminder here."
            />
            <Button
              type="button"
              className="w-fit gap-2"
              onClick={saveWorkspaceNote}
              disabled={savingWorkspace}
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Save workspace note
            </Button>
          </div>
          <SessionWhiteboard
            value={workspace?.whiteboard ?? { strokes: [] }}
            updatedAt={workspace?.updatedAt ?? null}
            onSave={saveWhiteboard}
          />
        </div>
      </section>

      {session.history.length > 0 && (
        <section className="grid gap-6 border-b border-border py-8 lg:grid-cols-[12rem_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-medium">
              <History className="size-4" aria-hidden="true" />
              Previous sessions
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Quick context from earlier sessions with this patient.
            </p>
          </div>
          <div className="border-y border-border">
            {session.history.map((previous) => (
              <article key={previous.id} className="border-b border-border/70 py-4 last:border-b-0">
                <p className="text-sm font-medium">
                  {formatSessionDate(previous.scheduledAt)} - {previous.status.replaceAll("_", " ").toLowerCase()}
                </p>
                {previous.summary ? (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{previous.summary.summary}</p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {previous.notes[0]?.content ?? "No previous notes captured."}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

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
