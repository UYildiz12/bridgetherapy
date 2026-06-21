"use client";
import { useState } from "react";
import { AlertTriangle, CircleHelp, HeartPulse, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";

const patterns = [
  {
    id: "478",
    name: "4-7-8 breathing",
    tone: "Settle",
    steps: ["4 seconds in", "7 seconds hold", "8 seconds out"],
    note: "Use when your body feels activated and you want a longer exhale.",
  },
  {
    id: "box",
    name: "Box breathing",
    tone: "Steady",
    steps: ["4 seconds in", "4 seconds hold", "4 seconds out", "4 seconds hold"],
    note: "Use before a session, message, or decision that needs steadier attention.",
  },
  {
    id: "paced",
    name: "Paced breathing",
    tone: "Regulate",
    steps: ["5 seconds in", "5 seconds out"],
    note: "Use for a repeatable two-step rhythm that is easy to keep in public.",
  },
];

const meditations = [
  {
    title: "Grounding scan",
    body: "5 things you can see, 4 things you can feel, 3 sounds, 2 scents, 1 helpful next action.",
  },
  {
    title: "Soft attention",
    body: "Let attention rest on one neutral object. When it wanders, name that gently and return.",
  },
  {
    title: "Thought defusion",
    body: "Prefix a sticky thought with: I am noticing the thought that... Then write the next useful step.",
  },
];

type View = "breathing" | "meditation" | "crisis";

const views = [
  { id: "breathing", label: "Breathing", Icon: Waves },
  { id: "meditation", label: "Meditation", Icon: HeartPulse },
  { id: "crisis", label: "Crisis", Icon: AlertTriangle },
] satisfies { id: View; label: string; Icon: typeof Waves }[];

export default function WellnessPage() {
  const [view, setView] = useState<View>("breathing");
  const [patternId, setPatternId] = useState(patterns[0].id);
  const pattern = patterns.find((item) => item.id === patternId) ?? patterns[0];

  return (
    <section className="space-y-8">
      <div className="border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Reset room</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Wellness</h1>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
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

      {view === "breathing" && (
        <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
          <div className="space-y-2">
            {patterns.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPatternId(item.id)}
                className={`w-full border-l-2 px-4 py-3 text-left transition-colors ${
                  patternId === item.id
                    ? "border-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                <span className="block text-sm font-medium">{item.name}</span>
                <span className="text-xs uppercase tracking-[0.2em]">{item.tone}</span>
              </button>
            ))}
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{pattern.name}</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{pattern.note}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {pattern.steps.map((step, index) => (
                <div key={`${step}-${index}`} className="border-t border-border pt-4">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step {index + 1}</span>
                  <p className="mt-2 text-lg font-medium">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "meditation" && (
        <div className="grid gap-6 md:grid-cols-3">
          {meditations.map((item) => (
            <section key={item.title} className="border-t border-border pt-5">
              <h2 className="text-xl font-semibold tracking-tight">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </section>
          ))}
        </div>
      )}

      {view === "crisis" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <section className="space-y-5 border-t border-border pt-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 text-destructive" />
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Immediate support</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  If you or someone else is in immediate danger, call emergency services now. In the United States,
                  call or text 988 for the Suicide & Crisis Lifeline or use the official chat.
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
              Move away from anything you could use to hurt yourself, stay near another person if possible, and send
              your therapist a message after immediate support is in place.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
