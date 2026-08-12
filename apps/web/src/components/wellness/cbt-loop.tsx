"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Footprints,
  HeartPulse,
  MapPin,
  RotateCw,
  Unlink,
  Zap,
} from "lucide-react";
import { LOOP_NODES, LOOP_PHASES } from "@/lib/cbt-loop";
import { CBT_SCENARIOS } from "@/lib/cbt-scenarios";

const NODE_ICONS: Record<string, LucideIcon> = {
  mapPin: MapPin,
  zap: Zap,
  heartPulse: HeartPulse,
  footprints: Footprints,
};

// Ring radius and orbit speed per phase. The loop pulls inward and speeds up as
// it tightens, then loosens when it breaks.
const PHASE_GEOMETRY: Record<
  string,
  { radius: number; orbit: number; ring: number; glow: number }
> = {
  form: { radius: 37, orbit: 7, ring: 0.9, glow: 0.05 },
  tighten: { radius: 28, orbit: 2.4, ring: 1.6, glow: 0.13 },
  break: { radius: 41, orbit: 0, ring: 0.8, glow: 0.06 },
};

function point(angleDeg: number, r: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: 50 + r * Math.sin(a), y: 50 - r * Math.cos(a) };
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return () => {};
      }
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener?.("change", onStoreChange);
      return () => m.removeEventListener?.("change", onStoreChange);
    },
    () =>
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    () => false,
  );
}

export function CbtLoop() {
  const reduced = usePrefersReducedMotion();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [scenarioId, setScenarioId] = useState(CBT_SCENARIOS[0].id);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);

  const phase = LOOP_PHASES[phaseIndex];
  const scenario = CBT_SCENARIOS.find((s) => s.id === scenarioId) ?? CBT_SCENARIOS[0];
  const geo = PHASE_GEOMETRY[phase.id];

  // Auto-advance through the three phases, unless paused, hovered, or reduced.
  useEffect(() => {
    if (!playing || hovered || reduced) return;
    const t = setInterval(() => setPhaseIndex((i) => (i + 1) % LOOP_PHASES.length), 9000);
    return () => clearInterval(t);
  }, [playing, hovered, reduced]);

  function selectPhase(i: number) {
    setPhaseIndex(i);
    setPlaying(false);
  }

  const top = point(0, geo.radius);
  const bottom = point(180, geo.radius);
  const fullRing = `M 50 ${top.y} A ${geo.radius} ${geo.radius} 0 0 1 50 ${bottom.y} A ${geo.radius} ${geo.radius} 0 0 1 50 ${top.y}`;
  // Break: the ring snaps into two halves with the gap on the thought-to-feeling link.
  const R = geo.radius;
  const breakPt = point(135, R);
  const halfA = `M ${point(317, R).x} ${point(317, R).y} A ${R} ${R} 0 0 1 ${point(133, R).x} ${point(133, R).y}`;
  const halfB = `M ${point(137, R).x} ${point(137, R).y} A ${R} ${R} 0 0 1 ${point(313, R).x} ${point(313, R).y}`;
  const deathPath = `M ${point(0, R).x} ${point(0, R).y} A ${R} ${R} 0 0 1 ${point(133, R).x} ${point(133, R).y}`;

  return (
    <section
      className="grid gap-7"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Intro */}
      <div className="grid max-w-prose gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-medium">
          <RotateCw className="size-4" aria-hidden="true" />
          The CBT loop
        </div>
        <p className="text-base leading-8 text-muted-foreground">
          Almost nothing upsets us directly. Between what happens and what we feel sits a thought,
          usually too fast to catch, and what we do next tends to carry us straight back to the
          start. Here is the same loop in three states: how it forms, how it tightens with
          repetition, and where it breaks.
        </p>
      </div>

      {/* Phase tabs */}
      <div className="flex flex-wrap gap-1.5">
        {LOOP_PHASES.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectPhase(i)}
            aria-pressed={i === phaseIndex}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              i === phaseIndex
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            }`}
          >
            <span className="tabular-nums text-xs opacity-60">{i + 1}</span>{" "}
            {p.tab}
          </button>
        ))}
      </div>

      {/* Diagram + narrative */}
      <div className="grid items-center gap-8 lg:grid-cols-2">
        {/* Animated ring */}
        <div className="relative mx-auto aspect-square w-full max-w-[400px]">
          {/* Radial glow that intensifies as the loop tightens */}
          <div
            className="pointer-events-none absolute inset-[12%] rounded-full"
            style={{
              background: "radial-gradient(circle at center, rgba(255,255,255,1) 0%, transparent 65%)",
              opacity: geo.glow,
              transition: "opacity 0.8s ease",
            }}
            aria-hidden="true"
          />
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
          >
            {/* Base ring (faint) — hidden once the loop snaps */}
            {phase.id !== "break" && (
              <circle
                cx="50"
                cy="50"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-foreground/15"
                style={{ r: `${geo.radius}px`, transition: "r 0.8s cubic-bezier(0.16,1,0.3,1)" }}
              />
            )}

            {phase.id === "break" ? (
              <g key={`break-${phaseIndex}`}>
                {/* Downstream half: disconnected, dimmed, drifting away */}
                <g style={reduced ? { transform: "translate(-3.2px, 3.2px)" } : undefined}>
                  {!reduced && (
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values="0 0; -3.8 3.8; -3.2 3.2"
                      keyTimes="0;0.65;1"
                      dur="0.7s"
                      calcMode="spline"
                      keySplines="0.2 0.8 0.3 1; 0.4 0 0.6 1"
                      fill="freeze"
                    />
                  )}
                  <path
                    d={halfB}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.9"
                    strokeLinecap="round"
                    strokeDasharray="1.4 2.4"
                    className="text-foreground/25"
                  />
                </g>

                {/* Live half: situation to thought, where energy still flows and then dies at the break */}
                <g style={reduced ? { transform: "translate(3.2px, -3.2px)" } : undefined}>
                  {!reduced && (
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values="0 0; 3.8 -3.8; 3.2 -3.2"
                      keyTimes="0;0.65;1"
                      dur="0.7s"
                      calcMode="spline"
                      keySplines="0.2 0.8 0.3 1; 0.4 0 0.6 1"
                      fill="freeze"
                    />
                  )}
                  <path
                    d={halfA}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    className="text-foreground/75"
                  />
                  {!reduced && (
                    <g key={`death-${scenarioId}`}>
                      <circle r="1.7" fill="currentColor" className="text-foreground">
                        <animateMotion dur="2.8s" repeatCount="indefinite" path={deathPath} />
                        <animate
                          attributeName="opacity"
                          values="0;1;1;0"
                          keyTimes="0;0.2;0.72;1"
                          dur="2.8s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </g>
                  )}
                </g>

                {/* Snap flash at the break point */}
                {!reduced && (
                  <circle
                    key={`flash-${phaseIndex}`}
                    cx={breakPt.x}
                    cy={breakPt.y}
                    r="2.6"
                    fill="currentColor"
                    className="cbt-flash text-foreground"
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  />
                )}
              </g>
            ) : (
              <>
                {/* Live ring */}
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={geo.ring}
                  strokeLinecap="round"
                  className="text-foreground/55"
                  style={{ r: `${geo.radius}px`, transition: "r 0.8s cubic-bezier(0.16,1,0.3,1)" }}
                />
                {/* Orbiting comet: a lead dot with trailing ghosts */}
                {!reduced ? (
                  <g key={`${phase.id}-${scenarioId}`}>
                    {[0, -0.12, -0.24, -0.36].map((delay, n) => (
                      <circle
                        key={n}
                        r={1.8 - n * 0.35}
                        fill="currentColor"
                        className="text-foreground"
                        opacity={1 - n * 0.24}
                      >
                        <animateMotion
                          dur={`${geo.orbit}s`}
                          begin={`${delay * geo.orbit}s`}
                          repeatCount="indefinite"
                          path={fullRing}
                        />
                      </circle>
                    ))}
                  </g>
                ) : (
                  <circle cx="50" cy={top.y} r="1.8" fill="currentColor" className="text-foreground" />
                )}
              </>
            )}
          </svg>

          {/* Broken-link marker, sitting in the gap that opens up */}
          {phase.id === "break" && (
            <div
              key={`unlink-${phaseIndex}`}
              className="cbt-rise absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${breakPt.x}%`, top: `${breakPt.y}%`, animationDelay: "0.45s" }}
            >
              <span className="flex size-9 items-center justify-center rounded-full border border-foreground/50 bg-background text-foreground shadow-[0_0_22px_rgba(255,255,255,0.2)]">
                <Unlink size={15} aria-hidden />
              </span>
            </div>
          )}

          {/* Nodes */}
          {LOOP_NODES.map((node) => {
            const pos = point(node.angle, geo.radius);
            const a = (node.angle * Math.PI) / 180;
            const lx = pos.x - Math.sin(a) * 12;
            const ly = pos.y + Math.cos(a) * 12;
            const Icon = NODE_ICONS[node.icon] ?? MapPin;
            const highlit = !!phase.lens?.[node.key];
            return (
              <div key={node.key}>
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transition: "left 0.8s cubic-bezier(0.16,1,0.3,1), top 0.8s cubic-bezier(0.16,1,0.3,1)",
                  }}
                >
                  <span
                    className={`relative flex size-10 items-center justify-center rounded-full border bg-background transition-colors duration-500 ${
                      highlit
                        ? "border-foreground text-foreground"
                        : "border-foreground/25 text-muted-foreground"
                    }`}
                  >
                    {highlit && !reduced && (
                      <span className="cbt-soft-pulse absolute inset-0 rounded-full shadow-[0_0_18px_rgba(255,255,255,0.22)]" />
                    )}
                    <Icon size={16} aria-hidden />
                    <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-foreground text-[9px] font-medium tabular-nums text-background">
                      {node.index}
                    </span>
                  </span>
                </div>
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-center text-[11px] font-medium leading-tight text-foreground/80"
                  style={{
                    left: `${lx}%`,
                    top: `${ly}%`,
                    transition: "left 0.8s cubic-bezier(0.16,1,0.3,1), top 0.8s cubic-bezier(0.16,1,0.3,1)",
                  }}
                >
                  {node.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Narrative panel (re-mounts per phase to animate in) */}
        <div key={phase.id} className="cbt-rise grid gap-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{phase.kicker}</p>
          <h3 className="text-2xl leading-tight sm:text-[1.7rem]">{phase.title}</h3>
          {phase.paragraphs.map((para, n) => (
            <p key={n} className="text-[15px] leading-7 text-muted-foreground">
              {para}
            </p>
          ))}
          <p className="border-l-2 border-foreground/40 pl-4 text-[15px] leading-7 text-foreground/90">
            {phase.takeaway}
          </p>
        </div>
      </div>

      {/* Concrete example, part by part */}
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          See it run with{" "}
          {CBT_SCENARIOS.map((s, i) => (
            <span key={s.id}>
              <button
                type="button"
                onClick={() => setScenarioId(s.id)}
                aria-pressed={s.id === scenarioId}
                className={`underline-offset-4 transition-colors ${
                  s.id === scenarioId
                    ? "text-foreground underline"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label.toLowerCase()}
              </button>
              {i < CBT_SCENARIOS.length - 1 ? (
                <span className="text-muted-foreground/40"> · </span>
              ) : (
                "."
              )}
            </span>
          ))}
        </p>

        <div key={`${phase.id}-${scenarioId}`} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP_NODES.map((node, n) => {
            const Icon = NODE_ICONS[node.icon] ?? MapPin;
            const lens = phase.lens?.[node.key];
            return (
              <div
                key={node.key}
                className="cbt-rise rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                style={{ animationDelay: `${n * 70}ms` }}
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon size={14} aria-hidden />
                  <span className="text-xs uppercase tracking-[0.18em]">{node.label}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground/90">{scenario[node.key]}</p>
                {lens && (
                  <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-muted-foreground">
                    {lens}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
