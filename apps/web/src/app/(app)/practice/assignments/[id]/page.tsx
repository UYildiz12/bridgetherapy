"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchReviewDetail, reviewAssignment, type ReviewDetail } from "@/lib/homework/client";
import { ItemReview } from "@/components/homework/item-review";
import { StatusBadge } from "@/components/homework/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchReviewDetail(id)
      .then((d) => {
        setDetail(d);
        setFeedback(d.response.feedback ?? "");
      })
      .catch(() => setLoadError("Couldn't load this submission."));
  }, [id]);

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;
  if (!detail) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const { set, response, patientName, assignment } = detail;

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await reviewAssignment(id, feedback);
      setSavedAt(new Date().toLocaleTimeString());
      setDetail((d) =>
        d
          ? {
              ...d,
              response: { ...d.response, feedback, reviewedAt: res.reviewedAt },
              assignment: { ...d.assignment, reviewedAt: res.reviewedAt },
            }
          : d,
      );
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't save feedback.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/practice/assignments"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Assignments
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{set.title}</h1>
            <p className="text-sm text-muted-foreground">{patientName}</p>
          </div>
          <StatusBadge status={assignment.status} />
        </div>
      </div>

      <div className="grid gap-4">
        {set.content.items.map((item) => (
          <ItemReview key={item.id} item={item} response={response.items[item.id]} />
        ))}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="fb">Feedback</Label>
        <textarea
          id="fb"
          className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Share encouragement or next steps…"
        />
        {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : response.reviewedAt ? "Update feedback" : "Send feedback"}
          </Button>
          {savedAt && <span className="text-xs text-muted-foreground">Saved at {savedAt}</span>}
        </div>
      </div>
    </div>
  );
}
