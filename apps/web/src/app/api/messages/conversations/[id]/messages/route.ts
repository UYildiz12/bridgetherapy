import { z } from "zod";
import { prisma } from "@exhale/db";
import { json, withErrorHandling } from "@/lib/http";
import { conversationWhere, requireMessenger, senderSelect, toMessageDto } from "@/lib/messages/server";
import { parseBody } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

const SendMessage = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const POST = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const auth = await requireMessenger(req);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  const parsed = await parseBody(req, SendMessage);
  if (!parsed.ok) return parsed.response;

  const conversation = await prisma.conversation.findFirst({
    where: conversationWhere(id, auth.messenger),
    select: { id: true },
  });
  if (!conversation) return json({ error: "Conversation not found" }, 404);

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: auth.messenger.userId,
      body: parsed.data.body,
    },
    include: { sender: { select: senderSelect } },
  });
  await prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return json({ data: toMessageDto(message, auth.messenger.userId) }, 201);
});
