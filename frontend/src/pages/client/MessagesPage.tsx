import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";

import { listConversations } from "@/api/clientConversations";

export function MessagesPage() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["client-conversations"], queryFn: listConversations });

  return (
    <div className="flex flex-col">
      <div className="px-5 pb-4 pt-6">
        <h1 className="font-serif text-xl font-semibold text-white">Mensagens</h1>
      </div>
      <div className="px-5">
        {data?.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <MessageCircle size={28} className="text-ink-600" />
            <p className="text-sm text-ink-500">
              Suas conversas com barbearias aparecem aqui após o primeiro agendamento.
            </p>
          </div>
        )}
        {data?.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/c/mensagens/${c.id}`)}
            className="flex w-full items-center gap-4 border-b border-white/[0.05] py-4 text-left"
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-ink-800">
              {c.barbershop.logo_url && (
                <img src={c.barbershop.logo_url} alt={c.barbershop.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{c.barbershop.name}</span>
                {c.last_message_at && (
                  <span className="text-[10px] text-ink-600">
                    {new Date(c.last_message_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-ink-600">Toque para ver a conversa</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
