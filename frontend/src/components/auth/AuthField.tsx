import type { LucideIcon } from "lucide-react";
import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
}

/**
 * Campo de formulário reutilizado por login/cadastro do cliente e do dono
 * (mesma identidade visual Noir dos dois — variante muda só o conteúdo ao
 * redor, não o campo em si).
 */
export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, icon: Icon, error, type = "text", id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const resolvedType = isPassword && showPassword ? "text" : type;

    return (
      <div className="flex flex-col gap-2">
        <label
          htmlFor={inputId}
          className="text-[10px] font-medium uppercase tracking-widest text-ink-400"
        >
          {label}
        </label>
        <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-ink-900 px-4">
          <Icon size={15} className="shrink-0 text-ink-500" />
          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-ink-500"
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="shrink-0 text-ink-500"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  },
);
AuthField.displayName = "AuthField";
