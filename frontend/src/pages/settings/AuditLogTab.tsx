import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { listAuditLogs } from "@/api/auditLogs";
import { listStaffUsers } from "@/api/users";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditLogTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["settings-audit-logs"],
    queryFn: () => listAuditLogs(1, 100),
  });
  const { data: staff } = useQuery({ queryKey: ["staff-users"], queryFn: listStaffUsers });

  function actorLabel(entry: { actor_type: string; actor_user_id: string | null }): string {
    if (entry.actor_type === "SYSTEM") return "Sistema";
    if (entry.actor_type === "CLIENT") return "Cliente";
    const user = staff?.find((u) => u.id === entry.actor_user_id);
    return user?.full_name ?? "Membro da equipe";
  }

  return (
    <div>
      <p className="mb-4 max-w-xl text-sm text-ink-500">
        Histórico de ações sensíveis feitas na sua conta — cancelamentos, mudanças de permissão,
        estornos e outras alterações que valem auditoria.
      </p>

      <div className="table-card">
        {isLoading && <p className="px-4 py-6 text-center text-sm text-ink-500">Carregando...</p>}
        {isError && (
          <p className="px-4 py-6 text-center text-sm text-red-400">Não foi possível carregar o log.</p>
        )}
        {data && data.items.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <FileText size={28} className="text-ink-600" />
            <p className="text-sm text-ink-500">Nenhuma ação registrada ainda.</p>
          </div>
        )}
        {data && data.items.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Quem</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Recurso</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry) => (
                <tr key={entry.id} className="border-t border-white/[0.05] text-white">
                  <td className="px-4 py-3 text-ink-400">{formatDateTime(entry.created_at)}</td>
                  <td className="px-4 py-3">{actorLabel(entry)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gold">{entry.action}</td>
                  <td className="px-4 py-3 text-ink-400">{entry.resource_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
