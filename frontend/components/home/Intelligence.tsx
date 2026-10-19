"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n/en";
import { Reveal } from "@/lib/motion/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Badge, stressTone } from "@/components/ui/Badge";
import { SampleDataBadge } from "@/components/ui/SampleDataBadge";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { LinkButton } from "@/components/ui/Button";
import { classifyApiError, fetchWaterStressMap } from "@/lib/api/client";
import { apiErrorMessageKey } from "@/lib/api/errorMessage";
import type { WaterStressMapPoint } from "@/lib/api/schemas";

const stressLabelKey: Record<WaterStressMapPoint["stress_level"], TranslationKey> = {
  low: "stress.low",
  moderate: "stress.moderate",
  high: "stress.high",
  severe: "stress.severe",
};

export function Intelligence() {
  const { t } = useLanguage();
  const [state, setState] = useState<
    { status: "loading" } | { status: "error"; message: string } | { status: "success"; data: WaterStressMapPoint[] }
  >({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchWaterStressMap()
      .then((data) => {
        if (cancelled) return;
        setState({ status: "success", data });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ status: "error", message: t(apiErrorMessageKey(classifyApiError(error))) });
      });
    return () => {
      cancelled = true;
    };
  }, [retryKey, t]);

  const topDistricts =
    state.status === "success"
      ? [...state.data].sort((a, b) => b.stress_index - a.stress_index).slice(0, 6)
      : [];

  return (
    <Section tone="ivory">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Reveal>
          <SectionHeading
            eyebrow={t("home.intelligence.eyebrow")}
            title={t("home.intelligence.title")}
            body={t("home.intelligence.body")}
          />
        </Reveal>
        <Reveal delay={0.1}>
          <SampleDataBadge />
        </Reveal>
      </div>

      <div className="mt-10">
        {state.status === "loading" ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <Spinner className="h-7 w-7" />
          </div>
        ) : state.status === "error" ? (
          <ErrorNotice message={state.message} onRetry={() => setRetryKey((k) => k + 1)} />
        ) : (
          <Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topDistricts.map((district) => (
                <Card key={district.district_id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold">{district.name}</p>
                    <p className="text-sm text-muted">{district.state}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={stressTone(district.stress_level)}>
                      {t(stressLabelKey[district.stress_level])}
                    </Badge>
                    <span className="tabular-nums text-xs text-muted">{district.stress_index}/100</span>
                  </div>
                </Card>
              ))}
            </div>
          </Reveal>
        )}
      </div>

      <Reveal delay={0.15}>
        <div className="mt-10 flex flex-wrap gap-4">
          <LinkButton href="/map" variant="secondary">
            {t("home.intelligence.viewMap")}
          </LinkButton>
          <LinkButton href="/explore" variant="ghost">
            {t("home.intelligence.viewExplorer")}
          </LinkButton>
        </div>
      </Reveal>
    </Section>
  );
}
