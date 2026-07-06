"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { fetchReviewDetail, reviewAssignment, type ReviewDetail } from "@/lib/homework/client";
import { parseContent, parseResponse } from "@/lib/homework/schema";
import { docSchema, type HomeworkDoc } from "@/lib/homework/blocks";
import { parseResponseDoc } from "@/lib/homework/adapt";
import { choiceScore, isEntryComplete, isScoredDoc, maxChoiceScore } from "@/lib/homework/completion";
import { BlockView } from "@/components/homework/block-view";
import { ItemReview } from "@/components/homework/item-review";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/homework/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const SERIF = { fontFamily: "var(--font-instrument-serif), serif" } as const;
const areaCls =
  "min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function entryLabel(date: string): string {
  if (date === "1970-01-01") return "Submission";
  return formatDate(new Date(`${date}T00:00:00`));
}

/** Hairline score trend across entries, in the blueprint idiom. */
function Sparkline({ values, max }: { values: number[]; max: number }) {
  const w = 132;
  const h = 30;
  const pad = 3;
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1);
  const y = (v: number) => h - pad - (max > 0 ? (Math.min(v, max) / max) * (h - pad * 2) : 0);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-foreground/70" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(values.at(-1) ?? 0)} r="2.2" fill="currentColor" />
    </svg>
  );
}

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [feedback, setFeedback] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [revisionAt, setRevisionAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchReviewDetail(id)
      .then((d) => {
        setDetail(d);
        const rd = parseResponseDoc(d.set.content, d.response);
        setFeedback(rd.feedback ?? "");
        setComments(rd.comments ?? {});
        setRevisionAt(rd.revisionRequestedAt ?? null);
      })
      .catch(() => setLoadError("Couldn't load this submission."));
  }, [id]);

  const v2 = useMemo(
    () => (detail ? docSchema.safeParse(detail.set.content) : null),
    [detail],
  );

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

  const { set, patientName, assignment } = detail;

  async function save(requestRevision = false) {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await reviewAssignment(id, {
        feedback: feedback || undefined,
        comments: Object.keys(comments).length > 0 ? comments : undefined,
        requestRevision: requestRevision || undefined,
      });
      setSavedAt(new Date().toLocaleTimeString());
      if (requestRevision) setRevisionAt(new Date().toISOString());
      setDetail((d) => (d ? { ...d, assignment: { ...d.assignment, reviewedAt: res.reviewedAt } } : d));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't save the review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/practice/assignments" className="text-sm text-muted-foreground hover:text-foreground">
          ← Assignments
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl">{set.title}</h1>
            <p className="text-sm text-muted-foreground">{patientName}</p>
          </div>
          <StatusBadge status={assignment.status} />
        </div>
      </div>

      {v2?.success ? (
        <V2Review
          doc={v2.data}
          rawContent={set.content}
          rawResponse={detail.response}
          comments={comments}
          onComment={(blockId, text) =>
            setComments((prev) => {
              const next = { ...prev };
              if (text.trim()) next[blockId] = text;
              else delete next[blockId];
              return next;
            })
          }
        />
      ) : (
        <div className="grid gap-4">
          {parseContent(set.content).items.map((item) => (
            <ItemReview key={item.id} item={item} response={parseResponse(detail.response).items[item.id]} />
          ))}
        </div>
      )}

      <div className="grid gap-2 border-t border-border pt-5">
        <Label htmlFor="fb">Overall feedback</Label>
        <textarea
          id="fb"
          className={areaCls}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Share encouragement or next steps…"
        />
        {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => save(false)} disabled={saving}>
            {saving ? "Saving…" : assignment.reviewedAt ? "Update review" : "Send review"}
          </Button>
          {v2?.success && (
            <Button variant="outline" onClick={() => save(true)} disabled={saving}>
              Request changes
            </Button>
          )}
          {revisionAt && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquareText size={12} aria-hidden /> Changes requested · waiting on{" "}
              {patientName.split(" ")[0]}
            </span>
          )}
          {savedAt && <span className="text-xs text-muted-foreground">Saved at {savedAt}</span>}
        </div>
      </div>
    </div>
  );
}

function V2Review({
  doc,
  rawContent,
  rawResponse,
  comments,
  onComment,
}: {
  doc: HomeworkDoc;
  rawContent: unknown;
  rawResponse: unknown;
  comments: Record<string, string>;
  onComment: (blockId: string, text: string) => void;
}) {
  const rd = useMemo(() => parseResponseDoc(rawContent, rawResponse), [rawContent, rawResponse]);
  const scored = isScoredDoc(doc);
  const scoreMax = maxChoiceScore(doc);
  const [activeIdx, setActiveIdx] = useState(() => Math.max(0, rd.entries.length - 1));
  const entry = rd.entries[activeIdx];

  if (rd.entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing submitted yet.</p>;
  }

  return (
    <div className="grid gap-4">
      {rd.entries.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Entries">
          {rd.entries.map((e, i) => {
            const complete = isEntryComplete(doc, e);
            const active = i === activeIdx;
            return (
              <button
                key={e.id}
                type="button"
                role="tab"
                aria-selected={active}
                title={complete ? "Entry complete" : "Entry incomplete"}
                onClick={() => setActiveIdx(i)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                <span
                  aria-hidden
                  className={`size-1.5 rounded-full ${
                    complete ? (active ? "bg-background" : "bg-foreground") : "border border-current"
                  }`}
                />
                {entryLabel(e.date)}
                {scored && <span className="tabular-nums opacity-70">· {choiceScore(doc, e)}</span>}
              </button>
            );
          })}
        </div>
      )}

      {scored && entry && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Score for this entry:{" "}
            <span className="text-xl leading-none tabular-nums text-foreground" style={SERIF}>
              {choiceScore(doc, entry)}
            </span>
            {scoreMax > 0 && <span className="tabular-nums"> of {scoreMax}</span>}
          </p>
          {rd.entries.length > 1 && (
            <div className="grid justify-items-end gap-0.5">
              <Sparkline values={rd.entries.map((e) => choiceScore(doc, e))} max={scoreMax} />
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Trend across entries
              </span>
            </div>
          )}
        </div>
      )}

      {entry && (
        <div className="grid max-w-2xl gap-6">
          {doc.blocks.map((block) => (
            <div key={block.id} className="grid gap-2">
              <BlockView block={block} response={entry.blocks[block.id]} onChange={() => {}} readOnly />
              {block.type.startsWith("input.") && (
                <input
                  value={comments[block.id] ?? ""}
                  onChange={(e) => onComment(block.id, e.target.value)}
                  placeholder="Comment on this part (optional)"
                  aria-label={`Comment on ${"label" in block ? block.label || block.type : block.type}`}
                  className="h-9 w-full rounded-md border border-input/60 bg-transparent px-3 text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:text-foreground"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
