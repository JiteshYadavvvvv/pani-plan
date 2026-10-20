"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Info, MapPin, Search, SlidersHorizontal, Sprout } from "lucide-react";
import { classifyApiError, fetchCrops, fetchDistricts, fetchWaterStressMap } from "@/lib/api/client";
import { apiErrorMessageKey } from "@/lib/api/errorMessage";
import type { CropOut, DistrictOut, WaterStressMapPoint } from "@/lib/api/schemas";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Section } from "@/components/ui/Section";
import { SampleDataBadge } from "@/components/ui/SampleDataBadge";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Badge, stressTone } from "@/components/ui/Badge";
import { Reveal } from "@/lib/motion/Reveal";
import type { TranslationKey } from "@/lib/i18n/en";
import { DistrictDetail } from "./_components/DistrictDetail";

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
    searchLabel: "Search districts",
    searchPlaceholder: "Search by district name…",
    stateLabel: "State",
    stateAll: "All states",
    totalDistricts: (n: number) => `${n} districts in this dataset`,
    detailState: "State",
    detailSoil: "Dominant soil",
    detailStress: "Water-stress index",
    outOf: "out of 100",
    cropsLabel: "Primary crops grown here",
    noCrops: "No primary crops are recorded for this district.",
    soilLabels: {
      sandy: "Sandy",
      sandy_loam: "Sandy loam",
      loam: "Loam",
      clay_loam: "Clay loam",
      clay: "Clay",
    } satisfies Record<DistrictOut["dominant_soil"], string>,
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
    searchLabel: "जिला खोजें",
    searchPlaceholder: "जिले का नाम खोजें…",
    stateLabel: "राज्य",
    stateAll: "सभी राज्य",
    totalDistricts: (n: number) => `इस डेटासेट में ${n} जिले`,
    detailState: "राज्य",
    detailSoil: "प्रमुख मिट्टी",
    detailStress: "जल-तनाव सूचकांक",
    outOf: "100 में से",
    cropsLabel: "यहां उगाई जाने वाली मुख्य फसलें",
    noCrops: "इस जिले के लिए कोई मुख्य फसल दर्ज नहीं है।",
    soilLabels: {
      sandy: "रेतीली",
      sandy_loam: "रेतीली दोमट",
      loam: "दोमट",
      clay_loam: "चिकनी दोमट",
      clay: "चिकनी मिट्टी",
    } satisfies Record<DistrictOut["dominant_soil"], string>,
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
  const [districts, setDistricts] = useState<DistrictOut[]>([]);
  const [crops, setCrops] = useState<CropOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("stress-desc");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [mapResult, districtsResult, cropsResult] = await Promise.all([
        fetchWaterStressMap(),
        fetchDistricts(),
        fetchCrops(),
      ]);
      setPoints(mapResult);
      setDistricts(districtsResult);
      setCrops(cropsResult);
      setSelectedDistrictId((previous) => previous ?? mapResult[0]?.district_id ?? null);
    } catch (error) {
      setErrorMessage(t(apiErrorMessageKey(classifyApiError(error))));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const states = useMemo(() => {
    if (!points) return [];
    return Array.from(new Set(points.map((point) => point.state))).sort();
  }, [points]);

  const filteredPoints = useMemo(() => {
    if (!points) return [];
    const query = search.trim().toLowerCase();
    return points.filter((point) => {
      const matchesThreshold = point.stress_index >= threshold;
      const matchesState = stateFilter === "all" || point.state === stateFilter;
      const matchesSearch = query.length === 0 || point.name.toLowerCase().includes(query);
      return matchesThreshold && matchesState && matchesSearch;
    });
  }, [points, threshold, search, stateFilter]);

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

  const distribution = useMemo(() => {
    const counts: Record<StressLevel, number> = { low: 0, moderate: 0, high: 0, severe: 0 };
    (points ?? []).forEach((point) => {
      counts[point.stress_level] += 1;
    });
    return counts;
  }, [points]);

  const soilByDistrict = useMemo(() => new Map(districts.map((d) => [d.district_id, d.dominant_soil])), [districts]);
  const cropNameById = useMemo(() => new Map(crops.map((c) => [c.crop_id, c.name])), [crops]);

  const selectedPoint = useMemo(
    () => (points ?? []).find((point) => point.district_id === selectedDistrictId) ?? null,
    [points, selectedDistrictId]
  );

  const clearFilters = useCallback(() => {
    setThreshold(0);
    setSearch("");
    setStateFilter("all");
  }, []);

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
        ) : errorMessage ? (
          <ErrorNotice message={errorMessage} onRetry={loadData} />
        ) : points ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 rounded border border-earth-light bg-surface px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <SlidersHorizontal className="h-4 w-4 text-forest" />
                    {c.filterTitle}
                  </span>
                  <span className="text-sm text-muted">{c.totalDistricts(points.length)}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="map-search"
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={c.searchPlaceholder}
                      aria-label={c.searchLabel}
                      className="w-full rounded border border-earth-light bg-ivory py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus-visible:outline-forest"
                    />
                  </div>
                  <select
                    id="map-state-filter"
                    value={stateFilter}
                    onChange={(event) => setStateFilter(event.target.value)}
                    aria-label={c.stateLabel}
                    className="w-full rounded border border-earth-light bg-ivory px-3 py-2 text-sm text-ink focus-visible:outline-forest"
                  >
                    <option value="all">{c.stateAll}</option>
                    {states.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
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
                  cropNameById={cropNameById}
                />
              </div>

              <div className="flex flex-wrap items-center gap-5 rounded border border-earth-light bg-surface px-4 py-3">
                <span className="text-sm font-semibold text-ink">{c.legendTitle}</span>
                {LEGEND_LEVELS.map((level) => (
                  <span key={level} className="flex items-center gap-2 text-sm text-ink">
                    <span className={`inline-block h-3 w-3 rounded-full ${LEGEND_SWATCH_CLASSES[level]}`} aria-hidden />
                    {t(STRESS_LABEL_KEYS[level])}
                    <span className="tabular-nums text-muted">({distribution[level]})</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {selectedPoint ? (
                <DistrictDetail
                  point={selectedPoint}
                  dominantSoil={soilByDistrict.get(selectedPoint.district_id)}
                  cropNames={selectedPoint.primary_crops.map((id) => cropNameById.get(id) ?? id)}
                  copy={c}
                />
              ) : null}

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
                    onClick={clearFilters}
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
                            {point.primary_crops.map((id) => cropNameById.get(id) ?? id).join(", ")}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              </div>
            </div>
          </div>
        ) : null}
      </Section>
    </>
  );
}
