import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";

import { conversationSocketUrl, listMessages, sendMessage } from "@/api/clientConversations";
import { ClientTopBar } from "@/components/client/ClientTopBar";
import { useClientAuthStore } from "@/store/clientAuthStore";
import type { ConversationMessage } from "@/types/clientConversation";

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const accessToken = useClientAuthStore((s) => s.accessToken);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: history } = useQuery({
    queryKey: ["client-conversation-messages", conversationId],
    queryFn: () => listMessages(conversationId!),
    enabled: Boolean(conversationId),
  });

  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  useEffect(() => {
    if (!conversationId || !accessToken) return;
    const socket = new WebSocket(conversationSocketUrl(conversationId, accessToken));
    socket.onmessage = (event) => {
      const incoming = JSON.parse(event.data) as ConversationMessage;
      setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
    };
    return () => socket.close();
  }, [conversationId, accessToken]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const body = input.trim();
    if (!body || !conversationId) return;
    setInput("");
    setSending(true);
    try {
      const message = await sendMessage(conversationId, body);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-ink-950">
      <ClientTopBar onBack={() => navigate("/c/mensagens")} />
      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-2">
        {messages.map((m) => {
          const isMe = m.sender_type === "CLIENT";
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[78%] rounded-2xl px-4 py-3"
                style={{
                  background: isMe ? "#C8A65E" : "#161614",
                  border: isMe ? "none" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p className="text-sm leading-relaxed" style={{ color: isMe ? "#0C0C0B" : "white" }}>
                  {m.body}
                </p>
                <p className="mt-1 text-[10px]" style={{ color: isMe ? "rgba(12,12,11,0.5)" : "#4a4a44" }}>
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/[0.06] px-5 pb-8 pt-3">
        <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/[0.08] bg-ink-900 px-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Escreva uma mensagem..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-ink-600"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-all"
            style={{ background: input.trim() ? "#C8A65E" : "#222220" }}
          >
            <Send size={13} className={input.trim() ? "text-ink-950" : "text-ink-600"} />
          </button>
        </div>
      </div>
    </div>
  );
}
