import { Check } from "lucide-react";
import type { HomeworkItem, ItemResponse } from "@/lib/homework/schema";
import { ITEM_KIND_LABELS, isItemComplete } from "@/lib/homework/schema";
import { mediaUrl } from "@/lib/homework/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Read-only render of an item plus the patient's response, for therapist review. */
export function ItemReview({ item, response }: { item: HomeworkItem; response?: ItemResponse }) {
  const r: ItemResponse = response ?? { done: false };
  const complete = isItemComplete(item, r);

  return (
    <Card>
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
      <CardContent className="grid gap-2 text-sm">
        {item.kind === "task" && (
          <p className="text-muted-foreground">{r.done ? "Marked done." : "Not done yet."}</p>
        )}
        {item.kind === "reading" && (
          <p className="text-muted-foreground">{r.done ? "Marked as read." : "Not read yet."}</p>
        )}
        {item.kind === "writing" &&
          (r.text?.trim() ? (
            <p className="whitespace-pre-wrap text-foreground/90">{r.text}</p>
          ) : (
            <p className="text-muted-foreground">No response yet.</p>
          ))}
        {item.kind === "quiz" && <QuizAnswer item={item} choiceIndex={r.choiceIndex} />}
        {item.kind === "voice" &&
          (r.mediaId ? (
            <audio controls src={mediaUrl(r.mediaId)} className="w-full" />
          ) : (
            <p className="text-muted-foreground">No recording yet.</p>
          ))}
        {item.kind === "drawing" &&
          (r.mediaId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(r.mediaId)} alt="Patient drawing" className="w-full rounded-md border border-border" />
          ) : (
            <p className="text-muted-foreground">No drawing yet.</p>
          ))}
      </CardContent>
    </Card>
  );
}

function QuizAnswer({
  item,
  choiceIndex,
}: {
  item: Extract<HomeworkItem, { kind: "quiz" }>;
  choiceIndex?: number;
}) {
  if (typeof choiceIndex !== "number") {
    return <p className="text-muted-foreground">Not answered yet.</p>;
  }
  const correct = choiceIndex === item.answerIndex;
  return (
    <div className="grid gap-1">
      <p className="text-foreground/90">Answered: {item.choices[choiceIndex]}</p>
      <p className={correct ? "text-foreground" : "text-destructive"}>
        {correct ? "Correct" : `Correct answer: ${item.choices[item.answerIndex]}`}
      </p>
    </div>
  );
}
