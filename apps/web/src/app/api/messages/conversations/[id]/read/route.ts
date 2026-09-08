import { prisma } from "@bridge/db";
import { json, withErrorHandling } from "@/lib/http";
import { conversationWhere, requireMessenger } from "@/lib/messages/server";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const auth = await requireMessenger(req);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  const conversation = await prisma.conversation.findFirst({
    where: conversationWhere(id, auth.messenger),
    select: { id: true },
  });
  if (!conversation) return json({ error: "Conversation not found" }, 404);

  const result = await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: auth.messenger.userId }, readAt: null },
    data: { readAt: new Date() },
  });

  return json({ data: { updated: result.count } }, 200);
});
