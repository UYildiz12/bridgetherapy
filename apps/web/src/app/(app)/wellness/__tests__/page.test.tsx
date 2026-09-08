// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/wellness",
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import WellnessPage from "../page";

describe("WellnessPage", () => {
  beforeEach(() => {
    nav.search = "";
    nav.replace.mockReset();
  });

  afterEach(cleanup);

  // Tab panels are code-split via next/dynamic, so the first assertion inside a
  // panel awaits the chunk with findBy*; everything after can read synchronously.
  it("opens with a video library", async () => {
    render(<WellnessPage />);

    expect(screen.getByRole("heading", { name: /wellness/i })).toBeDefined();
    expect(await screen.findByRole("heading", { name: /calm anxiety/i })).toBeDefined();
    expect(screen.getByText(/how to break the anxiety cycle/i)).toBeDefined();
  });

  it("shows guided breathing and switches breathing patterns", async () => {
    render(<WellnessPage />);

    fireEvent.click(screen.getByRole("button", { name: /practice/i }));
    expect(screen.getByRole("heading", { name: /guided breathing/i })).toBeDefined();

    fireEvent.click(await screen.findByRole("button", { name: /4-7-8 breathing/i }));

    expect(screen.getByText(/long bridge signals/i)).toBeDefined();
    expect(screen.getByText(/Breathe out · 8s/i)).toBeDefined();
  });

  it("shows CBT learning support", async () => {
    render(<WellnessPage />);

    fireEvent.click(screen.getByRole("button", { name: /learn/i }));

    expect(await screen.findByText(/the CBT loop/i)).toBeDefined();
    expect(screen.getByText(/thinking traps/i)).toBeDefined();
    expect(screen.getByText(/thought records/i)).toBeDefined();
  });

  it("shows crisis support with direct emergency and 988 options", () => {
    render(<WellnessPage />);

    fireEvent.click(screen.getByRole("button", { name: /crisis/i }));

    expect(screen.getByText(/immediate danger/i)).toBeDefined();
    expect(screen.getByText(/call or text 988/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /chat with 988/i })).toBeDefined();
  });

  it("keeps the selected tab in the URL so views are linkable", () => {
    render(<WellnessPage />);

    fireEvent.click(screen.getByRole("button", { name: /crisis/i }));

    expect(nav.replace).toHaveBeenCalledWith("/wellness?tab=crisis", { scroll: false });
  });

  it("opens crisis resources directly from a ?tab=crisis deep link", () => {
    nav.search = "tab=crisis";
    render(<WellnessPage />);

    expect(screen.getByText(/immediate danger/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /call 988/i }).getAttribute("href")).toBe("tel:988");
    expect(screen.getByRole("link", { name: /text 988/i }).getAttribute("href")).toBe("sms:988");
  });

  it("falls back to the default view for an unknown ?tab value", async () => {
    nav.search = "tab=bogus";
    render(<WellnessPage />);

    expect(await screen.findByRole("heading", { name: /calm anxiety/i })).toBeDefined();
  });
});
