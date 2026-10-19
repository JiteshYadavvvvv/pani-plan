"use client";

import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BenchmarkResponse } from "@/lib/api/schemas";

export interface AmdahlChartCopy {
  theoreticalSeries: string;
  measuredSeries: string;
  workersAxis: string;
  speedupAxis: string;
  baselineLabel: string;
}

export function AmdahlChart({
  amdahlCurve,
  measuredPoints,
  copy,
}: {
  amdahlCurve: BenchmarkResponse["amdahl_curve"];
  measuredPoints: { workers: number; speedup: number }[];
  copy: AmdahlChartCopy;
}) {
  const maxWorkers = Math.max(
    8,
    ...amdahlCurve.map((point) => point.workers),
    ...measuredPoints.map((point) => point.workers)
  );
  const maxSpeedup = Math.max(
    1,
    ...amdahlCurve.map((point) => point.theoretical_speedup),
    ...measuredPoints.map((point) => point.speedup)
  );

  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart margin={{ top: 24, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid stroke="#ddd3c0" strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="workers"
          domain={[1, maxWorkers]}
          tick={{ fill: "#6c6253", fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "#ddd3c0" }}
          label={{ value: copy.workersAxis, position: "insideBottom", offset: -4, fill: "#6c6253", fontSize: 12 }}
        />
        <YAxis
          type="number"
          domain={[0, Math.ceil(maxSpeedup + 0.5)]}
          tick={{ fill: "#6c6253", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={48}
          label={{ value: copy.speedupAxis, angle: -90, position: "insideLeft", fill: "#6c6253", fontSize: 12 }}
        />
        <Tooltip
          cursor={{ stroke: "#8a7359", strokeDasharray: "3 3" }}
          contentStyle={{ borderRadius: 10, borderColor: "#ddd3c0", fontSize: 13 }}
          formatter={(value, name) => [`${Number(value).toFixed(2)}×`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <ReferenceLine y={1} stroke="#8a7359" strokeDasharray="4 4" label={{ value: copy.baselineLabel, position: "right", fill: "#8a7359", fontSize: 11 }} />
        <Line
          data={amdahlCurve}
          dataKey="theoretical_speedup"
          name={copy.theoreticalSeries}
          stroke="#1f3a2c"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          type="monotone"
        />
        <Scatter
          data={measuredPoints}
          dataKey="speedup"
          name={copy.measuredSeries}
          fill="#c6901f"
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
