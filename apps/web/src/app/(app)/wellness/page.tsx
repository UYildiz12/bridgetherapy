"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, BookOpen, CircleHelp, Clapperboard, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";

// Each tab loads its own chunk on demand, so opening Wellness ships only the
// active view's code instead of all four at once.
const tabLoading = () => (
  <div className="grid gap-4">
    <Skeleton className="h-40 w-full rounded-2xl" />
    <Skeleton className="h-40 w-full rounded-2xl" />
  </div>
);
const VideoLibrary = dynamic(
  () => import("@/components/wellness/video-library").then((m) => m.VideoLibrary),
  { loading: tabLoading },
);
const BreathingGuide = dynamic(
  () => import("@/components/wellness/breathing-guide").then((m) => m.BreathingGuide),
  { loading: tabLoading },
);
const LearnModules = dynamic(
  () => import("@/components/wellness/learn-modules").then((m) => m.LearnModules),
  { loading: tabLoading },
);
const QuickPractices = dynamic(
  () => import("@/components/wellness/quick-practices").then((m) => m.QuickPractices),
  { loading: tabLoading },
);

type View = "watch" | "practice" | "learn" | "crisis";

const views = [
  { id: "watch", label: "Watch", Icon: Clapperboard },
  { id: "practice", label: "Practice", Icon: Waves },
  { id: "learn", label: "Learn", Icon: BookOpen },
  { id: "crisis", label: "Crisis", Icon: AlertTriangle },
] satisfies { id: View; label: string; Icon: typeof Waves }[];

export default function WellnessPage() {
  const [view, setView] = useState<View>("watch");

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Wellness"
        sub="A calm place to watch, breathe, and learn between sessions."
      />

      <div className="grid gap-2 sm:grid-cols-4">
        {views.map(({ id, label, Icon }) => (
          <Button
            key={id}
            type="button"
            variant={view === id ? "default" : "outline"}
            onClick={() => setView(id)}
            className="justify-start"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {view === "watch" && <VideoLibrary />}

      {view === "practice" && (
        <div className="grid gap-12">
          <div className="grid gap-4">
            <div className="grid gap-1">
              <h2 className="text-xl">Guided breathing</h2>
              <p className="max-w-prose text-sm text-muted-foreground">
                Pick a rhythm, press start, and follow the circle as it grows and shrinks.
              </p>
            </div>
            <BreathingGuide />
          </div>

          <section className="grid gap-4">
            <h2 className="text-xl">Quick practices</h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              Short, guided exercises you can actually do right now. Tap one to begin; most take a
              minute or two.
            </p>
            <QuickPractices />
          </section>
        </div>
      )}

      {view === "learn" && <LearnModules />}

      {view === "crisis" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <section className="space-y-5 border-t border-border pt-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 text-destructive" />
              <div>
                <h2 className="text-2xl">Immediate support</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  If you or someone else is in immediate danger, call emergency services now. In the
                  United States, call or text 988 for the Suicide & Crisis Lifeline or use the official
                  chat.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href="tel:988">Call 988</a>
              </Button>
              <Button asChild variant="outline">
                <a href="sms:988">Text 988</a>
              </Button>
              <Button asChild variant="outline">
                <a href="https://chat.988lifeline.org/" target="_blank" rel="noreferrer">
                  Chat with 988
                </a>
              </Button>
            </div>
          </section>

          <aside className="space-y-3 border-t border-border pt-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CircleHelp className="h-4 w-4" />
              While waiting
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Move away from anything you could use to hurt yourself, stay near another person if
              possible, and send your therapist a message after immediate support is in place.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
