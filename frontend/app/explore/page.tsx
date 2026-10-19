"use client";

import { useCallback, useEffect, useState } from "react";
import { Sprout, MapPinned } from "lucide-react";
import { ApiError, fetchCrops, fetchDistricts } from "@/lib/api/client";
import type { CropOut, DistrictOut } from "@/lib/api/schemas";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Section } from "@/components/ui/Section";
import { SampleDataBadge } from "@/components/ui/SampleDataBadge";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Reveal } from "@/lib/motion/Reveal";
import { CropsExplorer } from "./_components/CropsExplorer";
import { DistrictsExplorer } from "./_components/DistrictsExplorer";

type Tab = "crops" | "districts";

const copy = {
  en: {
    eyebrow: "Crop & district data",
    title: "Explore crops and districts",
    subtitle:
      "Browse the sample crop catalogue and district dataset side by side, filter by category or state, and cross-check which districts grow which crops.",
    tabsAriaLabel: "Explore view",
    cropsTab: "Crops",
    districtsTab: "Districts",
    loading: "Loading crops and districts…",
    errorConfig: "The backend address isn't configured for this deployment. Please contact the site administrator.",
    errorNetwork: "Could not reach the server. Check your connection and try again.",
    errorHttp: "The server returned an error. Please try again in a moment.",
    errorValidation: "The server sent back data in an unexpected format. Please try again.",
  },
  hi: {
    eyebrow: "फसल और जिला डेटा",
    title: "फसलों और जिलों का अन्वेषण करें",
    subtitle:
      "नमूना फसल सूची और जिला डेटासेट को साथ-साथ देखें, श्रेणी या राज्य के अनुसार फ़िल्टर करें, और जानें कि कौन-सा जिला कौन-सी फसल उगाता है।",
    tabsAriaLabel: "अन्वेषण दृश्य",
    cropsTab: "फसलें",
    districtsTab: "जिले",
    loading: "फसलें और जिले लोड हो रहे हैं…",
    errorConfig: "इस डिप्लॉयमेंट के लिए बैकएंड पता कॉन्फ़िगर नहीं किया गया है। कृपया साइट व्यवस्थापक से संपर्क करें।",
    errorNetwork: "सर्वर से संपर्क नहीं हो सका। अपना कनेक्शन जांचें और फिर से प्रयास करें।",
    errorHttp: "सर्वर से त्रुटि मिली। कृपया कुछ देर बाद फिर से प्रयास करें।",
    errorValidation: "सर्वर से अप्रत्याशित प्रारूप में डेटा मिला। कृपया फिर से प्रयास करें।",
  },
} as const;

export default function ExplorePage() {
  const { locale } = useLanguage();
  const c = copy[locale];

  const [crops, setCrops] = useState<CropOut[] | null>(null);
  const [districts, setDistricts] = useState<DistrictOut[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("crops");
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [cropsResult, districtsResult] = await Promise.all([fetchCrops(), fetchDistricts()]);
      setCrops(cropsResult);
      setDistricts(districtsResult);
      setSelectedCropId((previous) => previous ?? cropsResult[0]?.crop_id ?? null);
      setSelectedDistrictId((previous) => previous ?? districtsResult[0]?.district_id ?? null);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.kind === "config") setErrorMessage(c.errorConfig);
        else if (error.kind === "network" || error.kind === "timeout") setErrorMessage(c.errorNetwork);
        else if (error.kind === "validation") setErrorMessage(c.errorValidation);
        else setErrorMessage(c.errorHttp);
      } else {
        setErrorMessage(c.errorHttp);
      }
    } finally {
      setLoading(false);
    }
  }, [c]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleJumpToDistrict = (districtId: string) => {
    setSelectedDistrictId(districtId);
    setTab("districts");
  };

  const handleJumpToCrop = (cropId: string) => {
    setSelectedCropId(cropId);
    setTab("crops");
  };

  return (
    <>
      <Section tone="forest" className="pb-14 pt-16">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold-light">{c.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            {c.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-sage-light">{c.subtitle}</p>
          <div className="mt-6">
            <SampleDataBadge />
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
        ) : crops && districts ? (
          <>
            <div
              role="tablist"
              aria-label={c.tabsAriaLabel}
              className="mb-8 inline-flex gap-2 rounded border border-earth-light bg-surface p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === "crops"}
                onClick={() => setTab("crops")}
                className={`inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors ${
                  tab === "crops" ? "bg-forest text-ivory" : "text-ink hover:bg-sage-light"
                }`}
              >
                <Sprout className="h-4 w-4" />
                {c.cropsTab}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "districts"}
                onClick={() => setTab("districts")}
                className={`inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors ${
                  tab === "districts" ? "bg-forest text-ivory" : "text-ink hover:bg-sage-light"
                }`}
              >
                <MapPinned className="h-4 w-4" />
                {c.districtsTab}
              </button>
            </div>

            {tab === "crops" ? (
              <CropsExplorer
                crops={crops}
                districts={districts}
                selectedCropId={selectedCropId}
                onSelectCrop={setSelectedCropId}
                onJumpToDistrict={handleJumpToDistrict}
              />
            ) : (
              <DistrictsExplorer
                districts={districts}
                crops={crops}
                selectedDistrictId={selectedDistrictId}
                onSelectDistrict={setSelectedDistrictId}
                onJumpToCrop={handleJumpToCrop}
              />
            )}
          </>
        ) : null}
      </Section>
    </>
  );
}
