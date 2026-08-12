import { describe, it, expect } from "vitest";
import {
  setContentSchema,
  responseSubmissionSchema,
  isItemComplete,
  countComplete,
  isSetComplete,
  parseContent,
  parseResponse,
  type HomeworkItem,
  type HomeworkResponse,
} from "../schema";

const items: HomeworkItem[] = [
  { id: "a", kind: "task", title: "Walk" },
  { id: "b", kind: "writing", title: "Thought record" },
  { id: "c", kind: "quiz", title: "Q", question: "2+2?", choices: ["3", "4"], answerIndex: 1 },
];

describe("completion logic", () => {
  it("task is complete only when done", () => {
    expect(isItemComplete(items[0], { done: false })).toBe(false);
    expect(isItemComplete(items[0], { done: true })).toBe(true);
  });

  it("writing is complete when text is non-empty", () => {
    expect(isItemComplete(items[1], { done: false })).toBe(false);
    expect(isItemComplete(items[1], { done: false, text: "   " })).toBe(false);
    expect(isItemComplete(items[1], { done: false, text: "wrote it" })).toBe(true);
  });

  it("quiz is complete once a choice is picked", () => {
    expect(isItemComplete(items[2], { done: false })).toBe(false);
    expect(isItemComplete(items[2], { done: false, choiceIndex: 0 })).toBe(true);
  });

  it("voice/drawing are complete when a media id is present", () => {
    const voice: HomeworkItem = { id: "v", kind: "voice", title: "Note" };
    expect(isItemComplete(voice, { done: false })).toBe(false);
    expect(isItemComplete(voice, { done: false, mediaId: "m1" })).toBe(true);
  });

  it("counts and detects a fully complete set", () => {
    const content = { items };
    const full: HomeworkResponse = {
      items: { a: { done: true }, b: { done: false, text: "x" }, c: { done: false, choiceIndex: 1 } },
    };
    expect(countComplete(content, full)).toBe(3);
    expect(isSetComplete(content, full)).toBe(true);
    expect(isSetComplete(content, { items: { a: { done: true } } })).toBe(false);
  });
});

describe("content validation", () => {
  it("accepts a valid mixed set", () => {
    expect(setContentSchema.safeParse({ items }).success).toBe(true);
  });
  it("rejects an empty set", () => {
    expect(setContentSchema.safeParse({ items: [] }).success).toBe(false);
  });
  it("rejects a quiz whose answerIndex is out of range", () => {
    const bad = {
      items: [{ id: "q", kind: "quiz", title: "Q", question: "?", choices: ["a", "b"], answerIndex: 5 }],
    };
    expect(setContentSchema.safeParse(bad).success).toBe(false);
  });
  it("rejects duplicate item ids", () => {
    const dup = {
      items: [
        { id: "x", kind: "task", title: "A" },
        { id: "x", kind: "task", title: "B" },
      ],
    };
    expect(setContentSchema.safeParse(dup).success).toBe(false);
  });
  it("rejects an unknown item kind", () => {
    expect(setContentSchema.safeParse({ items: [{ id: "z", kind: "magic", title: "?" }] }).success).toBe(
      false,
    );
  });
});

describe("safe parsers and submission schema", () => {
  it("parseContent falls back to empty items on garbage", () => {
    expect(parseContent("nonsense")).toEqual({ items: [] });
  });
  it("parseResponse falls back to empty on null", () => {
    expect(parseResponse(null)).toEqual({ items: {} });
  });
  it("accepts a patient submission body", () => {
    expect(responseSubmissionSchema.safeParse({ items: { a: { done: true } }, submit: true }).success).toBe(
      true,
    );
  });
});
