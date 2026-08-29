import { useRef } from "react";
import { Calendar } from "lucide-react";

interface DatePickerButtonProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

/** Botão só com o ícone de calendário — o input de data nativo fica
 * presente porém invisível, e o botão só aciona `showPicker()` nele. Evita
 * mostrar a data crua na tela: o usuário abre o calendário quando quiser
 * escolher outra. */
export function DatePickerButton({ value, onChange, label = "Escolher data" }: DatePickerButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function open() {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        // segue para o fallback abaixo
      }
    }
    el.click();
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={open}
        aria-label={label}
        title={label}
        className="press-scale flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-ink-900 text-ink-300 hover:bg-ink-800"
      >
        <Calendar size={15} />
      </button>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute h-0 w-0 opacity-0"
      />
    </span>
  );
}
