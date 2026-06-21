"use client";
import { useEffect, useState } from "react";
import { Mail, MessagesSquare } from "lucide-react";
import { fetchSharedEntries, type SharedEntry } from "@/lib/notes-client";
import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/empty-state";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function TherapistNotesPage() {
  const [entries, setEntries] = useState<SharedEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSharedEntries()
      .then(setEntries)
      .catch(() => setError("Couldn't load shared reflections."));
  }, []);

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Shared reflections"
        sub="Journal entries your active patients chose to share. Read-only — this is their space."
      />

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {entries === null && !error && (
        <div className="grid gap-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      )}

      {entries && entries.length === 0 && (
        <EmptyState
          icon={<MessagesSquare size={18} strokeWidth={1.75} />}
          title="No shared reflections yet"
          hint="When an active patient shares a reflection, it appears here."
        />
      )}

      {entries && entries.length > 0 && (
        <div className="grid border-t border-border">
          {entries.map((e) => (
            <article key={e.id} className="grid gap-3 border-b border-border py-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="grid gap-0.5">
                  <span className="text-sm font-medium text-foreground">{e.patientName}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail size={12} aria-hidden /> {e.patientEmail}
                  </span>
                </div>
                <time className="text-xs text-muted-foreground" dateTime={e.sharedAt ?? e.createdAt}>
                  {formatDate(e.sharedAt ?? e.createdAt)}
                </time>
              </div>
              {e.title && <h2 className="text-lg leading-snug">{e.title}</h2>}
              <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{e.content}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
