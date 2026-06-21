"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchIntake, saveIntake } from "@/lib/matching/client";
import { CONCERNS, AVAILABILITY } from "@/lib/matching/taxonomy";
import { ChipSelect } from "@/components/matching/chip-select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function IntakePage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [goals, setGoals] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIntake()
      .then((i) => {
        setConcerns(i.concerns);
        setAvailability(i.availability);
        setGoals(i.goals);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const toggleConcern = (id: string) =>
    setConcerns((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAvailability = (id: string) =>
    setAvailability((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveIntake({ concerns, availability, goals: goals.trim() });
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
          Tell us what you are looking for. This shapes who we match you with.
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
