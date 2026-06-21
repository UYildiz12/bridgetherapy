import "server-only";
import { prisma, type Homework, type Prisma } from "@exhale/db";
import { parseContent, parseResponse, countComplete } from "./schema";

export type DerivedStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";

/** Map a Homework row to the client-facing set DTO (content parsed + validated). */
export function toSetDTO(h: Homework) {
  return {
    id: h.id,
    title: h.title,
    description: h.description,
    content: parseContent(h.content),
    isTemplate: h.isTemplate,
    createdAt: h.createdAt,
    updatedAt: h.updatedAt,
  };
}

/** True when an active PatientTherapist link exists between this therapist and patient. */
export async function isLinked(therapistId: string, patientId: string): Promise<boolean> {
  const link = await prisma.patientTherapist.findUnique({
    where: { patientId_therapistId: { patientId, therapistId } },
    select: { isActive: true },
  });
  return Boolean(link?.isActive);
}

/** Cast a validated plain object to Prisma's Json input type without fighting the structural mismatch. */
export function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

type AssignmentRow = {
  id: string;
  status: string;
  dueDate: Date | null;
  completedAt: Date | null;
  response: Prisma.JsonValue;
  homework: Homework;
};

type AssignmentRowWithPatient = AssignmentRow & {
  patient: { id: string; user: { firstName: string; lastName: string; email: string } };
};

function displayName(u: { firstName: string; lastName: string; email: string }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email;
}

/** Stored status, but surfaced as OVERDUE when past the due date and not yet completed. */
export function derivedStatus(a: { status: string; dueDate: Date | null }): DerivedStatus {
  if (a.status === "COMPLETED") return "COMPLETED";
  if (a.dueDate && a.dueDate.getTime() < Date.now()) return "OVERDUE";
  return (a.status as DerivedStatus) || "PENDING";
}

export function toPatientAssignmentDTO(a: AssignmentRow) {
  return {
    id: a.id,
    status: derivedStatus(a),
    dueDate: a.dueDate,
    completedAt: a.completedAt,
    set: toSetDTO(a.homework),
    response: parseResponse(a.response),
  };
}

export function toTherapistAssignmentDTO(a: AssignmentRowWithPatient) {
  const content = parseContent(a.homework.content);
  const response = parseResponse(a.response);
  return {
    id: a.id,
    status: derivedStatus(a),
    dueDate: a.dueDate,
    completedAt: a.completedAt,
    reviewedAt: response.reviewedAt ?? null,
    patient: { patientId: a.patient.id, name: displayName(a.patient.user) },
    set: { id: a.homework.id, title: a.homework.title },
    completedCount: countComplete(content, response),
    itemCount: content.items.length,
  };
}
