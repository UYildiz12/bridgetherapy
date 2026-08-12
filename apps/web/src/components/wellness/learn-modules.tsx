"use client";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Brain,
  ChevronDown,
  CloudLightning,
  Contrast,
  Eye,
  Filter,
  Gavel,
  Heart,
  Repeat,
  Tag,
  Target,
  Telescope,
} from "lucide-react";
import { LESSONS, THINKING_TRAPS } from "@/lib/lessons";
import { CbtLoop } from "./cbt-loop";
import { BlueprintFrame } from "./blueprint-frame";

const TRAP_ICONS: Record<string, LucideIcon> = {
  contrast: Contrast,
  repeat: Repeat,
  filter: Filter,
  eye: Eye,
  telescope: Telescope,
  cloudLightning: CloudLightning,
  heart: Heart,
  gavel: Gavel,
  tag: Tag,
  target: Target,
};

export function LearnModules() {
  const [trapIdx, setTrapIdx] = useState(0);
  const [openLesson, setOpenLesson] = useState<string | null>(LESSONS[0]?.id ?? null);

  const trap = THINKING_TRAPS[trapIdx];
  const TrapIcon = TRAP_ICONS[trap.icon] ?? Brain;

  return (
    <div className="grid gap-16">
      {/* ---- CBT loop: the centerpiece ---- */}
      <CbtLoop />

      {/* ---- Thinking traps ---- */}
      <section className="grid gap-5">
        <div className="grid max-w-prose gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            <Brain className="size-4" aria-hidden="true" />
            Thinking traps
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            These are the shortcuts a worried mind takes. Naming the one you are in is often enough to
            take some of the air out of it. Tap any to see how it tends to sound, and a question that
            loosens its grip.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {THINKING_TRAPS.map((t, i) => {
            const I = TRAP_ICONS[t.icon] ?? Brain;
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => setTrapIdx(i)}
                aria-pressed={i === trapIdx}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  i === trapIdx
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                <I size={13} aria-hidden />
                {t.name}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-foreground/30 text-foreground">
              <TrapIcon size={18} aria-hidden />
            </span>
            <h4 className="text-lg leading-snug">{trap.name}</h4>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{trap.what}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="border-l-2 border-border pl-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sounds like</p>
              <ul className="mt-1.5 grid gap-1.5">
                {trap.examples.map((ex) => (
                  <li key={ex} className="text-sm leading-6 text-foreground/90">
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-l-2 border-foreground/40 pl-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Loosen it</p>
              <p className="mt-1.5 text-sm leading-6 text-foreground/90">{trap.reframe}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Lessons ---- */}
      <section className="grid gap-4">
        <h3 className="text-xl">Lessons</h3>
        <div className="grid border-t border-border">
          {LESSONS.map((lesson) => {
            const open = openLesson === lesson.id;
            return (
              <div key={lesson.id} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => setOpenLesson(open ? null : lesson.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="grid gap-1">
                    <span className="text-lg font-medium text-foreground">{lesson.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {lesson.summary}{" "}
                      <span className="text-muted-foreground/60">· {lesson.minutes} min</span>
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    aria-hidden
                    className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>

                {open && (
                  <div className="grid gap-5 pb-7 sm:max-w-2xl">
                    <BlueprintFrame className="mx-auto w-44 sm:w-52">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/illustrations/${lesson.id}.png`}
                        alt=""
                        className="h-auto w-full"
                      />
                    </BlueprintFrame>
                    {lesson.sections.map((s) => (
                      <div key={s.heading} className="grid gap-1.5">
                        <h5 className="text-sm font-medium text-foreground">{s.heading}</h5>
                        <p className="text-sm leading-7 text-muted-foreground">{s.body}</p>
                      </div>
                    ))}

                    <div className="grid gap-2">
                      <p className="text-sm font-medium text-foreground">Key points</p>
                      <ul className="grid gap-1.5">
                        {lesson.keyPoints.map((point) => (
                          <li key={point} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                            <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-foreground/50" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-xl border border-border bg-foreground/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Try this</p>
                      <p className="mt-1.5 text-sm leading-6 text-foreground/90">{lesson.tryThis}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
