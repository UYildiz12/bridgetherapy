// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AppShell } from "../app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/notes",
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

describe("AppShell", () => {
  afterEach(cleanup);

  it("opens patient navigation in a mobile dropdown", () => {
    render(
      <AppShell firstName="Mina" lastName="Kaya" email="mina@example.com" role="PATIENT">
        <p>Patient content</p>
      </AppShell>,
    );

    expect(screen.queryByRole("navigation", { name: /mobile navigation/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));

    const mobileNav = screen.getByRole("navigation", { name: /mobile navigation/i });
    expect(within(mobileNav).getByRole("link", { name: "Reflections" }).getAttribute("aria-current")).toBe("page");
    expect(within(mobileNav).getByRole("link", { name: "Sessions" }).getAttribute("href")).toBe("/sessions");
    expect(within(mobileNav).getByRole("link", { name: "Therapist" }).getAttribute("href")).toBe("/find");
    expect(screen.getByRole("button", { name: /close navigation menu/i }).getAttribute("aria-expanded")).toBe("true");
  });

  it("uses therapist links for therapist accounts", () => {
    render(
      <AppShell firstName="Sam" email="sam@example.com" role="THERAPIST">
        <p>Therapist content</p>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));

    const mobileNav = screen.getByRole("navigation", { name: /mobile navigation/i });
    expect(within(mobileNav).getByRole("link", { name: "Patients" }).getAttribute("href")).toBe("/practice/patients");
    expect(within(mobileNav).getByRole("link", { name: "Assignments" }).getAttribute("href")).toBe(
      "/practice/assignments",
    );
  });
});
