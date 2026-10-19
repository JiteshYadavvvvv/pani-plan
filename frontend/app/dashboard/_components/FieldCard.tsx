"use client";

import { Trash2 } from "lucide-react";
import { Badge, stressTone } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import type { AdvisoryResponse } from "@/lib/api/schemas";
import type { Locale } from "@/lib/i18n/LanguageProvider";

export interface DashboardField {
  id: string;
  label: string;
  districtId: string;
  cropId: string;
  growthStage: "initial" | "development" | "mid_season" | "late_season";
  irrigationMethod: "drip" | "sprinkler" | "flood";
  areaHectares: number;
}

export type FieldAdvisoryState = "loading" | "error" | AdvisoryResponse;

export interface FieldCardCopy {
  cardErrorMessage: string;
  removeLabel: (label: string) => string;
  areaCaption: (hectares: string) => string;
  growthStage: Record<DashboardField["growthStage"], string>;
  irrigationMethod: Record<DashboardField["irrigationMethod"], string>;
  stressLabel: Record<AdvisoryResponse["stress_level"], string>;
  headline: (grossMm: string, litres: string, days: number) => string;
}

function formatNumber(value: number, locale: Locale, maximumFractionDigits = 1): string {
  return value.toLocaleString(locale === "hi" ? "hi-IN" : "en-IN", {
    maximumFractionDigits,
  });
}

export function FieldCard({
  field,
  districtName,
  cropName,
  state,
  onRemove,
  onRetry,
  locale,
  copy,
}: {
  field: DashboardField;
  districtName: string;
  cropName: string;
  state: FieldAdvisoryState;
  onRemove: () => void;
  onRetry: () => void;
  locale: Locale;
  copy: FieldCardCopy;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-earth-light bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold text-ink">{field.label}</p>
          <p className="text-sm text-muted">
            {cropName} · {districtName}
          </p>
          <p className="mt-1 text-xs tabular-nums text-muted">
            {copy.growthStage[field.growthStage]} · {copy.irrigationMethod[field.irrigationMethod]} ·{" "}
            {copy.areaCaption(formatNumber(field.areaHectares, locale, 2))}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={copy.removeLabel(field.label)}
          className="flex-none rounded border border-earth-light p-2 text-muted transition-colors hover:border-stress-severe-border hover:text-stress-severe focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {state === "loading" ? (
        <div className="flex items-center gap-2 py-2">
          <Spinner className="h-4 w-4" />
        </div>
      ) : state === "error" ? (
        <ErrorNotice message={copy.cardErrorMessage} onRetry={onRetry} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={stressTone(state.stress_level)}>{copy.stressLabel[state.stress_level]}</Badge>
          </div>
          <p className="tabular-nums text-sm font-semibold leading-snug text-forest-dark">
            {copy.headline(
              formatNumber(state.gross_irrigation_mm, locale),
              formatNumber(state.total_water_liters, locale, 0),
              Math.round(state.irrigation_interval_days)
            )}
          </p>
        </div>
      )}
    </div>
  );
}
