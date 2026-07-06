"use client";
import Link from "next/link";
import { Check, ExternalLink, Plus, X } from "lucide-react";
import type { ActivityKind, Block, BlockResponse } from "@/lib/homework/blocks";
import { AUTO_VERIFIED } from "@/lib/homework/blocks";
import { isBlockComplete } from "@/lib/homework/completion";
import { Button } from "@/components/ui/button";
import { VoiceRecorder } from "./voice-recorder";
import { DrawingPad } from "./drawing-pad";

const SERIF = { fontFamily: "var(--font-instrument-serif), serif" } as const;

const ACTIVITY_LINKS: Record<ActivityKind, { href: string; cta: string }> = {
  "mood-checkin": { href: "/mood", cta: "Do a mood check-in" },
  reflection: { href: "/notes", cta: "Write a reflection" },
  breathing: { href: "/wellness?tab=practice", cta: "Do a breathing session" },
  "quick-practice": { href: "/wellness?tab=practice", cta: "Do a quick practice" },
  lesson: { href: "/wellness?tab=learn", cta: "Open the lesson" },
};

function FieldLabel({ text, optional }: { text: string; optional?: boolean }) {
  return (
    <p className="text-sm font-medium text-foreground">
      {text}
      {optional && <span className="ml-2 text-xs font-normal text-muted-foreground">optional</span>}
    </p>
  );
}

/**
 * Renders any homework block and edits its flat response. The single renderer
 * shared by the patient runner, the builder's live preview, and the therapist
 * review (readOnly).
 */
export function BlockView({
  block,
  response,
  onChange,
  readOnly = false,
}: {
  block: Block;
  response: BlockResponse | undefined;
  onChange: (next: BlockResponse) => void;
  readOnly?: boolean;
}) {
  const r = response ?? {};
  const set = (patch: BlockResponse) => onChange({ ...r, ...patch });

  switch (block.type) {
    case "heading":
      return <h3 className="pt-2 text-xl leading-snug" style={SERIF}>{block.text}</h3>;

    case "text":
      return (
        <div className="grid gap-3 border-l-2 border-border pl-4">
          <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{block.body}</p>
          {block.requireAck && (
            <div>
              <Button
                type="button"
                size="sm"
                variant={r.done ? "default" : "outline"}
                disabled={readOnly}
                onClick={() => set({ done: !r.done })}
                className="gap-1.5"
              >
                <Check size={14} aria-hidden />
                {r.done ? "Read" : "Mark as read"}
              </Button>
            </div>
          )}
        </div>
      );

    case "input.text":
      return (
        <div className="grid gap-2">
          <FieldLabel text={block.label} optional={block.optional} />
          {block.multiline ? (
            <textarea
              value={r.text ?? ""}
              onChange={(e) => set({ text: e.target.value })}
              placeholder={block.placeholder}
              disabled={readOnly}
              aria-label={block.label}
              className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base leading-7 outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-70 sm:text-sm sm:leading-6"
            />
          ) : (
            <input
              value={r.text ?? ""}
              onChange={(e) => set({ text: e.target.value })}
              placeholder={block.placeholder}
              disabled={readOnly}
              aria-label={block.label}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-base outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-70 sm:text-sm"
            />
          )}
        </div>
      );

    case "input.scale": {
      const val = r.value ?? block.min;
      // A tap that doesn't move the thumb fires no change event, so commit the
      // resting value on release — otherwise "leave it at the minimum" never counts.
      const commit = () => {
        if (!readOnly && r.value === undefined) set({ value: val });
      };
      return (
        <div className="grid gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <FieldLabel text={block.label} optional={block.optional} />
            <span className="text-2xl leading-none tabular-nums" style={SERIF}>
              {r.value ?? "–"}
            </span>
          </div>
          <input
            type="range"
            min={block.min}
            max={block.max}
            step={block.step ?? 1}
            value={val}
            disabled={readOnly}
            aria-label={block.label}
            onChange={(e) => set({ value: Number(e.target.value) })}
            onPointerUp={commit}
            onKeyUp={commit}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15 disabled:cursor-default"
            style={{ accentColor: "var(--foreground)" }}
          />
          <div className="flex justify-between text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <span>{block.minLabel ?? block.min}</span>
            <span>{block.maxLabel ?? block.max}</span>
          </div>
        </div>
      );
    }

    case "input.choice": {
      const selected = r.selected ?? [];
      const toggle = (i: number) => {
        if (block.multi) {
          set({ selected: selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i] });
        } else {
          set({ selected: [i] });
        }
      };
      return (
        <div className="grid gap-2">
          <FieldLabel text={block.label} optional={block.optional} />
          <div className="grid gap-1.5">
            {block.options.map((opt, i) => {
              const active = selected.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={readOnly}
                  aria-pressed={active}
                  onClick={() => toggle(i)}
                  className={`rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${
                    active
                      ? "border-foreground bg-foreground/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  } disabled:pointer-events-none`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "input.checklist": {
      const checked = r.checked ?? [];
      const toggle = (itemId: string) =>
        set({ checked: checked.includes(itemId) ? checked.filter((x) => x !== itemId) : [...checked, itemId] });
      return (
        <div className="grid gap-2">
          {block.label && <FieldLabel text={block.label} optional={block.optional} />}
          <div className="grid gap-1.5">
            {block.items.map((it) => {
              const done = checked.includes(it.id);
              return (
                <button
                  key={it.id}
                  type="button"
                  disabled={readOnly}
                  aria-pressed={done}
                  onClick={() => toggle(it.id)}
                  className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 text-left text-sm transition-colors hover:border-foreground/40 disabled:pointer-events-none"
                >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      done ? "border-foreground bg-foreground text-background" : "border-foreground/30"
                    }`}
                  >
                    {done && <Check size={12} aria-hidden />}
                  </span>
                  <span className={done ? "text-foreground" : "text-muted-foreground"}>{it.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "input.table": {
      const rows = r.rows ?? [];
      const setCell = (rowIdx: number, colId: string, value: string | number) => {
        const next = rows.map((row, i) => (i === rowIdx ? { ...row, [colId]: value } : row));
        set({ rows: next });
      };
      return (
        <div className="grid gap-2">
          <FieldLabel text={block.label} optional={block.optional} />
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {block.columns.map((c) => (
                    <th key={c.id} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {c.header}
                    </th>
                  ))}
                  {!readOnly && <th className="w-8" aria-hidden />}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-b-0">
                    {block.columns.map((c) => (
                      <td key={c.id} className="px-2 py-1.5 align-top">
                        {readOnly ? (
                          <span className="px-1 text-foreground/90">{row[c.id] ?? ""}</span>
                        ) : c.kind === "scale" ? (
                          <input
                            type="number"
                            min={c.min}
                            max={c.max}
                            value={row[c.id] ?? ""}
                            aria-label={`${c.header} row ${i + 1}`}
                            onChange={(e) => setCell(i, c.id, e.target.value === "" ? "" : Number(e.target.value))}
                            className="h-9 w-24 rounded-md border border-input bg-transparent px-2 text-base outline-none tabular-nums focus-visible:border-ring sm:text-sm"
                          />
                        ) : (
                          <input
                            value={typeof row[c.id] === "string" || typeof row[c.id] === "number" ? String(row[c.id]) : ""}
                            aria-label={`${c.header} row ${i + 1}`}
                            onChange={(e) => setCell(i, c.id, e.target.value)}
                            className="h-9 w-full min-w-36 rounded-md border border-input bg-transparent px-2 text-base outline-none focus-visible:border-ring sm:text-sm"
                          />
                        )}
                      </td>
                    ))}
                    {!readOnly && (
                      <td className="px-1 py-1.5 align-middle">
                        <button
                          type="button"
                          aria-label={`Remove row ${i + 1}`}
                          onClick={() => set({ rows: rows.filter((_, x) => x !== i) })}
                          className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                        >
                          <X size={13} aria-hidden />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={block.columns.length + 1} className="px-3 py-3 text-sm text-muted-foreground">
                      No rows yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!readOnly && (
            <div>
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => set({ rows: [...rows, {}] })}>
                <Plus size={14} aria-hidden /> Add row
              </Button>
              {block.minRows && (
                <span className="ml-3 text-xs text-muted-foreground">
                  {Math.min(rows.length, block.minRows)} of {block.minRows} rows
                </span>
              )}
            </div>
          )}
        </div>
      );
    }

    case "input.media":
      return (
        <div className="grid gap-2">
          <FieldLabel text={block.label} optional={block.optional} />
          {block.prompt && <p className="text-sm leading-6 text-muted-foreground">{block.prompt}</p>}
          {readOnly ? (
            <p className="text-sm text-muted-foreground">{r.mediaId ? "Attached." : "Nothing attached."}</p>
          ) : block.mode === "voice" ? (
            <VoiceRecorder value={r.mediaId} onChange={(mediaId) => set({ mediaId })} />
          ) : (
            <DrawingPad value={r.mediaId} onChange={(mediaId) => set({ mediaId })} />
          )}
        </div>
      );

    case "input.activity": {
      const link = ACTIVITY_LINKS[block.activity];
      const auto = AUTO_VERIFIED.has(block.activity);
      const need = block.count ?? 1;
      const have = auto ? (r.verifiedIds?.length ?? 0) : r.selfDone ? need : 0;
      const done = isBlockComplete(block, r);
      return (
        <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel text={block.label} optional={block.optional} />
            <span className={`text-xs uppercase tracking-[0.14em] ${done ? "text-foreground" : "text-muted-foreground"}`}>
              {done ? "Done" : auto ? `${Math.min(have, need)} of ${need} verified` : "Not yet"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={link.href}
              className="inline-flex items-center gap-1.5 text-sm text-foreground underline underline-offset-4 hover:opacity-80"
            >
              {link.cta} <ExternalLink size={13} aria-hidden />
            </Link>
            {!auto && !readOnly && (
              <Button
                type="button"
                size="sm"
                variant={r.selfDone ? "default" : "outline"}
                onClick={() => set({ selfDone: !r.selfDone })}
                className="gap-1.5"
              >
                <Check size={14} aria-hidden /> {r.selfDone ? "Did it" : "I did this"}
              </Button>
            )}
          </div>
          {auto && (
            <p className="text-xs leading-5 text-muted-foreground">
              Counted automatically from your activity in the app during this assignment.
            </p>
          )}
        </div>
      );
    }
  }
}
