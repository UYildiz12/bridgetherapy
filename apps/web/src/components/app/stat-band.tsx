import type { ReactNode } from "react";

const SERIF = { fontFamily: "var(--font-instrument-serif), serif" } as const;

export interface StatItem {
  label: string;
  value: string;
  /** Optional small glyph rendered beside the numeral, e.g. a trend arrow. */
  icon?: ReactNode;
}

/**
 * A single glass panel of key numbers divided by internal hairlines: the app's
 * instrument-strip. Serif numerals, uppercase micro-labels, no cards-in-cards.
 */
export function StatBand({ items, ariaLabel }: { items: StatItem[]; ariaLabel: string }) {
  return (
    <section
      aria-label={ariaLabel}
      className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] lg:grid-cols-4"
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`px-5 py-4 ${i % 2 === 1 ? "border-l border-white/10" : ""} ${
            i >= 2 ? "border-t border-white/10 lg:border-t-0" : ""
          } ${i >= 2 ? "lg:border-l lg:border-white/10" : ""}`}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
          <p
            className="mt-2 flex items-baseline gap-1.5 text-3xl leading-none tabular-nums"
            style={SERIF}
          >
            {item.icon && <span className="self-center text-muted-foreground">{item.icon}</span>}
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}
