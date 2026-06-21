"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, LockKeyhole, UserRound } from "lucide-react";
import { fetchAccountSettings, type AccountSettings } from "@/lib/settings-client";

type PrefKey = "sessionReminders" | "homeworkNudges" | "weeklyCheckIn";

const prefStorage: Record<PrefKey, string> = {
  sessionReminders: "exhale.settings.sessionReminders",
  homeworkNudges: "exhale.settings.homeworkNudges",
  weeklyCheckIn: "exhale.settings.weeklyCheckIn",
};

function storedBoolean(key: PrefKey, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(prefStorage[key]);
  return value === null ? fallback : value === "true";
}

function displayName(account: AccountSettings) {
  return [account.firstName, account.lastName].filter(Boolean).join(" ").trim() || account.email;
}

export default function SettingsPage() {
  const [account, setAccount] = useState<AccountSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>(() => ({
    sessionReminders: storedBoolean("sessionReminders", true),
    homeworkNudges: storedBoolean("homeworkNudges", true),
    weeklyCheckIn: storedBoolean("weeklyCheckIn", false),
  }));

  useEffect(() => {
    fetchAccountSettings()
      .then(setAccount)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load settings."));
  }, []);

  function toggle(key: PrefKey) {
    setPrefs((current) => {
      const next = { ...current, [key]: !current[key] };
      window.localStorage.setItem(prefStorage[key], String(next[key]));
      return next;
    });
  }

  return (
    <section className="space-y-8">
      <div className="border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Preferences</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1>
      </div>

      {error && <p className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>}
      {!account && !error && <p className="text-sm text-muted-foreground">Loading settings...</p>}

      {account && (
        <div className="grid gap-8">
          <section className="grid gap-5 border-t border-border pt-5 md:grid-cols-[13rem_1fr]">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserRound className="h-4 w-4" />
              Account
            </div>
            <div className="grid gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{displayName(account)}</h2>
                <p className="text-sm text-muted-foreground">{account.email}</p>
              </div>
              <p className="text-sm capitalize text-muted-foreground">
                {account.role.toLowerCase()} account
              </p>
              {account.role === "THERAPIST" ? (
                <Link href="/practice/profile" className="text-sm font-medium text-primary hover:underline">
                  Edit therapist profile
                </Link>
              ) : (
                <Link href="/intake" className="text-sm font-medium text-primary hover:underline">
                  Update intake
                </Link>
              )}
            </div>
          </section>

          <section className="grid gap-5 border-t border-border pt-5 md:grid-cols-[13rem_1fr]">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bell className="h-4 w-4" />
              Notifications
            </div>
            <div className="grid gap-3">
              {[
                ["sessionReminders", "Session reminders"],
                ["homeworkNudges", "Homework nudges"],
                ["weeklyCheckIn", "Weekly check-in prompt"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-4 border-b border-border py-3 text-sm">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={prefs[key as PrefKey]}
                    onChange={() => toggle(key as PrefKey)}
                    className="size-4 accent-primary"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="grid gap-5 border-t border-border pt-5 md:grid-cols-[13rem_1fr]">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LockKeyhole className="h-4 w-4" />
              Privacy
            </div>
            <div className="grid gap-3 text-sm leading-6 text-muted-foreground">
              <p>Reflections stay private until you explicitly share them with a therapist.</p>
              <p>Crisis tools are not a substitute for emergency care or live crisis support.</p>
              <p>Billing and HIPAA/compliance settings are intentionally outside this build.</p>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
