"use client";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Video } from "lucide-react";
import { SessionWhiteboard } from "@/components/sessions/session-whiteboard";
import { Button } from "@/components/ui/button";
import {
  fetchPatientSessionWorkspace,
  fetchPatientSessions,
  updatePatientSessionWorkspace,
  type PatientSessionItem,
  type SessionWorkspace,
  type WhiteboardState,
} from "@/lib/sessions-client";

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export default function PatientSessionsPage() {
  const [sessions, setSessions] = useState<PatientSessionItem[] | null>(null);
  const [workspaces, setWorkspaces] = useState<Record<string, SessionWorkspace>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingWorkspace, setSavingWorkspace] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatientSessions()
      .then(async (sessionData) => {
        setSessions(sessionData);
        const loaded = await Promise.all(
          sessionData.map((session) =>
            fetchPatientSessionWorkspace(session.id)
              .then((workspace) => [session.id, workspace] as const)
              .catch(() => null),
          ),
        );
        const workspaceMap = Object.fromEntries(loaded.filter(Boolean) as [string, SessionWorkspace][]);
        setWorkspaces(workspaceMap);
        setNoteDrafts(
          Object.fromEntries(Object.entries(workspaceMap).map(([id, workspace]) => [id, workspace.patientNote])),
        );
      })
      .catch(() => setError("Couldn't load sessions."));
  }, []);

  const nextSession = useMemo(
    () =>
      sessions
        ?.filter((session) => session.status === "SCHEDULED" || session.status === "IN_PROGRESS")
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0],
    [sessions],
  );

  async function saveNote(sessionId: string) {
    setSavingWorkspace((prev) => ({ ...prev, [sessionId]: true }));
    setError(null);
    try {
      const updated = await updatePatientSessionWorkspace(sessionId, {
        patientNote: noteDrafts[sessionId] ?? "",
      });
      setWorkspaces((prev) => ({ ...prev, [sessionId]: updated }));
      setNoteDrafts((prev) => ({ ...prev, [sessionId]: updated.patientNote }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that session note.");
    } finally {
      setSavingWorkspace((prev) => ({ ...prev, [sessionId]: false }));
    }
  }

  async function saveWhiteboard(sessionId: string, whiteboard: WhiteboardState) {
    setSavingWorkspace((prev) => ({ ...prev, [sessionId]: true }));
    setError(null);
    try {
      const updated = await updatePatientSessionWorkspace(sessionId, { whiteboard });
      setWorkspaces((prev) => ({ ...prev, [sessionId]: updated }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that whiteboard.");
    } finally {
      setSavingWorkspace((prev) => ({ ...prev, [sessionId]: false }));
    }
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <section className="border-y border-border py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" aria-hidden="true" />
              Care calendar
            </div>
            <h1 className="max-w-4xl text-[clamp(2.35rem,6vw,4.75rem)] font-semibold leading-[0.98] tracking-tight">
              Sessions
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Join scheduled video sessions and keep track of your care appointments.
            </p>
          </div>
          <div className="self-end lg:border-l lg:border-border lg:pl-6">
            <p className="text-sm text-muted-foreground">Next session</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              {nextSession ? formatSessionDate(nextSession.scheduledAt) : "None scheduled"}
            </p>
          </div>
        </div>
      </section>

      <section className="py-10">
        {sessions === null && !error && (
          <div className="grid gap-4 border-y border-border py-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-20 animate-pulse bg-foreground/10" />
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {sessions && sessions.length === 0 && (
          <div className="border-y border-dashed border-border py-12">
            <p className="text-sm font-medium">No sessions scheduled</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Sessions your therapist schedules will show up here.
            </p>
          </div>
        )}

        {sessions && sessions.length > 0 && (
          <div className="border-y border-border">
            {sessions.map((session) => (
              <article
                key={session.id}
                className="grid gap-5 border-b border-border/70 py-5 last:border-b-0 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-medium text-foreground">{formatSessionDate(session.scheduledAt)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{statusLabel(session.status)}</p>
                </div>
                {session.videoUrl ? (
                  <Button asChild className="w-full gap-2 md:w-auto">
                    <a href={session.videoUrl} target="_blank" rel="noreferrer">
                      <Video className="size-4" aria-hidden="true" />
                      Join video
                    </a>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">Video room not ready yet</p>
                )}
                <div className="grid gap-5 md:col-span-2">
                  {session.summary && (
                    <div className="border-y border-border py-4">
                      <p className="text-sm font-medium">Post-session summary</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{session.summary.summary}</p>
                    </div>
                  )}
                  <div className="grid gap-4 border-t border-border pt-4">
                    <div className="grid gap-2">
                      <label htmlFor={`patient-session-note-${session.id}`} className="text-sm font-medium">
                        Patient session note
                      </label>
                      <textarea
                        id={`patient-session-note-${session.id}`}
                        aria-label="Patient session note"
                        className="min-h-28 w-full resize-y border border-input bg-background p-3 text-sm leading-6"
                        value={noteDrafts[session.id] ?? ""}
                        onChange={(e) =>
                          setNoteDrafts((prev) => ({ ...prev, [session.id]: e.target.value }))
                        }
                        placeholder="Add what you want to remember before or after this session."
                      />
                      <Button
                        type="button"
                        className="w-fit gap-2"
                        onClick={() => saveNote(session.id)}
                        disabled={Boolean(savingWorkspace[session.id])}
                      >
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        Save session note
                      </Button>
                    </div>
                    <SessionWhiteboard
                      value={workspaces[session.id]?.whiteboard ?? { strokes: [] }}
                      onSave={(whiteboard) => saveWhiteboard(session.id, whiteboard)}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
