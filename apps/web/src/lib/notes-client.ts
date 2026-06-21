export interface PatientNote {
  id: string;
  content: string;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TherapistNote extends PatientNote {
  patientId: string;
  patientName: string;
  patientEmail: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return (await res.json()).data as T;
}

async function send<T>(url: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
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

export const fetchPatientNotes = () => getJson<PatientNote[]>("/api/notes");
export const createPatientNote = (content: string) =>
  send<PatientNote>("/api/notes", "POST", { content });
export const fetchTherapistNotes = () => getJson<TherapistNote[]>("/api/therapist/notes");
export const updateTherapistNote = (id: string, isResolved: boolean) =>
  send<TherapistNote>(`/api/therapist/notes/${id}`, "PATCH", { isResolved });
