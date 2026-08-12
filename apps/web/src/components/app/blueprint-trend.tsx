// A blueprint-style trend chart for 1-10 scores: hairline grid, a thin plotted
// line, hollow point markers, and the latest value labeled in the serif voice.
// Pure SVG, monochrome, no chart library.

const W = 640;
const H = 180;
const PAD_X = 10;
const PAD_TOP = 16;
const PAD_BOTTOM = 22;

export interface TrendPoint {
  value: number;
  /** Short label under the tick, e.g. "Jun 21". Rendered for first and last only. */
  label?: string;
}

export function BlueprintTrend({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return null;

  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const x = (i: number) => PAD_X + (i / (points.length - 1)) * innerW;
  const y = (v: number) => PAD_TOP + (1 - (v - 1) / 9) * innerH;

  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const last = points[points.length - 1];
  const lastX = x(points.length - 1);
  const lastY = y(last.value);
  const lastLabel = Number.isInteger(last.value) ? `${last.value}` : last.value.toFixed(1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full text-foreground"
      role="img"
      aria-label={`Trend of the last ${points.length} scores, most recent ${lastLabel} out of 10`}
    >
      {/* Grid: top and bottom rails plus faint quarter lines */}
      {[10, 7.75, 5.5, 3.25, 1].map((v, i) => (
        <line
          key={v}
          x1={PAD_X}
          x2={W - PAD_X}
          y1={y(v)}
          y2={y(v)}
          stroke="currentColor"
          strokeWidth="1"
          opacity={i === 0 || i === 4 ? 0.22 : 0.09}
        />
      ))}
      {/* Scale labels on the rails */}
      <text x={W - PAD_X} y={y(10) - 5} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.45">
        10
      </text>
      <text x={W - PAD_X} y={y(1) + 14} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.45">
        1
      </text>

      {/* Baseline ticks per point */}
      {points.map((_, i) => (
        <line
          key={i}
          x1={x(i)}
          x2={x(i)}
          y1={y(1)}
          y2={y(1) + 4}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />
      ))}

      {/* First and last date labels */}
      {points[0].label && (
        <text x={x(0)} y={H - 4} textAnchor="start" fontSize="10" fill="currentColor" opacity="0.45">
          {points[0].label}
        </text>
      )}
      {last.label && (
        <text x={lastX} y={H - 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.45">
          {last.label}
        </text>
      )}

      {/* The plotted line */}
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.65"
      />

      {/* Hollow markers, filled for the latest */}
      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        return (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={isLast ? 4 : 3}
            fill={isLast ? "currentColor" : "var(--background)"}
            stroke="currentColor"
            strokeWidth="1.5"
            opacity={isLast ? 1 : 0.7}
          />
        );
      })}

      {/* Latest value, in the serif voice */}
      <text
        x={lastX}
        y={lastY - 12}
        textAnchor={lastX > W - 60 ? "end" : "middle"}
        fontSize="22"
        fill="currentColor"
        style={{ fontFamily: "var(--font-instrument-serif), serif" }}
      >
        {lastLabel}
      </text>
    </svg>
  );
}
