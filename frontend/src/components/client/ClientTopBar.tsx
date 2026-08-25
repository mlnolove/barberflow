import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface ClientTopBarProps {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
}

/** Barra de topo com voltar/título, reutilizada em toda tela secundária do
 * app do cliente. Sem `onBack`, volta pelo histórico do navegador. */
export function ClientTopBar({ title, onBack, right }: ClientTopBarProps) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(-1));

  return (
    <div className="flex items-center justify-between px-5 pb-3 pt-5">
      <button
        onClick={handleBack}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] transition-colors hover:bg-white/10"
      >
        <ArrowLeft size={18} className="text-white" />
      </button>
      {title && <span className="text-sm font-medium text-ink-300">{title}</span>}
      {right ?? <div className="w-9" />}
    </div>
  );
}
