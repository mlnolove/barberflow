import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
}

export function AuthButton({ variant = "primary", className, children, ...props }: AuthButtonProps) {
  return (
    <button
      className={clsx(
        "h-12 w-full rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60",
        variant === "primary" && "bg-gold text-ink-950 hover:opacity-90",
        variant === "outline" && "border border-white/10 bg-transparent text-white hover:bg-white/5",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
