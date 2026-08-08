import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatMoney, formatMoneyCompact } from "@/lib/format";
import type { MoneyPoint } from "@/types/dashboard";

interface RevenueAreaChartProps {
  data: MoneyPoint[];
}

export function RevenueAreaChart({ data }: RevenueAreaChartProps) {
  const points = data.map((d) => ({ label: d.label, value: Number(d.value) }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-series-1)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--chart-series-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--chart-baseline)" }}
          tickLine={false}
          interval={1}
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
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--chart-series-1)"
          strokeWidth={2}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
