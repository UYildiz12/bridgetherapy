"use client";
import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { fetchMoodEntries, createMoodEntry, type MoodEntry } from "@/lib/mood-client";
import { useSwrLite } from "@/lib/swr-lite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/app/page-header";
import { BlueprintTrend } from "@/components/app/blueprint-trend";
import { StatBand } from "@/components/app/stat-band";
import { MoodSlider } from "@/components/mood/mood-slider";
import { Skeleton } from "@/components/ui/skeleton";

const SERIF = { fontFamily: "var(--font-instrument-serif), serif" } as const;
const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));
const DAY = 24 * 60 * 60 * 1000;

function shortDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function average(list: MoodEntry[]) {
  if (list.length === 0) return null;
  return list.reduce((sum, e) => sum + e.moodScore, 0) / list.length;
}

/** A tiny 1-10 rail with a marker at the score: the row's blueprint fingerprint. */
function ScoreRail({ score }: { score: number }) {
  const pct = ((score - 1) / 9) * 100;
  return (
    <div aria-hidden className="relative h-px w-24 shrink-0 bg-foreground/20">
      {[0, 50, 100].map((p) => (
        <span
          key={p}
          className="absolute top-[-2px] h-[5px] w-px bg-foreground/25"
          style={{ left: `${p}%` }}
        />
      ))}
      <span
        className="absolute top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground bg-background"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

export default function MoodPage() {
  const { data: entries, error: loadError, update } = useSwrLite("mood-entries", fetchMoodEntries);
  const [score, setScore] = useState<number | null>(null);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      update((prev) => [entry, ...(prev ?? [])]);
      setScore(null);
      setTags("");
      setNotes("");
    } catch {
      setError("Couldn't save that. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // One stable "now" per mount keeps the memo pure; week buckets don't need to
  // tick live.
  const [now] = useState(() => Date.now());

  // Week-over-week reading, computed from whatever history exists.
  const stats = useMemo(() => {
    if (!entries || entries.length === 0) return null;
    const thisWeek = entries.filter((e) => now - new Date(e.createdAt).getTime() < 7 * DAY);
    const lastWeek = entries.filter((e) => {
      const age = now - new Date(e.createdAt).getTime();
      return age >= 7 * DAY && age < 14 * DAY;
    });
    const avgNow = average(thisWeek);
    const avgPrev = average(lastWeek);
    return {
      avgNow,
      delta: avgNow !== null && avgPrev !== null ? avgNow - avgPrev : null,
      weekCount: thisWeek.length,
      total: entries.length,
    };
  }, [entries, now]);

  const trendPoints = useMemo(() => {
    if (!entries || entries.length < 2) return [];
    return entries
      .slice(0, 14)
      .reverse()
      .map((e, i, arr) => ({
        value: e.moodScore,
        label:
          i === 0 || i === arr.length - 1
            ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
                new Date(e.createdAt),
              )
            : undefined,
      }));
  }, [entries]);

  return (
    <div className="grid gap-12">
      <PageHeader
        title="How are you feeling?"
        sub="Slide to anywhere that feels true. Halves and tenths count."
      />

      <form onSubmit={submit} className="grid gap-8">
        <MoodSlider value={score} onChange={setScore} />

        <div className="grid gap-5 border-t border-border pt-7 sm:max-w-2xl">
          <div className="grid gap-5 sm:grid-cols-2">
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
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Button type="submit" disabled={score === null || saving}>
              {saving ? "Saving…" : "Log mood"}
            </Button>
          </div>
        </div>
      </form>

      {stats && (
        <StatBand
          ariaLabel="Mood summary"
          items={[
            {
              label: "7-day average",
              value: stats.avgNow === null ? "n/a" : fmt(Number(stats.avgNow.toFixed(1))),
            },
            {
              label: "vs week before",
              value: stats.delta === null ? "n/a" : fmt(Number(Math.abs(stats.delta).toFixed(1))),
              icon:
                stats.delta === null ? undefined : stats.delta >= 0 ? (
                  <TrendingUp className="size-4" aria-hidden />
                ) : (
                  <TrendingDown className="size-4" aria-hidden />
                ),
            },
            { label: "This week", value: String(stats.weekCount) },
            { label: "All time", value: String(stats.total) },
          ]}
        />
      )}

      {trendPoints.length >= 2 && (
        <section className="grid gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl">Your trend</h2>
            <p className="text-xs text-muted-foreground">
              Last {trendPoints.length} check-ins, scored 1 to 10
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <BlueprintTrend points={trendPoints} />
          </div>
        </section>
      )}

      <section className="grid gap-4">
        <h2 className="text-xl">Recent check-ins</h2>

        {entries === null && !loadError && (
          <div className="grid gap-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-2/3 rounded-xl" />
          </div>
        )}

        {entries === null && loadError && (
          <p className="text-sm text-muted-foreground">Couldn&apos;t load your history. Refresh to try again.</p>
        )}

        {entries && entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No check-ins yet. Log your first one above.</p>
        )}

        {entries && entries.length > 0 && (
          <div className="grid">
            {entries.map((m) => (
              <div
                key={m.id}
                className="grid grid-cols-[3.5rem_1fr] items-start gap-x-4 gap-y-2 border-b border-border py-4 sm:grid-cols-[3.5rem_1fr_auto]"
              >
                <span className="sr-only">Mood {fmt(m.moodScore)}/10</span>
                <p aria-hidden className="text-3xl leading-none tabular-nums" style={SERIF}>
                  {fmt(m.moodScore)}
                  <span className="ml-0.5 align-baseline text-xs text-muted-foreground/70">/10</span>
                </p>
                <div className="grid gap-1.5">
                  <p className="text-xs text-muted-foreground">{shortDate(m.createdAt)}</p>
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
                  {m.notes && <p className="text-sm leading-6 text-muted-foreground">{m.notes}</p>}
                </div>
                <div className="col-span-2 pt-1 sm:col-span-1 sm:self-center sm:pt-0">
                  <ScoreRail score={m.moodScore} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
