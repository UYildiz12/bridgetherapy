import "server-only";
import { prisma } from "@exhale/db";
// Relative import (not @/lib/audit): the db:approve CLI loads this module under
// tsx, which does not reliably resolve the @/ tsconfig path alias.
import { writeAuditLog } from "./audit";

/** Thrown for operator-correctable problems (unknown email, not a therapist). */
export class TherapistApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TherapistApprovalError";
  }
}

export interface ApproveResult {
  status: "approved" | "already-approved";
  userId: string;
  email: string;
}

/**
 * Approve a therapist by email: sets TherapistProfile.approvedAt and writes an
 * APPROVE_THERAPIST audit log. Idempotent — re-approving an approved therapist
 * is a no-op. This is the seam a future admin UI/route reuses.
 */
export async function approveTherapist(email: string): Promise<ApproveResult> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      therapistProfile: { select: { id: true, approvedAt: true } },
    },
  });

  if (!user) throw new TherapistApprovalError(`No user found with email ${email}`);
  if (user.role !== "THERAPIST") {
    throw new TherapistApprovalError(`${email} is not a therapist (role: ${user.role})`);
  }
  if (!user.therapistProfile) {
    throw new TherapistApprovalError(`${email} has no therapist profile`);
  }
  if (user.therapistProfile.approvedAt) {
    return { status: "already-approved", userId: user.id, email: user.email };
  }

  await prisma.therapistProfile.update({
    where: { id: user.therapistProfile.id },
    data: { approvedAt: new Date() },
  });

  await writeAuditLog({
    userId: user.id,
    action: "APPROVE_THERAPIST",
    resourceType: "TherapistProfile",
    resourceId: user.therapistProfile.id,
    metadata: { via: "cli" },
  });

  return { status: "approved", userId: user.id, email: user.email };
}
