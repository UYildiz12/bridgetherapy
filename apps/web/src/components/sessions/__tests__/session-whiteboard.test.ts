import { describe, expect, it } from "vitest";
import {
  appendStrokePoint,
  mergeWhiteboards,
  MAX_STROKE_POINTS,
  MAX_STROKES,
} from "../session-whiteboard";
import type { WhiteboardState } from "@/lib/sessions-client";

function stroke(points: { x: number; y: number }[], color = "#111827") {
  return { points, color, size: 4 };
}

describe("appendStrokePoint", () => {
  it("appends points that moved far enough from the previous sample", () => {
    const state: WhiteboardState = { strokes: [stroke([{ x: 10, y: 10 }])] };
    const next = appendStrokePoint(state, { x: 14, y: 10 });
    expect(next.strokes[0].points).toEqual([
      { x: 10, y: 10 },
      { x: 14, y: 10 },
    ]);
  });

  it("decimates jittery sub-2px pointer moves", () => {
    const state: WhiteboardState = { strokes: [stroke([{ x: 10, y: 10 }])] };
    const next = appendStrokePoint(state, { x: 11, y: 10.5 });
    expect(next).toBe(state); // unchanged reference: the sample was dropped
  });

  it("hard-caps a stroke at the server's point limit so long drags stay saveable", () => {
    const points = Array.from({ length: MAX_STROKE_POINTS }, (_, i) => ({ x: i * 3, y: 0 }));
    const state: WhiteboardState = { strokes: [stroke(points)] };
    const next = appendStrokePoint(state, { x: 9_999, y: 0 });
    expect(next.strokes[0].points).toHaveLength(MAX_STROKE_POINTS);
  });

  it("does nothing when no stroke has been started", () => {
    const state: WhiteboardState = { strokes: [] };
    expect(appendStrokePoint(state, { x: 1, y: 1 })).toBe(state);
  });
});

describe("mergeWhiteboards", () => {
  it("re-applies only the strokes drawn since the last successful save", () => {
    const saved = stroke([{ x: 0, y: 0 }]);
    const localNew = stroke([{ x: 5, y: 5 }], "#b91c1c");
    const serverNew = stroke([{ x: 9, y: 9 }], "#0f766e");

    const merged = mergeWhiteboards(
      { strokes: [saved, serverNew] }, // fresh board: our old stroke + the other side's
      { strokes: [saved, localNew] }, // local draft: our old stroke + one unsaved stroke
      1, // one leading local stroke was already persisted
    );

    expect(merged.state.strokes).toEqual([saved, serverNew, localNew]);
    expect(merged.savedCount).toBe(2); // everything but the unsaved local stroke
  });

  it("keeps the whole fresh board when nothing new was drawn locally", () => {
    const server = { strokes: [stroke([{ x: 1, y: 1 }]), stroke([{ x: 2, y: 2 }])] };
    const merged = mergeWhiteboards(server, { strokes: [stroke([{ x: 1, y: 1 }])] }, 1);
    expect(merged.state).toEqual(server);
    expect(merged.savedCount).toBe(2);
  });

  it("trims the oldest strokes when the merge exceeds the server stroke cap", () => {
    const server = { strokes: Array.from({ length: MAX_STROKES }, (_, i) => stroke([{ x: i, y: 0 }])) };
    const local = { strokes: [stroke([{ x: 0, y: 999 }], "#b91c1c")] };

    const merged = mergeWhiteboards(server, local, 0);

    expect(merged.state.strokes).toHaveLength(MAX_STROKES);
    // The newest local stroke survives; the oldest server stroke was dropped.
    expect(merged.state.strokes.at(-1)).toEqual(local.strokes[0]);
    expect(merged.state.strokes[0]).toEqual(server.strokes[1]);
    expect(merged.savedCount).toBe(MAX_STROKES - 1);
  });
});
