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

export async function fetchMoodEntries(): Promise<MoodEntry[]> {
  const res = await fetch("/api/mood");
  if (!res.ok) throw new Error(`Failed to load mood entries: ${res.status}`);
  return (await res.json()).data as MoodEntry[];
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
