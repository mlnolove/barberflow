interface AlertBadgeProps {
  label: string;
  count: number;
  severity: "warning" | "critical" | "neutral";
}

const SEVERITY_STYLES: Record<AlertBadgeProps["severity"], string> = {
  warning:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  critical:
    "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  neutral:
    "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
};

const SEVERITY_ICON: Record<AlertBadgeProps["severity"], string> = {
  warning: "⚠️",
  critical: "🔴",
  neutral: "•",
};

export function AlertBadge({ label, count, severity }: AlertBadgeProps) {
  const effectiveSeverity = count === 0 ? "neutral" : severity;
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${SEVERITY_STYLES[effectiveSeverity]}`}
    >
      <span aria-hidden="true">{SEVERITY_ICON[effectiveSeverity]}</span>
      <span className="font-semibold tabular-nums">{count}</span>
      <span>{label}</span>
    </div>
  );
}
