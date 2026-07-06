export type SessionStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface SessionSummary {
  id: string;
  sessionId: string;
  summary: string;
  keyPoints: string[];
  nextSteps: string[];
  createdAt: string;
}

export interface WhiteboardState {
  strokes: {
    points: { x: number; y: number }[];
    color: string;
    size: number;
  }[];
}

export interface SessionWorkspace {
  id: string | null;
  sessionId: string;
  patientNote: string;
  whiteboard: WhiteboardState;
  createdAt: string | null;
  updatedAt: string | null;
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
  videoProvider: string | null;
  videoRoomId: string | null;
  videoUrl: string | null;
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
  history: SessionHistoryItem[];
}

export interface SessionHistoryItem {
  id: string;
  scheduledAt: string;
  status: SessionStatus;
  noteCount: number;
  notes: { id: string; content: string }[];
  summary: SessionSummary | null;
}

export interface PatientSessionItem {
  id: string;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  status: SessionStatus;
  videoProvider: string | null;
  videoRoomId: string | null;
  videoUrl: string | null;
  summary: SessionSummary | null;
}

/** Error thrown by write calls, keeping the HTTP status so callers can react to 409s. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** True when a save was rejected because the resource changed since the client last read it. */
export function isConflictError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 409;
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
    throw new ApiError(message, res.status);
  }
  return (await res.json()).data as T;
}

export const fetchSessions = () => getJson<SessionListItem[]>("/api/therapist/sessions");
export const fetchPatientSessions = () => getJson<PatientSessionItem[]>("/api/sessions");
export const createSession = (body: { patientId: string; scheduledAt: string }) =>
  send<SessionListItem>("/api/therapist/sessions", "POST", body);
export const fetchSession = (id: string) => getJson<SessionDetail>(`/api/therapist/sessions/${id}`);
export const updateSession = (id: string, body: { status?: SessionStatus; scheduledAt?: string }) =>
  send<SessionDetail>(`/api/therapist/sessions/${id}`, "PATCH", body);
export const ensureSessionVideo = (id: string) => send<SessionDetail>(`/api/therapist/sessions/${id}/video`, "POST");
/**
 * Workspace patch body. `baseUpdatedAt` is the `updatedAt` the client last
 * saw (null when no workspace existed); the server rejects the save with a
 * 409 when it no longer matches, instead of overwriting the other side.
 */
export interface SessionWorkspacePatch {
  patientNote?: string;
  whiteboard?: WhiteboardState;
  baseUpdatedAt?: string | null;
}

export const fetchPatientSessionWorkspace = (id: string) => getJson<SessionWorkspace>(`/api/sessions/${id}/workspace`);
export const updatePatientSessionWorkspace = (id: string, body: SessionWorkspacePatch) =>
  send<SessionWorkspace>(`/api/sessions/${id}/workspace`, "PATCH", body);
export const fetchTherapistSessionWorkspace = (id: string) =>
  getJson<SessionWorkspace>(`/api/therapist/sessions/${id}/workspace`);
export const updateTherapistSessionWorkspace = (id: string, body: SessionWorkspacePatch) =>
  send<SessionWorkspace>(`/api/therapist/sessions/${id}/workspace`, "PATCH", body);
export const addSessionNote = (id: string, content: string) =>
  send<SessionNote>(`/api/therapist/sessions/${id}/notes`, "POST", { content });
export const generateSessionSummary = (id: string) =>
  send<SessionSummary>(`/api/therapist/sessions/${id}/summary`, "POST");
