"use client";
import { useEffect, useRef, useState } from "react";
import { Eraser, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WhiteboardState } from "@/lib/sessions-client";

const WIDTH = 900;
const HEIGHT = 420;
const COLORS = ["#111827", "#0f766e", "#7c3aed", "#b91c1c"];

function drawState(canvas: HTMLCanvasElement, state: WhiteboardState) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#fbfbf7";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "rgba(17,24,39,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 45) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 45) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  for (const stroke of state.strokes) {
    if (stroke.points.length === 0) continue;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (const point of stroke.points.slice(1)) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }
}

function pointFromEvent(canvas: HTMLCanvasElement, event: React.PointerEvent<HTMLCanvasElement>) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(WIDTH, ((event.clientX - rect.left) / rect.width) * WIDTH)),
    y: Math.max(0, Math.min(HEIGHT, ((event.clientY - rect.top) / rect.height) * HEIGHT)),
  };
}

export function SessionWhiteboard({
  value,
  onSave,
}: {
  value: WhiteboardState;
  onSave: (state: WhiteboardState) => void;
}) {
  return <SessionWhiteboardCanvas key={JSON.stringify(value)} initialValue={value} onSave={onSave} />;
}

function SessionWhiteboardCanvas({
  initialValue,
  onSave,
}: {
  initialValue: WhiteboardState;
  onSave: (state: WhiteboardState) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [draft, setDraft] = useState<WhiteboardState>(initialValue);
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (canvasRef.current) drawState(canvasRef.current, draft);
  }, [draft]);

  function begin(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const point = pointFromEvent(canvas, event);
    setDraft((prev) => ({
      strokes: [...prev.strokes, { points: [point], color, size: 4 }],
    }));
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || !drawingRef.current) return;
    const point = pointFromEvent(canvas, event);
    setDraft((prev) => {
      const strokes = [...prev.strokes];
      const last = strokes.at(-1);
      if (!last) return prev;
      strokes[strokes.length - 1] = { ...last, points: [...last.points, point] };
      return { strokes };
    });
  }

  function end() {
    drawingRef.current = false;
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2" aria-label="Whiteboard colors">
          {COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={`Use ${swatch}`}
              aria-pressed={color === swatch}
              className="size-7 border border-border"
              style={{ backgroundColor: swatch }}
              onClick={() => setColor(swatch)}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setDraft({ strokes: [] })}>
            <Eraser className="size-4" aria-hidden="true" />
            Clear
          </Button>
          <Button type="button" size="sm" className="gap-2" onClick={() => onSave(draft)}>
            <Save className="size-4" aria-hidden="true" />
            Save whiteboard
          </Button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="h-auto w-full touch-none border border-border bg-[#fbfbf7]"
        aria-label="Session whiteboard canvas"
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
    </div>
  );
}
