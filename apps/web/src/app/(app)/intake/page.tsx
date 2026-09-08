"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ClipboardList, HeartPulse, LifeBuoy, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChipSelect } from "@/components/matching/chip-select";
import { fetchIntake, saveIntake } from "@/lib/matching/client";
import { CONCERNS, AVAILABILITY, concernLabel, availabilityLabel } from "@/lib/matching/taxonomy";
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

const SCREENING_PROMPTS: { key: keyof CbtIntake["screening"]; label: string }[] = [
  { key: "lowMood", label: "Low mood or loss of interest" },
  { key: "worry", label: "Worry, tension, or feeling keyed up" },
  { key: "panic", label: "Panic surges or sudden fear spikes" },
  { key: "sleep", label: "Sleep disruption" },
  { key: "avoidance", label: "Avoiding tasks, places, people, or conversations" },
  { key: "concentration", label: "Trouble focusing or making decisions" },
];

const emptyCbtIntake = normalizeCbtIntake(undefined);

const MATCHING_LENSES = [
  "Focus areas",
  "Availability",
  "CBT loop",
  "Therapist style",
] as const;

const STEPS = [
  {
    title: "Start with what brings you here",
    intro: "Pick the focus areas that should guide therapist matching first.",
    short: "Focus",
  },
  {
    title: "Fit therapy into your week",
    intro: "A good match also needs to work with your time and practice style.",
    short: "Schedule",
  },
  {
    title: "Map the loop",
    intro: "CBT starts by making the situation, thought, feeling, and response visible.",
    short: "Loop",
  },
  {
    title: "Name the signals",
    intro: "Select the emotional, body, and behavior patterns that show up most often.",
    short: "Signals",
  },
  {
    title: "Scan the last two weeks",
    intro: "These screening-style prompts help your therapist understand intensity and impact.",
    short: "Scan",
  },
  {
    title: "Add safety and support context",
    intro: "This is not crisis support, but it helps your therapist review the intake responsibly.",
    short: "Support",
  },
  {
    title: "Choose the therapeutic fit",
    intro: "Tell us what kind of therapist presence and homework rhythm would help.",
    short: "Style",
  },
  {
    title: "Review and find your match",
    intro: "Your answers become therapist matching inputs and a clearer first-session brief.",
    short: "Review",
  },
] as const;

function splitLines(value: string) {
  return value.split("\n");
}

function previewList(items: string[], label: (id: string) => string) {
  if (!items.length) return "Not selected yet";
  return items.slice(0, 3).map(label).join(", ") + (items.length > 3 ? ` +${items.length - 3}` : "");
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  minHeight = "min-h-28",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  minHeight?: string;
}) {
  return (
    <div className="grid gap-3">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <textarea
        id={id}
        className={`${minHeight} w-full resize-y border-0 border-b border-border bg-transparent px-0 py-3 text-base leading-7 outline-none placeholder:text-muted-foreground focus-visible:border-foreground/50`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  );
}

// Shown inline as soon as someone tells us about self-harm thoughts, so the
// resources are right there instead of a page away.
function InlineCrisisSupport() {
  return (
    <div role="status" className="grid gap-4 border-l-2 border-foreground/40 bg-foreground/[0.03] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <LifeBuoy className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="grid gap-1">
          <p className="text-sm font-medium">Support is available right now</p>
          <p className="text-sm leading-6 text-muted-foreground">
            Thank you for sharing this. You don&apos;t have to wait for a therapist match — the 988
            Suicide & Crisis Lifeline is free, confidential, and open around the clock.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <a href="tel:988">Call 988</a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href="sms:741741">Text HOME to 741741</a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href="https://chat.988lifeline.org/" target="_blank" rel="noreferrer">
            Chat with 988
          </a>
        </Button>
      </div>
      <Link
        href="/wellness?tab=crisis"
        className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      >
        See all crisis resources
      </Link>
    </div>
  );
}

function BlueprintVisual({
  step,
  concerns,
  availability,
}: {
  step: number;
  concerns: string[];
  availability: string[];
}) {
  const lensValues = [
    previewList(concerns, concernLabel),
    previewList(availability, availabilityLabel),
    step >= 2 ? "Situation, thoughts, signals" : "Coming in chapter 3",
    step >= 6 ? "Preference signals" : "Captured near the end",
  ];

  return (
    <figure className="relative min-h-[28rem] overflow-hidden border border-border bg-[#071015] text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
      <Image
        src="/images/intake-blueprint.png"
        alt="Therapy match blueprint"
        fill
        priority
        sizes="(min-width: 1024px) 31rem, 100vw"
        className="object-cover opacity-70"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,12,18,0.95),rgba(5,12,18,0.42)_58%,rgba(5,12,18,0.7))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-cyan-100/45" />
      <div className="relative flex min-h-[28rem] flex-col justify-between gap-8 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-cyan-100/75">Generated blueprint artwork</p>
            <p className="mt-3 max-w-64 text-2xl font-semibold leading-tight tracking-tight">
              Your match takes shape as you answer.
            </p>
          </div>
          <div className="flex size-12 shrink-0 items-center justify-center border border-cyan-100/45 bg-cyan-100/10 text-cyan-50">
            <Route className="size-5" aria-hidden="true" />
          </div>
        </div>

        <div className="grid gap-2">
          {MATCHING_LENSES.map((label, index) => (
            <div
              key={label}
              className={`grid gap-2 border-l px-3 py-2 backdrop-blur-sm sm:grid-cols-[8rem_1fr] ${
                index <= Math.min(step, MATCHING_LENSES.length - 1)
                  ? "border-cyan-100/70 bg-cyan-100/10"
                  : "border-white/18 bg-white/[0.035]"
              }`}
            >
              <p className="text-sm font-medium text-cyan-50">{label}</p>
              <p className="text-sm leading-6 text-cyan-50/72">{lensValues[index]}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between text-xs text-cyan-50/70">
            <span>Matching blueprint</span>
            <span>{STEPS[step].short}</span>
          </div>
          <div className="grid grid-cols-4 gap-2" aria-hidden="true">
            {STEPS.map((item, index) => (
              <div
                key={item.short}
                className={`h-1.5 ${index <= step ? "bg-cyan-100" : "bg-cyan-100/18"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

export default function IntakePage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [goals, setGoals] = useState("");
  const [cbtIntake, setCbtIntake] = useState<CbtIntake>(emptyCbtIntake);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);
  const isLastStep = step === STEPS.length - 1;
  const canContinue = step !== 0 || concerns.length > 0;

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
    setCbtIntake((prev) => ({ ...prev, [key]: splitLines(value) }));
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

  function continueFlow() {
    if (!canContinue) return;
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  if (!loaded) {
    return (
      <div className="grid gap-5">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <section className="relative overflow-hidden border-y border-border py-8 md:py-10">
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(40,85,105,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(40,85,105,0.08)_1px,transparent_1px)] bg-[size:32px_32px]"
          aria-hidden="true"
        />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,31rem)]">
          <div>
            <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <ClipboardList className="size-4" aria-hidden="true" />
                Answer in chapters
              </span>
              <span>Step {step + 1} of {STEPS.length}</span>
            </div>
            <h1 className="max-w-4xl text-[clamp(2.35rem,6vw,4.75rem)] font-semibold leading-[0.98] tracking-tight">
              {STEPS[step].title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{STEPS[step].intro}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              A chaptered intake that feels like a conversation, while still giving matching enough signal to work.
            </p>
            <div className="mt-8 h-1.5 w-full max-w-2xl bg-foreground/10" aria-hidden="true">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <BlueprintVisual step={step} concerns={concerns} availability={availability} />
        </div>
      </section>

      <section className="grid gap-8 py-10 lg:grid-cols-[13rem_1fr]">
        <aside className="hidden lg:block">
          <ol className="sticky top-24 grid gap-3">
            {STEPS.map((item, index) => (
              <li key={item.short}>
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  className={`w-full border-l py-2 pl-4 text-left text-sm transition-colors ${
                    index === step
                      ? "border-foreground text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/60 hover:text-foreground"
                  }`}
                >
                  {item.short}
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <div className="min-w-0">
          <div className="min-h-[28rem] border-y border-border py-8">
            {step === 0 && (
              <div className="grid gap-5">
                <p className="text-sm leading-6 text-muted-foreground">
                  Choose all that apply. These become the strongest signals in therapist matching.
                </p>
                <ChipSelect options={CONCERNS} selected={concerns} onToggle={toggleConcern} />
                {concerns.length === 0 && (
                  <p className="text-sm text-muted-foreground">Pick at least one focus area to continue.</p>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-8">
                <div className="grid gap-4">
                  <FieldLabel>When can you usually meet?</FieldLabel>
                  <ChipSelect options={AVAILABILITY} selected={availability} onToggle={toggleAvailability} />
                </div>
                <div className="grid gap-3 sm:max-w-sm">
                  <FieldLabel htmlFor="homeworkComfort">Homework comfort</FieldLabel>
                  <select
                    id="homeworkComfort"
                    className="h-10 border border-input bg-background px-3 text-sm"
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
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-8">
                <TextAreaField
                  id="primaryProblems"
                  label="Current problems or patterns"
                  value={cbtIntake.primaryProblems.join("\n")}
                  onChange={(value) => setListFromLines("primaryProblems", value)}
                  placeholder="One per line"
                  maxLength={2400}
                />
                <TextAreaField
                  id="recentSituation"
                  label="A recent situation that captures the problem"
                  value={cbtIntake.recentSituation}
                  onChange={(value) => setCbtIntake((prev) => ({ ...prev, recentSituation: value }))}
                  placeholder="What happened, where were you, and who was involved?"
                  maxLength={1200}
                />
                <TextAreaField
                  id="automaticThoughts"
                  label="Thoughts or images that showed up"
                  value={cbtIntake.automaticThoughts}
                  onChange={(value) => setCbtIntake((prev) => ({ ...prev, automaticThoughts: value }))}
                  placeholder="Examples: I can't cope, something bad will happen, I messed this up"
                  maxLength={1200}
                />
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-8">
                <div className="grid gap-4">
                  <FieldLabel>Emotions</FieldLabel>
                  <ChipSelect
                    options={EMOTION_OPTIONS}
                    selected={cbtIntake.emotions}
                    onToggle={(id) => toggleCbtList("emotions", id)}
                  />
                </div>
                <div className="grid gap-4">
                  <FieldLabel>Body sensations</FieldLabel>
                  <ChipSelect
                    options={BODY_SENSATION_OPTIONS}
                    selected={cbtIntake.bodySensations}
                    onToggle={(id) => toggleCbtList("bodySensations", id)}
                  />
                </div>
                <div className="grid gap-4">
                  <FieldLabel>Behaviors that keep the loop going</FieldLabel>
                  <ChipSelect
                    options={BEHAVIOR_OPTIONS}
                    selected={cbtIntake.behaviors}
                    onToggle={(id) => toggleCbtList("behaviors", id)}
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="grid gap-4">
                {SCREENING_PROMPTS.map((prompt) => (
                  <div key={prompt.key} className="grid gap-3 border-b border-border/70 py-4 sm:grid-cols-[1fr_240px] sm:items-center">
                    <FieldLabel htmlFor={`screening-${prompt.key}`}>{prompt.label}</FieldLabel>
                    <select
                      id={`screening-${prompt.key}`}
                      className="h-10 border border-input bg-background px-3 text-sm"
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
                <div className="grid gap-3 py-4 sm:grid-cols-[1fr_240px] sm:items-center">
                  <FieldLabel htmlFor="functionalImpact">How much this interferes with life</FieldLabel>
                  <select
                    id="functionalImpact"
                    className="h-10 border border-input bg-background px-3 text-sm"
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
            )}

            {step === 5 && (
              <div className="grid gap-8">
                <div className="grid gap-3 sm:max-w-sm">
                  <FieldLabel htmlFor="selfHarmThoughts">Thoughts of harming yourself</FieldLabel>
                  <select
                    id="selfHarmThoughts"
                    className="h-10 border border-input bg-background px-3 text-sm"
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
                {(cbtIntake.safety.selfHarmThoughts === "passive" ||
                  cbtIntake.safety.selfHarmThoughts === "active") && <InlineCrisisSupport />}
                <label className="flex items-center gap-3 text-sm text-muted-foreground">
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
                <TextAreaField
                  id="safetyNotes"
                  label="Support people, warning signs, or context you want noted"
                  value={cbtIntake.safety.notes}
                  onChange={(value) =>
                    setCbtIntake((prev) => ({ ...prev, safety: { ...prev.safety, notes: value } }))
                  }
                  maxLength={1000}
                  minHeight="min-h-24"
                />
              </div>
            )}

            {step === 6 && (
              <div className="grid gap-8">
                <div className="grid gap-4">
                  <FieldLabel>Therapist style preferences</FieldLabel>
                  <ChipSelect
                    options={THERAPIST_STYLE_OPTIONS}
                    selected={cbtIntake.preferences.therapistStyle}
                    onToggle={toggleStyle}
                  />
                </div>
                <TextAreaField
                  id="strengths"
                  label="Strengths, supports, or coping tools that already help"
                  value={cbtIntake.strengths.join("\n")}
                  onChange={(value) => setListFromLines("strengths", value)}
                  placeholder="One per line"
                  maxLength={2400}
                />
              </div>
            )}

            {step === 7 && (
              <div className="grid gap-8">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="border-l border-border pl-4">
                    <p className="text-sm text-muted-foreground">Focus</p>
                    <p className="mt-2 text-base">{previewList(concerns, concernLabel)}</p>
                  </div>
                  <div className="border-l border-border pl-4">
                    <p className="text-sm text-muted-foreground">Schedule</p>
                    <p className="mt-2 text-base">{previewList(availability, availabilityLabel)}</p>
                  </div>
                  <div className="border-l border-border pl-4">
                    <p className="text-sm text-muted-foreground">Therapy style</p>
                    <p className="mt-2 text-base">
                      {cbtIntake.preferences.therapistStyle.length
                        ? cbtIntake.preferences.therapistStyle.join(", ")
                        : "Not selected yet"}
                    </p>
                  </div>
                </div>
                <TextAreaField
                  id="goals"
                  label="Anything your therapist should know? (optional)"
                  value={goals}
                  onChange={setGoals}
                  placeholder="A sentence or two about your goals"
                  maxLength={2000}
                  minHeight="min-h-32"
                />
              </div>
            )}
          </div>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="gap-2 sm:w-auto"
              onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
              disabled={step === 0 || saving}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back
            </Button>
            {isLastStep ? (
              <Button type="button" className="gap-2 sm:w-auto" onClick={save} disabled={saving || concerns.length === 0}>
                <Check className="size-4" aria-hidden="true" />
                {saving ? "Saving..." : "Find matching therapists"}
              </Button>
            ) : (
              <Button type="button" className="gap-2 sm:w-auto" onClick={continueFlow} disabled={!canContinue || saving}>
                Continue
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-border pt-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Private by default", "Only your care workflow uses this intake inside Bridge."],
            ["CBT-informed", "The questions map situations, thoughts, feelings, body signals, and behavior loops."],
            ["Match-ready", "Therapists are ranked by focus fit, related concerns, and schedule overlap."],
          ].map(([title, body]) => (
            <div key={title} className="border-l border-border pl-4">
              <HeartPulse className="mb-3 size-4 text-foreground" aria-hidden="true" />
              <p className="text-sm font-medium">{title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
