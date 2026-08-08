import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { CountPoint } from "@/types/dashboard";

interface RankedBarChartProps {
  data: CountPoint[];
  emptyLabel: string;
}

export function RankedBarChart({ data, emptyLabel }: RankedBarChartProps) {
  if (data.length === 0) {
    return <p className="flex h-full items-center justify-center text-sm text-slate-400">{emptyLabel}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        barCategoryGap={10}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--chart-baseline)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: "var(--chart-text-secondary)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
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
        <Bar dataKey="value" fill="var(--chart-series-1)" radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
