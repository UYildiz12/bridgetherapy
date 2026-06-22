import { prisma } from "@exhale/db";
import { json, withErrorHandling } from "@/lib/http";
import { requirePatient } from "@/lib/patient";
import { toWorkspaceDto, WorkspacePatch, workspaceData } from "@/lib/session-workspace";
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

  const data = workspaceData(parsed.data);
  const workspace = await prisma.sessionWorkspace.upsert({
    where: { sessionId: id },
    update: data,
    create: { sessionId: id, ...data },
  });

  return json({ data: toWorkspaceDto(workspace, id) }, 200);
});
