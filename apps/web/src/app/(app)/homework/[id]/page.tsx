"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import {
  fetchMyAssignment,
  saveMyEntry,
  saveMyResponse,
  type PatientAssignment,
} from "@/lib/homework/client";
import {
  countComplete,
  isSetComplete,
  parseContent,
  parseResponse,
  setContentSchema,
  type ItemResponse,
} from "@/lib/homework/schema";
import { docSchema, type BlockResponse, type HomeworkDoc } from "@/lib/homework/blocks";
import { parseResponseDoc } from "@/lib/homework/adapt";
import { docProgress, expectedEntries, isDocComplete, isEntryComplete } from "@/lib/homework/completion";
import { BlockView } from "@/components/homework/block-view";
import { ItemDo } from "@/components/homework/item-do";
import { StatusBadge } from "@/components/homework/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Local-time YYYY-MM-DD, since entries are dated in the patient's day. */
function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function chipLabel(date: string, cadence: "daily" | "weekly"): string {
  const d = new Date(`${date}T00:00:00`);
  const label = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d);
  return cadence === "weekly" ? `Week of ${label}` : label;
}

/** The dates a patient can hold entries for: assignment start through today (capped at due). */
function entryDates(doc: HomeworkDoc, createdAt: Date, dueDate: Date | null): string[] {
  const out: string[] = [];
  const end = new Date(Math.min(Date.now(), dueDate ? dueDate.getTime() + 86_399_000 : Infinity));
  const cursor = new Date(createdAt);
  if (doc.schedule.cadence === "weekly") {
    // Snap to Monday of the starting week.
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  }
  const step = doc.schedule.cadence === "weekly" ? 7 : 1;
  while (cursor.getTime() <= end.getTime() && out.length < 120) {
    out.push(localDate(cursor));
    cursor.setDate(cursor.getDate() + step);
  }
  return out;
}

export default function HomeworkDoPage() {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<PatientAssignment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyAssignment(id)
      .then(setAssignment)
      .catch(() => setError("Couldn't load this homework."));
  }, [id]);

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

  const v2 = docSchema.safeParse(assignment.set.content);
  if (v2.success) {
    return <BlockRunner assignment={assignment} doc={v2.data} onAssignment={setAssignment} />;
  }
  if (setContentSchema.safeParse(assignment.set.content).success) {
    return <LegacyRunner assignment={assignment} onAssignment={setAssignment} />;
  }
  return <p className="text-sm text-muted-foreground">This homework has no content yet.</p>;
}

// ---------------------------------------------------------------------------
// v2: block documents with dated entries
// ---------------------------------------------------------------------------

function BlockRunner({
  assignment,
  doc,
  onAssignment,
}: {
  assignment: PatientAssignment;
  doc: HomeworkDoc;
  onAssignment: (a: PatientAssignment) => void;
}) {
  const router = useRouter();
  const createdAt = useMemo(
    () => (assignment.createdAt ? new Date(assignment.createdAt) : new Date()),
    [assignment.createdAt],
  );
  const dueDate = useMemo(
    () => (assignment.dueDate ? new Date(assignment.dueDate) : null),
    [assignment.dueDate],
  );
  const recurring = doc.schedule.cadence !== "once";
  const dates = useMemo(
    () => (recurring ? entryDates(doc, createdAt, dueDate) : []),
    [recurring, doc, createdAt, dueDate],
  );

  const [responseDoc, setResponseDoc] = useState(() => parseResponseDoc(assignment.set.content, assignment.response));
  const [activeDate, setActiveDate] = useState<string>(() =>
    recurring ? (dates.at(-1) ?? localDate(new Date())) : (responseDoc.entries[0]?.date ?? localDate(new Date())),
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const entry = responseDoc.entries.find((e) => e.date === activeDate);
  const blocks = entry?.blocks ?? {};

  // Debounced autosave of the active entry; the server merges per block.
  const pendingRef = useRef<Record<string, BlockResponse>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(
    async (submit = false) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      const patchBlocks = { ...pendingRef.current };
      pendingRef.current = {};
      if (Object.keys(patchBlocks).length === 0 && !submit) return;
      setSaving(true);
      setError(null);
      try {
        const updated = await saveMyEntry(assignment.id, { date: activeDate, blocks: patchBlocks }, submit);
        onAssignment(updated);
        setResponseDoc(parseResponseDoc(updated.set.content, updated.response));
        setSavedAt(new Date().toLocaleTimeString());
        if (submit) router.push("/homework");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save.");
      } finally {
        setSaving(false);
      }
    },
    [assignment.id, activeDate, onAssignment, router],
  );

  const update = useCallback(
    (blockId: string, r: BlockResponse) => {
      pendingRef.current[blockId] = { ...pendingRef.current[blockId], ...r };
      // Optimistic local state so the UI is instant.
      setResponseDoc((prev) => {
        const entries = [...prev.entries];
        const idx = entries.findIndex((e) => e.date === activeDate);
        if (idx === -1) {
          entries.push({ id: activeDate, date: activeDate, blocks: { [blockId]: r } });
          entries.sort((a, b) => a.date.localeCompare(b.date));
        } else {
          entries[idx] = {
            ...entries[idx],
            blocks: { ...entries[idx].blocks, [blockId]: { ...entries[idx].blocks[blockId], ...r } },
          };
        }
        return { ...prev, entries };
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(false), 700);
    },
    [activeDate, flush],
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const expected = expectedEntries(doc, createdAt, dueDate);
  const progress = docProgress(doc, responseDoc.entries, expected);
  const allDone = isDocComplete(doc, responseDoc.entries, expected);
  const submitted = assignment.status === "COMPLETED";

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/homework" className="text-sm text-muted-foreground hover:text-foreground">
          ← Homework
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl">{assignment.set.title}</h1>
            {assignment.set.description && (
              <p className="mt-1 max-w-prose text-sm text-muted-foreground">{assignment.set.description}</p>
            )}
          </div>
          <StatusBadge status={assignment.status} />
        </div>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {recurring
            ? `${doc.schedule.cadence === "daily" ? "Daily" : "Weekly"} · ${progress.complete} of ${progress.expected ?? "ongoing"} entries complete`
            : `${progress.complete === 1 ? "Complete" : "In progress"}`}
          {assignment.dueDate && ` · due ${new Date(assignment.dueDate).toLocaleDateString()}`}
        </p>
      </div>

      {responseDoc.revisionRequestedAt && !submitted && (
        <Card className="border-foreground/30">
          <CardContent className="grid gap-1 pt-6">
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-foreground">
              <MessageSquareText size={13} aria-hidden /> Changes requested
            </span>
            <p className="text-sm leading-6 text-muted-foreground">
              Your therapist asked you to revisit this one. Their notes are shown under the relevant parts.
            </p>
          </CardContent>
        </Card>
      )}

      {responseDoc.feedback && (
        <Card className="border-primary/30">
          <CardContent className="grid gap-1 pt-6">
            <span className="text-xs uppercase tracking-[0.18em] text-primary">Therapist feedback</span>
            <p className="text-sm leading-6 text-foreground/90">{responseDoc.feedback}</p>
          </CardContent>
        </Card>
      )}

      {recurring && (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Entries">
          {dates.map((date) => {
            const e = responseDoc.entries.find((x) => x.date === date);
            const complete = e ? isEntryComplete(doc, e) : false;
            const active = date === activeDate;
            return (
              <button
                key={date}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  void flush(false);
                  setActiveDate(date);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                {complete && (
                  <span aria-hidden className={`size-1.5 rounded-full ${active ? "bg-background" : "bg-foreground"}`} />
                )}
                {chipLabel(date, doc.schedule.cadence === "weekly" ? "weekly" : "daily")}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid max-w-2xl gap-6">
        {doc.blocks.map((block) => (
          <div key={block.id} className="grid gap-2">
            <BlockView
              block={block}
              response={blocks[block.id]}
              onChange={(r) => update(block.id, r)}
              readOnly={submitted}
            />
            {responseDoc.comments?.[block.id] && (
              <p className="border-l-2 border-foreground/40 pl-3 text-sm leading-6 text-muted-foreground">
                <span className="text-xs uppercase tracking-[0.14em] text-foreground/80">Therapist </span>
                {responseDoc.comments[block.id]}
              </p>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button variant="outline" onClick={() => void flush(false)} disabled={saving || submitted}>
          {saving ? "Saving…" : "Save progress"}
        </Button>
        <Button onClick={() => void flush(true)} disabled={saving || !allDone || submitted}>
          {submitted ? "Submitted" : "Submit"}
        </Button>
        {savedAt && <span className="text-xs text-muted-foreground">Saved at {savedAt}</span>}
        {!allDone && !submitted && (
          <span className="text-xs text-muted-foreground">
            {recurring ? "Complete every expected entry to submit" : "Finish every part to submit"}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// v1: legacy six-kind sets, unchanged behavior
// ---------------------------------------------------------------------------

function LegacyRunner({
  assignment,
  onAssignment,
}: {
  assignment: PatientAssignment;
  onAssignment: (a: PatientAssignment) => void;
}) {
  const router = useRouter();
  const content = useMemo(() => parseContent(assignment.set.content), [assignment.set.content]);
  const initial = useMemo(
    () => parseResponse(assignment.response),
    [assignment.response],
  );
  const [responses, setResponses] = useState<Record<string, ItemResponse>>(initial.items ?? {});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const update = useCallback((itemId: string, r: ItemResponse) => {
    setResponses((prev) => ({ ...prev, [itemId]: r }));
  }, []);

  const total = content.items.length;
  const done = countComplete(content, { items: responses });
  const allDone = isSetComplete(content, { items: responses });
  const pct = total ? Math.round((done / total) * 100) : 0;

  const persist = async (submit: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await saveMyResponse(assignment.id, { items: responses, submit });
      onAssignment(updated);
      setResponses(parseResponse(updated.response).items ?? {});
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
            <h1 className="text-2xl">{assignment.set.title}</h1>
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

      {initial.reviewedAt && initial.feedback && (
        <Card className="border-primary/30">
          <CardContent className="grid gap-1 pt-6">
            <span className="text-xs uppercase tracking-wide text-primary">Therapist feedback</span>
            <p className="text-sm text-foreground/90">{initial.feedback}</p>
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
