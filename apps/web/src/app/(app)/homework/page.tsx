"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMyHomework, type PatientAssignment } from "@/lib/homework/client";
import { countComplete } from "@/lib/homework/schema";
import { ClipboardList } from "lucide-react";
import { StatusBadge } from "@/components/homework/status-badge";
import { EmptyState } from "@/components/app/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/app/page-header";

export default function HomeworkListPage() {
  const [items, setItems] = useState<PatientAssignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyHomework()
      .then(setItems)
      .catch(() => setError("Couldn't load your homework."));
  }, []);

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

      {items && items.length > 0 && (
        <div className="grid gap-3">
          {items.map((a) => {
            const total = a.set.content.items.length;
            const done = countComplete(a.set.content, a.response);
            return (
              <Link key={a.id} href={`/homework/${a.id}`} className="group block no-underline">
                <Card className="transition-colors hover:border-foreground/30">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid gap-1">
                        <CardTitle className="text-base">{a.set.title}</CardTitle>
                        {a.set.description && <CardDescription>{a.set.description}</CardDescription>}
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {done} of {total} done
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
            );
          })}
        </div>
      )}
    </div>
  );
}
