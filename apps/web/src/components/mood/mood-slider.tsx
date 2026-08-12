"use client";

import { useRef, useState } from "react";

const TICKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// The bar's gradient: deep near-black (low) to warm off-white (high).
const GRADIENT =
  "linear-gradient(90deg, #07080b 0%, #232530 26%, #4f5560 50%, #8d9099 72%, #c9c8c1 88%, #f4f3ee 100%)";

// Solid orb is 14px; inset the travel rail by its radius so it never spills past the bar ends.
const ORB = 14;
const INSET = ORB / 2;

const clamp = (v: number) => Math.min(10, Math.max(1, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

export function MoodSlider({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const set = value !== null;
  const pos = value ?? 5.5; // resting position for the orb when nothing is chosen yet
  const pct = ((pos - 1) / 9) * 100;

  // Orb is grayscale and tracks the bar: near-black at the low end → near-white at the high end.
  // The glow uses the opposite tone, and a dual light/dark ring keeps the edge readable anywhere.
  const t = (pos - 1) / 9;
  const orbL = Math.round(8 + t * 88); // 8% → 96% lightness
  const invL = 100 - orbL; // glow tone, inverted so it shows against the bar at every position
  const orbColor = `hsl(0 0% ${orbL}%)`;
  const glow = (spread: number, alpha: number) =>
    `0 0 ${spread}px ${Math.round(spread / 3)}px hsl(0 0% ${invL}% / ${alpha})`;

  function valueFromX(clientX: number) {
    const el = trackRef.current;
    if (!el) return pos;
    const r = el.getBoundingClientRect();
    const usable = r.width - INSET * 2;
    return round1(clamp(1 + ((clientX - r.left - INSET) / usable) * 9));
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    onChange(valueFromX(e.clientX));
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    onChange(valueFromX(e.clientX));
  }
  function endDrag(e: React.PointerEvent) {
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be released */
    }
  }
  function onKeyDown(e: React.KeyboardEvent) {
    const base = value ?? 5;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(round1(clamp(base + 0.1)));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(round1(clamp(base - 0.1)));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(1);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(10);
    }
  }

  return (
    <div className="grid gap-7">
      {/* live readout */}
      <div className="flex items-baseline gap-2.5">
        <span
          className="text-6xl leading-none tabular-nums"
          style={{ fontFamily: "var(--font-instrument-serif), serif" }}
        >
          {set ? value!.toFixed(1) : "–"}
        </span>
        <span className="text-base text-muted-foreground">/ 10</span>
      </div>

      {/* the gradient bar */}
      <div>
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-valuemin={1}
          aria-valuemax={10}
          aria-valuenow={set ? value! : undefined}
          aria-label="Today's mood"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          className="group relative h-5 w-full touch-none cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          style={{ background: GRADIENT, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)" }}
        >
          {/* inset rail: the orb travels inside this so it stays within the bar ends */}
          <div
            className="pointer-events-none absolute inset-y-0"
            style={{ left: INSET, right: INSET }}
          >
            <div
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 ${
                dragging ? "" : "transition-[left] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              }`}
              style={{ left: `${pct}%` }}
            >
              <div
                className={`rounded-full transition-[transform,box-shadow,opacity,background-color] duration-200 group-hover:scale-125 ${
                  dragging ? "scale-125" : ""
                }`}
                style={{
                  width: ORB,
                  height: ORB,
                  opacity: set ? 1 : 0.5,
                  backgroundColor: orbColor,
                  boxShadow: dragging
                    ? `0 0 0 1px rgba(0,0,0,0.6), 0 0 0 3px rgba(255,255,255,0.4), ${glow(18, 0.85)}, ${glow(36, 0.5)}`
                    : `0 0 0 1px rgba(0,0,0,0.6), 0 0 0 2.5px rgba(255,255,255,0.35), ${glow(13, 0.7)}, ${glow(28, 0.38)}`,
                }}
              />
            </div>
          </div>
        </div>

        {/* integer stops — keyboard/click selectable, accessible name = the number */}
        <div className="mt-4 flex justify-between">
          {TICKS.map((n) => {
            const active = set && Math.round(value!) === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={`min-w-[1.25rem] text-center text-xs tabular-nums transition-colors ${
                  active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
