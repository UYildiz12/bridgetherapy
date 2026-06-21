export interface ExportRow {
  metric: string;
  value: string;
}

export interface PatientProgressReport {
  role: "PATIENT";
  mood: {
    average: number | null;
    current: number | null;
    previous: number | null;
    delta: number | null;
    entries: { moodScore: number; createdAt: string; tags?: string[] }[];
  };
  homework: { completed: number; total: number; completionRate: number };
  reflections: { total: number };
  exportRows: ExportRow[];
}

export interface TherapistPatientProgress {
  patientId: string;
  patientName: string;
  patientEmail: string;
  moodAverage: number | null;
  moodDelta: number | null;
  homeworkCompletionRate: number;
  reflectionCount: number;
}

export interface TherapistProgressReport {
  role: "THERAPIST";
  patients: TherapistPatientProgress[];
}

export type ProgressReport = PatientProgressReport | TherapistProgressReport;

export async function fetchProgressReport(): Promise<ProgressReport> {
  const res = await fetch("/api/reports/progress");
  if (!res.ok) throw new Error(`GET /api/reports/progress failed: ${res.status}`);
  return (await res.json()).data as ProgressReport;
}
