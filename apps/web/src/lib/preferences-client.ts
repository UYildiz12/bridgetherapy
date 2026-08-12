export interface NotificationPreferences {
  notifySessionReminders: boolean;
  notifyHomeworkNudges: boolean;
  notifyWeeklyCheckin: boolean;
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await fetch("/api/me/preferences");
  if (!res.ok) throw new Error(`GET /api/me/preferences failed: ${res.status}`);
  return (await res.json()).data as NotificationPreferences;
}

export async function saveNotificationPreferences(
  prefs: NotificationPreferences,
): Promise<NotificationPreferences> {
  const res = await fetch("/api/me/preferences", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error(`PUT /api/me/preferences failed: ${res.status}`);
  return (await res.json()).data as NotificationPreferences;
}
