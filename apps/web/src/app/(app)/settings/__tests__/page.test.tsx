// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { fetchAccountSettings } = vi.hoisted(() => ({
  fetchAccountSettings: vi.fn(),
}));

vi.mock("@/lib/settings-client", () => ({ fetchAccountSettings }));

import SettingsPage from "../page";

describe("SettingsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchAccountSettings.mockReset().mockResolvedValue({
      id: "u1",
      email: "sam@example.com",
      firstName: "Sam",
      lastName: "Lee",
      role: "PATIENT",
      isActive: true,
      createdAt: "2026-06-21T00:00:00.000Z",
      updatedAt: "2026-06-21T00:00:00.000Z",
    });
  });

  afterEach(cleanup);

  it("shows account identity and profile settings", async () => {
    render(<SettingsPage />);

    await waitFor(() => screen.getByText("sam@example.com"));

    expect(screen.getByRole("heading", { name: /settings/i })).toBeDefined();
    expect(screen.getByText("Sam Lee")).toBeDefined();
    expect(screen.getByText(/patient account/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /update intake/i })).toBeDefined();
  });

  it("keeps notification preferences locally", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByText("sam@example.com"));

    const checkbox = screen.getByLabelText(/homework nudges/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);

    expect(checkbox.checked).toBe(false);
    expect(localStorage.getItem("exhale.settings.homeworkNudges")).toBe("false");
  });

  it("shows privacy boundaries for reflections and crisis support", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByText("sam@example.com"));

    expect(screen.getByText(/reflections stay private/i)).toBeDefined();
    expect(screen.getByText(/crisis tools are not a substitute/i)).toBeDefined();
  });

  it("lets therapists set their urgent access preference locally", async () => {
    fetchAccountSettings.mockResolvedValue({
      id: "u2",
      email: "dr@example.com",
      firstName: "Dr",
      lastName: "Can",
      role: "THERAPIST",
      isActive: true,
      createdAt: "2026-06-21T00:00:00.000Z",
      updatedAt: "2026-06-21T00:00:00.000Z",
    });

    render(<SettingsPage />);
    await waitFor(() => screen.getByText("dr@example.com"));

    const select = screen.getByLabelText(/urgent access preference/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "sameDay" } });

    expect(select.value).toBe("sameDay");
    expect(localStorage.getItem("exhale.settings.urgentAccessPreference")).toBe("sameDay");
  });
});
