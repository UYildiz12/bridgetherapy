"use client";
import { useEffect, useState } from "react";
import { fetchMoodEntries, createMoodEntry, type MoodEntry } from "@/lib/mood-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/app/page-header";
import { MoodSlider } from "@/components/mood/mood-slider";

const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

export default function MoodPage() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMoodEntries().then(setEntries).catch(() => setError("Couldn't load your history."));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (score === null) return;
    setSaving(true);
    setError(null);
    try {
      const entry = await createMoodEntry({
        moodScore: score,
        notes: notes.trim() || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setEntries((prev) => [entry, ...prev]);
      setScore(null);
      setTags("");
      setNotes("");
    } catch {
      setError("Couldn't save that. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-12">
      <PageHeader title="How are you feeling?" sub="Slide to anywhere that feels true. Halves and tenths count." />

      <form onSubmit={submit} className="grid gap-8">
        <MoodSlider value={score} onChange={setScore} />

        <div className="grid gap-5 border-t border-border pt-7 sm:max-w-xl">
          <div className="grid gap-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="tired, hopeful"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="Anything you want to note?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Button type="submit" disabled={score === null || saving}>
              {saving ? "Saving…" : "Log mood"}
            </Button>
          </div>
        </div>
      </form>

      {entries.length > 1 && (
        <section className="grid gap-4">
          <h2 className="text-xl">Your trend</h2>
          <div className="flex h-32 items-end gap-1.5 border-b border-border pb-px">
            {entries
              .slice(0, 14)
              .reverse()
              .map((m) => (
                <div
                  key={m.id}
                  className="flex-1 rounded-t bg-primary/80 transition-colors hover:bg-primary"
                  style={{ height: `${Math.max(m.moodScore * 10, 6)}%` }}
                  title={`${fmt(m.moodScore)}/10`}
                />
              ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Last {Math.min(entries.length, 14)} check-ins · scored 1 to 10
          </p>
        </section>
      )}

      <section className="grid gap-4">
        <h2 className="text-xl">Recent check-ins</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No check-ins yet. Log your first one above.</p>
        ) : (
          <div className="grid">
            {entries.map((m) => (
              <div key={m.id} className="grid gap-2 border-b border-border py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">Mood {fmt(m.moodScore)}/10</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                </div>
                {m.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {m.notes && <p className="text-sm text-muted-foreground">{m.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
