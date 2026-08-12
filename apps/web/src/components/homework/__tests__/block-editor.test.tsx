// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BlockEditor } from "../block-editor";
import { docSchema, type HomeworkDoc } from "@/lib/homework/blocks";

const EMPTY: HomeworkDoc = { version: 2, schedule: { cadence: "once" }, blocks: [] };

function setup(value: HomeworkDoc = EMPTY) {
  const onChange = vi.fn();
  render(<BlockEditor value={value} onChange={onChange} />);
  return onChange;
}

afterEach(cleanup);

describe("BlockEditor", () => {
  it("adds a block from the grouped palette", () => {
    const onChange = setup();
    fireEvent.click(screen.getByRole("button", { name: /add block/i }));
    expect(screen.getByText("Content")).toBeDefined();
    expect(screen.getByText("Inputs")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /scale/i }));
    const doc = onChange.mock.calls[0][0] as HomeworkDoc;
    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0].type).toBe("input.scale");
  });

  it("edits a block's config", () => {
    const doc: HomeworkDoc = {
      version: 2,
      schedule: { cadence: "once" },
      blocks: [{ type: "input.text", id: "w", label: "", multiline: true }],
    };
    const onChange = setup(doc);
    fireEvent.change(screen.getByLabelText(/text answer label/i), { target: { value: "Situation" } });
    const next = onChange.mock.calls[0][0] as HomeworkDoc;
    expect(next.blocks[0]).toMatchObject({ id: "w", label: "Situation" });
  });

  it("moves, duplicates, and deletes blocks", () => {
    const doc: HomeworkDoc = {
      version: 2,
      schedule: { cadence: "once" },
      blocks: [
        { type: "heading", id: "a", text: "One" },
        { type: "heading", id: "b", text: "Two" },
      ],
    };
    const onChange = setup(doc);
    fireEvent.click(screen.getByRole("button", { name: /move block 2 up/i }));
    expect((onChange.mock.calls[0][0] as HomeworkDoc).blocks.map((b) => b.id)).toEqual(["b", "a"]);

    fireEvent.click(screen.getByRole("button", { name: /duplicate block 1/i }));
    const dup = onChange.mock.calls[1][0] as HomeworkDoc;
    expect(dup.blocks).toHaveLength(3);
    expect(dup.blocks[1].type).toBe("heading");
    expect(dup.blocks[1].id).not.toBe("a");

    fireEvent.click(screen.getByRole("button", { name: /delete block 1/i }));
    expect((onChange.mock.calls[2][0] as HomeworkDoc).blocks.map((b) => b.id)).toEqual(["b"]);
  });

  it("changes cadence and shows the helper line", () => {
    const onChange = setup({
      version: 2,
      schedule: { cadence: "once" },
      blocks: [{ type: "heading", id: "a", text: "One" }],
    });
    fireEvent.change(screen.getByLabelText(/schedule/i), { target: { value: "daily" } });
    expect((onChange.mock.calls[0][0] as HomeworkDoc).schedule.cadence).toBe("daily");
  });

  it("emits schema-valid docs when fields are filled", () => {
    const doc: HomeworkDoc = {
      version: 2,
      schedule: { cadence: "once" },
      blocks: [{ type: "input.choice", id: "c", label: "Pick", options: ["a", "b"] }],
    };
    const onChange = setup(doc);
    fireEvent.change(screen.getByLabelText(/choice options/i), { target: { value: "One\nTwo\nThree" } });
    const next = onChange.mock.calls[0][0] as HomeworkDoc;
    expect(docSchema.safeParse(next).success).toBe(true);
    expect((next.blocks[0] as { options: string[] }).options).toEqual(["One", "Two", "Three"]);
  });
});
