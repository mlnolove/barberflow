import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarDays,
  Clock,
  LayoutGrid,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Package,
  Scissors,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

import { logout } from "@/api/auth";
import { listNotifications } from "@/api/notifications";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useAuthStore } from "@/store/authStore";
import type { SchedulingMode } from "@/types/auth";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  permission?: string;
}

function buildNavItems(schedulingMode: SchedulingMode | undefined): NavItem[] {
  const scheduleItem: NavItem =
    schedulingMode === "QUEUE"
      ? { to: "/fila", label: "Fila", icon: Clock, permission: "appointments.view" }
      : { to: "/agenda", label: "Agenda", icon: CalendarDays, permission: "appointments.view" };

  return [
    { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    scheduleItem,
    { to: "/clientes", label: "Clientes", icon: Users, permission: "clients.view" },
    { to: "/mensagens", label: "Mensagens", icon: MessageCircle, permission: "messages.view" },
    { to: "/servicos", label: "Serviços", icon: Scissors, permission: "services.view" },
    { to: "/profissionais", label: "Profissionais", icon: Users, permission: "employees.view" },
    { to: "/equipe", label: "Equipe", icon: ShieldCheck, permission: "employees.view" },
    { to: "/estoque", label: "Estoque", icon: Package, permission: "inventory.view" },
    { to: "/financeiro", label: "Financeiro", icon: Wallet, permission: "finance.view" },
    { to: "/configuracoes", label: "Configurações", icon: Settings, permission: "settings.view" },
  ];
}

/** Subconjunto de 5 itens pra barra inferior do celular — espelha o padrão
 * de 5 abas do app do cliente. Os demais (Mensagens, Serviços,
 * Profissionais, Equipe, Estoque, Configurações) ficam dentro de "Mais". */
function buildMobileNavItems(schedulingMode: SchedulingMode | undefined): NavItem[] {
  const all = buildNavItems(schedulingMode);
  const scheduleTo = schedulingMode === "QUEUE" ? "/fila" : "/agenda";
  const keep = new Set(["/dashboard", scheduleTo, "/clientes", "/financeiro"]);
  const items = all.filter((item) => keep.has(item.to));
  items.push({ to: "/mais", label: "Mais", icon: MoreHorizontal });
  return items;
}

function NotificationBell() {
  const navigate = useNavigate();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canView = hasPermission("notifications.view");
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(1, 20),
    enabled: canView,
  });
  const hasUnread = data?.items.some((n) => !n.read_at) ?? false;

  if (!canView) return null;

  return (
    <button
      onClick={() => navigate("/notificacoes")}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-400 hover:bg-ink-800"
      aria-label="Notificações"
    >
      <Bell size={17} />
      {hasUnread && <div className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold" />}
    </button>
  );
}

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const clear = useAuthStore((state) => state.clear);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  async function handleLogout() {
    await logout().catch(() => undefined);
    clear();
    window.location.href = "/login";
  }

  const visibleDesktopItems = buildNavItems(tenant?.scheduling_mode).filter(
    (item) => !item.permission || hasPermission(item.permission),
  );
  const visibleMobileItems = buildMobileNavItems(tenant?.scheduling_mode).filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  if (!isDesktop) {
    // Celular — mesmo padrão do app do cliente: barra inferior fixa com 5
    // abas em vez de menu lateral. Itens secundários ficam dentro de "Mais".
    return (
      <div className="flex min-h-screen flex-col bg-ink-950">
        <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center justify-between border-b border-white/[0.06] bg-ink-950 px-4">
          <p className="truncate font-serif text-sm font-semibold text-white">
            {tenant?.name ?? "BarberFlow"}
          </p>
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto pb-24 pt-14">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.06] bg-ink-950/95 pb-5 pt-2 backdrop-blur-md">
          <div className="mx-auto flex max-w-md justify-around px-2">
            {visibleMobileItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className="flex flex-col items-center gap-1 px-2 py-1">
                  {({ isActive }) => (
                    <>
                      <Icon size={20} className={isActive ? "text-gold" : "text-ink-600"} strokeWidth={isActive ? 2 : 1.5} />
                      <span className={`text-[9px] font-medium ${isActive ? "text-gold" : "text-ink-600"}`}>
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-ink-950">
      <aside className="static z-auto flex w-60 flex-col border-r border-white/[0.06] bg-ink-900">
        <div className="px-6 py-5">
          {tenant?.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="h-8 max-w-full object-contain object-left"
            />
          ) : (
            <p className="font-serif text-lg font-semibold italic text-gold">BarberFlow</p>
          )}
          <p className="mt-0.5 truncate text-xs text-ink-500">{tenant?.name}</p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {visibleDesktopItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-gold/[0.1] text-gold"
                      : "text-ink-400 hover:bg-ink-800 hover:text-white"
                  }`
                }
              >
                <Icon size={16} strokeWidth={1.75} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-4">
          <p className="truncate text-sm font-medium text-white">{user?.full_name}</p>
          <p className="truncate text-xs text-ink-500">{user?.role.name}</p>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-white/[0.08] px-3 py-1.5 text-sm text-ink-300 hover:bg-ink-800"
          >
            <LogOut size={14} strokeWidth={1.75} />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="flex justify-end border-b border-white/[0.06] px-6 py-3">
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
