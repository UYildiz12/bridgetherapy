"use client";
// TEMPORARY visual-audit page (public, no auth) so the dark app UI can be seen
// without logging in. Delete after the design pass.
import { useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/homework/status-badge";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { MoodSlider } from "@/components/mood/mood-slider";

const LINKS = [
  { title: "Mood check-in", desc: "Log how you feel and watch the trend build over time." },
  { title: "Homework", desc: "Work through the sets your therapist assigned." },
  { title: "Find a therapist", desc: "Browse matched therapists and request to connect." },
];

export default function UiPreview() {
  const [mood, setMood] = useState<number | null>(7.4);
  return (
    <div className="app-shell dark min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <span className="font-semibold tracking-tight">exhale</span>
          <span className="text-sm text-muted-foreground">UI preview</span>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-10 px-6 py-10">
        <div className="grid gap-8">
          <PageHeader title="Welcome back, Umur" sub="A calm space to check in with yourself." />
          <nav className="grid">
            {LINKS.map((l) => (
              <Link
                key={l.title}
                href="#"
                className="group flex items-center justify-between gap-6 border-b border-border py-5 no-underline"
              >
                <div className="grid gap-1">
                  <span className="text-lg font-medium">{l.title}</span>
                  <span className="text-sm text-muted-foreground">{l.desc}</span>
                </div>
                <span className="text-muted-foreground" aria-hidden>→</span>
              </Link>
            ))}
          </nav>
        </div>

        <section className="grid gap-6">
          <h2 className="text-xl">Mood slider</h2>
          <MoodSlider value={mood} onChange={setMood} />
        </section>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base">Cognitive restructuring</CardTitle>
              <StatusBadge status="IN_PROGRESS" />
            </div>
            <CardDescription>From Dr. Okafor</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full w-2/3 rounded-full bg-primary" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <Button key={n} variant={n === 7 ? "default" : "outline"} size="icon">
                  {n}
                </Button>
              ))}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="x">Notes</Label>
              <Input id="x" placeholder="Anything you want to note?" />
            </div>
            <div className="flex gap-3">
              <Button>Log mood</Button>
              <Button variant="outline">Save</Button>
              <Button variant="ghost">Cancel</Button>
            </div>
          </CardContent>
        </Card>

        <EmptyState
          icon={<ClipboardList size={18} strokeWidth={1.75} />}
          title="No homework yet"
          hint="Sets your therapist assigns will show up here."
        />
      </main>
    </div>
  );
}
