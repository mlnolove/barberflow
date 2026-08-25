export interface ConversationClientSummary {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface Conversation {
  id: string;
  client: ConversationClientSummary;
  last_message_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  sender_type: "CLIENT" | "STAFF";
  body: string;
  created_at: string;
  read_at: string | null;
}
