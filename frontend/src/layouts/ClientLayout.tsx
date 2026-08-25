import { NavLink, Outlet } from "react-router-dom";
import { Calendar, Home, MessageCircle, Search, User } from "lucide-react";

const TABS = [
  { to: "/c/inicio", icon: Home, label: "Início" },
  { to: "/c/busca", icon: Search, label: "Buscar" },
  { to: "/c/agendamentos", icon: Calendar, label: "Agenda" },
  { to: "/c/mensagens", icon: MessageCircle, label: "Mensagens" },
  { to: "/c/perfil", icon: User, label: "Perfil" },
];

/** Shell do app do cliente — chrome fixo do BarberFlow (não muda por
 * barbearia, ao contrário do painel do dono que é tenant-branded). */
export function ClientLayout() {
  return (
    <div className="relative flex min-h-screen flex-col bg-ink-950">
      <div className="flex-1 pb-20">
        <Outlet />
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.06] bg-ink-950/95 pb-5 pt-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-md justify-around px-2">
          {TABS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className="flex flex-col items-center gap-1 px-2 py-1">
              {({ isActive }) => (
                <>
                  <Icon size={20} className={isActive ? "text-gold" : "text-ink-600"} strokeWidth={isActive ? 2 : 1.5} />
                  <span className={`text-[9px] font-medium ${isActive ? "text-gold" : "text-ink-600"}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
