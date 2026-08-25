import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";

import {
  conversationSocketUrl,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
} from "@/api/conversations";
import { useAuthStore } from "@/store/authStore";
import type { Message } from "@/types/conversation";

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: listConversations,
  });
  const conversation = conversations?.find((c) => c.id === conversationId);

  const { data: history } = useQuery({
    queryKey: ["conversation-messages", conversationId],
    queryFn: () => listMessages(conversationId!),
    enabled: Boolean(conversationId),
  });

  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  useEffect(() => {
    if (!conversationId) return;
    markConversationRead(conversationId).catch(() => undefined);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !accessToken) return;
    const socket = new WebSocket(conversationSocketUrl(conversationId, accessToken));
    socket.onmessage = (event) => {
      const incoming = JSON.parse(event.data) as Message;
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
    <div className="flex h-[calc(100vh-1px)] flex-col">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-4">
        <button
          onClick={() => navigate("/mensagens")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-800"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="font-serif text-lg font-semibold text-white">
          {conversation?.client.full_name ?? "Conversa"}
        </h1>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
        {messages.map((m) => {
          const isMe = m.sender_type === "STAFF";
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[60%] rounded-2xl px-4 py-3 ${
                  isMe ? "bg-gold text-ink-950" : "border border-white/[0.06] bg-ink-900 text-white"
                }`}
              >
                <p className="text-sm leading-relaxed">{m.body}</p>
                <p className={`mt-1 text-[10px] ${isMe ? "text-ink-950/50" : "text-ink-600"}`}>
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/[0.06] px-6 py-4">
        <div className="flex h-12 items-center gap-3 rounded-xl border border-white/[0.08] bg-ink-900 px-4">
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
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-ink-950 disabled:bg-ink-800 disabled:text-ink-600"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
