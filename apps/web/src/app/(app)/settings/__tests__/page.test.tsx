// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { fetchAccountSettings, fetchNotificationPreferences, saveNotificationPreferences } = vi.hoisted(() => ({
  fetchAccountSettings: vi.fn(),
  fetchNotificationPreferences: vi.fn(),
  saveNotificationPreferences: vi.fn(),
}));

vi.mock("@/lib/settings-client", () => ({ fetchAccountSettings }));
vi.mock("@/lib/preferences-client", () => ({ fetchNotificationPreferences, saveNotificationPreferences }));

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
    fetchNotificationPreferences.mockReset().mockResolvedValue({
      notifySessionReminders: true,
      notifyHomeworkNudges: true,
      notifyWeeklyCheckin: true,
    });
    saveNotificationPreferences.mockReset().mockImplementation(async (prefs) => prefs);
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

  it("loads and persists notification preferences through the API", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByText("sam@example.com"));

    const checkbox = (await screen.findByLabelText(/homework nudges/i)) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);

    expect(checkbox.checked).toBe(false);
    await waitFor(() =>
      expect(saveNotificationPreferences).toHaveBeenCalledWith({
        notifySessionReminders: true,
        notifyHomeworkNudges: false,
        notifyWeeklyCheckin: true,
      }),
    );
    // Persistence now lives on the User row, not in this browser.
    expect(localStorage.getItem("exhale.settings.homeworkNudges")).toBeNull();
  });

  it("reverts the toggle and surfaces an error when saving fails", async () => {
    saveNotificationPreferences.mockRejectedValue(new Error("PUT /api/me/preferences failed: 500"));

    render(<SettingsPage />);
    const checkbox = (await screen.findByLabelText(/homework nudges/i)) as HTMLInputElement;

    fireEvent.click(checkbox);

    await waitFor(() => screen.getByText(/couldn't save notification preferences/i));
    expect((screen.getByLabelText(/homework nudges/i) as HTMLInputElement).checked).toBe(true);
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
