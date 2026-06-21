"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAssignments, type TherapistAssignment } from "@/lib/homework/client";
import { StatusBadge } from "@/components/homework/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";

export default function AssignmentsPage() {
  const [items, setItems] = useState<TherapistAssignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignments()
      .then(setItems)
      .catch(() => setError("Couldn't load assignments."));
  }, []);

  return (
    <div className="grid gap-6">
      <PageHeader title="Assignments" sub="Track and review what you have assigned." />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {items === null && !error && <Skeleton className="h-24 w-full rounded-xl" />}
      {items && items.length === 0 && (
        <EmptyState
          icon={<Inbox size={18} strokeWidth={1.75} />}
          title="No assignments yet"
          hint="Assign a set from the Sets tab to see progress and submissions here."
        />
      )}
      {items && items.length > 0 && (
        <div className="grid gap-3">
          {items.map((a) => (
            <Link
              key={a.id}
              href={`/practice/assignments/${a.id}`}
              className="group block no-underline"
            >
              <Card className="transition-colors hover:border-foreground/30">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <CardTitle className="text-base">{a.set.title}</CardTitle>
                      <span className="text-sm text-muted-foreground">{a.patient.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.reviewedAt && <span className="text-xs text-foreground">Reviewed</span>}
                      <StatusBadge status={a.status} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {a.completedCount} of {a.itemCount} done
                    {a.dueDate ? ` · due ${new Date(a.dueDate).toLocaleDateString()}` : ""}
                  </span>
                  <span
                    className="text-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  >
                    →
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
