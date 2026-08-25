import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { listNotifications, markAllNotificationsRead } from "@/api/notifications";
import { notificationIcon } from "@/lib/notifications";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(1, 50),
  });

  const hasUnread = data?.items.some((n) => !n.read_at) ?? false;

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-semibold text-white">Notificações</h1>
        {hasUnread && (
          <button onClick={handleMarkAllRead} className="btn-secondary">
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="table-card mt-4">
        {isLoading && <p className="px-4 py-6 text-center text-sm text-ink-500">Carregando...</p>}
        {isError && (
          <p className="px-4 py-6 text-center text-sm text-red-400">Não foi possível carregar as notificações.</p>
        )}
        {data && data.items.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <Bell size={28} className="text-ink-600" />
            <p className="text-sm text-ink-500">Nenhuma notificação por aqui ainda.</p>
          </div>
        )}
        {data?.items.map((n) => {
          const Icon = notificationIcon(n.type);
          const unread = !n.read_at;
          return (
            <div
              key={n.id}
              className="flex items-start gap-3 border-t border-white/[0.05] px-4 py-4 first:border-t-0"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  unread ? "bg-gold/[0.12]" : "bg-ink-800"
                }`}
              >
                <Icon size={15} className={unread ? "text-gold" : "text-ink-500"} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-medium ${unread ? "text-white" : "text-ink-400"}`}>{n.title}</p>
                  <span className="shrink-0 text-xs text-ink-600">{formatDateTime(n.created_at)}</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-500">{n.body}</p>
              </div>
              {unread && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
