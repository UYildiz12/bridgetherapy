import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("app shell CSS layers", () => {
  it("keeps the sticky header above animated app content", () => {
    const css = readFileSync(new URL("../globals.css", import.meta.url), "utf8");
    const shellChildrenRule = css.indexOf(".app-shell > *");
    const headerRule = css.indexOf(".app-shell > header");

    expect(shellChildrenRule).toBeGreaterThanOrEqual(0);
    expect(headerRule).toBeGreaterThan(shellChildrenRule);
    expect(css.slice(headerRule, headerRule + 80)).toContain("z-index: 40");
  });
});
