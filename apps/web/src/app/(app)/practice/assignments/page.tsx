"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchAssignments, type TherapistAssignment } from "@/lib/homework/client";
import { formatDate } from "@/lib/format";
import {
  REVIEW_BUCKET_LABELS,
  REVIEW_BUCKET_ORDER,
  reviewBucket,
  type ReviewBucket,
} from "@/lib/homework/attention";
import { StatusBadge } from "@/components/homework/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { SubNav } from "@/components/app/sub-nav";

const BUCKET_HINTS: Record<ReviewBucket, string> = {
  "needs-review": "Submitted and waiting on you.",
  "changes-requested": "Waiting on the patient to revise.",
  "in-progress": "Being worked on.",
  "not-started": "Assigned, not opened yet.",
  reviewed: "Reviewed and closed out.",
};

function AssignmentCard({ a }: { a: TherapistAssignment }) {
  const pct = a.itemCount > 0 ? Math.round((Math.min(a.completedCount, a.itemCount) / a.itemCount) * 100) : 0;
  return (
    <Link href={`/practice/assignments/${a.id}`} className="group block no-underline">
      <Card className="transition-colors hover:border-foreground/30">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <CardTitle className="text-base">{a.set.title}</CardTitle>
              <span className="text-sm text-muted-foreground">{a.patient.name}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {a.revisionRequestedAt && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  <MessageSquareText size={12} aria-hidden /> Awaiting changes
                </span>
              )}
              <StatusBadge status={a.status} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          <div className="h-1 overflow-hidden rounded-full bg-border" aria-hidden>
            <div className="h-full rounded-full bg-foreground/80 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {a.completedCount} of {a.itemCount} done
              {a.dueDate && (
                <span className={a.status === "OVERDUE" ? "text-destructive" : ""}>
                  {" "}
                  · due {formatDate(a.dueDate)}
                </span>
              )}
              {a.completedAt && ` · submitted ${formatDate(a.completedAt)}`}
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

export default function AssignmentsPage() {
  const [items, setItems] = useState<TherapistAssignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [patientFilter, setPatientFilter] = useState<string>("all");

  useEffect(() => {
    fetchAssignments()
      .then(setItems)
      .catch(() => setError("Couldn't load assignments."));
  }, []);

  const patients = useMemo(() => {
    const seen = new Map<string, string>();
    for (const a of items ?? []) seen.set(a.patient.patientId, a.patient.name);
    return [...seen.entries()].sort((x, y) => x[1].localeCompare(y[1]));
  }, [items]);

  const filtered = useMemo(
    () => (items ?? []).filter((a) => patientFilter === "all" || a.patient.patientId === patientFilter),
    [items, patientFilter],
  );

  const buckets = useMemo(() => {
    const byBucket = new Map<ReviewBucket, TherapistAssignment[]>();
    for (const a of filtered) {
      const b = reviewBucket(a);
      byBucket.set(b, [...(byBucket.get(b) ?? []), a]);
    }
    // Oldest submission first where the therapist owes a review; overdue first
    // while work is still open.
    byBucket
      .get("needs-review")
      ?.sort((x, y) => new Date(x.completedAt ?? 0).getTime() - new Date(y.completedAt ?? 0).getTime());
    byBucket.get("in-progress")?.sort((x, y) => Number(y.status === "OVERDUE") - Number(x.status === "OVERDUE"));
    return byBucket;
  }, [filtered]);

  const needsAttention = (buckets.get("needs-review")?.length ?? 0) + (buckets.get("changes-requested")?.length ?? 0);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Homework"
        sub={
          items && items.length > 0
            ? needsAttention > 0
              ? `${needsAttention} assignment${needsAttention === 1 ? "" : "s"} waiting on a review or a revision.`
              : "Everything assigned is either moving or reviewed."
            : "Track and review what you have assigned."
        }
      />
      <SubNav
        links={[
          { href: "/practice/homework", label: "Sets" },
          { href: "/practice/assignments", label: "Assignments" },
        ]}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {items === null && !error && <Skeleton className="h-24 w-full rounded-xl" />}
      {items && items.length === 0 && (
        <EmptyState
          icon={<Inbox size={18} strokeWidth={1.75} />}
          title="No assignments yet"
          hint="Assign a set from the Sets tab to see progress and submissions here."
        />
      )}

      {items && items.length > 0 && patients.length > 1 && (
        <div className="flex items-center gap-2">
          <label htmlFor="patient-filter" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Patient
          </label>
          <select
            id="patient-filter"
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="all" className="bg-background">
              All patients
            </option>
            {patients.map(([id, name]) => (
              <option key={id} value={id} className="bg-background">
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {items && items.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No assignments for this patient yet.</p>
      )}

      {REVIEW_BUCKET_ORDER.map((bucket) => {
        const list = buckets.get(bucket);
        if (!list || list.length === 0) return null;
        return (
          <section key={bucket} className="grid gap-3" aria-label={REVIEW_BUCKET_LABELS[bucket]}>
            <div className="flex items-baseline gap-2">
              <h2 className="text-xs uppercase tracking-[0.18em] text-foreground">
                {REVIEW_BUCKET_LABELS[bucket]} · {list.length}
              </h2>
              <span className="text-xs text-muted-foreground">{BUCKET_HINTS[bucket]}</span>
            </div>
            {list.map((a) => (
              <AssignmentCard key={a.id} a={a} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
