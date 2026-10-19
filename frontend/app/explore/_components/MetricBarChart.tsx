"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface MetricBarDatum {
  id: string;
  label: string;
  value: number;
  color: string;
}

export function MetricBarChart({
  data,
  valueSuffix,
  ariaLabel,
}: {
  data: MetricBarDatum[];
  valueSuffix?: string;
  ariaLabel: string;
}) {
  const rowHeight = 34;
  const chartHeight = Math.max(200, data.length * rowHeight + 40);

  return (
    <div role="img" aria-label={ariaLabel} style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 4 }}
          barCategoryGap={10}
        >
          <CartesianGrid horizontal={false} stroke="#ddd3c0" />
          <XAxis
            type="number"
            tick={{ fill: "#6c6253", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={128}
            tick={{ fill: "#2a251e", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "#e4ecdc" }}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #ddd3c0",
              borderRadius: 8,
              fontSize: 12,
              padding: "8px 12px",
            }}
            labelStyle={{ color: "#2a251e", fontWeight: 600, marginBottom: 2 }}
            itemStyle={{ color: "#6c6253" }}
            formatter={(value) => (valueSuffix ? `${value} ${valueSuffix}` : `${value}`)}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
            {data.map((datum) => (
              <Cell key={datum.id} fill={datum.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
