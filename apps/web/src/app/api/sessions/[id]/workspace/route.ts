import { prisma } from "@bridge/db";
import { json, withErrorHandling } from "@/lib/http";
import { requirePatient } from "@/lib/patient";
import {
  saveWorkspacePatch,
  toWorkspaceDto,
  WORKSPACE_CONFLICT_MESSAGE,
  WorkspacePatch,
} from "@/lib/session-workspace";
import { parseBody } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

async function requireOwnSession(req: Request, id: string) {
  const p = await requirePatient(req);
  if (!p.ok) return p;

  const session = await prisma.session.findFirst({
    where: { id, patientId: p.patientId },
    select: { id: true },
  });
  if (!session) return { ok: false as const, response: json({ error: "Session not found" }, 404) };
  return { ok: true as const, patientId: p.patientId };
}

export const GET = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const own = await requireOwnSession(req, id);
  if (!own.ok) return own.response;

  const workspace = await prisma.sessionWorkspace.findUnique({ where: { sessionId: id } });
  return json({ data: toWorkspaceDto(workspace, id) }, 200);
});

export const PATCH = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const own = await requireOwnSession(req, id);
  if (!own.ok) return own.response;

  const parsed = await parseBody(req, WorkspacePatch);
  if (!parsed.ok) return parsed.response;

  // Guarded write: a stale `baseUpdatedAt` means the other side saved first.
  const saved = await saveWorkspacePatch(id, parsed.data);
  if (!saved.ok) return json({ error: WORKSPACE_CONFLICT_MESSAGE }, 409);

  return json({ data: toWorkspaceDto(saved.workspace, id) }, 200);
});
