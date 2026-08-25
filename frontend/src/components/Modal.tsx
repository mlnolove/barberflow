import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-ink-900 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-ink-500 hover:text-white">
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
