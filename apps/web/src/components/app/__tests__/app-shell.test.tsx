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
    expect(within(mobileNav).getByRole("link", { name: "Wellness" }).getAttribute("href")).toBe("/wellness");
    expect(within(mobileNav).getByRole("link", { name: "Therapist" }).getAttribute("href")).toBe("/find");
    expect(within(mobileNav).getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/settings");
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
    expect(within(mobileNav).getByRole("link", { name: "Protocols" }).getAttribute("href")).toBe(
      "/practice/protocols",
    );
  });

  it("opens account actions from the desktop avatar menu", () => {
    render(
      <AppShell firstName="Mina" lastName="Kaya" email="mina@example.com" role="PATIENT">
        <p>Patient content</p>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));

    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("Mina Kaya")).toBeDefined();
    expect(within(menu).getByRole("menuitem", { name: /settings/i }).getAttribute("href")).toBe("/settings");
  });
});
