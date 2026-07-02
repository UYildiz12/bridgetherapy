import { describe, expect, it } from "vitest";
import { parseDoc, parseResponseDoc } from "../adapt";

const v1Content = {
  items: [
    { id: "i1", kind: "task", title: "Take a walk", detail: "10 minutes" },
    { id: "i2", kind: "reading", title: "Why exposure works", body: "Long text." },
    { id: "i3", kind: "writing", title: "Reflect", prompt: "What did you notice?" },
    { id: "i4", kind: "quiz", title: "Check", question: "Best next step?", choices: ["Avoid", "Approach"], answerIndex: 1 },
    { id: "i5", kind: "voice", title: "Say it", prompt: "Record" },
    { id: "i6", kind: "drawing", title: "Draw it" },
  ],
};
const v1Response = {
  items: { i1: { done: true }, i3: { text: "Calmer" }, i4: { choiceIndex: 1 }, i5: { mediaId: "m9" } },
  feedback: "Nice",
};

describe("parseDoc", () => {
  it("adapts v1 content to a v2 doc preserving ids", () => {
    const doc = parseDoc(v1Content);
    expect(doc.version).toBe(2);
    expect(doc.schedule.cadence).toBe("once");
    expect(doc.blocks.map((b) => [b.id, b.type])).toEqual([
      ["i1", "input.checklist"],
      ["i2", "text"],
      ["i3", "input.text"],
      ["i4", "input.choice"],
      ["i5", "input.media"],
      ["i6", "input.media"],
    ]);
  });

  it("passes v2 docs through and returns an empty doc for garbage", () => {
    const v2 = { version: 2, schedule: { cadence: "daily" }, blocks: [{ type: "heading", id: "h", text: "Hi" }] };
    expect(parseDoc(v2).schedule.cadence).toBe("daily");
    expect(parseDoc({ nope: true }).blocks).toEqual([]);
    expect(parseDoc(null).blocks).toEqual([]);
  });
});

describe("parseResponseDoc", () => {
  it("adapts a v1 response into entry #0 against the adapted doc", () => {
    const rd = parseResponseDoc(v1Content, v1Response);
    expect(rd.entries).toHaveLength(1);
    const b = rd.entries[0].blocks;
    expect(b.i1.checked).toEqual(["i1.do"]);
    expect(b.i3.text).toBe("Calmer");
    expect(b.i4.selected).toEqual([1]);
    expect(b.i5.mediaId).toBe("m9");
    expect(rd.feedback).toBe("Nice");
  });

  it("passes v2 responses through and defaults garbage to empty entries", () => {
    expect(parseResponseDoc(v1Content, { version: 2, entries: [] }).entries).toEqual([]);
    expect(parseResponseDoc(v1Content, null).entries).toEqual([]);
    expect(parseResponseDoc(v1Content, { items: {} }).entries).toEqual([]);
  });
});
