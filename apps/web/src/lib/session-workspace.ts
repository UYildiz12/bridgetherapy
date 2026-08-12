import { z } from "zod";
import { prisma, type Prisma } from "@exhale/db";

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
    /**
     * Optimistic-concurrency precondition: the workspace `updatedAt` the client
     * last saw (`null` when it saw no workspace yet). When present, the save
     * only applies if the row still matches; a stale value yields a 409 so
     * patient and therapist cannot silently overwrite each other's board.
     * Omitted by older clients, which keep last-write-wins.
     */
    baseUpdatedAt: z.string().datetime().nullable().optional(),
  })
  .strict();

export type WhiteboardState = z.infer<typeof Whiteboard>;
export type WorkspacePatchInput = z.infer<typeof WorkspacePatch>;

export const EMPTY_WHITEBOARD: WhiteboardState = { strokes: [] };

export const WORKSPACE_CONFLICT_MESSAGE =
  "This board was updated on the other side. The latest version has been loaded - please save again.";

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

/**
 * Persist a workspace patch. With a `baseUpdatedAt` precondition the write is
 * guarded (`updateMany` filtered on the last-seen `updatedAt`), so two open
 * boards cannot silently drop each other's strokes; `{ ok: false }` signals a
 * conflict the route should surface as a 409. Without the precondition the
 * legacy last-write-wins upsert is kept for older clients.
 */
export async function saveWorkspacePatch(
  sessionId: string,
  patch: WorkspacePatchInput,
): Promise<{ ok: true; workspace: WorkspaceRow } | { ok: false }> {
  const data = workspaceData(patch);

  if (patch.baseUpdatedAt === undefined) {
    const workspace = await prisma.sessionWorkspace.upsert({
      where: { sessionId },
      update: data,
      create: { sessionId, ...data },
    });
    return { ok: true, workspace };
  }

  if (patch.baseUpdatedAt === null) {
    // The client saw no workspace yet; if one exists now, the other side saved first.
    try {
      const workspace = await prisma.sessionWorkspace.create({ data: { sessionId, ...data } });
      return { ok: true, workspace };
    } catch {
      // Unique violation on sessionId: the row appeared between read and write.
      return { ok: false };
    }
  }

  const { count } = await prisma.sessionWorkspace.updateMany({
    where: { sessionId, updatedAt: new Date(patch.baseUpdatedAt) },
    data,
  });
  if (count === 0) return { ok: false };

  // updateMany does not return the row; re-fetch it for the DTO.
  const workspace = await prisma.sessionWorkspace.findUnique({ where: { sessionId } });
  if (!workspace) return { ok: false };
  return { ok: true, workspace };
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
