"use client";
import { Check } from "lucide-react";
import type { HomeworkItem, ItemResponse } from "@/lib/homework/schema";
import { ITEM_KIND_LABELS, isItemComplete } from "@/lib/homework/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VoiceRecorder } from "./voice-recorder";
import { DrawingPad } from "./drawing-pad";

/** Renders one homework item interactively and reports the patient's response. */
export function ItemDo({
  item,
  response,
  onChange,
}: {
  item: HomeworkItem;
  response: ItemResponse;
  onChange: (r: ItemResponse) => void;
}) {
  const complete = isItemComplete(item, response);
  const set = (patch: Partial<ItemResponse>) => onChange({ ...response, ...patch });

  return (
    <Card className={complete ? "border-foreground/30" : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-0.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {ITEM_KIND_LABELS[item.kind]}
            </span>
            <CardTitle className="text-base">{item.title}</CardTitle>
          </div>
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
              complete
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground"
            }`}
          >
            {complete && <Check size={14} strokeWidth={3} />}
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {item.kind === "task" && (
          <>
            {item.detail && <p className="text-sm text-muted-foreground">{item.detail}</p>}
            <ToggleDone done={response.done} label="Mark done" onToggle={() => set({ done: !response.done })} />
          </>
        )}

        {item.kind === "reading" && (
          <>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{item.body}</p>
            <ToggleDone done={response.done} label="Mark as read" onToggle={() => set({ done: !response.done })} />
          </>
        )}

        {item.kind === "writing" && (
          <>
            {item.prompt && <p className="text-sm text-muted-foreground">{item.prompt}</p>}
            <textarea
              className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="Write your response…"
              value={response.text ?? ""}
              onChange={(e) => set({ text: e.target.value })}
            />
          </>
        )}

        {item.kind === "quiz" && (
          <Quiz item={item} choiceIndex={response.choiceIndex} onPick={(i) => set({ choiceIndex: i })} />
        )}

        {item.kind === "voice" && (
          <>
            {item.prompt && <p className="text-sm text-muted-foreground">{item.prompt}</p>}
            <VoiceRecorder value={response.mediaId} onChange={(id) => set({ mediaId: id })} />
          </>
        )}

        {item.kind === "drawing" && (
          <>
            {item.prompt && <p className="text-sm text-muted-foreground">{item.prompt}</p>}
            <DrawingPad value={response.mediaId} onChange={(id) => set({ mediaId: id })} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ToggleDone({ done, label, onToggle }: { done: boolean; label: string; onToggle: () => void }) {
  return (
    <Button
      type="button"
      variant={done ? "default" : "outline"}
      size="sm"
      onClick={onToggle}
      className="justify-self-start"
    >
      {done ? "Done" : label}
    </Button>
  );
}

function Quiz({
  item,
  choiceIndex,
  onPick,
}: {
  item: Extract<HomeworkItem, { kind: "quiz" }>;
  choiceIndex?: number;
  onPick: (i: number) => void;
}) {
  const answered = typeof choiceIndex === "number";
  return (
    <div className="grid gap-2">
      <p className="text-sm text-foreground/90">{item.question}</p>
      <div className="grid gap-2">
        {item.choices.map((c, i) => {
          const picked = choiceIndex === i;
          const correct = i === item.answerIndex;
          let cls = "border-border hover:border-foreground/30";
          if (answered && picked && correct) cls = "border-foreground/60 bg-foreground/10 text-foreground";
          else if (answered && picked && !correct) cls = "border-destructive/50 bg-destructive/10 text-destructive";
          else if (answered && correct) cls = "border-foreground/40";
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(i)}
              className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${cls}`}
            >
              {c}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className="text-xs text-muted-foreground">
          {choiceIndex === item.answerIndex
            ? "Correct."
            : `The right answer is "${item.choices[item.answerIndex]}".`}
        </p>
      )}
    </div>
  );
}
