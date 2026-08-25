import { Link } from "react-router-dom";
import {
  ChevronRight,
  LogOut,
  MessageCircle,
  Package,
  Scissors,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { logout } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

interface GridItem {
  to: string;
  label: string;
  icon: typeof Users;
  permission?: string;
}

const GRID_ITEMS: GridItem[] = [
  { to: "/mensagens", label: "Mensagens", icon: MessageCircle, permission: "messages.view" },
  { to: "/servicos", label: "Serviços", icon: Scissors, permission: "services.view" },
  { to: "/profissionais", label: "Profissionais", icon: Users, permission: "employees.view" },
  { to: "/equipe", label: "Equipe", icon: ShieldCheck, permission: "employees.view" },
  { to: "/estoque", label: "Estoque", icon: Package, permission: "inventory.view" },
];

export function MaisPage() {
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const clear = useAuthStore((state) => state.clear);

  const visibleGridItems = GRID_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );
  const canViewSettings = hasPermission("settings.view");

  async function handleLogout() {
    await logout().catch(() => undefined);
    clear();
    window.location.href = "/login";
  }

  return (
    <div className="pb-6">
      <div className="px-5 pb-2 pt-6">
        <h1 className="font-serif text-xl font-semibold text-white">Mais</h1>
      </div>

      <div className="mx-5 mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-ink-900 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-gold/50 bg-ink-950 font-serif text-base font-semibold text-gold">
          {user?.full_name?.charAt(0).toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{user?.full_name}</p>
          <p className="truncate text-xs text-ink-500">
            {user?.role.name} · {tenant?.name}
          </p>
        </div>
      </div>

      {visibleGridItems.length > 0 && (
        <>
          <p className="mx-5 mb-2 mt-6 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
            Operação
          </p>
          <div className="mx-5 grid grid-cols-3 gap-2">
            {visibleGridItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-ink-900 p-3 text-center"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-800">
                    <Icon size={15} className="text-gold" strokeWidth={1.75} />
                  </div>
                  <span className="text-[10.5px] font-medium leading-tight text-white">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <p className="mx-5 mb-2 mt-6 text-[10px] font-semibold uppercase tracking-wide text-ink-500">Conta</p>
      <div className="mx-5 rounded-2xl border border-white/[0.06] bg-ink-900">
        {canViewSettings && (
          <Link
            to="/configuracoes"
            className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <Settings size={15} className="text-ink-300" strokeWidth={1.75} />
              <span className="text-sm text-white">Configurações</span>
            </div>
            <ChevronRight size={15} className="text-ink-600" />
          </Link>
        )}
        <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3.5 text-red-400">
          <LogOut size={15} strokeWidth={1.75} />
          <span className="text-sm">Sair</span>
        </button>
      </div>
    </div>
  );
}
