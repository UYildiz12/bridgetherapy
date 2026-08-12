import type { ReactNode } from "react";

// A reusable "blueprint specimen" frame: construction circle, cardinal ticks and
// nodes, corner sparkles, registration crosshairs, and faint diagonals. Drawn in
// currentColor so it inherits the surrounding text color and themes cleanly. The
// ring marks turn slowly (reduced-motion safe); the centered motif stays still.
// On hover the frame brightens and scales a touch, while the motif is untouched.

const C = 512;
const R = 402;
const rad = (deg: number) => (deg * Math.PI) / 180;
const at = (deg: number, r: number): [number, number] => [
  C + r * Math.sin(rad(deg)),
  C - r * Math.cos(rad(deg)),
];

function star(cx: number, cy: number, r: number) {
  const i = r * 0.3;
  return [
    [cx, cy - r], [cx + i, cy - i], [cx + r, cy], [cx + i, cy + i],
    [cx, cy + r], [cx - i, cy + i], [cx - r, cy], [cx - i, cy - i],
  ]
    .map((p) => p.join(","))
    .join(" ");
}

const CORNERS: [number, number][] = [
  [78, 78], [1024 - 78, 78], [78, 1024 - 78], [1024 - 78, 1024 - 78],
];
const CROSSHAIRS: [number, number][] = [
  [150, 150], [1024 - 150, 150], [150, 1024 - 150], [1024 - 150, 1024 - 150],
];

export function BlueprintFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative aspect-square text-foreground ${className ?? ""}`}>
      <svg
        viewBox="0 0 1024 1024"
        className="absolute inset-0 h-full w-full"
        fill="none"
        aria-hidden="true"
      >
        {/* faint diagonals (static) */}
        <g stroke="currentColor" strokeWidth="2.5" opacity="0.12">
          <line x1="96" y1="96" x2="928" y2="928" />
          <line x1="928" y1="96" x2="96" y2="928" />
        </g>

        {/* construction circle (static) */}
        <circle cx={C} cy={C} r={R} stroke="currentColor" strokeWidth="2.5" opacity="0.28" />

        {/* slowly turning ring marks */}
        <g className="bp-rotate">
          {/* mid-edge ticks (faint) */}
          <g stroke="currentColor" strokeWidth="2.5" opacity="0.32">
            {[45, 135, 225, 315].map((deg) => {
              const [x1, y1] = at(deg, R - 9);
              const [x2, y2] = at(deg, R + 9);
              return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
          </g>

          {/* cardinal ticks + nodes */}
          <g stroke="currentColor" strokeWidth="3.5" opacity="0.9">
            {[0, 90, 180, 270].map((deg) => {
              const [x1, y1] = at(deg, R - 16);
              const [x2, y2] = at(deg, R + 16);
              const [nx, ny] = at(deg, R);
              return (
                <g key={deg}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} />
                  <circle cx={nx} cy={ny} r="9" strokeWidth="3" />
                </g>
              );
            })}
          </g>
        </g>

        {/* corner crosshairs (static, faint) */}
        <g stroke="currentColor" strokeWidth="2.5" opacity="0.38">
          {CROSSHAIRS.map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <line x1={x - 9} y1={y} x2={x + 9} y2={y} />
              <line x1={x} y1={y - 9} x2={x} y2={y + 9} />
            </g>
          ))}
        </g>

        {/* corner sparkles (static) */}
        <g fill="currentColor">
          {CORNERS.map(([x, y]) => (
            <polygon key={`${x}-${y}`} points={star(x, y, 12)} />
          ))}
        </g>
      </svg>

      <div className="absolute inset-0 grid place-items-center">
        <div className="w-[52%]">{children}</div>
      </div>
    </div>
  );
}
