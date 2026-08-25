import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { listClientNotifications, markAllClientNotificationsRead } from "@/api/clientNotifications";
import { ClientTopBar } from "@/components/client/ClientTopBar";
import { notificationIcon } from "@/lib/notifications";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ClientNotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["client-notifications"],
    queryFn: () => listClientNotifications(1, 50),
  });

  const hasUnread = data?.items.some((n) => !n.read_at) ?? false;

  async function handleMarkAllRead() {
    await markAllClientNotificationsRead();
    queryClient.invalidateQueries({ queryKey: ["client-notifications"] });
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <ClientTopBar
        title="Notificações"
        onBack={() => navigate(-1)}
        right={
          hasUnread ? (
            <button onClick={handleMarkAllRead} className="text-xs text-gold">
              Marcar lidas
            </button>
          ) : undefined
        }
      />
      <div className="flex-1 px-5 pb-6">
        {data?.items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Bell size={28} className="text-ink-600" />
            <p className="text-sm text-ink-500">Nenhuma notificação por aqui ainda.</p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {data?.items.map((n) => {
            const Icon = notificationIcon(n.type);
            const unread = !n.read_at;
            return (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-ink-900 p-3"
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
                    <span className="shrink-0 text-[10px] text-ink-600">{formatDateTime(n.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">{n.body}</p>
                </div>
                {unread && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
