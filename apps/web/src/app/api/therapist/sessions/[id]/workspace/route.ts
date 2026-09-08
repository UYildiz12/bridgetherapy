import { prisma } from "@bridge/db";
import { requireApprovedTherapist } from "@/lib/authz";
import { json, withErrorHandling } from "@/lib/http";
import { linkedSessionWhere } from "@/lib/sessions/server";
import {
  saveWorkspacePatch,
  toWorkspaceDto,
  WORKSPACE_CONFLICT_MESSAGE,
  WorkspacePatch,
} from "@/lib/session-workspace";
import { parseBody } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

async function requireLinkedSession(req: Request, id: string) {
  const t = await requireApprovedTherapist(req);
  if (!t.ok) return t;

  const therapistId = t.user.therapistProfile!.id;
  const session = await prisma.session.findFirst({
    where: linkedSessionWhere(id, therapistId),
    select: { id: true },
  });
  if (!session) return { ok: false as const, response: json({ error: "Session not found" }, 404) };
  return { ok: true as const, therapistId };
}

export const GET = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const linked = await requireLinkedSession(req, id);
  if (!linked.ok) return linked.response;

  const workspace = await prisma.sessionWorkspace.findUnique({ where: { sessionId: id } });
  return json({ data: toWorkspaceDto(workspace, id) }, 200);
});

export const PATCH = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const linked = await requireLinkedSession(req, id);
  if (!linked.ok) return linked.response;

  const parsed = await parseBody(req, WorkspacePatch);
  if (!parsed.ok) return parsed.response;

  // Guarded write: a stale `baseUpdatedAt` means the other side saved first.
  const saved = await saveWorkspacePatch(id, parsed.data);
  if (!saved.ok) return json({ error: WORKSPACE_CONFLICT_MESSAGE }, 409);

  return json({ data: toWorkspaceDto(saved.workspace, id) }, 200);
});
