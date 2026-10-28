"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Reveal } from "@/lib/motion/Reveal";
import { Section } from "@/components/ui/Section";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { classifyApiError, fetchAdvisory, fetchCrops, fetchDistricts } from "@/lib/api/client";
import { apiErrorMessageKey } from "@/lib/api/errorMessage";
import type { AdvisoryRequest, AdvisoryResponse, CropOut, DistrictOut } from "@/lib/api/schemas";
import { AdvisoryForm } from "./_components/AdvisoryForm";
import { ResultPanel, type ResultStatus } from "./_components/ResultPanel";
import { WeatherWidget } from "./_components/WeatherWidget";

const copy = {
  en: {
    heroEyebrow: "Irrigation calculator",
    heroTitle: "Know exactly how much water to apply, and when",
    heroSubtitle:
      "Pick your district, crop and growth stage, and PaaniPlan runs the real FAO-56 crop-water-balance formulas to give you a clear, one-line irrigation recommendation in seconds.",
    formHeading: "Your field",
    districtLabel: "District",
    districtPlaceholder: "Select a district",
    cropLabel: "Crop",
    cropPlaceholder: "Select a crop",
    recommendedSuffix: "recommended here",
    growthStageLabel: "Growth stage",
    irrigationMethodLabel: "Irrigation method",
    areaLabel: "Field area (hectares)",
    advancedToggle: "Advanced: override climate & soil values",
    advancedNote:
      "Leave these blank to use typical seasonal climate values and your district's dominant soil type. These are sample figures for demonstration, not live weather readings.",
    tmaxLabel: "Max temperature (°C)",
    tminLabel: "Min temperature (°C)",
    rainfallLabel: "Rainfall in the last 7 days (mm)",
    soilLabel: "Soil type",
    soilPlaceholder: "Use district default",
    submit: "Calculate irrigation advice",
    submitting: "Calculating…",
    requiredError: "Please make a selection.",
    areaRangeError: "Enter an area between 0 and 10,000 hectares.",
    climateRangeError: "Enter a realistic value, or leave this blank.",
    resultEmptyTitle: "Your recommendation will appear here",
    resultEmptyBody:
      "Fill in the form and press Calculate to get a real, formula-based irrigation recommendation for your field.",
    resultHeading: "Your irrigation recommendation",
    reasoningNote:
      "This combines your crop's current water demand with expected rainfall, soil water-holding capacity and your irrigation method's efficiency.",
    breakdownHeading: "How we got there",
    etoLabel: "Reference evapotranspiration (ETo)",
    kcLabel: "Crop coefficient (Kc)",
    etcLabel: "Crop water demand (ETc)",
    effectiveRainfallLabel: "Effective rainfall",
    sampleClimateNote: "Published IMD Climatological Normals for this district were used because no live weather override was provided.",
    mmPerDay: "mm/day",
    loadError: "Could not load districts and crops.",
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
    soilType: {
      sandy: "Sandy",
      sandy_loam: "Sandy Loam",
      loam: "Loam",
      clay_loam: "Clay Loam",
      clay: "Clay",
    },
    stressLabel: {
      low: "Low stress",
      moderate: "Moderate stress",
      high: "High stress",
      severe: "Severe stress",
    },
    headline: (grossMm: string, litres: string, days: number) =>
      `Apply ~${grossMm} mm (~${litres} litres) every ${days} ${days === 1 ? "day" : "days"}`,
  },
  hi: {
    heroEyebrow: "सिंचाई कैलकुलेटर",
    heroTitle: "जानें कितना पानी देना है, और कब देना है",
    heroSubtitle:
      "अपना जिला, फसल और फसल की अवस्था चुनें — PaaniPlan वास्तविक FAO-56 फसल-जल-संतुलन फॉर्मूलों से सेकंडों में एक स्पष्ट, एक-पंक्ति सिंचाई सिफारिश देता है।",
    formHeading: "आपके खेत की जानकारी",
    districtLabel: "जिला",
    districtPlaceholder: "जिला चुनें",
    cropLabel: "फसल",
    cropPlaceholder: "फसल चुनें",
    recommendedSuffix: "यहाँ अनुशंसित",
    growthStageLabel: "फसल की अवस्था",
    irrigationMethodLabel: "सिंचाई विधि",
    areaLabel: "खेत का क्षेत्रफल (हेक्टेयर)",
    advancedToggle: "उन्नत: जलवायु और मिट्टी के मान बदलें",
    advancedNote:
      "इन्हें खाली छोड़ने पर आपके जिले के सामान्य मौसमी जलवायु मान और प्रमुख मिट्टी प्रकार उपयोग होंगे। ये प्रदर्शन हेतु नमूना आंकड़े हैं, लाइव मौसम रीडिंग नहीं।",
    tmaxLabel: "अधिकतम तापमान (°C)",
    tminLabel: "न्यूनतम तापमान (°C)",
    rainfallLabel: "पिछले 7 दिनों की वर्षा (मिमी)",
    soilLabel: "मिट्टी का प्रकार",
    soilPlaceholder: "जिले का डिफ़ॉल्ट उपयोग करें",
    submit: "सिंचाई सलाह की गणना करें",
    submitting: "गणना हो रही है…",
    requiredError: "कृपया एक विकल्प चुनें।",
    areaRangeError: "0 से 10,000 हेक्टेयर के बीच क्षेत्रफल दर्ज करें।",
    climateRangeError: "एक वास्तविक मान दर्ज करें, या इसे खाली छोड़ दें।",
    resultEmptyTitle: "आपकी सिफारिश यहाँ दिखाई देगी",
    resultEmptyBody:
      "फॉर्म भरें और 'गणना करें' दबाएं ताकि आपके खेत के लिए वास्तविक, फॉर्मूला-आधारित सिंचाई सिफारिश मिल सके।",
    resultHeading: "आपकी सिंचाई सिफारिश",
    reasoningNote:
      "यह आपकी फसल की वर्तमान जल आवश्यकता को अपेक्षित वर्षा, मिट्टी की जल-धारण क्षमता और आपकी सिंचाई विधि की दक्षता के साथ जोड़ता है।",
    breakdownHeading: "यह गणना कैसे हुई",
    etoLabel: "संदर्भ वाष्पोत्सर्जन (ETo)",
    kcLabel: "फसल गुणांक (Kc)",
    etcLabel: "फसल जल आवश्यकता (ETc)",
    effectiveRainfallLabel: "प्रभावी वर्षा",
    sampleClimateNote: "कोई लाइव मौसम ओवरराइड न दिए जाने पर इस जिले के लिए प्रकाशित IMD जलवायु मानक मान उपयोग किए गए।",
    mmPerDay: "मिमी/दिन",
    loadError: "जिले और फसलें लोड नहीं हो सकीं।",
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
    soilType: {
      sandy: "रेतीली",
      sandy_loam: "रेतीली दोमट",
      loam: "दोमट",
      clay_loam: "चिकनी दोमट",
      clay: "चिकनी मिट्टी",
    },
    stressLabel: {
      low: "कम तनाव",
      moderate: "मध्यम तनाव",
      high: "अधिक तनाव",
      severe: "गंभीर तनाव",
    },
    headline: (grossMm: string, litres: string, days: number) =>
      `हर ${days} दिन में ~${grossMm} मिमी (~${litres} लीटर) पानी दें`,
  },
} as const;

type ReferenceDataState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; districts: DistrictOut[]; crops: CropOut[] };

export default function AdvisoryPage() {
  const { locale, t } = useLanguage();
  const c = copy[locale];

  const [referenceData, setReferenceData] = useState<ReferenceDataState>({ status: "loading" });
  const [resultStatus, setResultStatus] = useState<ResultStatus>("idle");
  const [result, setResult] = useState<AdvisoryResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [lastValues, setLastValues] = useState<AdvisoryRequest | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | undefined>(undefined);
  const [weatherFill, setWeatherFill] = useState<{ tmax: number; tmin: number; rain: number } | null>(null);

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

  const runAdvisory = useCallback(
    (values: AdvisoryRequest) => {
      setLastValues(values);
      setSubmitting(true);
      setResultStatus("loading");
      setSubmitError(undefined);
      fetchAdvisory(values)
        .then((response) => {
          setResult(response);
          setResultStatus("success");
        })
        .catch((error: unknown) => {
          setSubmitError(t(apiErrorMessageKey(classifyApiError(error))));
          setResultStatus("error");
        })
        .finally(() => {
          setSubmitting(false);
        });
    },
    [t]
  );

  const handleRetrySubmit = useCallback(() => {
    if (lastValues) {
      runAdvisory(lastValues);
    }
  }, [lastValues, runAdvisory]);

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
        {referenceData.status === "loading" ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : referenceData.status === "error" ? (
          <div className="mx-auto max-w-md">
            <ErrorNotice message={referenceData.message} onRetry={loadReferenceData} />
          </div>
        ) : (
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
              <div className="flex flex-col gap-6">
                <WeatherWidget
                  districtId={selectedDistrictId}
                  onUseLiveWeather={(tmax, tmin, rain) => setWeatherFill({ tmax, tmin, rain })}
                />
                <div className="rounded-lg border border-earth-light bg-surface p-6 sm:p-8">
                  <AdvisoryForm
                    districts={referenceData.districts}
                    crops={referenceData.crops}
                    submitting={submitting}
                    onSubmit={runAdvisory}
                    copy={c}
                    onDistrictChange={setSelectedDistrictId}
                    weatherFill={weatherFill}
                  />
                </div>
              </div>
              <ResultPanel
                status={resultStatus}
                result={result}
                errorMessage={submitError}
                onRetry={handleRetrySubmit}
                locale={locale}
                copy={c}
              />
            </div>
          </Reveal>
        )}
      </Section>
    </>
  );
}
