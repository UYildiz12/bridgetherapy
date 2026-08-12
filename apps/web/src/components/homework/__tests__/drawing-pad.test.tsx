// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/homework/client", () => ({
  uploadMedia: vi.fn(),
  mediaUrl: (id: string) => `/api/media/${id}`,
}));

import { DrawingPad } from "../drawing-pad";

// jsdom has no 2D canvas implementation, so give the pad a no-op context.
const context2d = {
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 0,
  lineCap: "",
  lineJoin: "",
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
};
const originalGetContext = HTMLCanvasElement.prototype.getContext;

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    value: () => context2d,
    configurable: true,
    writable: true,
  });
});

afterAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    value: originalGetContext,
    configurable: true,
    writable: true,
  });
});

function drawStroke(canvas: HTMLElement) {
  fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
  fireEvent.pointerMove(canvas, { clientX: 40, clientY: 40 });
  fireEvent.pointerUp(canvas);
}

describe("DrawingPad", () => {
  afterEach(cleanup);

  it("labels the canvas for assistive tech", () => {
    render(<DrawingPad onChange={vi.fn()} />);

    expect(screen.getByLabelText(/drawing pad canvas/i)).toBeDefined();
  });

  it("asks for confirmation before clearing unsaved marks", () => {
    render(<DrawingPad onChange={vi.fn()} />);
    const canvas = screen.getByLabelText(/drawing pad canvas/i);
    const saveButton = () => screen.getByRole("button", { name: /save drawing/i }) as HTMLButtonElement;

    drawStroke(canvas);
    expect(saveButton().disabled).toBe(false);

    // First tap only asks — the drawing survives.
    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));
    expect(screen.getByText(/clear this drawing\?/i)).toBeDefined();
    expect(saveButton().disabled).toBe(false);

    // Changing your mind keeps the marks.
    fireEvent.click(screen.getByRole("button", { name: /keep it/i }));
    expect(screen.queryByText(/clear this drawing\?/i)).toBeNull();
    expect(saveButton().disabled).toBe(false);

    // Confirming wipes the pad.
    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));
    expect(screen.queryByText(/clear this drawing\?/i)).toBeNull();
    expect(saveButton().disabled).toBe(true);
  });

  it("clears an untouched pad without asking", () => {
    render(<DrawingPad onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));

    expect(screen.queryByText(/clear this drawing\?/i)).toBeNull();
  });
});
