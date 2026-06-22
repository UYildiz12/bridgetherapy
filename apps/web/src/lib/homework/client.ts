import type { HomeworkSetContent, HomeworkResponse, ItemResponse } from "./schema";

export type AssignmentStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";

export interface HomeworkSet {
  id: string;
  title: string;
  description: string | null;
  content: HomeworkSetContent;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedPatient {
  patientId: string;
  name: string;
  email: string;
  linkedAt: string;
}

export interface PatientInvite {
  patientId: string;
  name: string;
  email: string;
  linkedAt: string;
  status: "pending";
}

/** Patient-facing view of one assigned set. */
export interface PatientAssignment {
  id: string;
  status: AssignmentStatus;
  dueDate: string | null;
  completedAt: string | null;
  set: HomeworkSet;
  response: HomeworkResponse;
}

/** Therapist-facing roll-up of an assignment across the practice. */
export interface TherapistAssignment {
  id: string;
  status: AssignmentStatus;
  dueDate: string | null;
  completedAt: string | null;
  reviewedAt: string | null;
  patient: { patientId: string; name: string };
  set: { id: string; title: string };
  completedCount: number;
  itemCount: number;
}

export interface ReviewDetail {
  assignment: TherapistAssignment;
  set: HomeworkSet;
  response: HomeworkResponse;
  patientName: string;
}

export interface HomeworkSetDraft {
  title: string;
  description?: string;
  content: HomeworkSetContent;
  model?: string;
  reviewRequired: boolean;
  guidance?: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return (await res.json()).data as T;
}

async function send<T>(url: string, method: "POST" | "PUT", body: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `${method} ${url} failed: ${res.status}`;
    try {
      const e = await res.json();
      if (e?.error) message = e.error;
    } catch {
      // keep the status-based message
    }
    throw new Error(message);
  }
  return (await res.json()).data as T;
}

// ---- Patient ----
export const fetchMyHomework = () => getJson<PatientAssignment[]>("/api/homework");
export const fetchMyAssignment = (id: string) => getJson<PatientAssignment>(`/api/homework/${id}`);
export const saveMyResponse = (
  id: string,
  body: { items: Record<string, ItemResponse>; submit?: boolean },
) => send<PatientAssignment>(`/api/homework/${id}`, "PUT", body);

// ---- Therapist ----
export const fetchPatients = () => getJson<LinkedPatient[]>("/api/therapist/patients");
export const addPatient = (email: string) =>
  send<PatientInvite>("/api/therapist/patients", "POST", { email });

export const fetchSets = () => getJson<HomeworkSet[]>("/api/therapist/homework");
export const fetchSet = (id: string) => getJson<HomeworkSet>(`/api/therapist/homework/${id}`);
export const createSet = (body: {
  title: string;
  description?: string;
  content: HomeworkSetContent;
}) => send<HomeworkSet>("/api/therapist/homework", "POST", body);
export const draftSetWithAI = (body: { prompt: string; patientContext?: string }) =>
  send<HomeworkSetDraft>("/api/therapist/homework/draft", "POST", body);
export const updateSet = (
  id: string,
  body: { title?: string; description?: string; content?: HomeworkSetContent },
) => send<HomeworkSet>(`/api/therapist/homework/${id}`, "PUT", body);

export const fetchAssignments = () => getJson<TherapistAssignment[]>("/api/therapist/assignments");
export const fetchReviewDetail = (id: string) =>
  getJson<ReviewDetail>(`/api/therapist/assignments/${id}`);
export const assignSet = (body: { homeworkId: string; patientId: string; dueDate?: string }) =>
  send<TherapistAssignment>("/api/therapist/assignments", "POST", body);
export const reviewAssignment = (id: string, feedback: string) =>
  send<{ id: string; reviewedAt: string }>(`/api/therapist/assignments/${id}/review`, "PUT", {
    feedback,
  });

// ---- Media (voice / drawing) ----
export async function uploadMedia(blob: Blob, kind: "voice" | "drawing"): Promise<string> {
  const form = new FormData();
  form.append("file", blob, kind === "voice" ? "note.webm" : "drawing.png");
  form.append("kind", kind);
  const res = await fetch("/api/media", { method: "POST", body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return (await res.json()).data.mediaId as string;
}

/** A media id resolves to a short-lived signed URL via this route (302 redirect), so it
 *  can be used directly as an <audio>/<img> src. */
export const mediaUrl = (id: string) => `/api/media/${id}`;
