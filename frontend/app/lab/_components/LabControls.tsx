"use client";

import { Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export interface LabControlsCopy {
  workloadLabel: string;
  workloadHint: string;
  maxWorkersLabel: string;
  maxWorkersHint: string;
  maxWorkersAuto: string;
  runButton: string;
  runningButton: string;
}

export function LabControls({
  copy,
  workloadSize,
  onWorkloadSizeChange,
  maxWorkers,
  onMaxWorkersChange,
  onRun,
  isLoading,
}: {
  copy: LabControlsCopy;
  workloadSize: number;
  onWorkloadSizeChange: (value: number) => void;
  maxWorkers: string;
  onMaxWorkersChange: (value: string) => void;
  onRun: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="workload-size" className="text-sm font-semibold text-ink">
            {copy.workloadLabel}
          </label>
          <span className="tabular-nums font-display text-xl font-semibold text-forest">
            {workloadSize.toLocaleString("en-IN")}
          </span>
        </div>
        <input
          id="workload-size"
          type="range"
          min={100}
          max={20000}
          step={100}
          value={workloadSize}
          disabled={isLoading}
          onChange={(event) => onWorkloadSizeChange(Number(event.target.value))}
          className="mt-3 w-full accent-forest disabled:opacity-50"
        />
        <p className="mt-2 text-xs text-muted">{copy.workloadHint}</p>
      </div>

      <div>
        <label htmlFor="max-workers" className="text-sm font-semibold text-ink">
          {copy.maxWorkersLabel}
        </label>
        <input
          id="max-workers"
          type="number"
          min={1}
          max={16}
          inputMode="numeric"
          placeholder={copy.maxWorkersAuto}
          value={maxWorkers}
          disabled={isLoading}
          onChange={(event) => onMaxWorkersChange(event.target.value)}
          className="mt-2 w-full rounded border border-earth-light bg-surface px-3 py-2 text-sm text-ink disabled:opacity-50"
        />
        <p className="mt-2 text-xs text-muted">{copy.maxWorkersHint}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={onRun} disabled={isLoading} size="lg" className="w-full sm:w-auto">
          <Play className="h-5 w-5" strokeWidth={1.75} />
          {isLoading ? copy.runningButton : copy.runButton}
        </Button>
        {isLoading ? <Spinner /> : null}
      </div>
    </div>
  );
}
