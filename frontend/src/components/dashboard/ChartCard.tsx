import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</h3>
      <div className="mt-3 h-64 w-full overflow-x-auto">{children}</div>
    </div>
  );
}
