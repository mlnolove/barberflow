import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { CountPoint } from "@/types/dashboard";

interface CountBarChartProps {
  data: CountPoint[];
  seriesColor?: string;
}

export function CountBarChart({ data, seriesColor = "var(--chart-series-1)" }: CountBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--chart-baseline)" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={32}
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
        <Bar dataKey="value" fill={seriesColor} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
