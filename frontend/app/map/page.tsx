"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Info, MapPin, SlidersHorizontal, Sprout } from "lucide-react";
import { fetchWaterStressMap } from "@/lib/api/client";
import type { WaterStressMapPoint } from "@/lib/api/schemas";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Section } from "@/components/ui/Section";
import { SampleDataBadge } from "@/components/ui/SampleDataBadge";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Badge, stressTone } from "@/components/ui/Badge";
import { Reveal } from "@/lib/motion/Reveal";
import type { TranslationKey } from "@/lib/i18n/en";

type StressLevel = WaterStressMapPoint["stress_level"];
type SortMode = "stress-desc" | "stress-asc" | "name";

const STRESS_LABEL_KEYS: Record<StressLevel, TranslationKey> = {
  low: "stress.low",
  moderate: "stress.moderate",
  high: "stress.high",
  severe: "stress.severe",
};

const LEGEND_LEVELS: StressLevel[] = ["low", "moderate", "high", "severe"];

const LEGEND_SWATCH_CLASSES: Record<StressLevel, string> = {
  low: "bg-stress-low",
  moderate: "bg-stress-moderate",
  high: "bg-stress-high",
  severe: "bg-stress-severe",
};

const copy = {
  en: {
    eyebrow: "Regional water stress",
    title: "India water-stress map",
    subtitle:
      "A district-level view of baseline irrigation water stress across 18 sample districts, built for demonstration — not a live satellite or government feed.",
    caption:
      "Circle size and colour both reflect the baseline water-stress index. Click a marker or a list row to highlight it on both.",
    loading: "Loading the water-stress map…",
    legendTitle: "Stress level",
    filterTitle: "Filter",
    thresholdLabel: "Minimum stress index",
    sortLabel: "Sort list by",
    sortOptions: {
      "stress-desc": "Stress (high to low)",
      "stress-asc": "Stress (low to high)",
      name: "District name",
    } satisfies Record<SortMode, string>,
    listTitle: "Districts",
    listCount: (shown: number, total: number) => `${shown} of ${total} districts shown`,
    emptyTitle: "No districts meet this threshold",
    emptyBody: "Lower the minimum stress index to see districts again.",
    resetFilter: "Reset filter",
    mapAccessibilityNote:
      "The map is a visual summary. The list below carries the same data in a form a screen reader or keyboard can browse directly.",
  },
  hi: {
    eyebrow: "क्षेत्रीय जल-तनाव",
    title: "भारत जल-तनाव मानचित्र",
    subtitle:
      "18 नमूना जिलों में आधारभूत सिंचाई जल-तनाव का जिला-स्तरीय दृश्य, केवल प्रदर्शन के लिए बनाया गया — यह कोई लाइव सैटेलाइट या सरकारी फीड नहीं है।",
    caption:
      "वृत्त का आकार और रंग दोनों आधारभूत जल-तनाव सूचकांक दर्शाते हैं। किसी मार्कर या सूची की पंक्ति पर क्लिक करें ताकि वह दोनों जगह हाइलाइट हो जाए।",
    loading: "जल-तनाव मानचित्र लोड हो रहा है…",
    legendTitle: "तनाव स्तर",
    filterTitle: "फ़िल्टर",
    thresholdLabel: "न्यूनतम तनाव सूचकांक",
    sortLabel: "सूची को इस आधार पर क्रमबद्ध करें",
    sortOptions: {
      "stress-desc": "तनाव (अधिक से कम)",
      "stress-asc": "तनाव (कम से अधिक)",
      name: "जिले का नाम",
    } satisfies Record<SortMode, string>,
    listTitle: "जिले",
    listCount: (shown: number, total: number) => `${total} में से ${shown} जिले दिखाए गए`,
    emptyTitle: "इस सीमा को कोई जिला पूरा नहीं करता",
    emptyBody: "फिर से जिले देखने के लिए न्यूनतम तनाव सूचकांक घटाएं।",
    resetFilter: "फ़िल्टर रीसेट करें",
    mapAccessibilityNote:
      "यह मानचित्र एक दृश्य सारांश है। नीचे दी गई सूची वही डेटा उस रूप में देती है जिसे स्क्रीन रीडर या कीबोर्ड से सीधे देखा जा सकता है।",
  },
} as const;

const StressMap = dynamic(() => import("./_components/StressMap").then((mod) => mod.StressMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface">
      <Spinner />
    </div>
  ),
});

export default function MapPage() {
  const { locale, t } = useLanguage();
  const c = copy[locale];

  const [points, setPoints] = useState<WaterStressMapPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [threshold, setThreshold] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("stress-desc");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    try {
      const result = await fetchWaterStressMap();
      setPoints(result);
      setSelectedDistrictId((previous) => previous ?? result[0]?.district_id ?? null);
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPoints = useMemo(() => {
    if (!points) return [];
    return points.filter((point) => point.stress_index >= threshold);
  }, [points, threshold]);

  const sortedPoints = useMemo(() => {
    const copyOfPoints = [...filteredPoints];
    if (sortMode === "stress-desc") {
      copyOfPoints.sort((a, b) => b.stress_index - a.stress_index);
    } else if (sortMode === "stress-asc") {
      copyOfPoints.sort((a, b) => a.stress_index - b.stress_index);
    } else {
      copyOfPoints.sort((a, b) => a.name.localeCompare(b.name));
    }
    return copyOfPoints;
  }, [filteredPoints, sortMode]);

  return (
    <>
      <Section tone="forest" className="pb-14 pt-16">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold-light">{c.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            {c.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-sage-light">{c.subtitle}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <SampleDataBadge />
            <p className="flex items-center gap-1.5 text-sm text-sage-light">
              <Info className="h-4 w-4 shrink-0" />
              {c.caption}
            </p>
          </div>
        </Reveal>
      </Section>

      <Section tone="ivory">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-muted">
            <Spinner />
            <span>{c.loading}</span>
          </div>
        ) : hasError ? (
          <ErrorNotice onRetry={loadData} />
        ) : points ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4 rounded border border-earth-light bg-surface px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <SlidersHorizontal className="h-4 w-4 text-forest" />
                  {c.filterTitle}
                </span>
                <label htmlFor="stress-threshold" className="flex flex-1 items-center gap-3 text-sm text-ink">
                  <span className="whitespace-nowrap">{c.thresholdLabel}</span>
                  <input
                    id="stress-threshold"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={threshold}
                    onChange={(event) => setThreshold(Number(event.target.value))}
                    className="flex-1 accent-forest"
                  />
                  <span className="w-10 text-right tabular-nums text-muted">{threshold}</span>
                </label>
              </div>

              <div className="h-[520px] w-full overflow-hidden rounded border border-earth-light">
                <StressMap
                  points={filteredPoints}
                  selectedDistrictId={selectedDistrictId}
                  onSelectDistrict={setSelectedDistrictId}
                />
              </div>

              <div className="flex flex-wrap items-center gap-5 rounded border border-earth-light bg-surface px-4 py-3">
                <span className="text-sm font-semibold text-ink">{c.legendTitle}</span>
                {LEGEND_LEVELS.map((level) => (
                  <span key={level} className="flex items-center gap-2 text-sm text-ink">
                    <span className={`inline-block h-3 w-3 rounded-full ${LEGEND_SWATCH_CLASSES[level]}`} aria-hidden />
                    {t(STRESS_LABEL_KEYS[level])}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3" role="region" aria-label={c.mapAccessibilityNote}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-ink">{c.listTitle}</h2>
                <span className="text-sm text-muted">
                  {c.listCount(sortedPoints.length, points.length)}
                </span>
              </div>

              <label htmlFor="sort-mode" className="text-sm font-medium text-ink">
                {c.sortLabel}
              </label>
              <select
                id="sort-mode"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="rounded border border-earth-light bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-forest"
              >
                {(Object.keys(c.sortOptions) as SortMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {c.sortOptions[mode]}
                  </option>
                ))}
              </select>

              {sortedPoints.length === 0 ? (
                <div className="mt-2 rounded border border-earth-light bg-surface p-5 text-center">
                  <p className="font-semibold text-ink">{c.emptyTitle}</p>
                  <p className="mt-2 text-sm text-muted">{c.emptyBody}</p>
                  <button
                    type="button"
                    onClick={() => setThreshold(0)}
                    className="mt-4 rounded border border-forest px-4 py-2 text-sm font-medium text-forest transition-colors hover:bg-forest hover:text-ivory"
                  >
                    {c.resetFilter}
                  </button>
                </div>
              ) : (
                <ul className="max-h-[560px] overflow-y-auto rounded border border-earth-light bg-surface">
                  {sortedPoints.map((point) => (
                    <li key={point.district_id} className="border-b border-earth-light last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setSelectedDistrictId(point.district_id)}
                        aria-current={point.district_id === selectedDistrictId}
                        className={`flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors ${
                          point.district_id === selectedDistrictId ? "bg-sage-light" : "hover:bg-ivory"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 font-medium text-ink">
                            <MapPin className="h-4 w-4 shrink-0 text-forest" />
                            {point.name}
                            <span className="font-normal text-muted">· {point.state}</span>
                          </span>
                          <Badge tone={stressTone(point.stress_level)}>
                            {t(STRESS_LABEL_KEYS[point.stress_level])}
                          </Badge>
                        </span>
                        <span className="text-sm text-muted">{point.stress_index}/100</span>
                        {point.primary_crops.length > 0 ? (
                          <span className="flex items-center gap-1.5 text-xs text-muted">
                            <Sprout className="h-3.5 w-3.5 shrink-0 text-forest" />
                            {point.primary_crops.join(", ")}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Section>
    </>
  );
}
