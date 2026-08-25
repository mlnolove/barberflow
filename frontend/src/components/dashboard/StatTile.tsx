interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
}

export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-ink-900 p-4">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-600">{hint}</p>}
    </div>
  );
}
