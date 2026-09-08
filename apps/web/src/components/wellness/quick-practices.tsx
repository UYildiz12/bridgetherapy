"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Brain,
  Check,
  ChevronLeft,
  Hand,
  HeartPulse,
  ListChecks,
  Pause,
  Play,
  Plus,
  Sparkles,
  Target,
  Waves,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createEntry } from "@/lib/notes-client";
import { QUICK_PRACTICES, type PracticeStep, type QuickPractice } from "@/lib/quick-practices";

const ICONS: Record<string, LucideIcon> = {
  hand: Hand,
  heartPulse: HeartPulse,
  brain: Brain,
  target: Target,
  listChecks: ListChecks,
  waves: Waves,
};

const SERIF = { fontFamily: "var(--font-instrument-serif), serif" } as const;

type Answers = Record<string, string | number | string[] | undefined>;

/** Replace {key} tokens with stored answers (arrays joined with commas). */
function fill(text: string, answers: Answers): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = answers[key];
    if (Array.isArray(v)) return v.join(", ");
    return v === undefined || v === "" ? "that" : String(v);
  });
}

export function QuickPractices() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = QUICK_PRACTICES.find((p) => p.id === activeId) ?? null;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_PRACTICES.map((p) => {
          const Icon = ICONS[p.icon] ?? Hand;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveId(p.id)}
              className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all hover:border-white/25 hover:bg-white/[0.05] active:scale-[0.99]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-foreground/20 text-foreground transition-colors group-hover:border-foreground/40">
                <Icon size={18} aria-hidden />
              </span>
              <span className="grid gap-1">
                <span className="font-medium leading-snug text-foreground">{p.title}</span>
                <span className="text-sm leading-6 text-muted-foreground">{p.tagline}</span>
                <span className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                  {p.duration}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {active && (
        <PracticeRunner key={active.id} practice={active} onClose={() => setActiveId(null)} />
      )}
    </>
  );
}

function PracticeRunner({
  practice,
  onClose,
}: {
  practice: QuickPractice;
  onClose: () => void;
}) {
  const router = useRouter();
  const steps = practice.steps;
  const SUMMARY = steps.length;
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [lumenBusy, setLumenBusy] = useState(false);
  const [lumenError, setLumenError] = useState<string | null>(null);

  const onSummary = i >= SUMMARY;
  const step = steps[i];
  const isLastStep = i === SUMMARY - 1;
  const draft =
    drafts[i] ?? (step?.kind === "text" && step.storeKey ? String(answers[step.storeKey] ?? "") : "");

  function setDraft(value: string) {
    setDrafts((current) => ({ ...current, [i]: value }));
  }

  function setAnswer(key: string, val: string | number | string[]) {
    setAnswers((a) => ({ ...a, [key]: val }));
  }

  // Lock background scroll and wire Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function goNext() {
    if (onSummary) {
      onClose();
      return;
    }
    const s = steps[i];
    if (s.kind === "text" && s.storeKey) setAnswer(s.storeKey, draft.trim());
    if (s.kind === "slider" && s.storeKey && answers[s.storeKey] === undefined) {
      setAnswer(s.storeKey, 50);
    }
    setI((v) => v + 1);
  }

  function goBack() {
    if (i > 0) setI((v) => v - 1);
  }

  // Hand the finished practice to Lumen: seed a private reflection with the recap
  // and carry tailored prompts (and an optional prefilled message) into the chat.
  async function openInLumen(prefill?: string) {
    setLumenBusy(true);
    setLumenError(null);
    try {
      const content = buildRecapText(practice, answers);
      const prompts = practice.summary.lumen.map((t) => fill(t, answers));
      const entry = await createEntry({ title: practice.title, content });
      sessionStorage.setItem("bridge:notes-open", entry.id);
      sessionStorage.setItem(`bridge:lumen-seed:${entry.id}`, JSON.stringify({ prompts, prefill }));
      router.push("/notes");
    } catch (e) {
      setLumenError(e instanceof Error ? e.message : "Couldn't open Lumen just now.");
      setLumenBusy(false);
    }
  }

  const list = (step?.storeKey ? (answers[step.storeKey] as string[] | undefined) : undefined) ?? [];

  function addItem() {
    const v = draft.trim();
    if (!v || !step?.storeKey) return;
    setAnswer(step.storeKey, [...list, v]);
    setDraft("");
  }

  function removeItem(idx: number) {
    if (!step?.storeKey) return;
    setAnswer(
      step.storeKey,
      list.filter((_, n) => n !== idx),
    );
  }

  const canNext = !step
    ? true
    : step.kind === "text"
      ? draft.trim().length > 0
      : step.kind === "collect"
        ? list.length >= 1
        : true;

  const ctaLabel = isLastStep ? "See your recap" : (step?.cta ?? "Continue");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={practice.title}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 sm:px-6">
        {i > 0 ? (
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
        ) : (
          <span className="size-9 shrink-0" />
        )}
        <p className="flex-1 truncate text-center text-sm text-muted-foreground">{practice.title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      {/* Progress */}
      <div className="h-0.5 w-full bg-white/10">
        <div
          className="h-full bg-foreground transition-all duration-300"
          style={{ width: `${((i + 1) / (SUMMARY + 1)) * 100}%` }}
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-6">
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center">
          {onSummary ? (
            <PracticeSummary
              practice={practice}
              answers={answers}
              busy={lumenBusy}
              error={lumenError}
              onOpenLumen={openInLumen}
            />
          ) : step ? (
            <StepBody
              step={step}
              answers={answers}
              draft={draft}
              setDraft={setDraft}
              list={list}
              addItem={addItem}
              removeItem={removeItem}
              onSlide={(v) => step.storeKey && setAnswer(step.storeKey, v)}
              onNote={() => {
                if (!step.storeKey) return;
                const cur = Number(answers[step.storeKey] ?? 0);
                setAnswer(step.storeKey, cur + 1);
              }}
              onTimerDone={goNext}
            />
          ) : null}
        </div>
      </div>

      {/* Footer */}
      {onSummary ? (
        <div
          className="border-t border-white/10 px-5 py-4 sm:px-6"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex w-full max-w-md">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-12 w-full text-base"
            >
              Finish
            </Button>
          </div>
        </div>
      ) : step && step.kind !== "timer" ? (
        <div
          className="border-t border-white/10 px-5 py-4 sm:px-6"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex w-full max-w-md">
            <Button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="h-12 w-full text-base"
            >
              {ctaLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Plain-text recap used as the seeded reflection body for Lumen.
function buildRecapText(practice: QuickPractice, answers: Answers): string {
  const lines: string[] = [];
  for (const s of practice.steps) {
    if (!s.storeKey || s.kind === "info" || s.kind === "timer") continue;
    const v = answers[s.storeKey];
    if (v === undefined || v === "") continue;
    const val = Array.isArray(v) ? v.join(", ") : s.kind === "slider" ? `${v}/100` : String(v);
    if (val) lines.push(`${fill(s.title, answers)}: ${val}`);
  }
  return [practice.title, "", lines.join("\n"), "", fill(practice.summary.helps, answers)]
    .join("\n")
    .trim();
}

function PracticeSummary({
  practice,
  answers,
  busy,
  error,
  onOpenLumen,
}: {
  practice: QuickPractice;
  answers: Answers;
  busy: boolean;
  error: string | null;
  onOpenLumen: (prefill?: string) => void;
}) {
  const recap = practice.steps
    .filter((s) => s.storeKey && s.kind !== "info" && s.kind !== "timer")
    .map((s) => {
      const v = answers[s.storeKey as string];
      if (v === undefined || v === "") return null;
      const value = Array.isArray(v)
        ? v.join(", ")
        : s.kind === "slider"
          ? `${v} / 100`
          : String(v);
      return value ? { label: fill(s.title, answers), value } : null;
    })
    .filter((r): r is { label: string; value: string } => r !== null);

  const helps = fill(practice.summary.helps, answers);
  const prompts = practice.summary.lumen.map((t) => fill(t, answers));

  return (
    <div className="grid gap-7">
      <div className="grid gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Check size={14} aria-hidden /> Done
        </span>
        <h2 className="text-2xl leading-tight sm:text-3xl" style={SERIF}>
          Nice work.
        </h2>
      </div>

      {recap.length > 0 && (
        <div className="grid gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">What you did</p>
          <ul className="grid gap-2.5">
            {recap.map((r) => (
              <li key={r.label} className="grid gap-0.5">
                <span className="text-xs text-muted-foreground">{r.label}</span>
                <span className="text-sm leading-6 text-foreground/90">{r.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="border-l-2 border-foreground/40 pl-4 text-[15px] leading-7 text-foreground/90">
        {helps}
      </p>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles size={15} aria-hidden /> Keep going with Lumen
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Lumen can pick this up from here. Tap a starting point and it opens a private reflection
          with your answers, ready to talk it through.
        </p>
        <div className="grid gap-2">
          {prompts.map((p) => (
            <button
              key={p}
              type="button"
              disabled={busy}
              onClick={() => onOpenLumen(p)}
              className="group flex items-start gap-2.5 rounded-xl border border-white/12 bg-white/[0.03] px-3.5 py-3 text-left text-sm leading-6 text-foreground/90 transition-colors hover:border-foreground/40 hover:bg-white/[0.05] disabled:opacity-50"
            >
              <Sparkles
                size={14}
                className="mt-0.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                aria-hidden
              />
              <span className="flex-1">{p}</span>
              <ArrowRight
                size={15}
                className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>
          ))}
        </div>
        {busy && <p className="text-xs text-muted-foreground">Opening Lumen…</p>}
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function StepBody({
  step,
  answers,
  draft,
  setDraft,
  list,
  addItem,
  removeItem,
  onSlide,
  onNote,
  onTimerDone,
}: {
  step: PracticeStep;
  answers: Answers;
  draft: string;
  setDraft: (v: string) => void;
  list: string[];
  addItem: () => void;
  removeItem: (idx: number) => void;
  onSlide: (v: number) => void;
  onNote: () => void;
  onTimerDone: () => void;
}) {
  const title = (
    <h2 className="text-2xl leading-tight sm:text-3xl" style={SERIF}>
      {fill(step.title, answers)}
    </h2>
  );

  if (step.kind === "info" || step.kind === "reflect") {
    return (
      <div className="grid gap-4">
        {title}
        {step.body && (
          <p className="text-base leading-7 text-muted-foreground">{fill(step.body, answers)}</p>
        )}
        {step.quote && (
          <p className="border-l-2 border-foreground/40 pl-4 text-lg italic leading-relaxed text-foreground/90">
            &ldquo;{fill(step.quote, answers)}&rdquo;
          </p>
        )}
        {step.kind === "reflect" && step.compare && (
          <ReflectCompare
            from={Number(answers[step.compare.fromKey] ?? 0)}
            to={Number(answers[step.compare.toKey] ?? 0)}
          />
        )}
      </div>
    );
  }

  if (step.kind === "text") {
    return (
      <div className="grid gap-4">
        {title}
        {step.body && <p className="text-base leading-7 text-muted-foreground">{step.body}</p>}
        <textarea
          autoFocus
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={step.placeholder}
          className="w-full resize-none rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-base leading-7 text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/40"
        />
      </div>
    );
  }

  if (step.kind === "collect") {
    return (
      <div className="grid gap-4">
        {title}
        {step.body && <p className="text-base leading-7 text-muted-foreground">{step.body}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addItem();
          }}
          className="flex gap-2"
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={step.placeholder}
            enterKeyHint="done"
            className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/40"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={!draft.trim()}
            aria-label="Add"
            className="h-12 shrink-0 px-4"
          >
            <Plus size={18} aria-hidden />
          </Button>
        </form>

        {step.count != null && (
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {Math.min(list.length, step.count)} of {step.count}
          </p>
        )}

        {list.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {list.map((item, idx) => (
              <li key={`${item}-${idx}`}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] py-1.5 pl-3.5 pr-1.5 text-sm text-foreground/90">
                  {item}
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    aria-label={`Remove ${item}`}
                    className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                  >
                    <X size={12} aria-hidden />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (step.kind === "slider") {
    const val = Number(answers[step.storeKey ?? ""] ?? 50);
    return (
      <div className="grid gap-6">
        {title}
        <div className="text-center">
          <span className="text-6xl tabular-nums leading-none" style={SERIF}>
            {val}
          </span>
        </div>
        <div>
          <input
            type="range"
            min={0}
            max={100}
            value={val}
            onChange={(e) => onSlide(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15"
            style={{ accentColor: "var(--foreground)" }}
          />
          <div className="mt-2 flex justify-between text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <span>{step.minLabel}</span>
            <span>{step.maxLabel}</span>
          </div>
        </div>
      </div>
    );
  }

  // timer
  return (
    <TimerStep
      step={step}
      answers={answers}
      onNote={onNote}
      onDone={onTimerDone}
      titleNode={title}
    />
  );
}

function ReflectCompare({ from, to }: { from: number; to: number }) {
  const line =
    to < from
      ? "It eased off, and you didn't have to act on it. That's the wave passing."
      : to === from
        ? "It held steady instead of growing. Notice that it didn't take over."
        : "It rose a little, and it still won't last. Stay with it a moment longer if you can.";
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-center gap-6">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Before</div>
          <div className="text-5xl tabular-nums leading-none" style={SERIF}>
            {from}
          </div>
        </div>
        <ArrowRight size={22} className="text-muted-foreground" aria-hidden />
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">After</div>
          <div className="text-5xl tabular-nums leading-none" style={SERIF}>
            {to}
          </div>
        </div>
      </div>
      <p className="text-base leading-7 text-muted-foreground">{line}</p>
    </div>
  );
}

function TimerStep({
  step,
  answers,
  onNote,
  onDone,
  titleNode,
}: {
  step: PracticeStep;
  answers: Answers;
  onNote: () => void;
  onDone: () => void;
  titleNode: React.ReactNode;
}) {
  const total = step.seconds ?? 60;
  const [left, setLeft] = useState(total);
  const [paused, setPaused] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (paused) return;
    if (left <= 0) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, paused, onDone]);

  const r = 64;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - left / total);
  const noteCount = step.storeKey ? Number(answers[step.storeKey] ?? 0) : 0;

  return (
    <div className="grid justify-items-center gap-6 text-center">
      <div className="max-w-md">{titleNode}</div>
      {step.body && (
        <p className="max-w-md text-base leading-7 text-muted-foreground">{step.body}</p>
      )}

      <div className="relative grid size-40 place-items-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 144 144" aria-hidden>
          <circle cx="72" cy="72" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
          <circle
            cx="72"
            cy="72"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="text-foreground transition-[stroke-dashoffset] duration-1000 ease-linear"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="text-5xl tabular-nums leading-none" style={SERIF}>
          {left}
        </span>
      </div>

      {step.noteLabel && (
        <button
          type="button"
          onClick={onNote}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          {step.noteLabel}
          {noteCount > 0 && <span className="tabular-nums text-foreground/80">{noteCount}</span>}
        </button>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPaused((p) => !p)}
          className="h-11 gap-1.5 px-5"
        >
          {paused ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button
          type="button"
          onClick={() => {
            if (!doneRef.current) {
              doneRef.current = true;
              onDone();
            }
          }}
          className="h-11 px-5"
        >
          {step.cta ?? "Skip ahead"}
        </Button>
      </div>
    </div>
  );
}
