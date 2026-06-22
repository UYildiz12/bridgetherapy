import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

import LearnPage from "../page";

describe("LearnPage", () => {
  it("redirects to the Wellness hub (Learn is merged there)", () => {
    LearnPage();
    expect(redirect).toHaveBeenCalledWith("/wellness");
  });
});
