import type { LucideIcon } from "lucide-react";

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
}

export function StatTile({ label, value, hint, icon: Icon }: StatTileProps) {
  return (
    <div className="press-scale rounded-xl border border-white/[0.06] bg-ink-900 p-4 transition-colors hover:border-white/[0.1]">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={12} className="text-ink-600" strokeWidth={2} />}
        <p className="text-xs font-medium text-ink-500">{label}</p>
      </div>
      <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-600">{hint}</p>}
    </div>
  );
}
