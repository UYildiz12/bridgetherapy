// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("../voice-recorder", () => ({ VoiceRecorder: () => <div data-testid="voice-recorder" /> }));
vi.mock("../drawing-pad", () => ({ DrawingPad: () => <div data-testid="drawing-pad" /> }));

import { BlockView } from "../block-view";
import type { Block } from "@/lib/homework/blocks";

const renderBlock = (block: Block, response = {}, readOnly = false) => {
  const onChange = vi.fn();
  render(<BlockView block={block} response={response} onChange={onChange} readOnly={readOnly} />);
  return onChange;
};

afterEach(cleanup);

describe("BlockView", () => {
  it("renders heading and text blocks; ack toggles done", () => {
    renderBlock({ type: "heading", id: "h", text: "Section one" });
    expect(screen.getByText("Section one")).toBeDefined();

    const onChange = renderBlock({ type: "text", id: "t", body: "Read me.", requireAck: true });
    fireEvent.click(screen.getByRole("button", { name: /mark as read/i }));
    expect(onChange).toHaveBeenCalledWith({ done: true });
  });

  it("edits text input", () => {
    const onChange = renderBlock({ type: "input.text", id: "w", label: "Situation", multiline: true });
    fireEvent.change(screen.getByLabelText("Situation"), { target: { value: "On the bus" } });
    expect(onChange).toHaveBeenCalledWith({ text: "On the bus" });
  });

  it("edits scale via range input and shows the value in serif", () => {
    const onChange = renderBlock({ type: "input.scale", id: "s", label: "SUDS", min: 0, max: 100 }, { value: 40 });
    fireEvent.change(screen.getByLabelText("SUDS"), { target: { value: "65" } });
    expect(onChange).toHaveBeenCalledWith({ value: 65 });
    expect(screen.getByText("40")).toBeDefined();
  });

  it("selects single and multi choices", () => {
    const single = renderBlock({ type: "input.choice", id: "c", label: "Pick", options: ["A", "B"] });
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(single).toHaveBeenCalledWith({ selected: [1] });
    cleanup();
    const multi = renderBlock(
      { type: "input.choice", id: "c2", label: "Pick many", options: ["A", "B"], multi: true },
      { selected: [0] },
    );
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(multi).toHaveBeenCalledWith({ selected: [0, 1] });
  });

  it("toggles checklist items", () => {
    const onChange = renderBlock({
      type: "input.checklist",
      id: "k",
      items: [
        { id: "k1", text: "First" },
        { id: "k2", text: "Second" },
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: /second/i }));
    expect(onChange).toHaveBeenCalledWith({ checked: ["k2"] });
  });

  it("adds table rows and edits cells", () => {
    const block: Block = {
      type: "input.table",
      id: "tb",
      label: "Log",
      columns: [
        { id: "what", header: "What", kind: "text" },
        { id: "suds", header: "SUDS", kind: "scale", min: 0, max: 100 },
      ],
      minRows: 2,
    };
    const add = renderBlock(block);
    fireEvent.click(screen.getByRole("button", { name: /add row/i }));
    expect(add).toHaveBeenCalledWith({ rows: [{}] });
    cleanup();
    const edit = renderBlock(block, { rows: [{}] });
    fireEvent.change(screen.getByLabelText("What row 1"), { target: { value: "Bus" } });
    expect(edit).toHaveBeenCalledWith({ rows: [{ what: "Bus" }] });
    fireEvent.change(screen.getByLabelText("SUDS row 1"), { target: { value: "55" } });
    expect(edit).toHaveBeenCalledWith({ rows: [{ suds: 55 }] });
  });

  it("renders media blocks through the shared recorders", () => {
    renderBlock({ type: "input.media", id: "m", label: "Say it", mode: "voice" });
    expect(screen.getByTestId("voice-recorder")).toBeDefined();
    cleanup();
    renderBlock({ type: "input.media", id: "d", label: "Draw it", mode: "drawing" });
    expect(screen.getByTestId("drawing-pad")).toBeDefined();
  });

  it("renders activity blocks: auto-verified shows count and no self toggle; self-report toggles", () => {
    renderBlock(
      { type: "input.activity", id: "a", label: "Check in", activity: "mood-checkin", count: 3 },
      { verifiedIds: ["x"] },
    );
    expect(screen.getByText(/1 of 3 verified/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /i did this/i })).toBeNull();
    cleanup();
    const onChange = renderBlock({ type: "input.activity", id: "b", label: "Breathe", activity: "breathing" });
    fireEvent.click(screen.getByRole("button", { name: /i did this/i }));
    expect(onChange).toHaveBeenCalledWith({ selfDone: true });
  });

  it("readOnly disables editing", () => {
    renderBlock({ type: "input.text", id: "w", label: "Situation" }, { text: "locked" }, true);
    expect((screen.getByLabelText("Situation") as HTMLInputElement).disabled).toBe(true);
  });
});
