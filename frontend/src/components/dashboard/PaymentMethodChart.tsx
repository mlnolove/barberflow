import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatMoney } from "@/lib/format";
import type { MoneyPoint } from "@/types/dashboard";

const SERIES_COLORS = [
  "var(--chart-series-1)",
  "var(--chart-series-2)",
  "var(--chart-series-3)",
  "var(--chart-series-4)",
  "var(--chart-series-5)",
];

interface PaymentMethodChartProps {
  data: MoneyPoint[];
  emptyLabel: string;
}

export function PaymentMethodChart({ data, emptyLabel }: PaymentMethodChartProps) {
  const points = data.map((d) => ({ label: d.label, value: Number(d.value) }));

  if (points.length === 0 || points.every((p) => p.value === 0)) {
    return <p className="flex h-full items-center justify-center text-sm text-ink-600">{emptyLabel}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Pie
          data={points}
          dataKey="value"
          nameKey="label"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          stroke="var(--chart-tooltip-bg)"
          strokeWidth={2}
        >
          {points.map((entry, index) => (
            <Cell key={entry.label} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatMoney(value)}
          contentStyle={{
            backgroundColor: "var(--chart-tooltip-bg)",
            border: "1px solid var(--chart-tooltip-border)",
            borderRadius: 8,
            color: "var(--chart-tooltip-text)",
            fontSize: 13,
          }}
        />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          wrapperStyle={{ fontSize: 12, color: "var(--chart-text-secondary)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
