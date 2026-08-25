import { useNavigate } from "react-router-dom";
import { ChevronRight, Scissors, User } from "lucide-react";

export function AccountTypePage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col bg-ink-950 px-6 py-10">
      <div className="mb-10 flex flex-col gap-2">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gold">
          <Scissors size={16} className="text-ink-950" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif text-2xl text-white">Bem-vindo ao BarberFlow</h1>
        <p className="text-sm text-ink-400">Como você vai usar o app?</p>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <button
          onClick={() => navigate("/c/entrar")}
          className="group relative flex flex-1 flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-ink-900 p-6 text-left"
        >
          <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-gold opacity-[0.08]" />
          <div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800">
              <User size={18} className="text-gold" />
            </div>
            <h3 className="mb-1.5 font-semibold text-white">Sou cliente</h3>
            <p className="text-sm leading-relaxed text-ink-400">
              Quero encontrar barbearias e agendar meu corte.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <span className="text-sm font-medium text-gold">Entrar como cliente</span>
            <ChevronRight size={14} className="text-gold" />
          </div>
        </button>

        <button
          onClick={() => navigate("/login")}
          className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-2xl bg-gold p-6 text-left"
        >
          <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-ink-950 opacity-10" />
          <div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-ink-950/20">
              <Scissors size={18} className="text-ink-950" strokeWidth={1.5} />
            </div>
            <h3 className="mb-1.5 font-semibold text-ink-950">Tenho uma barbearia</h3>
            <p className="text-sm leading-relaxed text-ink-950/55">
              Quero gerenciar minha barbearia e minha equipe.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <span className="text-sm font-semibold text-ink-950">Entrar como proprietário</span>
            <ChevronRight size={14} className="text-ink-950" />
          </div>
        </button>
      </div>
    </div>
  );
}
