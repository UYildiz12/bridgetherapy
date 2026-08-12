"use client";
import { useEffect, useRef, useState } from "react";
import { Eraser, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WhiteboardState } from "@/lib/sessions-client";

const WIDTH = 900;
const HEIGHT = 420;
const COLORS = ["#111827", "#0f766e", "#7c3aed", "#b91c1c"];

// Server limits (see lib/session-workspace.ts); the client must stay inside
// them or every save after a long drag would be rejected with a 400.
export const MAX_STROKE_POINTS = 500;
export const MAX_STROKES = 240;
/** Pointer samples closer than this (canvas px) to the previous point are dropped. */
const MIN_POINT_DISTANCE = 2;

/** Result of a save attempt; on a 409 the caller refetches and hands back the fresh board. */
export type WhiteboardSaveResult =
  | { ok: true; updatedAt: string | null }
  | { ok: false; conflict: { whiteboard: WhiteboardState; updatedAt: string | null } }
  | { ok: false; conflict?: undefined };

/**
 * Append a sampled pointer point to the in-progress stroke. pointermove fires
 * ~60x/s, so points within MIN_POINT_DISTANCE of the previous one are skipped
 * and a stroke is hard-capped at the server's per-stroke point limit.
 */
export function appendStrokePoint(state: WhiteboardState, point: { x: number; y: number }): WhiteboardState {
  const strokes = [...state.strokes];
  const last = strokes.at(-1);
  if (!last) return state;
  if (last.points.length >= MAX_STROKE_POINTS) return state;
  const prev = last.points.at(-1);
  if (prev) {
    const dx = point.x - prev.x;
    const dy = point.y - prev.y;
    if (dx * dx + dy * dy < MIN_POINT_DISTANCE * MIN_POINT_DISTANCE) return state;
  }
  strokes[strokes.length - 1] = { ...last, points: [...last.points, point] };
  return { strokes };
}

/**
 * After a conflicting save: keep the other side's fresh board and re-apply the
 * strokes drawn locally since the last successful save (`savedCount` marks how
 * many leading strokes were already persisted). Trimmed to the server's stroke
 * cap, dropping the oldest strokes first.
 */
export function mergeWhiteboards(
  server: WhiteboardState,
  local: WhiteboardState,
  savedCount: number,
): { state: WhiteboardState; savedCount: number } {
  const localNew = local.strokes.slice(Math.max(0, savedCount));
  let strokes = [...server.strokes, ...localNew];
  if (strokes.length > MAX_STROKES) strokes = strokes.slice(strokes.length - MAX_STROKES);
  return { state: { strokes }, savedCount: Math.max(0, strokes.length - localNew.length) };
}

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
  updatedAt = null,
  onSave,
}: {
  value: WhiteboardState;
  /** Workspace `updatedAt` the parent last saw; sent as the save precondition. */
  updatedAt?: string | null;
  onSave: (state: WhiteboardState, baseUpdatedAt: string | null) => Promise<WhiteboardSaveResult>;
}) {
  return (
    <SessionWhiteboardCanvas key={JSON.stringify(value)} initialValue={value} updatedAt={updatedAt} onSave={onSave} />
  );
}

function SessionWhiteboardCanvas({
  initialValue,
  updatedAt,
  onSave,
}: {
  initialValue: WhiteboardState;
  updatedAt: string | null;
  onSave: (state: WhiteboardState, baseUpdatedAt: string | null) => Promise<WhiteboardSaveResult>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [draft, setDraft] = useState<WhiteboardState>(initialValue);
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Refs so the async save flow always sees the latest board and revision.
  const draftRef = useRef(draft);
  const seenUpdatedAtRef = useRef<string | null>(updatedAt);
  /** How many leading strokes in `draft` are already persisted on the server. */
  const savedCountRef = useRef(initialValue.strokes.length);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // A note save elsewhere on the page bumps the workspace stamp without
  // remounting the canvas; adopt it so the next save's precondition is fresh.
  useEffect(() => {
    seenUpdatedAtRef.current = updatedAt;
  }, [updatedAt]);

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
    setDraft((prev) => appendStrokePoint(prev, point));
  }

  function end() {
    drawingRef.current = false;
  }

  function clear() {
    savedCountRef.current = 0;
    setDraft({ strokes: [] });
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      let state = draftRef.current;
      let mergedOnce = false;
      // On a conflict, merge the fresh board with the local strokes and retry once.
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await onSave(state, seenUpdatedAtRef.current);
        if (result.ok) {
          seenUpdatedAtRef.current = result.updatedAt;
          savedCountRef.current = state.strokes.length;
          setNotice(mergedOnce ? "Board updated: merged the other side's changes with yours." : null);
          return;
        }
        if (!result.conflict) return; // non-conflict failure; the page surfaced the error
        const merged = mergeWhiteboards(result.conflict.whiteboard, draftRef.current, savedCountRef.current);
        seenUpdatedAtRef.current = result.conflict.updatedAt;
        savedCountRef.current = merged.savedCount;
        draftRef.current = merged.state;
        setDraft(merged.state);
        setNotice("Board updated by the other participant. Your newest strokes were kept.");
        state = merged.state;
        mergedOnce = true;
      }
      setNotice("The board changed on the other side again. Your strokes are kept here - save to share them.");
    } finally {
      setSaving(false);
    }
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
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={clear}>
            <Eraser className="size-4" aria-hidden="true" />
            Clear
          </Button>
          <Button type="button" size="sm" className="gap-2" onClick={save} disabled={saving}>
            <Save className="size-4" aria-hidden="true" />
            Save whiteboard
          </Button>
        </div>
      </div>
      {notice && (
        <p role="status" className="text-xs text-muted-foreground">
          {notice}
        </p>
      )}
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
