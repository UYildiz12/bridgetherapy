import { prisma } from "@bridge/db";
import { json, withErrorHandling } from "@/lib/http";
import { conversationWhere, requireMessenger, threadInclude, toThreadDto } from "@/lib/messages/server";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const auth = await requireMessenger(req);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  const conversation = await prisma.conversation.findFirst({
    where: conversationWhere(id, auth.messenger),
    include: threadInclude,
  });
  if (!conversation) return json({ error: "Conversation not found" }, 404);

  return json({ data: toThreadDto(conversation, auth.messenger) }, 200);
});
