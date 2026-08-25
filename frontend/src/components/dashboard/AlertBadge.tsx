interface AlertBadgeProps {
  label: string;
  count: number;
  severity: "warning" | "critical" | "neutral";
}

const SEVERITY_STYLES: Record<AlertBadgeProps["severity"], string> = {
  warning: "border-amber-800/40 bg-amber-950/30 text-amber-300",
  critical: "border-red-900/40 bg-red-950/30 text-red-300",
  neutral: "border-white/[0.06] bg-ink-900 text-ink-500",
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
