import { api } from "@/lib/api";
import type { Conversation, Message } from "@/types/conversation";

export async function listConversations(): Promise<Conversation[]> {
  const { data } = await api.get<Conversation[]>("/conversations");
  return data;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data } = await api.get<Message[]>(`/conversations/${conversationId}/messages`);
  return data;
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const { data } = await api.post<Message>(`/conversations/${conversationId}/messages`, { body });
  return data;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await api.post(`/conversations/${conversationId}/read`);
}

/** URL do WebSocket de tempo real da conversa (lado equipe) — mesmo access
 * token já em memória (o WS não pode enviar o header Authorization). */
export function conversationSocketUrl(conversationId: string, accessToken: string): string {
  const apiBase = import.meta.env.VITE_API_URL || "/api";
  const absoluteBase = apiBase.startsWith("http") ? apiBase : `${window.location.origin}${apiBase}`;
  const wsBase = absoluteBase.replace(/^http/, "ws");
  return `${wsBase}/conversations/${conversationId}/ws?token=${encodeURIComponent(accessToken)}`;
}
