"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { fetchMyAssignment, saveMyResponse, type PatientAssignment } from "@/lib/homework/client";
import { countComplete, isSetComplete, type ItemResponse } from "@/lib/homework/schema";
import { ItemDo } from "@/components/homework/item-do";
import { StatusBadge } from "@/components/homework/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeworkDoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [assignment, setAssignment] = useState<PatientAssignment | null>(null);
  const [responses, setResponses] = useState<Record<string, ItemResponse>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchMyAssignment(id)
      .then((res) => {
        setAssignment(res);
        setResponses(res.response.items ?? {});
      })
      .catch(() => setError("Couldn't load this homework."));
  }, [id]);

  const update = useCallback((itemId: string, r: ItemResponse) => {
    setResponses((prev) => ({ ...prev, [itemId]: r }));
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!assignment) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const content = assignment.set.content;
  const total = content.items.length;
  const done = countComplete(content, { items: responses });
  const allDone = isSetComplete(content, { items: responses });
  const pct = total ? Math.round((done / total) * 100) : 0;

  const persist = async (submit: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await saveMyResponse(id, { items: responses, submit });
      setAssignment(updated);
      setResponses(updated.response.items ?? {});
      setSavedAt(new Date().toLocaleTimeString());
      if (submit) router.push("/homework");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/homework" className="text-sm text-muted-foreground hover:text-foreground">
          ← Homework
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{assignment.set.title}</h1>
            {assignment.set.description && (
              <p className="text-sm text-muted-foreground">{assignment.set.description}</p>
            )}
          </div>
          <StatusBadge status={assignment.status} />
        </div>
        <div className="mt-3 grid gap-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">
            {done} of {total} done
          </span>
        </div>
      </div>

      {assignment.response.reviewedAt && assignment.response.feedback && (
        <Card className="border-primary/30">
          <CardContent className="grid gap-1 pt-6">
            <span className="text-xs uppercase tracking-wide text-primary">Therapist feedback</span>
            <p className="text-sm text-foreground/90">{assignment.response.feedback}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {content.items.map((item) => (
          <ItemDo
            key={item.id}
            item={item}
            response={responses[item.id] ?? { done: false }}
            onChange={(r) => update(item.id, r)}
          />
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => persist(false)} disabled={saving}>
          {saving ? "Saving…" : "Save progress"}
        </Button>
        <Button onClick={() => persist(true)} disabled={saving || !allDone}>
          {assignment.status === "COMPLETED" ? "Update submission" : "Submit"}
        </Button>
        {savedAt && <span className="text-xs text-muted-foreground">Saved at {savedAt}</span>}
        {!allDone && <span className="text-xs text-muted-foreground">Finish every item to submit</span>}
      </div>
    </div>
  );
}
