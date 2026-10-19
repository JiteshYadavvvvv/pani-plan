"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BenchmarkResponse } from "@/lib/api/schemas";

export type BenchmarkMode = BenchmarkResponse["results"][number]["mode"];

export interface ChartRow {
  key: string;
  label: string;
  mode: BenchmarkMode;
  workers: number;
  timeSeconds: number;
  speedup: number;
}

export const modeColor: Record<BenchmarkMode, string> = {
  serial: "#1f3a2c",
  multiprocess: "#c6901f",
  vectorized: "#aec9a4",
};

export function buildChartRows(
  results: BenchmarkResponse["results"],
  labels: { serial: string; vectorized: string; workers: string }
): ChartRow[] {
  const ordered = [...results].sort((a, b) => {
    const rank = (mode: BenchmarkMode) => (mode === "serial" ? 0 : mode === "multiprocess" ? 1 : 2);
    const rankDiff = rank(a.mode) - rank(b.mode);
    if (rankDiff !== 0) return rankDiff;
    return a.workers - b.workers;
  });
  return ordered.map((entry) => {
    const label =
      entry.mode === "serial"
        ? labels.serial
        : entry.mode === "vectorized"
          ? labels.vectorized
          : `${entry.workers} ${labels.workers}`;
    return {
      key: `${entry.mode}-${entry.workers}`,
      label,
      mode: entry.mode,
      workers: entry.workers,
      timeSeconds: entry.time_seconds,
      speedup: entry.speedup,
    };
  });
}

export function ModeLegend({
  items,
}: {
  items: { mode: BenchmarkMode; label: string }[];
}) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2">
      {items.map((item) => (
        <li key={item.mode} className="flex items-center gap-2 text-sm text-muted">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: modeColor[item.mode] }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function TimeComparisonChart({
  rows,
  secondsUnitLabel,
}: {
  rows: ChartRow[];
  secondsUnitLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={rows} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid stroke="#ddd3c0" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#2a251e", fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "#ddd3c0" }}
        />
        <YAxis
          tick={{ fill: "#6c6253", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={56}
          label={{ value: secondsUnitLabel, angle: -90, position: "insideLeft", fill: "#6c6253", fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: "#e4ecdc" }}
          contentStyle={{ borderRadius: 10, borderColor: "#ddd3c0", fontSize: 13 }}
          formatter={(value) => [`${Number(value).toFixed(4)} s`, secondsUnitLabel]}
        />
        <Bar dataKey="timeSeconds" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={row.key} fill={modeColor[row.mode]} />
          ))}
          <LabelList
            dataKey="timeSeconds"
            position="top"
            className="tabular-nums"
            formatter={(value: number) => value.toFixed(3)}
            style={{ fill: "#2a251e", fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SpeedupChart({
  rows,
  baselineLabel,
  speedupUnitLabel,
}: {
  rows: ChartRow[];
  baselineLabel: string;
  speedupUnitLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={rows} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid stroke="#ddd3c0" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#2a251e", fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "#ddd3c0" }}
        />
        <YAxis
          tick={{ fill: "#6c6253", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ fill: "#e4ecdc" }}
          contentStyle={{ borderRadius: 10, borderColor: "#ddd3c0", fontSize: 13 }}
          formatter={(value) => [`${Number(value).toFixed(2)}×`, speedupUnitLabel]}
        />
        <ReferenceLine y={1} stroke="#8a7359" strokeDasharray="4 4" label={{ value: baselineLabel, position: "right", fill: "#8a7359", fontSize: 11 }} />
        <Bar dataKey="speedup" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={row.key} fill={modeColor[row.mode]} />
          ))}
          <LabelList
            dataKey="speedup"
            position="top"
            formatter={(value: number) => `${value.toFixed(2)}×`}
            style={{ fill: "#2a251e", fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
