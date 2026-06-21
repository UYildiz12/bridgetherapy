export type UserRole = "PATIENT" | "THERAPIST" | "ADMIN";

export interface CurrentUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
}

export interface MoodEntry {
  id: string;
  moodScore: number;
  notes?: string | null;
  tags: string[];
  createdAt?: string;
}

export interface ReflectionEntry {
  id: string;
  title: string | null;
  content: string;
  visibility: "PRIVATE" | "SHARED";
  updatedAt: string;
}

export interface HomeworkAssignment {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  dueDate: string | null;
  set: { title: string };
}

export interface ConversationListItem {
  id: string | null;
  peerName: string;
  peerRole: "PATIENT" | "THERAPIST";
  lastMessage: string | null;
  unreadCount: number;
}

export type ProgressReport =
  | {
      role: "PATIENT";
      mood: { average: number | null; delta: number | null };
      homework: { completionRate: number };
      reflections: { total: number };
    }
  | {
      role: "THERAPIST";
      patients: {
        patientId: string;
        patientName: string;
        moodAverage: number | null;
        homeworkCompletionRate: number;
      }[];
    };
