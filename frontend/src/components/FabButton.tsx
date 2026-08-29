import { Plus } from "lucide-react";
import { createPortal } from "react-dom";

interface FabButtonProps {
  onClick: () => void;
  label: string;
}

/** Botão flutuante circular (canto inferior direito) para a ação primária
 * de criação de uma tela — fica acima da barra de navegação inferior no
 * celular (bottom-24) e mais próximo da borda no desktop (md:bottom-6).
 * Renderizado via portal direto no body: a página é animada com um
 * `transform` (slide de troca de aba), e um `transform` em qualquer
 * ancestral vira o novo container de posicionamento pra elementos `fixed`
 * — sem o portal, o botão nasceria relativo à página animada e "cairia"
 * até a posição certa em vez de já aparecer lá. */
export function FabButton({ onClick, label }: FabButtonProps) {
  return createPortal(
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="press-scale fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-ink-950 shadow-lg shadow-black/30 transition-transform hover:opacity-90 md:bottom-6 md:right-6"
    >
      <Plus size={24} strokeWidth={2.5} />
    </button>,
    document.body,
  );
}
