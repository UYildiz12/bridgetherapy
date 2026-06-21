"use client";
import { useEffect, useState } from "react";
import { fetchMoodEntries, createMoodEntry, type MoodEntry } from "@/lib/mood-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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
    <div className="grid gap-8">
      <section>
        <h1 className="mb-1 text-2xl font-semibold">How are you feeling?</h1>
        <p className="mb-5 text-sm text-muted-foreground">Log a quick check-in. 1 = low, 10 = great.</p>
        <Card>
          <CardContent>
            <form onSubmit={submit} className="grid gap-5">
              <div className="grid gap-2">
                <Label>Today&apos;s mood</Label>
                <div className="flex flex-wrap gap-2">
                  {SCORES.map((n) => (
                    <Button
                      key={n}
                      type="button"
                      variant={score === n ? "default" : "outline"}
                      size="icon"
                      onClick={() => setScore(n)}
                      aria-pressed={score === n}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 · low</span>
                  <span>10 · great</span>
                </div>
              </div>
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
                  className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
            </form>
          </CardContent>
        </Card>
      </section>

      {entries.length > 1 && (
        <section>
          <h2 className="mb-3 text-lg font-medium">Your trend</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="flex h-24 items-end gap-1.5">
                {entries
                  .slice(0, 14)
                  .reverse()
                  .map((m) => (
                    <div
                      key={m.id}
                      className="flex-1 rounded-t bg-primary/80"
                      style={{ height: `${Math.max(m.moodScore * 10, 6)}%` }}
                      title={`${m.moodScore}/10`}
                    />
                  ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Last {Math.min(entries.length, 14)} check-ins
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium">Recent check-ins</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No check-ins yet. Log your first one above.</p>
        ) : (
          <div className="grid gap-3">
            {entries.map((m) => (
              <Card key={m.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>Mood {m.moodScore}/10</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                {(m.notes || m.tags.length > 0) && (
                  <CardContent className="grid gap-2 text-sm">
                    {m.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {m.tags.map((t) => (
                          <span key={t} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.notes && <p className="text-muted-foreground">{m.notes}</p>}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
