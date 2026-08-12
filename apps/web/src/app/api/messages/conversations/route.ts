import { z } from "zod";
import { prisma } from "@exhale/db";
import { json, withErrorHandling } from "@/lib/http";
import { requireMessenger, displayName, type Messenger } from "@/lib/messages/server";
import { parseBody } from "@/lib/validation";

const OpenConversation = z
  .object({
    patientId: z.string().min(1).optional(),
    therapistId: z.string().min(1).optional(),
  })
  .refine((value) => value.patientId || value.therapistId, {
    message: "patientId or therapistId is required",
  });

type LastConversation = {
  id: string;
  patientId: string;
  therapistId: string;
  updatedAt: Date;
  messages: { body: string; senderId: string; readAt: Date | null; createdAt: Date }[];
  _count: { messages: number };
};

function targetFor(messenger: Messenger, body: { patientId?: string; therapistId?: string }) {
  if (messenger.role === "PATIENT") {
    return body.therapistId ? { patientId: messenger.patientId, therapistId: body.therapistId } : null;
  }
  return body.patientId ? { patientId: body.patientId, therapistId: messenger.therapistId } : null;
}

function lastMessage(conversation?: LastConversation) {
  return conversation?.messages[0] ?? null;
}

export const GET = withErrorHandling(async (req: Request) => {
  const auth = await requireMessenger(req);
  if (!auth.ok) return auth.response;
  const { messenger } = auth;

  if (messenger.role === "PATIENT") {
    const links = await prisma.patientTherapist.findMany({
      where: { patientId: messenger.patientId, isActive: true, status: "ACTIVE" },
      orderBy: { startDate: "desc" },
      select: {
        patientId: true,
        therapistId: true,
        startDate: true,
        therapist: { select: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
    });
    const conversations = await prisma.conversation.findMany({
      where: { patientId: messenger.patientId, therapistId: { in: links.map((link) => link.therapistId) } },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, senderId: true, readAt: true, createdAt: true },
        },
        _count: {
          select: { messages: { where: { senderId: { not: messenger.userId }, readAt: null } } },
        },
      },
    });
    const byTherapist = new Map(conversations.map((conversation) => [conversation.therapistId, conversation]));
    const data = links.map((link) => {
      const conversation = byTherapist.get(link.therapistId) as LastConversation | undefined;
      const last = lastMessage(conversation);
      return {
        id: conversation?.id ?? null,
        patientId: link.patientId,
        therapistId: link.therapistId,
        peerName: displayName(link.therapist.user),
        peerEmail: link.therapist.user.email,
        peerRole: "THERAPIST",
        lastMessage: last?.body ?? null,
        lastMessageAt: last?.createdAt ?? null,
        unreadCount: conversation?._count.messages ?? 0,
      };
    });
    return json({ data }, 200);
  }

  const links = await prisma.patientTherapist.findMany({
    where: { therapistId: messenger.therapistId, isActive: true, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
    select: {
      patientId: true,
      therapistId: true,
      startDate: true,
      patient: { select: { user: { select: { firstName: true, lastName: true, email: true } } } },
    },
  });
  const conversations = await prisma.conversation.findMany({
    where: { therapistId: messenger.therapistId, patientId: { in: links.map((link) => link.patientId) } },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, senderId: true, readAt: true, createdAt: true },
      },
      _count: {
        select: { messages: { where: { senderId: { not: messenger.userId }, readAt: null } } },
      },
    },
  });
  const byPatient = new Map(conversations.map((conversation) => [conversation.patientId, conversation]));
  const data = links.map((link) => {
    const conversation = byPatient.get(link.patientId) as LastConversation | undefined;
    const last = lastMessage(conversation);
    return {
      id: conversation?.id ?? null,
      patientId: link.patientId,
      therapistId: link.therapistId,
      peerName: displayName(link.patient.user),
      peerEmail: link.patient.user.email,
      peerRole: "PATIENT",
      lastMessage: last?.body ?? null,
      lastMessageAt: last?.createdAt ?? null,
      unreadCount: conversation?._count.messages ?? 0,
    };
  });
  return json({ data }, 200);
});

export const POST = withErrorHandling(async (req: Request) => {
  const auth = await requireMessenger(req);
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, OpenConversation);
  if (!parsed.ok) return parsed.response;

  const target = targetFor(auth.messenger, parsed.data);
  if (!target) return json({ error: "Conversation target does not match your role." }, 400);

  const link = await prisma.patientTherapist.findFirst({
    where: { ...target, isActive: true, status: "ACTIVE" },
    select: { patientId: true, therapistId: true },
  });
  if (!link) return json({ error: "Conversation is only available for active care relationships." }, 403);

  const conversation = await prisma.conversation.upsert({
    where: { patientId_therapistId: target },
    create: target,
    update: {},
  });

  return json({ data: conversation }, 201);
});
