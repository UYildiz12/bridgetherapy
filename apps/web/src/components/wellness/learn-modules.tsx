"use client";
import { useState } from "react";
import { Brain, ChevronDown, Route } from "lucide-react";
import { CBT_LOOP } from "@/lib/education";
import { LESSONS, THINKING_TRAPS } from "@/lib/lessons";

export function LearnModules() {
  const [loopIdx, setLoopIdx] = useState(0);
  const [trapIdx, setTrapIdx] = useState(0);
  const [openLesson, setOpenLesson] = useState<string | null>(LESSONS[0]?.id ?? null);
  const node = CBT_LOOP[loopIdx] as (typeof CBT_LOOP)[number] & { example?: string };
  const trap = THINKING_TRAPS[trapIdx];

  return (
    <div className="grid gap-12">
      <section className="grid gap-5">
        <div className="grid gap-1">
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            <Route className="size-4" aria-hidden="true" />
            The CBT loop
          </div>
          <p className="max-w-prose text-sm text-muted-foreground">
            One moment, four linked parts. Tap each part to see how it plays out, and where the loop
            can be interrupted.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ol className="grid content-start gap-2">
            {CBT_LOOP.map((step, i) => {
              const active = i === loopIdx;
              return (
                <li key={step.label}>
                  <button
                    type="button"
                    onClick={() => setLoopIdx(i)}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      active
                        ? "border-foreground/40 bg-foreground/[0.06]"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    }`}
                  >
                    <span
                      className="text-sm tabular-nums"
                      style={{ fontFamily: "var(--font-instrument-serif), serif" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-medium">{step.label}</span>
                    {i < CBT_LOOP.length - 1 && (
                      <span className="ml-auto text-muted-foreground" aria-hidden>
                        next
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
            <h4 className="text-lg leading-snug">{node.label}</h4>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{node.detail}</p>
            {node.example && (
              <div className="mt-4 border-l-2 border-foreground/40 pl-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Example</p>
                <p className="mt-1 text-sm leading-6 text-foreground/90">{node.example}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5">
        <div className="grid gap-1">
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            <Brain className="size-4" aria-hidden="true" />
            Thinking traps
          </div>
          <p className="max-w-prose text-sm text-muted-foreground">
            Common distortions that fuel anxiety and low mood. Tap one to see how it sounds and a
            question that loosens its grip.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {THINKING_TRAPS.map((t, i) => (
            <button
              key={t.name}
              type="button"
              onClick={() => setTrapIdx(i)}
              aria-pressed={i === trapIdx}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                i === trapIdx
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
          <h4 className="text-lg leading-snug">{trap.name}</h4>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{trap.what}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="border-l-2 border-border pl-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sounds like</p>
              <p className="mt-1 text-sm leading-6 text-foreground/90">{trap.example}</p>
            </div>
            <div className="border-l-2 border-foreground/40 pl-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Loosen it</p>
              <p className="mt-1 text-sm leading-6 text-foreground/90">{trap.reframe}</p>
            </div>
          </div>
        </div>
      </section>

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
                      {lesson.minutes} min read - {lesson.summary}
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
