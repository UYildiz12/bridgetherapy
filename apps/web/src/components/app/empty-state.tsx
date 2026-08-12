import type { ReactNode } from "react";

/** A composed empty state: framed, centered, with an optional icon and call to action. */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 px-6 py-14 text-center">
      {icon && (
        <div className="flex size-10 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="grid gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
