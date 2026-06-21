"use client";
import { useEffect, useState } from "react";
import { fetchMoodEntries, createMoodEntry, type MoodEntry } from "@/lib/mood-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
            <form onSubmit={submit} className="grid gap-4">
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
              <input
                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="Tags (comma separated): tired, hopeful"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <textarea
                className="min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="Anything you want to note? (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div>
                <Button type="submit" disabled={score === null || saving}>
                  {saving ? "Saving…" : "Log mood"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Recent check-ins</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet — log your first above.</p>
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
