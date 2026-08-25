export interface ClientConversation {
  id: string;
  barbershop: { id: string; name: string; logo_url: string | null };
  last_message_at: string | null;
  created_at: string;
}

export interface ConversationMessage {
  id: string;
  sender_type: "CLIENT" | "STAFF";
  body: string;
  created_at: string;
  read_at: string | null;
}
