import { prisma } from "@bridge/db";
import type { Prisma } from "@bridge/db";
import { getAuthUser } from "@/lib/auth";
import { json } from "@/lib/http";

type UserLabel = { firstName: string; lastName: string; email: string };

export function displayName(user: UserLabel) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
}

const messengerSelect = {
  id: true,
  email: true,
  role: true,
  patientProfile: { select: { id: true } },
  therapistProfile: { select: { id: true, approvedAt: true } },
} satisfies Prisma.UserSelect;

export type Messenger =
  | { role: "PATIENT"; userId: string; patientId: string }
  | { role: "THERAPIST"; userId: string; therapistId: string };

type MessengerResult = { ok: true; messenger: Messenger } | { ok: false; response: Response };

export async function requireMessenger(req: Request): Promise<MessengerResult> {
  const auth = await getAuthUser(req);
  if (!auth) return { ok: false, response: json({ error: "Unauthorized" }, 401) };

  const user = await prisma.user.findUnique({
    where: { id: auth.authId },
    select: messengerSelect,
  });
  if (!user) return { ok: false, response: json({ error: "Not provisioned" }, 404) };
  if (user.role === "PATIENT" && user.patientProfile) {
    return { ok: true, messenger: { role: "PATIENT", userId: user.id, patientId: user.patientProfile.id } };
  }
  if (user.role === "THERAPIST") {
    if (!user.therapistProfile?.approvedAt) {
      return { ok: false, response: json({ error: "Therapist account pending approval" }, 403) };
    }
    return { ok: true, messenger: { role: "THERAPIST", userId: user.id, therapistId: user.therapistProfile.id } };
  }

  return { ok: false, response: json({ error: "Forbidden" }, 403) };
}

export const senderSelect = {
  firstName: true,
  lastName: true,
  email: true,
  role: true,
} satisfies Prisma.UserSelect;

export const threadInclude = {
  patient: { select: { user: { select: senderSelect } } },
  therapist: { select: { user: { select: senderSelect } } },
  messages: {
    orderBy: { createdAt: "asc" },
    include: { sender: { select: senderSelect } },
  },
} satisfies Prisma.ConversationInclude;

export function conversationWhere(id: string, messenger: Messenger): Prisma.ConversationWhereInput {
  if (messenger.role === "PATIENT") {
    return {
      id,
      patientId: messenger.patientId,
      therapist: {
        patients: {
          some: { patientId: messenger.patientId, isActive: true, status: "ACTIVE" },
        },
      },
    };
  }

  return {
    id,
    therapistId: messenger.therapistId,
    patient: {
      therapists: {
        some: { therapistId: messenger.therapistId, isActive: true, status: "ACTIVE" },
      },
    },
  };
}

type MessageWithSender = Prisma.MessageGetPayload<{ include: { sender: { select: typeof senderSelect } } }>;
type ThreadConversation = Prisma.ConversationGetPayload<{ include: typeof threadInclude }>;

export function toMessageDto(message: MessageWithSender, viewerUserId: string) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderName: displayName(message.sender),
    senderRole: message.sender.role,
    body: message.body,
    mine: message.senderId === viewerUserId,
    readAt: message.readAt,
    createdAt: message.createdAt,
  };
}

export function toThreadDto(conversation: ThreadConversation, messenger: Messenger) {
  const peer =
    messenger.role === "PATIENT" ? conversation.therapist.user : conversation.patient.user;

  return {
    id: conversation.id,
    patientId: conversation.patientId,
    therapistId: conversation.therapistId,
    peerName: displayName(peer),
    peerEmail: peer.email,
    peerRole: messenger.role === "PATIENT" ? "THERAPIST" : "PATIENT",
    messages: conversation.messages.map((message) => toMessageDto(message, messenger.userId)),
  };
}
