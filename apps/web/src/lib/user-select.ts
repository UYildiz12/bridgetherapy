import "server-only";
import { Prisma } from "@exhale/db";

/**
 * Fields safe to return to clients. Deliberately omits `passwordHash`.
 * Using a select (not include) means sensitive columns are never read from the DB,
 * and new sensitive fields added to the schema are NOT exposed by default.
 */
export const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  therapistProfile: true,
  patientProfile: true,
} satisfies Prisma.UserSelect;
