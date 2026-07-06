import type { CbtIntake } from "@/lib/intake/schema";

export interface Intake {
  concerns: string[];
  availability: string[];
  goals: string;
  cbtIntake: CbtIntake;
  completed: boolean;
}

export type ConnectionState = "none" | "pending" | "active" | "declined";

export interface TherapistCard {
  therapistId: string;
  name: string;
  specialty: string | null;
  bio: string | null;
  specialties: string[];
  availability: string[];
  fitScore: number;
  reason: string;
  connection: ConnectionState;
}

export interface TherapistInvite {
  id: string;
  therapistName: string;
  invitedAt: string;
}

export interface MyConnection {
  status: "none" | "pending" | "active";
  therapistName?: string;
  invites?: TherapistInvite[];
}

export interface TherapistProfileForm {
  specialty: string | null;
  bio: string | null;
  specialties: string[];
  availability: string[];
  acceptingPatients: boolean;
}

export interface IncomingRequest {
  id: string;
  patientName: string;
  concerns: string[];
  goals: string | null;
  requestNote: string | null;
  requestedAt: string;
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
      // keep status-based message
    }
    throw new Error(message);
  }
  return (await res.json()).data as T;
}

// ---- Patient ----
export const fetchIntake = () => getJson<Intake>("/api/intake");
export const saveIntake = (body: { concerns: string[]; availability: string[]; goals: string; cbtIntake: CbtIntake }) =>
  send<Intake>("/api/intake", "PUT", body);
export const fetchTherapists = () => getJson<TherapistCard[]>("/api/therapists");
export const fetchMyConnection = () => getJson<MyConnection>("/api/connections");
export const requestConnection = (therapistId: string, note?: string) =>
  send<{ status: ConnectionState }>("/api/connections", "POST", { therapistId, note });
export const respondToInvite = (id: string, accept: boolean) =>
  send<{ status: string }>(`/api/connections/${id}`, "PUT", { accept });

// ---- Therapist ----
export const fetchMyTherapistProfile = () => getJson<TherapistProfileForm>("/api/therapist/profile");
export const saveMyTherapistProfile = (body: TherapistProfileForm) =>
  send<TherapistProfileForm>("/api/therapist/profile", "PUT", body);
export const fetchRequests = () => getJson<IncomingRequest[]>("/api/therapist/requests");
export const respondToRequest = (id: string, accept: boolean) =>
  send<{ status: string }>(`/api/therapist/requests/${id}`, "PUT", { accept });
