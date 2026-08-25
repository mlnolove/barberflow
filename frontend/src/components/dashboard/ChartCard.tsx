import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-ink-900 p-4">
      <h3 className="text-sm font-semibold text-ink-300">{title}</h3>
      <div className="mt-3 h-64 w-full overflow-x-auto">{children}</div>
    </div>
  );
}
