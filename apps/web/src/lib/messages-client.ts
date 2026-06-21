export interface ConversationListItem {
  id: string | null;
  patientId: string;
  therapistId: string;
  peerName: string;
  peerEmail: string;
  peerRole: "PATIENT" | "THERAPIST";
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: "PATIENT" | "THERAPIST" | "ADMIN";
  body: string;
  mine: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface ConversationThread {
  id: string;
  patientId: string;
  therapistId: string;
  peerName: string;
  peerEmail: string;
  peerRole: "PATIENT" | "THERAPIST";
  messages: MessageItem[];
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return (await res.json()).data as T;
}

async function send<T>(url: string, method: "POST" | "PATCH", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `${method} ${url} failed: ${res.status}`;
    try {
      const e = await res.json();
      if (e?.error) message = e.error;
    } catch {
      // keep status-based message
    }
    throw new Error(message);
  }
  return (await res.json()).data as T;
}

export const fetchConversations = () => getJson<ConversationListItem[]>("/api/messages/conversations");

export const openConversation = (body: { patientId?: string; therapistId?: string }) =>
  send<{ id: string }>("/api/messages/conversations", "POST", body);

export const fetchConversation = (id: string) =>
  getJson<ConversationThread>(`/api/messages/conversations/${id}`);

export const sendMessage = (id: string, body: string) =>
  send<MessageItem>(`/api/messages/conversations/${id}/messages`, "POST", { body });

export const markConversationRead = (id: string) =>
  send<{ updated: number }>(`/api/messages/conversations/${id}/read`, "PATCH");
