"use client";

/** A multi-select rendered as toggleable pills. Shared by intake and the therapist profile. */
export function ChipSelect({
  options,
  selected,
  onToggle,
}: {
  options: readonly { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            aria-pressed={on}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              on
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
