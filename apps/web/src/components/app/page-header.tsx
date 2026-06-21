import type { ReactNode } from "react";

/**
 * The app's page header: a large serif display title over a hairline rule, in the
 * landing's blueprint voice. Serif comes from the `.app-shell h1` rule.
 */
export function PageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
      <div className="grid gap-1.5">
        <h1 className="text-3xl leading-tight">{title}</h1>
        {sub && <p className="max-w-prose text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action && <div className="shrink-0 pb-0.5">{action}</div>}
    </div>
  );
}
