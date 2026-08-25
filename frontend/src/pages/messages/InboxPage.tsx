import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";

import { listConversations } from "@/api/conversations";

export function InboxPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["conversations"],
    queryFn: listConversations,
  });

  return (
    <div className="p-6">
      <h1 className="font-serif text-xl font-semibold text-white">Mensagens</h1>
      <p className="mt-1 text-sm text-ink-500">Conversas com seus clientes.</p>

      <div className="table-card mt-4">
        {isLoading && <p className="px-4 py-6 text-center text-sm text-ink-500">Carregando...</p>}
        {isError && (
          <p className="px-4 py-6 text-center text-sm text-red-400">Não foi possível carregar as conversas.</p>
        )}
        {data && data.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <MessageCircle size={28} className="text-ink-600" />
            <p className="text-sm text-ink-500">
              As conversas iniciadas por clientes pelo app aparecem aqui.
            </p>
          </div>
        )}
        {data?.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/mensagens/${c.id}`)}
            className="table-row flex w-full items-center gap-4 px-4 py-4 text-left first:border-t-0"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-800">
              {c.client.avatar_url ? (
                <img src={c.client.avatar_url} alt={c.client.full_name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-ink-400">
                  {c.client.full_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{c.client.full_name}</span>
                {c.last_message_at && (
                  <span className="text-xs text-ink-600">
                    {new Date(c.last_message_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-ink-500">Toque para ver a conversa</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
