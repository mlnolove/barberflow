import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatMoney, formatMoneyCompact } from "@/lib/format";
import type { MoneyPoint } from "@/types/dashboard";

interface MoneyBarChartProps {
  data: MoneyPoint[];
}

export function MoneyBarChart({ data }: MoneyBarChartProps) {
  const points = data.map((d) => ({ label: d.label, value: Number(d.value) }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--chart-baseline)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatMoneyCompact(v)}
          width={64}
        />
        <Tooltip
          formatter={(value: number) => formatMoney(value)}
          contentStyle={{
            backgroundColor: "var(--chart-tooltip-bg)",
            border: "1px solid var(--chart-tooltip-border)",
            borderRadius: 8,
            color: "var(--chart-tooltip-text)",
            fontSize: 13,
          }}
          labelStyle={{ color: "var(--chart-tooltip-text)" }}
          cursor={{ fill: "var(--chart-grid)" }}
        />
        <Bar dataKey="value" fill="var(--chart-series-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
