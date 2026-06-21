import type { Prisma } from "@exhale/db";

type UserLabel = { firstName: string; lastName: string; email: string };

export function displayName(user: UserLabel) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
}

export const sessionInclude = (therapistId: string) =>
  ({
    patient: {
      select: { id: true, user: { select: { firstName: true, lastName: true, email: true } } },
    },
    notes: {
      where: { therapistId },
      orderBy: { createdAt: "asc" },
      select: { id: true, content: true, createdAt: true, updatedAt: true },
    },
    summary: true,
  }) satisfies Prisma.SessionInclude;

export const linkedSessionWhere = (id: string, therapistId: string) =>
  ({
    id,
    patient: {
      therapists: {
        some: { therapistId, isActive: true, status: "ACTIVE" },
      },
    },
  }) satisfies Prisma.SessionWhereInput;

type SessionWithRelations = Prisma.SessionGetPayload<{ include: ReturnType<typeof sessionInclude> }>;

function summaryDto(summary: SessionWithRelations["summary"]) {
  if (!summary) return null;
  return {
    id: summary.id,
    sessionId: summary.sessionId,
    summary: summary.summary,
    keyPoints: summary.keyPoints,
    nextSteps: summary.nextSteps,
    createdAt: summary.createdAt,
  };
}

export function toSessionListItem(session: SessionWithRelations) {
  return {
    id: session.id,
    patientId: session.patientId,
    patientName: displayName(session.patient.user),
    patientEmail: session.patient.user.email,
    scheduledAt: session.scheduledAt,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    status: session.status,
    noteCount: session.notes.length,
    hasSummary: Boolean(session.summary),
  };
}

export function toSessionDetail(session: SessionWithRelations) {
  return {
    ...toSessionListItem(session),
    notes: session.notes.map((note) => ({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })),
    summary: summaryDto(session.summary),
  };
}
