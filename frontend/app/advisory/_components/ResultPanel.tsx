"use client";

import { Droplets, Sprout } from "lucide-react";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Badge, stressTone } from "@/components/ui/Badge";
import { SampleDataBadge } from "@/components/ui/SampleDataBadge";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Disclosure } from "@/components/ui/Disclosure";
import type { AdvisoryResponse } from "@/lib/api/schemas";
import type { Locale } from "@/lib/i18n/LanguageProvider";

export interface ResultPanelCopy {
  resultEmptyTitle: string;
  resultEmptyBody: string;
  resultHeading: string;
  reasoningNote: string;
  breakdownHeading: string;
  etoLabel: string;
  kcLabel: string;
  etcLabel: string;
  effectiveRainfallLabel: string;
  sampleClimateNote: string;
  mmPerDay: string;
  stressLabel: Record<AdvisoryResponse["stress_level"], string>;
  headline: (grossMm: string, litres: string, days: number) => string;
}

export type ResultStatus = "idle" | "loading" | "error" | "success";

function formatNumber(value: number, locale: Locale, maximumFractionDigits = 1): string {
  return value.toLocaleString(locale === "hi" ? "hi-IN" : "en-IN", {
    maximumFractionDigits,
  });
}

export function ResultPanel({
  status,
  result,
  errorMessage,
  onRetry,
  locale,
  copy,
}: {
  status: ResultStatus;
  result: AdvisoryResponse | null;
  errorMessage?: string;
  onRetry?: () => void;
  locale: Locale;
  copy: ResultPanelCopy;
}) {
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = resultRef.current;
    if (!element || status !== "success") return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;
    const tween = gsap.fromTo(
      element,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );
    return () => {
      tween.kill();
    };
  }, [status, result]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-lg border border-earth-light bg-surface p-8 text-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-earth-light bg-surface p-6 sm:p-8">
        <ErrorNotice message={errorMessage} onRetry={onRetry} />
      </div>
    );
  }

  if (status === "success" && result) {
    const headline = copy.headline(
      formatNumber(result.gross_irrigation_mm, locale),
      formatNumber(result.total_water_liters, locale, 0),
      Math.round(result.irrigation_interval_days)
    );

    const breakdownRows: { label: string; value: string }[] = [
      { label: copy.etoLabel, value: `${formatNumber(result.eto_mm_day, locale, 2)} ${copy.mmPerDay}` },
      { label: copy.kcLabel, value: formatNumber(result.kc, locale, 2) },
      { label: copy.etcLabel, value: `${formatNumber(result.etc_mm_day, locale, 2)} ${copy.mmPerDay}` },
      {
        label: copy.effectiveRainfallLabel,
        value: `${formatNumber(result.effective_rainfall_mm_day, locale, 2)} ${copy.mmPerDay}`,
      },
    ];

    return (
      <div
        ref={resultRef}
        className="flex flex-col gap-6 rounded-lg border border-earth-light bg-surface p-6 sm:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="font-display text-xl font-semibold text-ink">{copy.resultHeading}</h3>
          <Badge tone={stressTone(result.stress_level)}>{copy.stressLabel[result.stress_level]}</Badge>
        </div>

        <div className="flex items-start gap-3 rounded border border-forest/20 bg-ivory p-4">
          <Droplets className="mt-0.5 h-5 w-5 flex-none text-forest" />
          <div>
            <p className="font-display text-lg font-semibold leading-snug text-forest-dark">{headline}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{copy.reasoningNote}</p>
          </div>
        </div>

        <Disclosure label={copy.breakdownHeading}>
          <dl className="grid gap-3 sm:grid-cols-2">
            {breakdownRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 border-b border-earth-light pb-2">
                <dt className="text-sm text-muted">{row.label}</dt>
                <dd className="tabular-nums text-sm font-semibold text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Disclosure>

        {result.used_sample_climate ? (
          <div className="flex flex-wrap items-center gap-2 rounded border border-gold bg-gold-light/40 p-3">
            <SampleDataBadge />
            <p className="text-xs leading-relaxed text-forest-dark">{copy.sampleClimateNote}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-earth-light bg-surface p-8 text-center">
      <Sprout className="h-8 w-8 text-sage" strokeWidth={1.5} />
      <p className="font-display text-lg font-semibold text-ink">{copy.resultEmptyTitle}</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted">{copy.resultEmptyBody}</p>
    </div>
  );
}
