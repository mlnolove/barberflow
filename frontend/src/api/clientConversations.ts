import { clientApi } from "@/lib/clientApi";
import type { ClientConversation, ConversationMessage } from "@/types/clientConversation";

export async function listConversations(): Promise<ClientConversation[]> {
  const { data } = await clientApi.get<ClientConversation[]>("/conversations");
  return data;
}

export async function startConversation(tenantId: string): Promise<ClientConversation> {
  const { data } = await clientApi.post<ClientConversation>("/conversations", { tenant_id: tenantId });
  return data;
}

export async function listMessages(conversationId: string): Promise<ConversationMessage[]> {
  const { data } = await clientApi.get<ConversationMessage[]>(
    `/conversations/${conversationId}/messages`,
  );
  return data;
}

export async function sendMessage(conversationId: string, body: string): Promise<ConversationMessage> {
  const { data } = await clientApi.post<ConversationMessage>(
    `/conversations/${conversationId}/messages`,
    { body },
  );
  return data;
}

/** URL do WebSocket de tempo real da conversa — usa o mesmo access token
 * já em memória (o WS não pode enviar o header Authorization). */
export function conversationSocketUrl(conversationId: string, accessToken: string): string {
  const apiBase = (import.meta.env.VITE_API_URL || "/api") + "/client";
  const absoluteBase = apiBase.startsWith("http")
    ? apiBase
    : `${window.location.origin}${apiBase}`;
  const wsBase = absoluteBase.replace(/^http/, "ws");
  return `${wsBase}/conversations/${conversationId}/ws?token=${encodeURIComponent(accessToken)}`;
}
