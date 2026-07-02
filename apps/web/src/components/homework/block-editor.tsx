"use client";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlignLeft,
  ArrowDown,
  ArrowUp,
  Copy,
  GaugeCircle,
  Heading2,
  ListChecks,
  ListTodo,
  Mic,
  Plus,
  Table2,
  Trash2,
  Type,
} from "lucide-react";
import { ACTIVITY_KINDS, type ActivityKind, type Block, type Cadence, type HomeworkDoc } from "@/lib/homework/blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fieldCls =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";
const areaCls =
  "min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const newId = () => crypto.randomUUID().slice(0, 8);

interface Palette {
  label: string;
  icon: LucideIcon;
  make: () => Block;
}

const PALETTE: { group: string; items: Palette[] }[] = [
  {
    group: "Content",
    items: [
      { label: "Heading", icon: Heading2, make: () => ({ type: "heading", id: newId(), text: "" }) },
      { label: "Instructions", icon: AlignLeft, make: () => ({ type: "text", id: newId(), body: "" }) },
    ],
  },
  {
    group: "Inputs",
    items: [
      { label: "Text answer", icon: Type, make: () => ({ type: "input.text", id: newId(), label: "", multiline: true }) },
      {
        label: "Scale",
        icon: GaugeCircle,
        make: () => ({ type: "input.scale", id: newId(), label: "", min: 0, max: 10 }),
      },
      {
        label: "Choice",
        icon: ListTodo,
        make: () => ({ type: "input.choice", id: newId(), label: "", options: ["", ""] }),
      },
      {
        label: "Checklist",
        icon: ListChecks,
        make: () => ({ type: "input.checklist", id: newId(), items: [{ id: newId(), text: "" }] }),
      },
      {
        label: "Table / log",
        icon: Table2,
        make: () => ({
          type: "input.table",
          id: newId(),
          label: "",
          columns: [{ id: newId(), header: "", kind: "text" }],
        }),
      },
      { label: "Voice or drawing", icon: Mic, make: () => ({ type: "input.media", id: newId(), label: "", mode: "voice" }) },
    ],
  },
  {
    group: "App activity",
    items: [
      {
        label: "App activity",
        icon: Activity,
        make: () => ({ type: "input.activity", id: newId(), label: "", activity: "mood-checkin" }),
      },
    ],
  },
];

const BLOCK_TITLES: Record<Block["type"], string> = {
  heading: "Heading",
  text: "Instructions",
  "input.text": "Text answer",
  "input.scale": "Scale",
  "input.choice": "Choice",
  "input.checklist": "Checklist",
  "input.table": "Table / log",
  "input.media": "Voice or drawing",
  "input.activity": "App activity",
};

const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  "mood-checkin": "Mood check-in",
  reflection: "Reflection",
  breathing: "Breathing session",
  "quick-practice": "Quick practice",
  lesson: "Learn lesson",
};

/** Controlled block-document editor: the builder's core. */
export function BlockEditor({ value, onChange }: { value: HomeworkDoc; onChange: (doc: HomeworkDoc) => void }) {
  const [adding, setAdding] = useState(false);

  const setBlocks = (blocks: Block[]) => onChange({ ...value, blocks });
  const setBlock = (i: number, b: Block) => setBlocks(value.blocks.map((x, n) => (n === i ? b : x)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.blocks.length) return;
    const blocks = [...value.blocks];
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    setBlocks(blocks);
  };
  const duplicate = (i: number) => {
    const src = value.blocks[i];
    const copy: Block = JSON.parse(JSON.stringify(src));
    copy.id = newId();
    if (copy.type === "input.checklist") copy.items = copy.items.map((it) => ({ ...it, id: newId() }));
    if (copy.type === "input.table") copy.columns = copy.columns.map((c) => ({ ...c, id: newId() }));
    setBlocks([...value.blocks.slice(0, i + 1), copy, ...value.blocks.slice(i + 1)]);
  };
  const remove = (i: number) => setBlocks(value.blocks.filter((_, n) => n !== i));

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="cadence">Schedule</Label>
        <select
          id="cadence"
          value={value.schedule.cadence}
          onChange={(e) => onChange({ ...value, schedule: { cadence: e.target.value as Cadence } })}
          className={fieldCls}
        >
          <option value="once">Once</option>
          <option value="daily">Daily until the due date</option>
          <option value="weekly">Weekly until the due date</option>
        </select>
        {value.schedule.cadence !== "once" && (
          <p className="text-xs leading-5 text-muted-foreground">
            The patient adds one entry per {value.schedule.cadence === "daily" ? "day" : "week"}, each a fresh pass
            through the blocks below.
          </p>
        )}
      </div>

      <div className="grid gap-3">
        {value.blocks.map((block, i) => (
          <div key={block.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {BLOCK_TITLES[block.type]}
              </span>
              <span className="ml-auto flex items-center gap-0.5">
                <button type="button" aria-label={`Move block ${i + 1} up`} onClick={() => move(i, -1)} className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground disabled:opacity-30" disabled={i === 0}>
                  <ArrowUp size={14} aria-hidden />
                </button>
                <button type="button" aria-label={`Move block ${i + 1} down`} onClick={() => move(i, 1)} className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground disabled:opacity-30" disabled={i === value.blocks.length - 1}>
                  <ArrowDown size={14} aria-hidden />
                </button>
                <button type="button" aria-label={`Duplicate block ${i + 1}`} onClick={() => duplicate(i)} className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground">
                  <Copy size={13} aria-hidden />
                </button>
                <button type="button" aria-label={`Delete block ${i + 1}`} onClick={() => remove(i)} className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-destructive">
                  <Trash2 size={13} aria-hidden />
                </button>
              </span>
            </div>
            <BlockConfig block={block} onChange={(b) => setBlock(i, b)} index={i} />
          </div>
        ))}
      </div>

      {adding ? (
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {PALETTE.map((group) => (
            <div key={group.group} className="grid gap-1.5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{group.group}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setBlocks([...value.blocks, p.make()]);
                      setAdding(false);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                  >
                    <p.icon size={13} aria-hidden />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button type="button" variant="outline" className="gap-1.5" onClick={() => setAdding(true)}>
            <Plus size={15} aria-hidden /> Add block
          </Button>
        </div>
      )}
    </div>
  );
}

function BlockConfig({ block, onChange, index }: { block: Block; onChange: (b: Block) => void; index: number }) {
  const suffix = `b${index}`;
  switch (block.type) {
    case "heading":
      return (
        <Input
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Section title"
          aria-label="Heading text"
        />
      );

    case "text":
      return (
        <div className="grid gap-2">
          <textarea
            value={block.body}
            onChange={(e) => onChange({ ...block, body: e.target.value })}
            placeholder="Instructions or psychoeducation the patient reads."
            aria-label="Instructions body"
            className={areaCls}
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={block.requireAck ?? false}
              onChange={(e) => onChange({ ...block, requireAck: e.target.checked })}
            />
            Require “mark as read”
          </label>
        </div>
      );

    case "input.text":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            placeholder="Question or label"
            aria-label="Text answer label"
          />
          <Input
            value={block.placeholder ?? ""}
            onChange={(e) => onChange({ ...block, placeholder: e.target.value || undefined })}
            placeholder="Placeholder (optional)"
            aria-label="Text answer placeholder"
          />
          <OptionalToggle block={block} onChange={onChange} />
        </div>
      );

    case "input.scale":
      return (
        <div className="grid gap-2">
          <Input
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            placeholder="What is being rated?"
            aria-label="Scale label"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="grid gap-1">
              <Label htmlFor={`min-${suffix}`}>Min</Label>
              <Input id={`min-${suffix}`} type="number" value={block.min} onChange={(e) => onChange({ ...block, min: Number(e.target.value) })} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`max-${suffix}`}>Max</Label>
              <Input id={`max-${suffix}`} type="number" value={block.max} onChange={(e) => onChange({ ...block, max: Number(e.target.value) })} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`minl-${suffix}`}>Low label</Label>
              <Input id={`minl-${suffix}`} value={block.minLabel ?? ""} onChange={(e) => onChange({ ...block, minLabel: e.target.value || undefined })} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`maxl-${suffix}`}>High label</Label>
              <Input id={`maxl-${suffix}`} value={block.maxLabel ?? ""} onChange={(e) => onChange({ ...block, maxLabel: e.target.value || undefined })} />
            </div>
          </div>
          <OptionalToggle block={block} onChange={onChange} />
        </div>
      );

    case "input.choice":
      return (
        <div className="grid gap-2">
          <Input
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            placeholder="Question"
            aria-label="Choice label"
          />
          <textarea
            value={block.options.join("\n")}
            onChange={(e) => onChange({ ...block, options: e.target.value.split("\n") })}
            placeholder={"One option per line"}
            aria-label="Choice options, one per line"
            className={areaCls}
          />
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={block.multi ?? false} onChange={(e) => onChange({ ...block, multi: e.target.checked || undefined, scored: e.target.checked ? undefined : block.scored })} />
              Allow multiple
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={block.scored ?? false} disabled={block.multi} onChange={(e) => onChange({ ...block, scored: e.target.checked || undefined })} />
              Scored (option order = points)
            </label>
          </div>
          <OptionalToggle block={block} onChange={onChange} />
        </div>
      );

    case "input.checklist":
      return (
        <div className="grid gap-2">
          <Input
            value={block.label ?? ""}
            onChange={(e) => onChange({ ...block, label: e.target.value || undefined })}
            placeholder="Checklist label (optional)"
            aria-label="Checklist label"
          />
          <textarea
            value={block.items.map((it) => it.text).join("\n")}
            onChange={(e) =>
              onChange({
                ...block,
                items: e.target.value.split("\n").map((text, n) => ({ id: block.items[n]?.id ?? newId(), text })),
              })
            }
            placeholder={"One step per line"}
            aria-label="Checklist items, one per line"
            className={areaCls}
          />
        </div>
      );

    case "input.table":
      return (
        <div className="grid gap-2">
          <Input
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            placeholder="What is this log for?"
            aria-label="Table label"
          />
          <div className="grid gap-2">
            {block.columns.map((c, ci) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2">
                <Input
                  value={c.header}
                  onChange={(e) =>
                    onChange({ ...block, columns: block.columns.map((x, n) => (n === ci ? { ...x, header: e.target.value } : x)) })
                  }
                  placeholder={`Column ${ci + 1}`}
                  aria-label={`Column ${ci + 1} header`}
                  className="w-48"
                />
                <select
                  value={c.kind}
                  aria-label={`Column ${ci + 1} kind`}
                  onChange={(e) => {
                    const kind = e.target.value as "text" | "scale";
                    onChange({
                      ...block,
                      columns: block.columns.map((x, n) =>
                        n === ci ? (kind === "scale" ? { ...x, kind, min: x.min ?? 0, max: x.max ?? 10 } : { id: x.id, header: x.header, kind }) : x,
                      ),
                    });
                  }}
                  className={`${fieldCls} w-28`}
                >
                  <option value="text">Text</option>
                  <option value="scale">Number</option>
                </select>
                {c.kind === "scale" && (
                  <>
                    <Input type="number" value={c.min ?? 0} aria-label={`Column ${ci + 1} min`} onChange={(e) => onChange({ ...block, columns: block.columns.map((x, n) => (n === ci ? { ...x, min: Number(e.target.value) } : x)) })} className="w-20" />
                    <Input type="number" value={c.max ?? 10} aria-label={`Column ${ci + 1} max`} onChange={(e) => onChange({ ...block, columns: block.columns.map((x, n) => (n === ci ? { ...x, max: Number(e.target.value) } : x)) })} className="w-20" />
                  </>
                )}
                <button
                  type="button"
                  aria-label={`Remove column ${ci + 1}`}
                  onClick={() => onChange({ ...block, columns: block.columns.filter((_, n) => n !== ci) })}
                  className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-destructive disabled:opacity-30"
                  disabled={block.columns.length <= 1}
                >
                  <Trash2 size={13} aria-hidden />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={block.columns.length >= 6}
                onClick={() => onChange({ ...block, columns: [...block.columns, { id: newId(), header: "", kind: "text" }] })}
              >
                <Plus size={13} aria-hidden /> Add column
              </Button>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Min rows
                <Input
                  type="number"
                  value={block.minRows ?? 1}
                  aria-label="Minimum rows"
                  onChange={(e) => onChange({ ...block, minRows: Math.max(1, Number(e.target.value)) })}
                  className="w-20"
                />
              </label>
            </div>
          </div>
          <OptionalToggle block={block} onChange={onChange} />
        </div>
      );

    case "input.media":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            placeholder="What should they record or draw?"
            aria-label="Media label"
          />
          <select
            value={block.mode}
            aria-label="Media mode"
            onChange={(e) => onChange({ ...block, mode: e.target.value as "voice" | "drawing" })}
            className={fieldCls}
          >
            <option value="voice">Voice note</option>
            <option value="drawing">Drawing</option>
          </select>
          <OptionalToggle block={block} onChange={onChange} />
        </div>
      );

    case "input.activity":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            placeholder="e.g. Log your mood three times"
            aria-label="Activity label"
          />
          <select
            value={block.activity}
            aria-label="Activity kind"
            onChange={(e) => onChange({ ...block, activity: e.target.value as ActivityKind })}
            className={fieldCls}
          >
            {ACTIVITY_KINDS.map((k) => (
              <option key={k} value={k}>
                {ACTIVITY_LABELS[k]}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            How many times
            <Input
              type="number"
              value={block.count ?? 1}
              aria-label="Activity count"
              onChange={(e) => onChange({ ...block, count: Math.max(1, Number(e.target.value)) })}
              className="w-20"
            />
          </label>
          <OptionalToggle block={block} onChange={onChange} />
        </div>
      );
  }
}

function OptionalToggle({
  block,
  onChange,
}: {
  block: Extract<Block, { optional?: boolean }>;
  onChange: (b: Block) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <input
        type="checkbox"
        checked={block.optional ?? false}
        onChange={(e) => onChange({ ...block, optional: e.target.checked || undefined } as Block)}
      />
      Optional for the patient
    </label>
  );
}
