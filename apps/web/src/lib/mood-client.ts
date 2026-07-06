export interface MoodEntry {
  id: string;
  moodScore: number;
  notes?: string | null;
  tags: string[];
  createdAt: string;
}

export interface CreateMoodInput {
  moodScore: number;
  notes?: string;
  tags?: string[];
}

export interface MoodHistory {
  /** Newest-first, capped by the API (enough for charts and recent lists). */
  entries: MoodEntry[];
  /** Real all-time check-in count, independent of the list cap. */
  total: number;
}

export async function fetchMoodHistory(): Promise<MoodHistory> {
  const res = await fetch("/api/mood");
  if (!res.ok) throw new Error(`Failed to load mood entries: ${res.status}`);
  const body = (await res.json()) as { data: MoodEntry[]; total?: number };
  return { entries: body.data, total: body.total ?? body.data.length };
}

export async function createMoodEntry(input: CreateMoodInput): Promise<MoodEntry> {
  const res = await fetch("/api/mood", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to save mood: ${res.status}`);
  return (await res.json()).data as MoodEntry;
}
