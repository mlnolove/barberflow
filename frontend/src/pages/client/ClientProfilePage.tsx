import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Clock, Heart, LogOut, User } from "lucide-react";

import { clientLogout } from "@/api/clientAuth";
import { listMyAppointments } from "@/api/clientAppointments";
import { listFavorites } from "@/api/clientFavorites";
import { useClientAuthStore } from "@/store/clientAuthStore";

export function ClientProfilePage() {
  const navigate = useNavigate();
  const client = useClientAuthStore((s) => s.client);
  const clear = useClientAuthStore((s) => s.clear);

  const { data: favorites } = useQuery({ queryKey: ["client-favorites"], queryFn: listFavorites });
  const { data: history } = useQuery({
    queryKey: ["client-appointments", "history"],
    queryFn: () => listMyAppointments("history"),
  });
  const completedCount = history?.filter((a) => a.status === "COMPLETED").length ?? 0;

  async function handleLogout() {
    await clientLogout().catch(() => undefined);
    clear();
    navigate("/entrar-como", { replace: true });
  }

  const menuItems = [
    { label: "Editar perfil", icon: User, onClick: () => navigate("/c/perfil/editar") },
    { label: "Favoritos", icon: Heart, onClick: () => navigate("/c/favoritos") },
    { label: "Histórico de agendamentos", icon: Clock, onClick: () => navigate("/c/agendamentos") },
  ];

  return (
    <div className="flex flex-col pb-6">
      <div className="px-5 pb-6 pt-8">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold/50 bg-ink-900 text-xl font-semibold text-gold">
            {client?.full_name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div>
            <h2 className="font-serif text-xl text-white">{client?.full_name}</h2>
            <p className="text-sm text-ink-600">{client?.email}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 px-5">
        {[
          [String(completedCount), "Cortes concluídos"],
          [String(favorites?.length ?? 0), "Favoritos"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-xl border border-white/[0.06] bg-ink-900 p-3 text-center">
            <p className="font-mono text-xl font-bold text-white">{value}</p>
            <p className="mt-1 text-[10px] text-ink-600">{label}</p>
          </div>
        ))}
      </div>

      <div className="px-5">
        {menuItems.map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="flex w-full items-center justify-between border-b border-white/[0.05] py-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-ink-900">
                <Icon size={14} className="text-ink-400" />
              </div>
              <span className="text-sm text-white">{label}</span>
            </div>
            <ChevronRight size={15} className="text-ink-600" />
          </button>
        ))}
        <button
          onClick={handleLogout}
          className="mt-4 flex items-center gap-2 py-2 text-sm text-red-400"
        >
          <LogOut size={14} />
          Sair da conta
        </button>
      </div>
    </div>
  );
}
