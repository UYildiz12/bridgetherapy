export type NoteVisibility = "PRIVATE" | "SHARED";

/** A patient's own journal entry (their workspace). */
export interface JournalEntry {
  id: string;
  title: string | null;
  content: string;
  visibility: NoteVisibility;
  sharedAt: string | null;
  lumenCount: number;
  createdAt: string;
  updatedAt: string;
}

/** A shared entry as seen by the therapist (read-only). */
export interface SharedEntry {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  title: string | null;
  content: string;
  sharedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LumenRole = "USER" | "LUMEN";

export interface LumenMessage {
  id: string;
  noteId: string;
  role: LumenRole;
  content: string;
  createdAt: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return (await res.json()).data as T;
}

async function send<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `${method} ${url} failed: ${res.status}`;
    try {
      const e = await res.json();
      if (e?.error) message = e.error;
    } catch {
      // keep status-based message
    }
    throw new Error(message);
  }
  return (await res.json()).data as T;
}

// Patient workspace
export const fetchEntries = () => getJson<JournalEntry[]>("/api/notes");
export const createEntry = (input: { title?: string; content: string }) =>
  send<JournalEntry>("/api/notes", "POST", input);
export const updateEntry = (
  id: string,
  patch: { title?: string | null; content?: string; visibility?: NoteVisibility },
) => send<JournalEntry>(`/api/notes/${id}`, "PATCH", patch);
export const deleteEntry = (id: string) => send<{ id: string }>(`/api/notes/${id}`, "DELETE");

// Lumen conversation for one entry
export const fetchLumen = (id: string) =>
  getJson<{ configured: boolean; messages: LumenMessage[] }>(`/api/notes/${id}/lumen`);
export const sendLumen = (id: string, message: string) =>
  send<{ user: LumenMessage; lumen: LumenMessage }>(`/api/notes/${id}/lumen`, "POST", { message });

// Therapist (read-only shared entries)
export const fetchSharedEntries = () => getJson<SharedEntry[]>("/api/therapist/notes");
