export type SessionStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface SessionSummary {
  id: string;
  sessionId: string;
  summary: string;
  keyPoints: string[];
  nextSteps: string[];
  createdAt: string;
}

export interface SessionListItem {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  status: SessionStatus;
  noteCount: number;
  hasSummary: boolean;
}

export interface SessionNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionDetail extends SessionListItem {
  notes: SessionNote[];
  summary: SessionSummary | null;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return (await res.json()).data as T;
}

async function send<T>(url: string, method: "POST" | "PATCH", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
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

export const fetchSessions = () => getJson<SessionListItem[]>("/api/therapist/sessions");
export const createSession = (body: { patientId: string; scheduledAt: string }) =>
  send<SessionListItem>("/api/therapist/sessions", "POST", body);
export const fetchSession = (id: string) => getJson<SessionDetail>(`/api/therapist/sessions/${id}`);
export const updateSession = (id: string, body: { status?: SessionStatus; scheduledAt?: string }) =>
  send<SessionDetail>(`/api/therapist/sessions/${id}`, "PATCH", body);
export const addSessionNote = (id: string, content: string) =>
  send<SessionNote>(`/api/therapist/sessions/${id}/notes`, "POST", { content });
export const generateSessionSummary = (id: string) =>
  send<SessionSummary>(`/api/therapist/sessions/${id}/summary`, "POST");
