import { isInputBlock, type HomeworkDoc, type HomeworkEntry, type ResponseDoc } from "./blocks";
import { parseDoc, parseResponseDoc } from "./adapt";
import { docProgress, expectedEntries, isBlockComplete, isEntryComplete } from "./completion";

/**
 * Pure "what deserves attention" derivations shared by the patient list, the
 * runner header, and the therapist review queue. Everything here works on the
 * client DTOs (ISO strings) so pages stay thin and this stays unit-testable.
 */

/** Local-time YYYY-MM-DD; entries are dated in the patient's day. */
export function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY = 86_400_000;

/** Monday 00:00 local of the week containing `d`. */
function weekStart(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

/** Required parts (non-optional inputs + require-ack texts) done vs total for one entry. */
export function entryParts(doc: HomeworkDoc, entry: HomeworkEntry | undefined): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const b of doc.blocks) {
    const required = (isInputBlock(b) && !b.optional) || (b.type === "text" && b.requireAck);
    if (!required) continue;
    total += 1;
    if (entry && isBlockComplete(b, entry.blocks[b.id])) done += 1;
  }
  return { done, total };
}

/** Consecutive complete daily entries ending today, or yesterday while today is still open. */
export function dailyStreak(doc: HomeworkDoc, entries: HomeworkEntry[], now: Date = new Date()): number {
  if (doc.schedule.cadence !== "daily") return 0;
  const complete = new Set(entries.filter((e) => isEntryComplete(doc, e)).map((e) => e.date));
  const cursor = new Date(now);
  if (!complete.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (complete.has(localDate(cursor))) {
    n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

/** The current cadence unit (today / this week) and whether its entry is complete. */
export type CurrentUnit = { unit: "day" | "week"; done: boolean } | null;

export function currentUnit(doc: HomeworkDoc, entries: HomeworkEntry[], now: Date = new Date()): CurrentUnit {
  if (doc.schedule.cadence === "once") return null;
  if (doc.schedule.cadence === "daily") {
    const today = entries.find((e) => e.date === localDate(now));
    return { unit: "day", done: Boolean(today && isEntryComplete(doc, today)) };
  }
  const start = weekStart(now).getTime();
  const done = entries.some((e) => {
    const t = new Date(`${e.date}T00:00:00`).getTime();
    return t >= start && t < start + 7 * DAY && isEntryComplete(doc, e);
  });
  return { unit: "week", done };
}

/** Everything the patient homework list needs to render and order one card. */
export interface PatientHomeworkInfo {
  doc: HomeworkDoc;
  rd: ResponseDoc;
  recurring: boolean;
  submitted: boolean;
  /** Therapist asked for changes and the patient has not edited since. */
  revisionRequested: boolean;
  reviewed: boolean;
  hasFeedback: boolean;
  unit: CurrentUnit;
  streak: number;
  entriesComplete: number;
  expected: number | null;
  parts: { done: number; total: number };
  /** 0-100, or null for open-ended recurring where a percent is meaningless. */
  pct: number | null;
  overdue: boolean;
  dueAt: number | null;
  /** Lower sorts first. */
  priority: number;
}

export interface PatientAssignmentLike {
  status: string;
  dueDate: string | null;
  createdAt: string | null;
  set: { content: unknown };
  response: unknown;
}

export function patientHomeworkInfo(a: PatientAssignmentLike, now: Date = new Date()): PatientHomeworkInfo {
  const doc = parseDoc(a.set.content);
  const rd = parseResponseDoc(a.set.content, a.response);
  const recurring = doc.schedule.cadence !== "once";
  const expected = expectedEntries(doc, a.createdAt ? new Date(a.createdAt) : now, a.dueDate ? new Date(a.dueDate) : null);
  const entriesComplete = docProgress(doc, rd.entries, expected).complete;
  const parts = entryParts(doc, rd.entries[0]);
  const unit = currentUnit(doc, rd.entries, now);
  const submitted = a.status === "COMPLETED";
  const revisionRequested = Boolean(rd.revisionRequestedAt);
  const reviewed = Boolean(rd.reviewedAt);
  const hasFeedback = Boolean(rd.feedback) || Object.keys(rd.comments ?? {}).length > 0;
  const overdue = a.status === "OVERDUE";

  const pct = recurring
    ? expected
      ? Math.round((Math.min(entriesComplete, expected) / expected) * 100)
      : null
    : parts.total > 0
      ? Math.round((parts.done / parts.total) * 100)
      : 0;

  let priority: number;
  if (revisionRequested) priority = 0;
  else if (overdue) priority = 1;
  else if (recurring && !submitted && unit && !unit.done) priority = 2;
  else if (!recurring && !submitted) priority = 3;
  else if (recurring && !submitted) priority = 4;
  else if (submitted && !reviewed) priority = 5;
  else priority = 6;

  return {
    doc,
    rd,
    recurring,
    submitted,
    revisionRequested,
    reviewed,
    hasFeedback,
    unit,
    streak: dailyStreak(doc, rd.entries, now),
    entriesComplete,
    expected,
    parts,
    pct,
    overdue,
    dueAt: a.dueDate ? new Date(a.dueDate).getTime() : null,
    priority,
  };
}

/** Attention order: priority, then nearest due date (no due date last). */
export function byAttention(x: PatientHomeworkInfo, y: PatientHomeworkInfo): number {
  if (x.priority !== y.priority) return x.priority - y.priority;
  // MAX_SAFE_INTEGER, not Infinity: two undated items must compare 0, not NaN.
  return (x.dueAt ?? Number.MAX_SAFE_INTEGER) - (y.dueAt ?? Number.MAX_SAFE_INTEGER);
}

// ---- Therapist review queue ----

export type ReviewBucket = "needs-review" | "changes-requested" | "in-progress" | "not-started" | "reviewed";

export interface TherapistAssignmentLike {
  status: string;
  reviewedAt: string | null;
  completedAt: string | null;
  revisionRequestedAt?: string | null;
}

/**
 * Which queue an assignment belongs to, from the therapist's point of view.
 * A resubmission after review (completedAt newer than reviewedAt) needs review
 * again; a pending revision request is waiting on the patient.
 */
export function reviewBucket(a: TherapistAssignmentLike): ReviewBucket {
  if (a.revisionRequestedAt) return "changes-requested";
  if (a.status === "COMPLETED") {
    if (!a.reviewedAt) return "needs-review";
    if (a.completedAt && new Date(a.completedAt).getTime() > new Date(a.reviewedAt).getTime()) return "needs-review";
    return "reviewed";
  }
  if (a.status === "PENDING") return "not-started";
  return "in-progress";
}

export const REVIEW_BUCKET_ORDER: readonly ReviewBucket[] = [
  "needs-review",
  "changes-requested",
  "in-progress",
  "not-started",
  "reviewed",
];

export const REVIEW_BUCKET_LABELS: Record<ReviewBucket, string> = {
  "needs-review": "Needs review",
  "changes-requested": "Changes requested",
  "in-progress": "In progress",
  "not-started": "Not started",
  reviewed: "Reviewed",
};
