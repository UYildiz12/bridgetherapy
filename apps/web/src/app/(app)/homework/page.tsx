"use client";
import Link from "next/link";
import { fetchMyHomework, type PatientAssignment } from "@/lib/homework/client";
import { useSwrLite } from "@/lib/swr-lite";
import { byAttention, patientHomeworkInfo, type PatientHomeworkInfo } from "@/lib/homework/attention";
import { formatDate } from "@/lib/format";
import { ClipboardList, Flame, MessageSquareText } from "lucide-react";
import { StatusBadge } from "@/components/homework/status-badge";
import { EmptyState } from "@/components/app/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/app/page-header";

function Chip({ tone, children }: { tone: "alert" | "info" | "quiet"; children: React.ReactNode }) {
  const cls =
    tone === "alert"
      ? "border-destructive/40 text-destructive"
      : tone === "info"
        ? "border-primary/40 text-primary"
        : "border-border text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      {children}
    </span>
  );
}

function progressLabel(info: PatientHomeworkInfo): string {
  if (!info.recurring) {
    return info.parts.total > 0 ? `${info.parts.done} of ${info.parts.total} parts` : "Nothing to fill in";
  }
  if (info.expected) return `${Math.min(info.entriesComplete, info.expected)} of ${info.expected} entries`;
  return `${info.entriesComplete} ${info.entriesComplete === 1 ? "entry" : "entries"} so far`;
}

function HomeworkCard({ a, info }: { a: PatientAssignment; info: PatientHomeworkInfo }) {
  const cadenceLabel =
    info.doc.schedule.cadence === "daily" ? "Daily" : info.doc.schedule.cadence === "weekly" ? "Weekly" : null;
  const showUnitChip = info.unit && !info.submitted && !info.revisionRequested;
  return (
    <Link href={`/homework/${a.id}`} className="group block no-underline">
      <Card className="transition-colors hover:border-foreground/30">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <CardTitle className="text-base">{a.set.title}</CardTitle>
              {a.set.description && <CardDescription>{a.set.description}</CardDescription>}
            </div>
            <StatusBadge status={a.status} />
          </div>
          {(info.revisionRequested || (info.submitted && info.hasFeedback) || showUnitChip || info.streak >= 2) && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {info.revisionRequested && (
                <Chip tone="alert">
                  <MessageSquareText size={12} aria-hidden /> Changes requested
                </Chip>
              )}
              {!info.revisionRequested && info.submitted && info.hasFeedback && (
                <Chip tone="info">
                  <MessageSquareText size={12} aria-hidden /> Feedback from your therapist
                </Chip>
              )}
              {showUnitChip && (
                <Chip tone={info.unit!.done ? "quiet" : "info"}>
                  {info.unit!.unit === "day"
                    ? info.unit!.done
                      ? "Today's entry done"
                      : "Today's entry open"
                    : info.unit!.done
                      ? "This week's entry done"
                      : "This week's entry open"}
                </Chip>
              )}
              {info.streak >= 2 && (
                <Chip tone="quiet">
                  <Flame size={12} aria-hidden /> {info.streak} days in a row
                </Chip>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="grid gap-2">
          {info.pct !== null && (
            <div className="h-1 overflow-hidden rounded-full bg-border" aria-hidden>
              <div
                className="h-full rounded-full bg-foreground/80 transition-all"
                style={{ width: `${info.pct}%` }}
              />
            </div>
          )}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {cadenceLabel ? `${cadenceLabel} · ` : ""}
              {progressLabel(info)}
              {a.dueDate && (
                <span className={info.overdue ? "text-destructive" : ""}>
                  {" "}
                  · due {formatDate(a.dueDate)}
                </span>
              )}
            </span>
            <span className="text-foreground transition-transform group-hover:translate-x-0.5" aria-hidden>
              →
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function HomeworkListPage() {
  const { data: items, error: loadError } = useSwrLite<PatientAssignment[]>(
    "my-homework",
    fetchMyHomework,
  );
  const error = items === null && loadError ? "Couldn't load your homework." : null;

  const withInfo = (items ?? [])
    .map((a) => ({ a, info: patientHomeworkInfo(a) }))
    .sort((x, y) => byAttention(x.info, y.info));
  // Revision requests are submitted but actionable, so they stay in "to do".
  const todo = withInfo.filter(({ info }) => !info.submitted || info.revisionRequested);
  const done = withInfo.filter(({ info }) => info.submitted && !info.revisionRequested);

  return (
    <div className="grid gap-6">
      <PageHeader title="Homework" sub="Sets your therapist assigned, and where you are on each." />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {items === null && !error && (
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {items && items.length === 0 && (
        <EmptyState
          icon={<ClipboardList size={18} strokeWidth={1.75} />}
          title="No homework yet"
          hint="Sets your therapist assigns will show up here."
        />
      )}

      {todo.length > 0 && (
        <section className="grid gap-3" aria-label="To do">
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">To do</h2>
          {todo.map(({ a, info }) => (
            <HomeworkCard key={a.id} a={a} info={info} />
          ))}
        </section>
      )}

      {done.length > 0 && (
        <section className="grid gap-3" aria-label="Submitted">
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Submitted</h2>
          {done.map(({ a, info }) => (
            <HomeworkCard key={a.id} a={a} info={info} />
          ))}
        </section>
      )}
    </div>
  );
}
