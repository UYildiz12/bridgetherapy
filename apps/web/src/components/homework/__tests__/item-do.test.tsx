// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { ItemDo } from "../item-do";
import type { HomeworkItem } from "@/lib/homework/schema";

afterEach(cleanup);

describe("ItemDo", () => {
  it("toggles a task as done", () => {
    const item: HomeworkItem = { id: "a", kind: "task", title: "Walk" };
    const onChange = vi.fn();
    render(<ItemDo item={item} response={{ done: false }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /mark done/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ done: true }));
  });

  it("captures a written response", () => {
    const item: HomeworkItem = { id: "w", kind: "writing", title: "Thought record" };
    const onChange = vi.fn();
    render(<ItemDo item={item} response={{ done: false }} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText(/write your response/i), {
      target: { value: "hello" },
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ text: "hello" }));
  });

  it("records a quiz choice and reveals correctness", () => {
    const item: HomeworkItem = {
      id: "q",
      kind: "quiz",
      title: "Q",
      question: "2+2?",
      choices: ["3", "4"],
      answerIndex: 1,
    };
    const onChange = vi.fn();
    const { rerender } = render(<ItemDo item={item} response={{ done: false }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ choiceIndex: 1 }));
    rerender(<ItemDo item={item} response={{ done: false, choiceIndex: 1 }} onChange={onChange} />);
    expect(screen.getByText(/correct\.?/i)).toBeTruthy();
  });
});
