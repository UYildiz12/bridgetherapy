"use client";
import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Phase {
  label: string;
  seconds: number;
  scale: number;
}
interface Pattern {
  id: string;
  name: string;
  tone: string;
  benefit: string;
  whenToUse: string;
  phases: Phase[];
}

const PATTERNS: Pattern[] = [
  {
    id: "box",
    name: "Box breathing",
    tone: "Steady",
    benefit: "An even rhythm that settles the nervous system for steadier attention.",
    whenToUse: "Before a session, a hard message, or a decision that needs focus.",
    phases: [
      { label: "Breathe in", seconds: 4, scale: 1 },
      { label: "Hold", seconds: 4, scale: 1 },
      { label: "Breathe out", seconds: 4, scale: 0.5 },
      { label: "Hold", seconds: 4, scale: 0.5 },
    ],
  },
  {
    id: "478",
    name: "4-7-8 breathing",
    tone: "Settle",
    benefit: "A long exhale signals the body that it is safe to stand down.",
    whenToUse: "When you feel activated or panicky, or to wind down for sleep.",
    phases: [
      { label: "Breathe in", seconds: 4, scale: 1 },
      { label: "Hold", seconds: 7, scale: 1 },
      { label: "Breathe out", seconds: 8, scale: 0.5 },
    ],
  },
  {
    id: "coherent",
    name: "Coherent breathing",
    tone: "Balance",
    benefit: "A smooth five-and-five rhythm that is easy to sustain for minutes.",
    whenToUse: "For a steady, repeatable calm you can keep almost anywhere.",
    phases: [
      { label: "Breathe in", seconds: 5, scale: 1 },
      { label: "Breathe out", seconds: 5, scale: 0.5 },
    ],
  },
  {
    id: "exhale",
    name: "Extended exhale",
    tone: "Soften",
    benefit: "Lengthening only the out-breath gently lowers arousal, no holds.",
    whenToUse: "When you want to downshift without holding your breath.",
    phases: [
      { label: "Breathe in", seconds: 4, scale: 1 },
      { label: "Breathe out", seconds: 6, scale: 0.5 },
    ],
  },
];

export function BreathingGuide() {
  const [patternId, setPatternId] = useState(PATTERNS[0].id);
  const pattern = PATTERNS.find((p) => p.id === patternId) ?? PATTERNS[0];
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [remaining, setRemaining] = useState(pattern.phases[0].seconds);
  const [cycles, setCycles] = useState(0);

  // Drive the current phase: a per-second countdown and a hand-off to the next phase.
  useEffect(() => {
    if (!running) return;
    const phases = pattern.phases;
    const tick = setInterval(() => setRemaining((r) => (r > 1 ? r - 1 : r)), 1000);
    const advance = setTimeout(() => {
      const next = (phaseIdx + 1) % phases.length;
      setRemaining(phases[next].seconds);
      if (next === 0) setCycles((c) => c + 1);
      setPhaseIdx(next);
    }, phases[phaseIdx].seconds * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(advance);
    };
  }, [running, phaseIdx, patternId, pattern.phases]);

  function selectPattern(id: string) {
    const nextPattern = PATTERNS.find((p) => p.id === id) ?? PATTERNS[0];
    setPatternId(nextPattern.id);
    setRunning(false);
    setPhaseIdx(0);
    setRemaining(nextPattern.phases[0].seconds);
    setCycles(0);
  }

  function toggleRunning() {
    setRunning((isRunning) => {
      if (!isRunning) setRemaining(pattern.phases[phaseIdx].seconds);
      return !isRunning;
    });
  }

  function reset() {
    setRunning(false);
    setPhaseIdx(0);
    setRemaining(pattern.phases[0].seconds);
    setCycles(0);
  }

  const phase = pattern.phases[phaseIdx];
  const scale = running ? phase.scale : 0.68;
  const duration = running ? phase.seconds : 0.6;

  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
      <div className="grid content-start gap-2">
        {PATTERNS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectPattern(p.id)}
            className={`w-full border-l-2 px-4 py-3 text-left transition-colors ${
              patternId === p.id
                ? "border-primary bg-primary/10"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            <span className="block text-sm font-medium">{p.name}</span>
            <span className="text-xs uppercase tracking-[0.2em]">{p.tone}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6">
        <div className="flex flex-col items-center justify-center gap-7 rounded-2xl border border-white/10 bg-white/[0.03] py-10">
          <div className="relative grid h-64 w-64 place-items-center">
            <div
              className="absolute size-64 rounded-full bg-foreground/[0.07]"
              style={{
                transform: `scale(${scale})`,
                transition: `transform ${duration}s ${running ? "ease-in-out" : "ease"}`,
                boxShadow: "0 0 70px rgba(255,255,255,0.14)",
              }}
            />
            <div
              className="absolute size-64 rounded-full border border-foreground/25"
              style={{
                transform: `scale(${scale})`,
                transition: `transform ${duration}s ${running ? "ease-in-out" : "ease"}`,
              }}
            />
            <div className="relative z-10 text-center">
              <p className="text-base font-medium" aria-live="polite">
                {running ? phase.label : "Ready"}
              </p>
              <p
                className="mt-1 text-5xl leading-none tabular-nums"
                style={{ fontFamily: "var(--font-instrument-serif), serif" }}
              >
                {running ? remaining : pattern.phases[0].seconds}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button type="button" onClick={toggleRunning} className="gap-1.5">
              {running ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
              {running ? "Pause" : "Start"}
            </Button>
            <Button type="button" variant="outline" onClick={reset} className="gap-1.5">
              <RotateCcw size={15} aria-hidden /> Reset
            </Button>
            <span className="text-sm text-muted-foreground">
              {cycles} cycle{cycles === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium">{pattern.name}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{pattern.benefit}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            <span className="text-foreground">When to use. </span>
            {pattern.whenToUse}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {pattern.phases.map((ph, i) => (
              <span
                key={`${ph.label}-${i}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
              >
                {ph.label} - {ph.seconds}s
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
