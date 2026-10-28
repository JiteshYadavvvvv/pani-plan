"use client";

import { useCallback, useEffect, useState } from "react";
import { PlusCircle, Sprout } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Reveal } from "@/lib/motion/Reveal";
import { Section } from "@/components/ui/Section";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Button } from "@/components/ui/Button";
import { classifyApiError, fetchAdvisory, fetchCrops, fetchDistricts } from "@/lib/api/client";
import { apiErrorMessageKey } from "@/lib/api/errorMessage";
import type { AdvisoryRequest, CropOut, DistrictOut } from "@/lib/api/schemas";
import { FieldForm, type FieldFormValues } from "./_components/FieldForm";
import { FieldCard, type DashboardField, type FieldAdvisoryState } from "./_components/FieldCard";

const STORAGE_KEY = "paaniplan-fields";
const GROWTH_STAGES = ["initial", "development", "mid_season", "late_season"] as const;
const IRRIGATION_METHODS = ["drip", "sprinkler", "flood"] as const;

const copy = {
  en: {
    heroEyebrow: "My fields",
    heroTitle: "Your saved fields, computed live",
    heroSubtitle:
      "Save the fields you manage and PaaniPlan recomputes a real irrigation recommendation for each one, using the same FAO-56 formulas as the Advisory calculator — right in your browser, no account needed.",
    dataCaption:
      "Each card below is computed fresh from your saved parameters through the real backend formulas. This is not a saved history or a live telemetry feed.",
    loadError: "Could not load districts and crops.",
    savedFieldsHeading: "Saved fields",
    emptyTitle: "No fields saved yet",
    emptyBody: "Add your first field using the form below to see a live, formula-based irrigation recommendation for it.",
    emptyCta: "Add a field",
    cardErrorMessage: "Could not calculate this field. Please try again.",
    removeLabel: (label: string) => `Remove ${label}`,
    areaCaption: (hectares: string) => `${hectares} ha`,
    addFormHeading: "Add a field",
    fieldLabelLabel: "Field name",
    fieldLabelPlaceholder: "e.g. North plot",
    districtLabel: "District",
    districtPlaceholder: "Select a district",
    cropLabel: "Crop",
    cropPlaceholder: "Select a crop",
    recommendedSuffix: "recommended here",
    growthStageLabel: "Growth stage",
    irrigationMethodLabel: "Irrigation method",
    areaLabel: "Field area (hectares)",
    addButton: "Add field",
    adding: "Adding…",
    requiredError: "Please make a selection.",
    labelRequiredError: "Give this field a short name.",
    areaRangeError: "Enter an area between 0 and 10,000 hectares.",
    growthStage: {
      initial: "Initial",
      development: "Development",
      mid_season: "Mid-season",
      late_season: "Late-season",
    },
    irrigationMethod: {
      drip: "Drip",
      sprinkler: "Sprinkler",
      flood: "Flood",
    },
    stressLabel: {
      low: "Low stress",
      moderate: "Moderate stress",
      high: "High stress",
      severe: "Severe stress",
    },
    headline: (grossMm: string, litres: string, days: number) =>
      `Apply ~${grossMm} mm (~${litres} litres) every ${days} ${days === 1 ? "day" : "days"}`,
    reasoningNote:
      "This combines the crop's current water demand with expected rainfall, soil water-holding capacity and the chosen irrigation method's efficiency.",
    breakdownHeading: "Weather & calculation details",
    etoLabel: "Reference evapotranspiration (ETo)",
    kcLabel: "Crop coefficient (Kc)",
    etcLabel: "Crop water demand (ETc)",
    effectiveRainfallLabel: "Effective rainfall",
    mmPerDay: "mm/day",
    sampleClimateNote: "Typical seasonal climate for this district was used, not a live weather reading.",
    regionalStressLabel: (index: number) => `District baseline: ${index}/100 (sample index)`,
  },
  hi: {
    heroEyebrow: "मेरे खेत",
    heroTitle: "आपके सहेजे गए खेत, लाइव गणना के साथ",
    heroSubtitle:
      "अपने खेत सहेजें और PaaniPlan हर एक के लिए वही FAO-56 फॉर्मूलों से एक वास्तविक सिंचाई सिफारिश की गणना करता है, जैसा एडवाइजरी कैलकुलेटर में होता है — आपके ब्राउज़र में ही, किसी खाते की जरूरत नहीं।",
    dataCaption:
      "नीचे हर कार्ड आपके सहेजे गए मापदंडों से वास्तविक बैकएंड फॉर्मूलों के माध्यम से ताज़ा गणना किया जाता है। यह कोई सहेजा गया इतिहास या लाइव टेलीमेट्री फ़ीड नहीं है।",
    loadError: "जिले और फसलें लोड नहीं हो सकीं।",
    savedFieldsHeading: "सहेजे गए खेत",
    emptyTitle: "अभी तक कोई खेत सहेजा नहीं गया",
    emptyBody: "नीचे दिए फॉर्म से अपना पहला खेत जोड़ें और उसके लिए एक लाइव, फॉर्मूला-आधारित सिंचाई सिफारिश देखें।",
    emptyCta: "खेत जोड़ें",
    cardErrorMessage: "इस खेत की गणना नहीं हो सकी। कृपया फिर से प्रयास करें।",
    removeLabel: (label: string) => `${label} हटाएं`,
    areaCaption: (hectares: string) => `${hectares} हेक्टेयर`,
    addFormHeading: "खेत जोड़ें",
    fieldLabelLabel: "खेत का नाम",
    fieldLabelPlaceholder: "जैसे, उत्तरी खेत",
    districtLabel: "जिला",
    districtPlaceholder: "जिला चुनें",
    cropLabel: "फसल",
    cropPlaceholder: "फसल चुनें",
    recommendedSuffix: "यहाँ अनुशंसित",
    growthStageLabel: "फसल की अवस्था",
    irrigationMethodLabel: "सिंचाई विधि",
    areaLabel: "खेत का क्षेत्रफल (हेक्टेयर)",
    addButton: "खेत जोड़ें",
    adding: "जोड़ा जा रहा है…",
    requiredError: "कृपया एक विकल्प चुनें।",
    labelRequiredError: "इस खेत के लिए एक छोटा नाम दें।",
    areaRangeError: "0 से 10,000 हेक्टेयर के बीच क्षेत्रफल दर्ज करें।",
    growthStage: {
      initial: "प्रारंभिक",
      development: "विकास",
      mid_season: "मध्य-मौसम",
      late_season: "अंतिम-मौसम",
    },
    irrigationMethod: {
      drip: "ड्रिप",
      sprinkler: "स्प्रिंकलर",
      flood: "फ्लड/बाढ़",
    },
    stressLabel: {
      low: "कम तनाव",
      moderate: "मध्यम तनाव",
      high: "अधिक तनाव",
      severe: "गंभीर तनाव",
    },
    headline: (grossMm: string, litres: string, days: number) =>
      `हर ${days} दिन में ~${grossMm} मिमी (~${litres} लीटर) पानी दें`,
    reasoningNote:
      "यह फसल की वर्तमान जल आवश्यकता को अपेक्षित वर्षा, मिट्टी की जल-धारण क्षमता और चुनी गई सिंचाई विधि की दक्षता के साथ जोड़ता है।",
    breakdownHeading: "मौसम और गणना विवरण",
    etoLabel: "संदर्भ वाष्पोत्सर्जन (ETo)",
    kcLabel: "फसल गुणांक (Kc)",
    etcLabel: "फसल जल आवश्यकता (ETc)",
    effectiveRainfallLabel: "प्रभावी वर्षा",
    mmPerDay: "मिमी/दिन",
    sampleClimateNote: "इस जिले के लिए सामान्य मौसमी जलवायु का उपयोग किया गया, लाइव मौसम रीडिंग नहीं।",
    regionalStressLabel: (index: number) => `जिला आधार: ${index}/100 (नमूना सूचकांक)`,
  },
} as const;

function isDashboardField(value: unknown): value is DashboardField {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.label === "string" &&
    candidate.label.length > 0 &&
    typeof candidate.districtId === "string" &&
    candidate.districtId.length > 0 &&
    typeof candidate.cropId === "string" &&
    candidate.cropId.length > 0 &&
    typeof candidate.growthStage === "string" &&
    GROWTH_STAGES.includes(candidate.growthStage as (typeof GROWTH_STAGES)[number]) &&
    typeof candidate.irrigationMethod === "string" &&
    IRRIGATION_METHODS.includes(candidate.irrigationMethod as (typeof IRRIGATION_METHODS)[number]) &&
    typeof candidate.areaHectares === "number" &&
    Number.isFinite(candidate.areaHectares) &&
    candidate.areaHectares > 0 &&
    candidate.areaHectares <= 10000
  );
}

function readFieldsFromStorage(): DashboardField[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDashboardField);
  } catch {
    return [];
  }
}

function writeFieldsToStorage(fields: DashboardField[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
  } catch {}
}

function createFieldId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `field-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

type ReferenceDataState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; districts: DistrictOut[]; crops: CropOut[] };

export default function DashboardPage() {
  const { locale, t } = useLanguage();
  const c = copy[locale];

  const [referenceData, setReferenceData] = useState<ReferenceDataState>({ status: "loading" });
  const [fields, setFields] = useState<DashboardField[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [adding, setAdding] = useState(false);
  const [advisoryMap, setAdvisoryMap] = useState<Record<string, FieldAdvisoryState>>({});

  const loadReferenceData = useCallback(() => {
    setReferenceData({ status: "loading" });
    Promise.all([fetchDistricts(), fetchCrops()])
      .then(([districts, crops]) => {
        setReferenceData({ status: "ready", districts, crops });
      })
      .catch((error) => {
        setReferenceData({ status: "error", message: t(apiErrorMessageKey(classifyApiError(error))) });
      });
  }, [t]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  const fetchForField = useCallback((field: DashboardField) => {
    setAdvisoryMap((prev) => ({ ...prev, [field.id]: "loading" }));
    const payload: AdvisoryRequest = {
      district_id: field.districtId,
      crop_id: field.cropId,
      growth_stage: field.growthStage,
      irrigation_method: field.irrigationMethod,
      area_hectares: field.areaHectares,
    };
    fetchAdvisory(payload)
      .then((response) => {
        setAdvisoryMap((prev) => ({ ...prev, [field.id]: response }));
      })
      .catch(() => {
        setAdvisoryMap((prev) => ({ ...prev, [field.id]: "error" }));
      });
  }, []);

  useEffect(() => {
    const loaded = readFieldsFromStorage();
    setFields(loaded);
    setHydrated(true);
    loaded.forEach((field) => {
      fetchForField(field);
    });
  }, [fetchForField]);

  useEffect(() => {
    if (!hydrated) return;
    writeFieldsToStorage(fields);
  }, [fields, hydrated]);

  const handleAddField = useCallback(
    (values: FieldFormValues) => {
      setAdding(true);
      const newField: DashboardField = {
        id: createFieldId(),
        label: values.label,
        districtId: values.district_id,
        cropId: values.crop_id,
        growthStage: values.growth_stage,
        irrigationMethod: values.irrigation_method,
        areaHectares: values.area_hectares,
      };
      setFields((prev) => [...prev, newField]);
      fetchForField(newField);
      setAdding(false);
    },
    [fetchForField]
  );

  const handleRemoveField = useCallback((id: string) => {
    setFields((prev) => prev.filter((field) => field.id !== id));
    setAdvisoryMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const getDistrictName = useCallback(
    (districtId: string) => {
      if (referenceData.status !== "ready") return districtId;
      const district = referenceData.districts.find((candidate) => candidate.district_id === districtId);
      return district ? `${district.name}, ${district.state}` : districtId;
    },
    [referenceData]
  );

  const getCropName = useCallback(
    (cropId: string) => {
      if (referenceData.status !== "ready") return cropId;
      const crop = referenceData.crops.find((candidate) => candidate.crop_id === cropId);
      return crop ? crop.name : cropId;
    },
    [referenceData]
  );

  const getBaselineStressIndex = useCallback(
    (districtId: string) => {
      if (referenceData.status !== "ready") return undefined;
      return referenceData.districts.find((candidate) => candidate.district_id === districtId)
        ?.baseline_water_stress_index;
    },
    [referenceData]
  );

  const scrollToAddForm = useCallback(() => {
    document.getElementById("add-field-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <>
      <Section tone="forest" className="pb-16 pt-16">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold-light">{c.heroEyebrow}</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            {c.heroTitle}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-sage-light">{c.heroSubtitle}</p>
        </Reveal>
      </Section>

      <Section tone="ivory">
        <Reveal>
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-semibold text-ink">{c.savedFieldsHeading}</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted">{c.dataCaption}</p>
          </div>
        </Reveal>

        <div className="mt-8">
          {!hydrated ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <Spinner className="h-7 w-7" />
            </div>
          ) : fields.length === 0 ? (
            <Reveal>
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-earth-light bg-surface p-10 text-center">
                <Sprout className="h-8 w-8 text-sage" strokeWidth={1.5} />
                <p className="font-display text-lg font-semibold text-ink">{c.emptyTitle}</p>
                <p className="max-w-sm text-sm leading-relaxed text-muted">{c.emptyBody}</p>
                <Button variant="secondary" size="sm" onClick={scrollToAddForm} className="mt-2">
                  <PlusCircle className="h-4 w-4" />
                  {c.emptyCta}
                </Button>
              </div>
            </Reveal>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((field) => (
                <Reveal key={field.id}>
                  <FieldCard
                    field={field}
                    districtName={getDistrictName(field.districtId)}
                    cropName={getCropName(field.cropId)}
                    baselineStressIndex={getBaselineStressIndex(field.districtId)}
                    state={advisoryMap[field.id] ?? "loading"}
                    onRemove={() => handleRemoveField(field.id)}
                    onRetry={() => fetchForField(field)}
                    locale={locale}
                    copy={c}
                  />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </Section>

      <Section tone="sage" id="add-field-form">
        {referenceData.status === "loading" ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Spinner className="h-7 w-7" />
          </div>
        ) : referenceData.status === "error" ? (
          <div className="mx-auto max-w-md">
            <ErrorNotice message={referenceData.message} onRetry={loadReferenceData} />
          </div>
        ) : (
          <Reveal>
            <div className="mx-auto max-w-xl rounded-lg border border-earth-light bg-ivory p-6 sm:p-8">
              <FieldForm
                districts={referenceData.districts}
                crops={referenceData.crops}
                adding={adding}
                onAdd={handleAddField}
                copy={c}
              />
            </div>
          </Reveal>
        )}
      </Section>
    </>
  );
}
