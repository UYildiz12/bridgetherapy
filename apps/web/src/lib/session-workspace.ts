import { z } from "zod";
import type { Prisma } from "@exhale/db";

const Point = z.object({
  x: z.number().min(0).max(4096),
  y: z.number().min(0).max(4096),
});

const Stroke = z.object({
  points: z.array(Point).min(1).max(500),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#111827"),
  size: z.number().min(1).max(24).default(3),
});

export const Whiteboard = z.object({
  strokes: z.array(Stroke).max(240).default([]),
});

export const WorkspacePatch = z
  .object({
    patientNote: z.string().trim().max(4000).optional(),
    whiteboard: Whiteboard.optional(),
  })
  .strict();

export type WhiteboardState = z.infer<typeof Whiteboard>;
export type WorkspacePatchInput = z.infer<typeof WorkspacePatch>;

export const EMPTY_WHITEBOARD: WhiteboardState = { strokes: [] };

type WorkspaceRow = {
  id: string;
  sessionId: string;
  patientNote: string | null;
  whiteboard: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

export function normalizeWhiteboard(value: unknown): WhiteboardState {
  const parsed = Whiteboard.safeParse(value);
  return parsed.success ? parsed.data : EMPTY_WHITEBOARD;
}

export function workspaceData(input: WorkspacePatchInput) {
  const whiteboard = input.whiteboard ? normalizeWhiteboard(input.whiteboard) : undefined;
  return {
    ...(input.patientNote !== undefined ? { patientNote: input.patientNote || null } : {}),
    ...(whiteboard ? { whiteboard: whiteboard as unknown as Prisma.InputJsonValue } : {}),
  };
}

export function toWorkspaceDto(workspace: WorkspaceRow | null | undefined, sessionId: string) {
  return {
    id: workspace?.id ?? null,
    sessionId,
    patientNote: workspace?.patientNote ?? "",
    whiteboard: normalizeWhiteboard(workspace?.whiteboard),
    createdAt: workspace?.createdAt ?? null,
    updatedAt: workspace?.updatedAt ?? null,
  };
}
