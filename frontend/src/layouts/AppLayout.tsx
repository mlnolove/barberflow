import { NavLink, Outlet } from "react-router-dom";

import { logout } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

interface NavItem {
  to: string;
  label: string;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/agenda", label: "Agenda", permission: "appointments.view" },
  { to: "/clientes", label: "Clientes", permission: "clients.view" },
  { to: "/servicos", label: "Serviços", permission: "services.view" },
  { to: "/profissionais", label: "Profissionais", permission: "employees.view" },
  { to: "/estoque", label: "Estoque", permission: "inventory.view" },
  { to: "/financeiro", label: "Financeiro", permission: "finance.view" },
  { to: "/configuracoes", label: "Configurações", permission: "settings.view" },
];

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const clear = useAuthStore((state) => state.clear);

  async function handleLogout() {
    await logout().catch(() => undefined);
    clear();
    window.location.href = "/login";
  }

  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="px-6 py-5">
          {tenant?.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="h-8 max-w-full object-contain object-left"
            />
          ) : (
            <p className="text-lg font-semibold text-brand dark:text-white">BarberFlow</p>
          )}
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            {tenant?.name}
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <p className="truncate text-sm font-medium">{user?.full_name}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.role.name}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
