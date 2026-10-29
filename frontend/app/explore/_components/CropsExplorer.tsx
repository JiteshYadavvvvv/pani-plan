"use client";

import { useMemo, useState } from "react";
import { Search, X, Sprout, MapPin } from "lucide-react";
import type { CropOut, DistrictOut } from "@/lib/api/schemas";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MetricBarChart, type MetricBarDatum } from "./MetricBarChart";

type Category = CropOut["category"];
type Metric = "root_depth_m" | "typical_season_days";

const CATEGORY_LABELS: Record<"en" | "hi", Record<string, string>> = {
  en: {
    cereal: "Cereal",
    cash_crop: "Cash crop",
    oilseed: "Oilseed",
    pulse: "Pulse",
    vegetable: "Vegetable",
  },
  hi: {
    cereal: "अनाज",
    cash_crop: "नकदी फसल",
    oilseed: "तिलहन",
    pulse: "दलहन",
    vegetable: "सब्ज़ी",
  },
};

const copy = {
  en: {
    categoryAll: "All categories",
    categoryLabel: "Filter by category",
    searchLabel: "Search crops",
    searchPlaceholder: "Search by crop name…",
    listHeading: "Crops",
    listCount: (n: number) => `${n} crop${n === 1 ? "" : "s"}`,
    emptyTitle: "No crops match these filters",
    emptyBody: "Try a different category or clear your search to see every crop.",
    clearFilters: "Clear filters",
    rootDepth: "Root depth",
    seasonLength: "Season length",
    metricToggleLabel: "Chart metric",
    metres: "m",
    days: "days",
    detailCategory: "Category",
    detailRootDepth: "Typical root depth",
    detailSeason: "Typical season length",
    grownIn: "Grown as a primary crop in",
    districtCount: (n: number) => `${n} district${n === 1 ? "" : "s"}`,
    noDistricts: "None of the sample districts list this as a primary crop.",
    chartHeading: "Comparing filtered crops",
  },
  hi: {
    categoryAll: "सभी श्रेणियां",
    categoryLabel: "श्रेणी के अनुसार फ़िल्टर करें",
    searchLabel: "फसल खोजें",
    searchPlaceholder: "फसल का नाम खोजें…",
    listHeading: "फसलें",
    listCount: (n: number) => `${n} फसल${n === 1 ? "" : "ें"}`,
    emptyTitle: "इन फ़िल्टर से कोई फसल नहीं मिली",
    emptyBody: "कोई अलग श्रेणी चुनें या सभी फसलें देखने के लिए खोज मिटाएं।",
    clearFilters: "फ़िल्टर साफ़ करें",
    rootDepth: "जड़ की गहराई",
    seasonLength: "फसल अवधि",
    metricToggleLabel: "चार्ट के लिए मेट्रिक",
    metres: "मीटर",
    days: "दिन",
    detailCategory: "श्रेणी",
    detailRootDepth: "सामान्य जड़ की गहराई",
    detailSeason: "सामान्य फसल अवधि",
    grownIn: "इन जिलों में मुख्य फसल के रूप में उगाई जाती है",
    districtCount: (n: number) => (n === 1 ? `${n} जिला` : `${n} जिले`),
    noDistricts: "नमूना डेटासेट के किसी भी जिले में यह मुख्य फसल के रूप में सूचीबद्ध नहीं है।",
    chartHeading: "फ़िल्टर की गई फसलों की तुलना",
  },
} as const;

const CATEGORY_ORDER: Category[] = ["cereal", "cash_crop", "oilseed", "pulse", "vegetable"];
const CROP_BAR_COLOR = "#1f3a2c";

export function CropsExplorer({
  crops,
  districts,
  selectedCropId,
  onSelectCrop,
  onJumpToDistrict,
}: {
  crops: CropOut[];
  districts: DistrictOut[];
  selectedCropId: string | null;
  onSelectCrop: (cropId: string) => void;
  onJumpToDistrict: (districtId: string) => void;
}) {
  const { locale, t } = useLanguage();
  const c = copy[locale];
  const categoryLabels = CATEGORY_LABELS[locale];

  const [category, setCategory] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");
  const [metric, setMetric] = useState<Metric>("root_depth_m");

  const filteredCrops = useMemo(() => {
    const query = search.trim().toLowerCase();
    return crops.filter((crop) => {
      const matchesCategory = category === "all" || crop.category === category;
      const matchesSearch = query.length === 0 || crop.name.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [crops, category, search]);

  const selectedCrop = useMemo(
    () => crops.find((crop) => crop.crop_id === selectedCropId) ?? null,
    [crops, selectedCropId]
  );

  const districtsGrowingSelected = useMemo(() => {
    if (!selectedCrop) return [];
    return districts.filter((district) => district.primary_crops.includes(selectedCrop.crop_id));
  }, [districts, selectedCrop]);

  const chartData: MetricBarDatum[] = useMemo(
    () =>
      filteredCrops.map((crop) => ({
        id: crop.crop_id,
        label: crop.name,
        value: metric === "root_depth_m" ? crop.root_depth_m : crop.typical_season_days,
        color: CROP_BAR_COLOR,
      })),
    [filteredCrops, metric]
  );

  const clearFilters = () => {
    setCategory("all");
    setSearch("");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <label htmlFor="crop-search" className="mb-1.5 block text-sm font-medium text-ink">
              {c.searchLabel}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="crop-search"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={c.searchPlaceholder}
                className="w-full rounded border border-earth-light bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus-visible:outline-forest"
              />
            </div>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium text-ink">{c.categoryLabel}</legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={category === "all"}
              onClick={() => setCategory("all")}
              className={`rounded border px-3 py-1.5 text-sm font-medium transition-colors ${
                category === "all"
                  ? "border-forest bg-forest text-ivory"
                  : "border-earth-light bg-surface text-ink hover:bg-sage-light"
              }`}
            >
              {c.categoryAll}
            </button>
            {CATEGORY_ORDER.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
                className={`rounded border px-3 py-1.5 text-sm font-medium transition-colors ${
                  category === value
                    ? "border-forest bg-forest text-ivory"
                    : "border-earth-light bg-surface text-ink hover:bg-sage-light"
                }`}
              >
                {categoryLabels[value]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ink">{c.listHeading}</h3>
          <span className="text-sm text-muted">{c.listCount(filteredCrops.length)}</span>
        </div>

        {filteredCrops.length === 0 ? (
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
            {filteredCrops.map((crop) => (
              <li key={crop.crop_id} className="border-b border-earth-light last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelectCrop(crop.crop_id)}
                  aria-current={crop.crop_id === selectedCropId}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                    crop.crop_id === selectedCropId ? "bg-sage-light" : "hover:bg-ivory"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Sprout className="h-4 w-4 shrink-0 text-forest" />
                    <span className="font-medium text-ink">{crop.name}</span>
                  </span>
                  <Badge tone="neutral">{categoryLabels[crop.category]}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {selectedCrop ? (
          <Card className="bg-surface">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl font-semibold text-ink">{selectedCrop.name}</h3>
                <p className="mt-1 text-sm text-muted">{c.detailCategory}</p>
              </div>
              <Badge tone="gold">{categoryLabels[selectedCrop.category]}</Badge>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-muted">{c.detailRootDepth}</dt>
                <dd className="font-display text-2xl font-semibold text-forest">
                  {selectedCrop.root_depth_m} {c.metres}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{c.detailSeason}</dt>
                <dd className="font-display text-2xl font-semibold text-forest">
                  {selectedCrop.typical_season_days} {c.days}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Water Demand</dt>
                <dd className="font-display text-xl font-semibold text-forest">
                  {selectedCrop.typical_water_need_mm}
                </dd>
              </div>
            </dl>
            <div className="mt-3 rounded border border-earth-light/60 bg-sand/30 px-3 py-1.5 text-xs text-muted">
              <span className="font-medium text-ink">Agronomic Standard:</span> {selectedCrop.fao_source}
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-ink">
                {c.grownIn} · {c.districtCount(districtsGrowingSelected.length)}
              </p>
              {districtsGrowingSelected.length === 0 ? (
                <p className="mt-2 text-sm text-muted">{c.noDistricts}</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {districtsGrowingSelected.map((district) => (
                    <button
                      key={district.district_id}
                      type="button"
                      onClick={() => onJumpToDistrict(district.district_id)}
                      className="inline-flex items-center gap-1.5 rounded border border-earth-light bg-ivory px-3 py-1.5 text-sm text-ink transition-colors hover:border-forest hover:bg-sage-light"
                    >
                      <MapPin className="h-3.5 w-3.5 text-forest" />
                      {district.name}
                      <span className="text-muted">· {district.state}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ) : null}

        <Card className="bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-ink">{c.chartHeading}</h3>
            <div
              role="group"
              aria-label={c.metricToggleLabel}
              className="inline-flex rounded border border-earth-light bg-ivory p-1"
            >
              <button
                type="button"
                aria-pressed={metric === "root_depth_m"}
                onClick={() => setMetric("root_depth_m")}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  metric === "root_depth_m" ? "bg-forest text-ivory" : "text-ink hover:bg-sage-light"
                }`}
              >
                {c.rootDepth}
              </button>
              <button
                type="button"
                aria-pressed={metric === "typical_season_days"}
                onClick={() => setMetric("typical_season_days")}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  metric === "typical_season_days"
                    ? "bg-forest text-ivory"
                    : "text-ink hover:bg-sage-light"
                }`}
              >
                {c.seasonLength}
              </button>
            </div>
          </div>
          {chartData.length === 0 ? (
            <p className="mt-6 text-sm text-muted">{c.emptyBody}</p>
          ) : (
            <div className="mt-4">
              <MetricBarChart
                data={chartData}
                valueSuffix={metric === "root_depth_m" ? c.metres : c.days}
                ariaLabel={`${c.chartHeading}: ${metric === "root_depth_m" ? c.rootDepth : c.seasonLength}`}
              />
            </div>
          )}
          <p className="mt-3 text-xs text-muted">{t("common.sampleDataShort")}</p>
        </Card>
      </div>
    </div>
  );
}
