"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPatients, type LinkedPatient } from "@/lib/homework/client";
import { createSession, fetchSessions, type SessionListItem } from "@/lib/sessions-client";

function localInputToIso(value: string) {
  return value.length === 16 ? `${value}:00.000Z` : new Date(value).toISOString();
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function TherapistSessionsPage() {
  const [sessions, setSessions] = useState<SessionListItem[] | null>(null);
  const [patients, setPatients] = useState<LinkedPatient[] | null>(null);
  const [patientId, setPatientId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchSessions(), fetchPatients()])
      .then(([sessionData, patientData]) => {
        setSessions(sessionData);
        setPatients(patientData);
        setPatientId(patientData[0]?.patientId ?? "");
      })
      .catch(() => setError("Couldn't load sessions."));
  }, []);

  const upcomingCount = useMemo(
    () => sessions?.filter((session) => session.status === "SCHEDULED" || session.status === "IN_PROGRESS").length ?? 0,
    [sessions],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!patientId || !scheduledAt) return;
    setSaving(true);
    setError(null);
    try {
      const session = await createSession({ patientId, scheduledAt: localInputToIso(scheduledAt) });
      setSessions((prev) => [session, ...(prev ?? [])]);
      setScheduledAt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't schedule that session.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <section className="border-y border-border py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" aria-hidden="true" />
              Practice calendar
            </div>
            <h1 className="max-w-4xl text-[clamp(2.35rem,6vw,4.75rem)] font-semibold leading-[0.98] tracking-tight">
              Sessions
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Schedule patient sessions, write therapist notes, and generate concise summaries.
            </p>
          </div>
          <div className="self-end lg:border-l lg:border-border lg:pl-6">
            <p className="text-5xl font-semibold tracking-tight">{upcomingCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Upcoming or active</p>
          </div>
        </div>
      </section>

      <section className="grid gap-10 py-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
        <form onSubmit={submit} className="relative border-l border-border pl-5 md:pl-8">
          <div className="absolute left-0 top-0 h-16 w-px bg-emerald-300" />
          <div className="grid gap-5">
            <div className="grid gap-3">
              <label htmlFor="patientId" className="text-sm font-medium">
                Patient
              </label>
              <select
                id="patientId"
                className="h-10 border border-input bg-background px-3 text-sm"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
              >
                {(patients ?? []).map((patient) => (
                  <option key={patient.patientId} value={patient.patientId}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3">
              <label htmlFor="scheduledAt" className="text-sm font-medium">
                Scheduled time
              </label>
              <input
                id="scheduledAt"
                type="datetime-local"
                className="h-10 border border-input bg-background px-3 text-sm"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-fit gap-2" disabled={saving || !patientId || !scheduledAt}>
              <CalendarDays className="size-4" aria-hidden="true" />
              {saving ? "Scheduling..." : "Schedule session"}
            </Button>
          </div>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </form>

        <div>
          {sessions === null && !error && (
            <div className="grid gap-4 border-y border-border py-4">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-16 animate-pulse bg-foreground/10" />
              ))}
            </div>
          )}

          {sessions && sessions.length === 0 && (
            <div className="border-y border-dashed border-border py-12">
              <p className="text-sm font-medium">No sessions scheduled</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Use the planner to create the next patient session.
              </p>
            </div>
          )}

          {sessions && sessions.length > 0 && (
            <div className="border-y border-border">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/practice/sessions/${session.id}`}
                  className="grid gap-4 border-b border-border/70 py-5 text-left no-underline last:border-b-0 md:grid-cols-[1fr_auto]"
                >
                  <span>
                    <span className="block font-medium text-foreground">{session.patientName}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {formatSessionDate(session.scheduledAt)} · {session.status.replaceAll("_", " ").toLowerCase()}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="size-4" aria-hidden="true" />
                    {session.noteCount} notes{session.hasSummary ? " · summary ready" : ""}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
