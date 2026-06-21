"use client";
import { useEffect, useState } from "react";
import {
  fetchMyTherapistProfile,
  saveMyTherapistProfile,
  type TherapistProfileForm,
} from "@/lib/matching/client";
import { CONCERNS, AVAILABILITY } from "@/lib/matching/taxonomy";
import { ChipSelect } from "@/components/matching/chip-select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function TherapistProfilePage() {
  const [p, setP] = useState<TherapistProfileForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchMyTherapistProfile()
      .then(setP)
      .catch(() => setError("Couldn't load your profile."));
  }, []);

  if (error && !p) return <p className="text-sm text-destructive">{error}</p>;
  if (!p) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  const set = (patch: Partial<TherapistProfileForm>) => setP({ ...p, ...patch });
  const toggle = (key: "specialties" | "availability", id: string) =>
    set({ [key]: p[key].includes(id) ? p[key].filter((x) => x !== id) : [...p[key], id] });

  async function save() {
    if (!p) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await saveMyTherapistProfile(p);
      setP(updated);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Your profile</h1>
        <p className="text-sm text-muted-foreground">How patients see you when they are looking for a therapist.</p>
      </div>

      <Card>
        <CardContent className="grid gap-6 pt-6">
          <div className="grid gap-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={p.specialty ?? ""}
              onChange={(e) => set({ specialty: e.target.value })}
              placeholder="e.g. CBT for anxiety and sleep"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={p.bio ?? ""}
              onChange={(e) => set({ bio: e.target.value })}
              placeholder="A short introduction for patients"
            />
          </div>
          <div className="grid gap-2">
            <Label>Specialties</Label>
            <ChipSelect
              options={CONCERNS}
              selected={p.specialties}
              onToggle={(id) => toggle("specialties", id)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Availability</Label>
            <ChipSelect
              options={AVAILABILITY}
              selected={p.availability}
              onToggle={(id) => toggle("availability", id)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={p.acceptingPatients}
              onChange={(e) => set({ acceptingPatients: e.target.checked })}
              className="size-4 accent-primary"
            />
            Accepting new patients
          </label>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
        {savedAt && <span className="text-xs text-muted-foreground">Saved at {savedAt}</span>}
      </div>
    </div>
  );
}
