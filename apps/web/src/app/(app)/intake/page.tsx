"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchIntake, saveIntake } from "@/lib/matching/client";
import { CONCERNS, AVAILABILITY } from "@/lib/matching/taxonomy";
import {
  BEHAVIOR_OPTIONS,
  BODY_SENSATION_OPTIONS,
  EMOTION_OPTIONS,
  FREQUENCY_OPTIONS,
  IMPACT_OPTIONS,
  THERAPIST_STYLE_OPTIONS,
  normalizeCbtIntake,
  type CbtIntake,
} from "@/lib/intake/schema";
import { ChipSelect } from "@/components/matching/chip-select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

const SCREENING_PROMPTS: { key: keyof CbtIntake["screening"]; label: string }[] = [
  { key: "lowMood", label: "Low mood or loss of interest" },
  { key: "worry", label: "Worry, tension, or feeling keyed up" },
  { key: "panic", label: "Panic surges or sudden fear spikes" },
  { key: "sleep", label: "Sleep disruption" },
  { key: "avoidance", label: "Avoiding tasks, places, people, or conversations" },
  { key: "concentration", label: "Trouble focusing or making decisions" },
];

const emptyCbtIntake = normalizeCbtIntake(undefined);

export default function IntakePage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [goals, setGoals] = useState("");
  const [cbtIntake, setCbtIntake] = useState<CbtIntake>(emptyCbtIntake);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIntake()
      .then((i) => {
        setConcerns(i.concerns);
        setAvailability(i.availability);
        setGoals(i.goals);
        setCbtIntake(normalizeCbtIntake(i.cbtIntake));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const toggleConcern = (id: string) =>
    setConcerns((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAvailability = (id: string) =>
    setAvailability((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleCbtList = (key: "emotions" | "bodySensations" | "behaviors", id: string) =>
    setCbtIntake((prev) => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter((x) => x !== id) : [...prev[key], id],
    }));
  const toggleStyle = (id: string) =>
    setCbtIntake((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        therapistStyle: prev.preferences.therapistStyle.includes(id)
          ? prev.preferences.therapistStyle.filter((x) => x !== id)
          : [...prev.preferences.therapistStyle, id],
      },
    }));
  const setListFromLines = (key: "primaryProblems" | "strengths", value: string) =>
    setCbtIntake((prev) => ({ ...prev, [key]: value.split("\n") }));
  const setScreening = (key: keyof CbtIntake["screening"], value: number | string) =>
    setCbtIntake((prev) => ({
      ...prev,
      screening: { ...prev.screening, [key]: value },
    }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveIntake({
        concerns,
        availability,
        goals: goals.trim(),
        cbtIntake: normalizeCbtIntake(cbtIntake),
      });
      router.push("/find");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Your intake</h1>
        <p className="text-sm text-muted-foreground">
          Tell us what is happening now. This shapes matching, session prep, and homework.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-6 pt-6">
          <div className="grid gap-2">
            <Label>What would you like to work on?</Label>
            <ChipSelect options={CONCERNS} selected={concerns} onToggle={toggleConcern} />
          </div>
          <div className="grid gap-2">
            <Label>When can you usually meet?</Label>
            <ChipSelect options={AVAILABILITY} selected={availability} onToggle={toggleAvailability} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="primaryProblems">Current problems or patterns</Label>
            <textarea
              id="primaryProblems"
              className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={cbtIntake.primaryProblems.join("\n")}
              onChange={(e) => setListFromLines("primaryProblems", e.target.value)}
              placeholder="One per line"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="recentSituation">A recent situation that captures the problem</Label>
            <textarea
              id="recentSituation"
              className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={cbtIntake.recentSituation}
              onChange={(e) => setCbtIntake((prev) => ({ ...prev, recentSituation: e.target.value }))}
              placeholder="What happened, where were you, and who was involved?"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="automaticThoughts">Thoughts or images that showed up</Label>
            <textarea
              id="automaticThoughts"
              className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={cbtIntake.automaticThoughts}
              onChange={(e) => setCbtIntake((prev) => ({ ...prev, automaticThoughts: e.target.value }))}
              placeholder="Examples: I can't cope, something bad will happen, I messed this up"
            />
          </div>
          <div className="grid gap-2">
            <Label>Emotions</Label>
            <ChipSelect
              options={EMOTION_OPTIONS}
              selected={cbtIntake.emotions}
              onToggle={(id) => toggleCbtList("emotions", id)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Body sensations</Label>
            <ChipSelect
              options={BODY_SENSATION_OPTIONS}
              selected={cbtIntake.bodySensations}
              onToggle={(id) => toggleCbtList("bodySensations", id)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Behaviors that keep the loop going</Label>
            <ChipSelect
              options={BEHAVIOR_OPTIONS}
              selected={cbtIntake.behaviors}
              onToggle={(id) => toggleCbtList("behaviors", id)}
            />
          </div>
          <div className="grid gap-3">
            <Label>Over the last two weeks</Label>
            <div className="grid gap-3">
              {SCREENING_PROMPTS.map((prompt) => (
                <div key={prompt.key} className="grid gap-2 sm:grid-cols-[1fr_220px] sm:items-center">
                  <span className="text-sm text-muted-foreground">{prompt.label}</span>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={String(cbtIntake.screening[prompt.key])}
                    onChange={(e) => setScreening(prompt.key, Number(e.target.value))}
                  >
                    {FREQUENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <div className="grid gap-2 sm:grid-cols-[1fr_220px] sm:items-center">
                <span className="text-sm text-muted-foreground">How much this interferes with life</span>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={cbtIntake.screening.functionalImpact}
                  onChange={(e) => setScreening("functionalImpact", e.target.value)}
                >
                  {IMPACT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            <Label>Safety and support</Label>
            <div className="grid gap-2 sm:grid-cols-[1fr_220px] sm:items-center">
              <span className="text-sm text-muted-foreground">Thoughts of harming yourself</span>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={cbtIntake.safety.selfHarmThoughts}
                onChange={(e) =>
                  setCbtIntake((prev) => ({
                    ...prev,
                    safety: {
                      ...prev.safety,
                      selfHarmThoughts: e.target.value as CbtIntake["safety"]["selfHarmThoughts"],
                    },
                  }))
                }
              >
                <option value="none">None</option>
                <option value="passive">Passive thoughts</option>
                <option value="active">Active thoughts</option>
                <option value="prefer_not_say">Prefer not to say</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Input
                type="checkbox"
                className="size-4"
                checked={cbtIntake.safety.urgentSupportRequested}
                onChange={(e) =>
                  setCbtIntake((prev) => ({
                    ...prev,
                    safety: { ...prev.safety, urgentSupportRequested: e.target.checked },
                  }))
                }
              />
              I would like my therapist to prioritize this during review.
            </label>
            <textarea
              className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={cbtIntake.safety.notes}
              onChange={(e) =>
                setCbtIntake((prev) => ({ ...prev, safety: { ...prev.safety, notes: e.target.value } }))
              }
              placeholder="Support people, warning signs, or context you want noted"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="strengths">Strengths, supports, or coping tools that already help</Label>
            <textarea
              id="strengths"
              className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={cbtIntake.strengths.join("\n")}
              onChange={(e) => setListFromLines("strengths", e.target.value)}
              placeholder="One per line"
            />
          </div>
          <div className="grid gap-2">
            <Label>Therapist style preferences</Label>
            <ChipSelect
              options={THERAPIST_STYLE_OPTIONS}
              selected={cbtIntake.preferences.therapistStyle}
              onToggle={toggleStyle}
            />
          </div>
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="homeworkComfort">Homework comfort</Label>
            <select
              id="homeworkComfort"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={cbtIntake.preferences.homeworkComfort}
              onChange={(e) =>
                setCbtIntake((prev) => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    homeworkComfort: e.target.value as CbtIntake["preferences"]["homeworkComfort"],
                  },
                }))
              }
            >
              <option value="low">Small steps</option>
              <option value="medium">Moderate practice</option>
              <option value="high">Structured homework is okay</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="goals">Anything your therapist should know? (optional)</Label>
            <textarea
              id="goals"
              className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="A sentence or two about your goals"
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div>
        <Button onClick={save} disabled={saving || concerns.length === 0}>
          {saving ? "Saving…" : "Save and find therapists"}
        </Button>
        {concerns.length === 0 && (
          <span className="ml-3 text-xs text-muted-foreground">Pick at least one focus area</span>
        )}
      </div>
    </div>
  );
}
