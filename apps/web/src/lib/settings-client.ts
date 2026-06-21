export type AccountRole = "PATIENT" | "THERAPIST" | "ADMIN";

export interface AccountSettings {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AccountRole;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchAccountSettings(): Promise<AccountSettings> {
  const res = await fetch("/api/me");
  if (!res.ok) throw new Error(`GET /api/me failed: ${res.status}`);
  return (await res.json()).data as AccountSettings;
}
