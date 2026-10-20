"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Sprout } from "lucide-react";
import { Badge, stressTone } from "@/components/ui/Badge";
import type { WaterStressMapPoint, DistrictOut } from "@/lib/api/schemas";
import type { TranslationKey } from "@/lib/i18n/en";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type SoilType = DistrictOut["dominant_soil"];

const STRESS_LABEL_KEYS: Record<WaterStressMapPoint["stress_level"], TranslationKey> = {
  low: "stress.low",
  moderate: "stress.moderate",
  high: "stress.high",
  severe: "stress.severe",
};

export interface DistrictDetailCopy {
  detailState: string;
  detailSoil: string;
  detailStress: string;
  outOf: string;
  cropsLabel: string;
  noCrops: string;
  soilLabels: Record<SoilType, string>;
}

export function DistrictDetail({
  point,
  dominantSoil,
  cropNames,
  copy,
}: {
  point: WaterStressMapPoint;
  dominantSoil?: SoilType;
  cropNames: string[];
  copy: DistrictDetailCopy;
}) {
  const { t } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;
    const tween = gsap.fromTo(
      element,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
    );
    return () => {
      tween.kill();
    };
  }, [point.district_id]);

  return (
    <div ref={cardRef} className="rounded-lg border border-earth-light bg-surface p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl font-semibold text-ink">{point.name}</h3>
          <p className="mt-1 text-sm text-muted">
            {copy.detailState}: {point.state}
          </p>
        </div>
        <Badge tone={stressTone(point.stress_level)}>{t(STRESS_LABEL_KEYS[point.stress_level])}</Badge>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">{copy.detailStress}</dt>
          <dd className="font-display text-2xl font-semibold text-forest">
            {point.stress_index}
            <span className="ml-1 text-base font-normal text-muted">{copy.outOf}</span>
          </dd>
        </div>
        {dominantSoil ? (
          <div>
            <dt className="text-sm text-muted">{copy.detailSoil}</dt>
            <dd className="font-display text-2xl font-semibold text-forest">{copy.soilLabels[dominantSoil]}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6">
        <p className="text-sm font-medium text-ink">{copy.cropsLabel}</p>
        {cropNames.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{copy.noCrops}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {cropNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded border border-earth-light bg-ivory px-3 py-1.5 text-sm text-ink"
              >
                <Sprout className="h-3.5 w-3.5 text-forest" />
                {name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
