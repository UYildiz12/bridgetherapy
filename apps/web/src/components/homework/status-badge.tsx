import type { AssignmentStatus } from "@/lib/homework/client";

const STYLES: Record<AssignmentStatus, string> = {
  PENDING: "border-border text-muted-foreground",
  IN_PROGRESS: "border-primary/40 text-primary",
  COMPLETED: "border-foreground/40 text-foreground",
  OVERDUE: "border-destructive/40 text-destructive",
};

const LABELS: Record<AssignmentStatus, string> = {
  PENDING: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  OVERDUE: "Overdue",
};

export function StatusBadge({ status }: { status: AssignmentStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
