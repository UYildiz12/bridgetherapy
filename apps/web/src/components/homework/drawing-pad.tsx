"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadMedia, mediaUrl } from "@/lib/homework/client";

const BG = "#0e1320";
const INK = "#e8eefc";

/** A simple pointer-driven sketch pad that exports a PNG, uploads it, and reports the media id. */
export function DrawingPad({
  value,
  onChange,
}: {
  value?: string;
  onChange: (mediaId: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resetCanvas();
  }, []);

  function ctx() {
    return canvasRef.current!.getContext("2d")!;
  }

  function resetCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    g.fillStyle = BG;
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = INK;
    g.lineWidth = 2.5;
    g.lineCap = "round";
    g.lineJoin = "round";
  }

  function point(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }

  function down(e: React.PointerEvent) {
    drawing.current = true;
    const { x, y } = point(e);
    const g = ctx();
    g.beginPath();
    g.moveTo(x, y);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const { x, y } = point(e);
    const g = ctx();
    g.lineTo(x, y);
    g.stroke();
    setDirty(true);
  }
  function up() {
    drawing.current = false;
  }

  function clear() {
    resetCanvas();
    setDirty(false);
  }

  function save() {
    setUploading(true);
    setError(null);
    canvasRef.current!.toBlob(async (blob) => {
      if (!blob) {
        setUploading(false);
        return;
      }
      try {
        onChange(await uploadMedia(blob, "drawing"));
        setDirty(false);
      } catch {
        setError("Couldn't save that drawing. Try again.");
      } finally {
        setUploading(false);
      }
    }, "image/png");
  }

  return (
    <div className="grid gap-2">
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(value)} alt="Your saved drawing" className="w-full rounded-md border border-border" />
      )}
      <canvas
        ref={canvasRef}
        width={600}
        height={360}
        className="w-full touch-none rounded-md border border-border"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      />
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          Clear
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={!dirty || uploading}>
          {uploading ? "Saving…" : "Save drawing"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
