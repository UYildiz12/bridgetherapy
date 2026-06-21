"use client";
import type { HomeworkItem } from "@/lib/homework/schema";
import { ITEM_KIND_LABELS } from "@/lib/homework/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const textareaCls =
  "min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Therapist-side editor for a single homework item (all kinds). */
export function ItemEditor({
  item,
  index,
  count,
  onChange,
  onRemove,
  onMove,
}: {
  item: HomeworkItem;
  index: number;
  count: number;
  onChange: (it: HomeworkItem) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const patch = (p: Record<string, unknown>) => onChange({ ...item, ...p } as HomeworkItem);

  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {index + 1}. {ITEM_KIND_LABELS[item.kind]}
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up">
            ↑
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down">
            ↓
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove item">
            ✕
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Title</Label>
        <Input value={item.title} onChange={(e) => patch({ title: e.target.value })} placeholder="e.g. Thought record" />
      </div>

      {item.kind === "task" && (
        <div className="grid gap-2">
          <Label>Detail (optional)</Label>
          <Input value={item.detail ?? ""} onChange={(e) => patch({ detail: e.target.value })} placeholder="What should they do?" />
        </div>
      )}

      {item.kind === "reading" && (
        <div className="grid gap-2">
          <Label>Reading</Label>
          <textarea
            className={textareaCls}
            value={item.body}
            onChange={(e) => patch({ body: e.target.value })}
            placeholder="The passage the patient reads…"
          />
        </div>
      )}

      {(item.kind === "writing" || item.kind === "voice" || item.kind === "drawing") && (
        <div className="grid gap-2">
          <Label>Prompt (optional)</Label>
          <Input value={item.prompt ?? ""} onChange={(e) => patch({ prompt: e.target.value })} placeholder="What are they responding to?" />
        </div>
      )}

      {item.kind === "quiz" && <QuizEditor item={item} onChange={onChange} />}
    </div>
  );
}

function QuizEditor({
  item,
  onChange,
}: {
  item: Extract<HomeworkItem, { kind: "quiz" }>;
  onChange: (it: HomeworkItem) => void;
}) {
  const setChoice = (i: number, val: string) => {
    const choices = item.choices.slice();
    choices[i] = val;
    onChange({ ...item, choices });
  };
  const addChoice = () => onChange({ ...item, choices: [...item.choices, ""] });
  const removeChoice = (i: number) => {
    if (item.choices.length <= 2) return;
    const choices = item.choices.filter((_, j) => j !== i);
    const answerIndex = item.answerIndex >= choices.length ? choices.length - 1 : item.answerIndex;
    onChange({ ...item, choices, answerIndex });
  };

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label>Question</Label>
        <Input
          value={item.question}
          onChange={(e) => onChange({ ...item, question: e.target.value })}
          placeholder="Ask something…"
        />
      </div>
      <div className="grid gap-2">
        <Label>Choices (select the correct one)</Label>
        {item.choices.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${item.id}`}
              checked={item.answerIndex === i}
              onChange={() => onChange({ ...item, answerIndex: i })}
              className="accent-primary"
              aria-label={`Mark choice ${i + 1} correct`}
            />
            <Input value={c} onChange={(e) => setChoice(i, e.target.value)} placeholder={`Choice ${i + 1}`} />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeChoice(i)}
              disabled={item.choices.length <= 2}
              aria-label="Remove choice"
            >
              ✕
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addChoice} className="justify-self-start">
          Add choice
        </Button>
      </div>
    </div>
  );
}
