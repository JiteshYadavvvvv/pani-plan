"use client";

import { useMemo, useState } from "react";
import { Search, X, MapPin, Wheat } from "lucide-react";
import type { CropOut, DistrictOut } from "@/lib/api/schemas";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { Badge, stressTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MetricBarChart, type MetricBarDatum } from "./MetricBarChart";

type SoilType = DistrictOut["dominant_soil"];
type StressLevel = "low" | "moderate" | "high" | "severe";

const STRESS_COLORS: Record<StressLevel, string> = {
  low: "#3f7a4c",
  moderate: "#a06c15",
  high: "#a3511f",
  severe: "#8c2a20",
};

function stressLevelFromIndex(index: number): StressLevel {
  if (index < 40) return "low";
  if (index < 60) return "moderate";
  if (index < 80) return "high";
  return "severe";
}

const copy = {
  en: {
    stateAll: "All states",
    stateLabel: "Filter by state",
    soilLabels: {
      sandy: "Sandy",
      sandy_loam: "Sandy loam",
      loam: "Loam",
      clay_loam: "Clay loam",
      clay: "Clay",
    } satisfies Record<SoilType, string>,
    stressLabels: {
      low: "Low stress",
      moderate: "Moderate stress",
      high: "High stress",
      severe: "Severe stress",
    } satisfies Record<StressLevel, string>,
    searchLabel: "Search districts",
    searchPlaceholder: "Search by district name…",
    listHeading: "Districts",
    listCount: (n: number) => `${n} district${n === 1 ? "" : "s"}`,
    emptyTitle: "No districts match these filters",
    emptyBody: "Try a different state or clear your search to see every district.",
    clearFilters: "Clear filters",
    detailState: "State",
    detailSoil: "Dominant soil",
    detailStress: "Baseline water-stress index",
    outOf: "out of 100",
    primaryCrops: "Primary crops grown here",
    noCrops: "No primary crops are recorded for this district.",
    chartHeading: "Baseline water-stress index, filtered districts",
  },
  hi: {
    stateAll: "सभी राज्य",
    stateLabel: "राज्य के अनुसार फ़िल्टर करें",
    soilLabels: {
      sandy: "रेतीली",
      sandy_loam: "रेतीली दोमट",
      loam: "दोमट",
      clay_loam: "चिकनी दोमट",
      clay: "चिकनी मिट्टी",
    } satisfies Record<SoilType, string>,
    stressLabels: {
      low: "कम तनाव",
      moderate: "मध्यम तनाव",
      high: "अधिक तनाव",
      severe: "गंभीर तनाव",
    } satisfies Record<StressLevel, string>,
    searchLabel: "जिला खोजें",
    searchPlaceholder: "जिले का नाम खोजें…",
    listHeading: "जिले",
    listCount: (n: number) => (n === 1 ? `${n} जिला` : `${n} जिले`),
    emptyTitle: "इन फ़िल्टर से कोई जिला नहीं मिला",
    emptyBody: "कोई अलग राज्य चुनें या सभी जिले देखने के लिए खोज मिटाएं।",
    clearFilters: "फ़िल्टर साफ़ करें",
    detailState: "राज्य",
    detailSoil: "प्रमुख मिट्टी",
    detailStress: "आधारभूत जल-तनाव सूचकांक",
    outOf: "100 में से",
    primaryCrops: "यहां उगाई जाने वाली मुख्य फसलें",
    noCrops: "इस जिले के लिए कोई मुख्य फसल दर्ज नहीं है।",
    chartHeading: "आधारभूत जल-तनाव सूचकांक, फ़िल्टर किए गए जिले",
  },
} as const;

export function DistrictsExplorer({
  districts,
  crops,
  selectedDistrictId,
  onSelectDistrict,
  onJumpToCrop,
}: {
  districts: DistrictOut[];
  crops: CropOut[];
  selectedDistrictId: string | null;
  onSelectDistrict: (districtId: string) => void;
  onJumpToCrop: (cropId: string) => void;
}) {
  const { locale, t } = useLanguage();
  const c = copy[locale];

  const [state, setState] = useState<string>("all");
  const [search, setSearch] = useState("");

  const states = useMemo(
    () => Array.from(new Set(districts.map((district) => district.state))).sort(),
    [districts]
  );

  const filteredDistricts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return districts.filter((district) => {
      const matchesState = state === "all" || district.state === state;
      const matchesSearch = query.length === 0 || district.name.toLowerCase().includes(query);
      return matchesState && matchesSearch;
    });
  }, [districts, state, search]);

  const selectedDistrict = useMemo(
    () => districts.find((district) => district.district_id === selectedDistrictId) ?? null,
    [districts, selectedDistrictId]
  );

  const cropsGrownBySelected = useMemo(() => {
    if (!selectedDistrict) return [];
    return crops.filter((crop) => selectedDistrict.primary_crops.includes(crop.crop_id));
  }, [crops, selectedDistrict]);

  const chartData: MetricBarDatum[] = useMemo(
    () =>
      filteredDistricts.map((district) => {
        const level = stressLevelFromIndex(district.baseline_water_stress_index);
        return {
          id: district.district_id,
          label: district.name,
          value: district.baseline_water_stress_index,
          color: STRESS_COLORS[level],
        };
      }),
    [filteredDistricts]
  );

  const clearFilters = () => {
    setState("all");
    setSearch("");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
      <div>
        <div className="w-full sm:max-w-xs">
          <label htmlFor="district-search" className="mb-1.5 block text-sm font-medium text-ink">
            {c.searchLabel}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="district-search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={c.searchPlaceholder}
              className="w-full rounded border border-earth-light bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus-visible:outline-forest"
            />
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="state-filter" className="mb-1.5 block text-sm font-medium text-ink">
            {c.stateLabel}
          </label>
          <select
            id="state-filter"
            value={state}
            onChange={(event) => setState(event.target.value)}
            className="w-full rounded border border-earth-light bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-forest sm:max-w-xs"
          >
            <option value="all">{c.stateAll}</option>
            {states.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ink">{c.listHeading}</h3>
          <span className="text-sm text-muted">{c.listCount(filteredDistricts.length)}</span>
        </div>

        {filteredDistricts.length === 0 ? (
          <Card className="mt-3 bg-surface text-center">
            <p className="font-semibold text-ink">{c.emptyTitle}</p>
            <p className="mt-2 text-sm text-muted">{c.emptyBody}</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={clearFilters}>
              <X className="h-4 w-4" />
              {c.clearFilters}
            </Button>
          </Card>
        ) : (
          <ul className="mt-3 max-h-[420px] overflow-y-auto rounded border border-earth-light bg-surface">
            {filteredDistricts.map((district) => {
              const level = stressLevelFromIndex(district.baseline_water_stress_index);
              return (
                <li key={district.district_id} className="border-b border-earth-light last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onSelectDistrict(district.district_id)}
                    aria-current={district.district_id === selectedDistrictId}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                      district.district_id === selectedDistrictId ? "bg-sage-light" : "hover:bg-ivory"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-forest" />
                      <span>
                        <span className="font-medium text-ink">{district.name}</span>
                        <span className="ml-1.5 text-sm text-muted">{district.state}</span>
                      </span>
                    </span>
                    <Badge tone={stressTone(level)}>{c.stressLabels[level]}</Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {selectedDistrict ? (
          <Card className="bg-surface">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl font-semibold text-ink">{selectedDistrict.name}</h3>
                <p className="mt-1 text-sm text-muted">
                  {c.detailState}: {selectedDistrict.state}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge tone={stressTone(stressLevelFromIndex(selectedDistrict.baseline_water_stress_index))}>
                  {c.stressLabels[stressLevelFromIndex(selectedDistrict.baseline_water_stress_index)]}
                </Badge>
                <span className="rounded bg-earth-light/60 px-2 py-0.5 text-xs font-semibold text-ink">
                  CGWB: {selectedDistrict.cgwb_category}
                </span>
              </div>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-sm text-muted">{c.detailSoil}</dt>
                <dd className="font-display text-xl font-semibold text-forest">
                  {c.soilLabels[selectedDistrict.dominant_soil]}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{c.detailStress}</dt>
                <dd className="font-display text-xl font-semibold text-forest">
                  {selectedDistrict.baseline_water_stress_index}
                  <span className="ml-1 text-sm font-normal text-muted">{c.outOf}</span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">GW Extraction Stage</dt>
                <dd className="font-display text-xl font-semibold text-forest">
                  {selectedDistrict.cgwb_stage_of_extraction_pct.toFixed(1)}%
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Annual Extractable</dt>
                <dd className="font-display text-xl font-semibold text-forest">
                  {selectedDistrict.annual_extractable_gw_mcm.toFixed(0)} <span className="text-xs font-normal text-muted">MCM</span>
                </dd>
              </div>
            </dl>

            <div className="mt-3 rounded border border-earth-light/60 bg-sand/30 px-3 py-1.5 text-xs text-muted">
              <span className="font-medium text-ink">Official Source:</span> {selectedDistrict.source_citation} ({selectedDistrict.data_period}). Irrigation draft: {selectedDistrict.gw_extraction_for_irrigation_mcm.toFixed(0)} MCM.
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-ink">{c.primaryCrops}</p>
              {cropsGrownBySelected.length === 0 ? (
                <p className="mt-2 text-sm text-muted">{c.noCrops}</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {cropsGrownBySelected.map((crop) => (
                    <button
                      key={crop.crop_id}
                      type="button"
                      onClick={() => onJumpToCrop(crop.crop_id)}
                      className="inline-flex items-center gap-1.5 rounded border border-earth-light bg-ivory px-3 py-1.5 text-sm text-ink transition-colors hover:border-forest hover:bg-sage-light"
                    >
                      <Wheat className="h-3.5 w-3.5 text-forest" />
                      {crop.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ) : null}

        <Card className="bg-surface">
          <h3 className="font-display text-lg font-semibold text-ink">{c.chartHeading}</h3>
          {chartData.length === 0 ? (
            <p className="mt-6 text-sm text-muted">{c.emptyBody}</p>
          ) : (
            <div className="mt-4">
              <MetricBarChart data={chartData} ariaLabel={c.chartHeading} />
            </div>
          )}
          <p className="mt-3 text-xs text-muted">{t("common.sampleDataShort")}</p>
        </Card>
      </div>
    </div>
  );
}
