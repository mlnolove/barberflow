import { useState } from "react";
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleLogout() {
    await logout().catch(() => undefined);
    clear();
    window.location.href = "/login";
  }

  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <div className="flex min-h-screen">
      {/* Barra superior — só em telas de celular (abaixo do breakpoint md) */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900 md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menu"
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <p className="truncate text-sm font-semibold text-brand dark:text-white">
          {tenant?.name ?? "BarberFlow"}
        </p>
        <div className="w-9" aria-hidden="true" />
      </header>

      {/* Fundo escurecido atrás da gaveta de navegação (mobile) */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out dark:border-slate-800 dark:bg-slate-900 md:static md:z-auto md:w-60 md:translate-x-0 md:transition-none ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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
              onClick={() => setDrawerOpen(false)}
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

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
