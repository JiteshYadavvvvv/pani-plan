"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import Image from "next/image";
import {
  Activity,
  BarChart3,
  BookOpen,
  Camera,
  CheckCircle,
  Database,
  Droplets,
  FileText,
  Fish,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  Waves,
  X,
} from "lucide-react";
import gsap from "gsap";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/lib/motion/Reveal";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ApiError,
  evaluateWaterQuality,
  fetchWaterQualityStandards,
  submitFishAnalysis,
} from "@/lib/api/client";
import type {
  FishAnalysisResponse,
  WaterQualityCheckResponse,
  WaterQualityStandard,
} from "@/lib/api/schemas";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const FISHERIES_STORAGE_KEY = "paaniplan-fisheries-observations";

const inputClasses =
  "w-full rounded border border-earth-light bg-ivory px-3.5 py-2.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";
const labelClasses = "text-sm font-medium text-ink";

interface StoredFishObservation {
  id: string;
  createdAt: string;
  speciesName: string;
  pondType: string;
  waterSource: string;
  symptoms: string;
  analysis: FishAnalysisResponse;
}

function fishConditionBadgeTone(
  condition: FishAnalysisResponse["health_condition"]
): "low" | "moderate" | "high" | "severe" | "neutral" | "gold" {
  if (condition === "healthy") return "low";
  if (condition === "suspected_disease") return "high";
  if (condition === "parasitic_infection") return "severe";
  if (condition === "water_stress_signs") return "moderate";
  return "neutral";
}

function fishConditionLabel(condition: FishAnalysisResponse["health_condition"]): string {
  if (condition === "healthy") return "Healthy";
  if (condition === "suspected_disease") return "Suspected Disease";
  if (condition === "parasitic_infection") return "Parasitic Infection";
  if (condition === "water_stress_signs") return "Water Stress Signs";
  return "Inconclusive";
}

function readStoredFishObservations(): StoredFishObservation[] {
  try {
    const raw = window.localStorage.getItem(FISHERIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredFishObservations(records: StoredFishObservation[]): void {
  try {
    window.localStorage.setItem(FISHERIES_STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

export default function FisheriesPage() {
  const [activeTab, setActiveTab] = useState<"species" | "water" | "history" | "analytics">("species");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [suspectedSpecies, setSuspectedSpecies] = useState("");
  const [pondType, setPondType] = useState("Freshwater Earthen Pond");
  const [waterSource, setWaterSource] = useState("Borewell / Ground water");
  const [symptoms, setSymptoms] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<FishAnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [observations, setObservations] = useState<StoredFishObservation[]>([]);

  const [standards, setStandards] = useState<WaterQualityStandard[]>([]);
  const [doInput, setDoInput] = useState<string>("");
  const [tempInput, setTempInput] = useState<string>("");
  const [phInput, setPhInput] = useState<string>("");
  const [ammoniaInput, setAmmoniaInput] = useState<string>("");
  const [alkalinityInput, setAlkalinityInput] = useState<string>("");
  const [evaluatingWater, setEvaluatingWater] = useState(false);
  const [waterEvalResult, setWaterEvalResult] = useState<WaterQualityCheckResponse | null>(null);
  const [waterError, setWaterError] = useState<string | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setObservations(readStoredFishObservations());
    fetchWaterQualityStandards()
      .then((data) => setStandards(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    const element = resultRef.current;
    if (!element || !result) return;
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
  }, [result]);

  const handleFileChange = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      if (file.size > MAX_FILE_BYTES) {
        setErrorMessage("Image must be smaller than 10 MB.");
        return;
      }
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setErrorMessage(null);
      setSaveStatus("idle");
    },
    [imagePreviewUrl]
  );

  const handleRemoveImage = useCallback(() => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setResult(null);
    setErrorMessage(null);
    setSaveStatus("idle");
  }, [imagePreviewUrl]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!imageFile) return;
      setSubmitting(true);
      setErrorMessage(null);
      setResult(null);
      setSaveStatus("idle");

      const fd = new FormData();
      fd.append("image", imageFile);
      if (suspectedSpecies.trim()) fd.append("suspected_species", suspectedSpecies.trim());
      if (pondType.trim()) fd.append("pond_type", pondType.trim());
      if (waterSource.trim()) fd.append("water_source", waterSource.trim());
      if (symptoms.trim()) fd.append("symptoms", symptoms.trim());

      try {
        const data = await submitFishAnalysis(fd);
        setResult(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setErrorMessage(err.serverMessage || "Fisheries analysis service error. Please check server logs.");
        } else {
          setErrorMessage("Failed to connect to backend server. Check connection.");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [imageFile, suspectedSpecies, pondType, waterSource, symptoms]
  );

  const handleSaveObservation = useCallback(() => {
    if (!result) return;
    setSaveStatus("saving");

    const record: StoredFishObservation = {
      id: crypto.randomUUID ? crypto.randomUUID() : `fish-${Date.now()}`,
      createdAt: new Date().toISOString(),
      speciesName: result.species_identified || suspectedSpecies.trim() || "Unspecified Fish",
      pondType,
      waterSource,
      symptoms: symptoms.trim() || "None reported",
      analysis: result,
    };

    setObservations((prev) => {
      const updated = [record, ...prev];
      writeStoredFishObservations(updated);
      return updated;
    });

    setSaveStatus("saved");
  }, [result, suspectedSpecies, pondType, waterSource, symptoms]);

  const handleDeleteRecord = useCallback((id: string) => {
    setObservations((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      writeStoredFishObservations(updated);
      return updated;
    });
  }, []);

  const handleEvaluateWater = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setEvaluatingWater(true);
      setWaterError(null);
      setWaterEvalResult(null);

      const payload = {
        dissolved_oxygen_mg_l: doInput ? parseFloat(doInput) : undefined,
        temperature_c: tempInput ? parseFloat(tempInput) : undefined,
        ph: phInput ? parseFloat(phInput) : undefined,
        ammonia_mg_l: ammoniaInput ? parseFloat(ammoniaInput) : undefined,
        alkalinity_mg_l: alkalinityInput ? parseFloat(alkalinityInput) : undefined,
      };

      try {
        const res = await evaluateWaterQuality(payload);
        setWaterEvalResult(res);
      } catch (err) {
        setWaterError(err instanceof ApiError && err.serverMessage ? err.serverMessage : "Could not evaluate water quality.");
      } finally {
        setEvaluatingWater(false);
      }
    },
    [doInput, tempInput, phInput, ammoniaInput, alkalinityInput]
  );

  const analytics = useMemo(() => {
    const total = observations.length;
    let healthyCount = 0;
    let diseaseCount = 0;
    let stressCount = 0;

    observations.forEach((obs) => {
      const cond = obs.analysis.health_condition;
      if (cond === "healthy") healthyCount++;
      else if (cond === "suspected_disease" || cond === "parasitic_infection") diseaseCount++;
      else if (cond === "water_stress_signs") stressCount++;
    });

    return {
      total,
      healthyCount,
      diseaseCount,
      stressCount,
    };
  }, [observations]);

  return (
    <>
      <Section tone="forest" className="pb-14 pt-16">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold-light">
                Aquaculture Intelligence
              </p>
              <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
                Fisheries &amp; Pond Management
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-sage-light">
                Specialized multimodal fish species identification, symptom analysis, and pond water quality safety
                benchmarks grounded in ICAR-CIFA and FAO fisheries standards.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 border-b border-forest-dark/40 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("species")}
              className={clsx(
                "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "species"
                  ? "bg-ivory text-forest font-semibold"
                  : "text-sage-light hover:bg-forest-dark/40 hover:text-ivory"
              )}
            >
              <Camera className="h-4 w-4" />
              Species &amp; Condition
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("water")}
              className={clsx(
                "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "water"
                  ? "bg-ivory text-forest font-semibold"
                  : "text-sage-light hover:bg-forest-dark/40 hover:text-ivory"
              )}
            >
              <Waves className="h-4 w-4" />
              Water Quality Advisor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={clsx(
                "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "history"
                  ? "bg-ivory text-forest font-semibold"
                  : "text-sage-light hover:bg-forest-dark/40 hover:text-ivory"
              )}
            >
              <BookOpen className="h-4 w-4" />
              Pond Log ({observations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={clsx(
                "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "analytics"
                  ? "bg-ivory text-forest font-semibold"
                  : "text-sage-light hover:bg-forest-dark/40 hover:text-ivory"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Fisheries Analytics
            </button>
          </div>
        </Reveal>
      </Section>

      <Section tone="ivory">
        {activeTab === "species" ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div className="rounded-lg border border-earth-light bg-surface p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-ink">Fish Photograph</h2>
                  <span className="text-xs font-medium text-muted">JPEG, PNG, WebP · max 10MB</span>
                </div>

                <div className="rounded-lg border-2 border-dashed border-earth-light bg-ivory transition-colors hover:border-forest">
                  {imagePreviewUrl && imageFile ? (
                    <div className="flex flex-col gap-3 p-4">
                      <Image
                        src={imagePreviewUrl}
                        alt="Fish preview"
                        width={400}
                        height={220}
                        unoptimized
                        className="max-h-56 w-full rounded object-contain"
                      />
                      <div className="flex items-center justify-between gap-3 border-t border-earth-light/60 pt-2">
                        <span className="truncate text-xs font-medium text-muted">{imageFile.name}</span>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="flex items-center gap-1 rounded border border-earth-light px-2.5 py-1 text-xs font-medium text-ink hover:bg-sage-light"
                        >
                          <X className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center gap-3 p-8 text-center">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => handleFileChange(e.target.files?.[0])}
                      />
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-light text-forest">
                        <Fish className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">
                          Upload fish photograph or{" "}
                          <span className="text-forest underline underline-offset-2">browse files</span>
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Take a clear side-profile photo showing gills, fins, and scales
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 rounded border border-earth-light bg-surface px-3 py-1.5 text-xs font-medium text-muted shadow-sm">
                        <Upload className="h-3.5 w-3.5" />
                        Select photo
                      </div>
                    </label>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClasses}>Suspected species (if known)</label>
                  <input
                    type="text"
                    placeholder="e.g. Rohu (Labeo rohita), Catla, Tilapia, Pangasius"
                    className={inputClasses}
                    value={suspectedSpecies}
                    onChange={(e) => setSuspectedSpecies(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClasses}>Pond / System type</label>
                    <select
                      className={inputClasses}
                      value={pondType}
                      onChange={(e) => setPondType(e.target.value)}
                    >
                      <option value="Freshwater Earthen Pond">Freshwater Earthen Pond</option>
                      <option value="Biofloc System">Biofloc System (BFT)</option>
                      <option value="Recirculating Aquaculture System (RAS)">RAS Indoor Tank</option>
                      <option value="Cage Aquaculture">Reservoir / River Cage</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={labelClasses}>Water source</label>
                    <select
                      className={inputClasses}
                      value={waterSource}
                      onChange={(e) => setWaterSource(e.target.value)}
                    >
                      <option value="Borewell / Ground water">Borewell / Ground water</option>
                      <option value="Canal / River supply">Canal / River supply</option>
                      <option value="Rainfed pond">Rainfed runoff</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClasses}>Observed behavior or marks</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Gasping at surface, eroded tail fin, red patches near operculum, erratic swimming"
                    className={clsx(inputClasses, "resize-y")}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                  />
                </div>

                {errorMessage ? (
                  <div className="rounded border border-stress-severe/30 bg-stress-severe-bg/50 p-3.5 text-xs text-ink">
                    <p className="font-semibold text-stress-severe">Analysis Notice</p>
                    <p className="mt-1">{errorMessage}</p>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  disabled={!imageFile || submitting}
                  className="justify-center"
                >
                  {submitting ? (
                    <>
                      <Spinner className="h-5 w-5" />
                      Evaluating with Gemini Vision…
                    </>
                  ) : (
                    <>
                      <Fish className="h-5 w-5" />
                      Run Fish Health Diagnosis
                    </>
                  )}
                </Button>
              </form>
            </div>

            <div>
              {submitting ? (
                <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 rounded-lg border border-earth-light bg-surface p-8 text-center">
                  <Spinner className="h-8 w-8" />
                  <div>
                    <p className="font-display text-lg font-semibold text-ink">Examining Aquatic Specimen</p>
                    <p className="mt-1 max-w-sm text-sm text-muted">
                      Verifying species morphological features, gill coloration, skin lesions, and environmental signs.
                    </p>
                  </div>
                </div>
              ) : result ? (
                <div
                  ref={resultRef}
                  className="flex flex-col gap-5 rounded-lg border border-earth-light bg-surface p-6 sm:p-8"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-earth-light/60 pb-4">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Aquatic Diagnosis
                      </span>
                      <h2 className="mt-0.5 font-display text-2xl font-semibold text-ink">
                        {result.common_name || result.species_identified || "Specimen Identified"}
                      </h2>
                      {result.scientific_name ? (
                        <p className="italic text-sm text-muted">{result.scientific_name}</p>
                      ) : null}
                    </div>
                    <Badge tone={fishConditionBadgeTone(result.health_condition)}>
                      {fishConditionLabel(result.health_condition)}
                    </Badge>
                  </div>

                  {result.suspected_issue ? (
                    <div className="rounded-lg border border-stress-high-border bg-stress-high-bg/40 p-4">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="mt-0.5 h-5 w-5 flex-none text-stress-high" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-stress-high">
                            Suspected Health Issue
                          </p>
                          <p className="font-display text-lg font-semibold text-ink">
                            {result.suspected_issue}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {result.visible_characteristics && result.visible_characteristics.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Visual Anatomical Characteristics
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {result.visible_characteristics.map((char, i) => (
                          <span
                            key={i}
                            className="rounded border border-earth-light bg-ivory px-2.5 py-1 text-xs font-medium text-ink"
                          >
                            {char}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded border border-forest/20 bg-ivory p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Confidence &amp; Diagnostic Note ({result.confidence_level.toUpperCase()})
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-forest-dark">
                      {result.confidence_note}
                    </p>
                  </div>

                  {result.water_quality_guidance ? (
                    <div className="rounded border border-forest/20 bg-sage-light/40 p-3.5">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-forest" />
                        <p className="text-xs font-bold uppercase tracking-wider text-forest-dark">
                          Pond Water Guidance
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-ink">{result.water_quality_guidance}</p>
                    </div>
                  ) : null}

                  {result.recommendations && result.recommendations.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Aquaculture Management Actions
                      </p>
                      <ol className="mt-2 flex flex-col gap-2">
                        {result.recommendations.map((rec, i) => (
                          <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink">
                            <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-forest text-xs font-bold text-ivory">
                              {i + 1}
                            </span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  {result.preventive_measures && result.preventive_measures.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Biosecurity &amp; Pond Sanitation
                      </p>
                      <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-ink">
                        {result.preventive_measures.map((prev, i) => (
                          <li key={i}>{prev}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {result.needs_expert ? (
                    <div className="flex items-start gap-3 rounded border border-gold bg-gold-light/40 p-4">
                      <HelpCircle className="mt-0.5 h-5 w-5 flex-none text-forest" />
                      <p className="text-sm font-medium leading-relaxed text-forest-dark">
                        Official validation advised: External photographs cannot definitively confirm bacterial or viral infections. Consult an ICAR-CIFA extension officer or state fisheries officer before applying chemical pond treatments.
                      </p>
                    </div>
                  ) : null}

                  <div className="border-t border-earth-light/60 pt-3 text-xs text-muted">
                    <p className="leading-relaxed">{result.uncertainty_note}</p>
                    <p className="mt-1 font-medium text-forest-dark">
                      Engine: {result.provider} · Multimodal Fisheries Intelligence · Reference purpose
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-earth-light pt-4">
                    {saveStatus === "idle" || saveStatus === "saving" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSaveObservation}
                        disabled={saveStatus === "saving"}
                      >
                        {saveStatus === "saving" ? (
                          <>
                            <Spinner className="h-4 w-4" />
                            Recording observation…
                          </>
                        ) : (
                          <>
                            <Database className="h-4 w-4" />
                            Save to Pond Records
                          </>
                        )}
                      </Button>
                    ) : null}

                    {saveStatus === "saved" ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-forest">
                        <CheckCircle className="h-4 w-4" />
                        Saved to local pond log
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-earth-light bg-surface p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-light/50 text-forest">
                    <Fish className="h-6 w-6" />
                  </div>
                  <p className="font-display text-lg font-semibold text-ink">
                    No Fish Assessment Yet
                  </p>
                  <p className="max-w-sm text-sm leading-relaxed text-muted">
                    Upload a photograph of your fish or pond specimen and select your pond system to run an AI-assisted health and species assessment.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "water" ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div className="rounded-lg border border-earth-light bg-surface p-6 sm:p-8">
              <form onSubmit={handleEvaluateWater} className="flex flex-col gap-5" noValidate>
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">Pond Water Quality Evaluator</h2>
                  <p className="mt-1 text-xs text-muted">
                    Enter field measurements to test against verified ICAR-CIFA and FAO aquaculture safety limits.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClasses}>Dissolved Oxygen (mg/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 5.5"
                      className={inputClasses}
                      value={doInput}
                      onChange={(e) => setDoInput(e.target.value)}
                    />
                    <span className="text-[11px] text-muted">Optimal: 5.0 – 8.0 mg/L</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={labelClasses}>Water Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 28.0"
                      className={inputClasses}
                      value={tempInput}
                      onChange={(e) => setTempInput(e.target.value)}
                    />
                    <span className="text-[11px] text-muted">Optimal: 24.0 – 30.0 °C</span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClasses}>pH Level</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 7.5"
                      className={inputClasses}
                      value={phInput}
                      onChange={(e) => setPhInput(e.target.value)}
                    />
                    <span className="text-[11px] text-muted">Optimal: 7.0 – 8.0</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={labelClasses}>Total Ammonia (TAN mg/L)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 0.02"
                      className={inputClasses}
                      value={ammoniaInput}
                      onChange={(e) => setAmmoniaInput(e.target.value)}
                    />
                    <span className="text-[11px] text-muted">Critical: &gt; 0.5 mg/L</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClasses}>Alkalinity (CaCO3 mg/L)</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="e.g. 110"
                    className={inputClasses}
                    value={alkalinityInput}
                    onChange={(e) => setAlkalinityInput(e.target.value)}
                  />
                  <span className="text-[11px] text-muted">Optimal: 80 – 150 mg/L</span>
                </div>

                {waterError ? (
                  <p className="text-xs text-stress-severe">{waterError}</p>
                ) : null}

                <Button type="submit" size="lg" disabled={evaluatingWater} className="justify-center">
                  {evaluatingWater ? (
                    <>
                      <Spinner className="h-5 w-5" />
                      Checking Scientific Ranges…
                    </>
                  ) : (
                    <>
                      <Waves className="h-5 w-5" />
                      Evaluate Pond Safety
                    </>
                  )}
                </Button>
              </form>
            </div>

            <div>
              {waterEvalResult ? (
                <div className="flex flex-col gap-5 rounded-lg border border-earth-light bg-surface p-6 sm:p-8">
                  <div className="flex items-center justify-between border-b border-earth-light/60 pb-4">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-ink">Water Safety Evaluation</h3>
                      <p className="text-xs text-muted">Reference: {waterEvalResult.source}</p>
                    </div>
                    <Badge
                      tone={
                        waterEvalResult.overall_status === "optimal"
                          ? "low"
                          : waterEvalResult.overall_status === "acceptable"
                          ? "gold"
                          : "severe"
                      }
                    >
                      {waterEvalResult.overall_status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-3">
                    {waterEvalResult.evaluations.map((item, i) => (
                      <div
                        key={i}
                        className={clsx(
                          "rounded border p-3.5",
                          item.status === "optimal" && "border-forest/20 bg-sage-light/30",
                          item.status === "acceptable" && "border-gold/30 bg-gold-light/30",
                          item.status === "critical" && "border-stress-severe/30 bg-stress-severe-bg/40"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-ink">{item.parameter}</span>
                          <span className="text-xs font-mono font-bold text-ink">
                            {item.measured_value}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted leading-relaxed">{item.guidance}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Recommended Corrective Actions
                    </h4>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink">
                      {waterEvalResult.corrective_actions.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-earth-light bg-surface p-6 sm:p-8">
                  <h3 className="font-display text-lg font-semibold text-ink">Scientific Reference Standards</h3>
                  <p className="text-xs text-muted">Source: ICAR-CIFA Guidelines for Tropical Aquaculture</p>

                  <div className="mt-4 flex flex-col gap-3">
                    {standards.map((std, i) => (
                      <div key={i} className="border-b border-earth-light/60 pb-2.5 text-xs">
                        <div className="flex items-center justify-between font-semibold text-ink">
                          <span>{std.parameter}</span>
                          <span className="text-forest-dark">{std.optimal_range} {std.unit}</span>
                        </div>
                        <p className="mt-0.5 text-muted">Hazard threshold: {std.critical_threshold}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "history" ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">
                  Pond Observation History
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Log of fish health examinations recorded on this device.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab("species")}>
                <Camera className="h-4 w-4" />
                New Examination
              </Button>
            </div>

            {observations.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-earth-light bg-surface p-8 text-center">
                <FileText className="h-8 w-8 text-sage" />
                <p className="font-display text-lg font-semibold text-ink">No pond logs recorded yet</p>
                <p className="max-w-sm text-sm text-muted">
                  Run a fish photo analysis and click &quot;Save to Pond Records&quot; to build your persistent farm health log.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {observations.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-lg border border-earth-light bg-surface p-5 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display text-lg font-semibold text-ink">{item.speciesName}</p>
                          <p className="text-xs text-muted">{item.pondType} · {new Date(item.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Badge tone={fishConditionBadgeTone(item.analysis.health_condition)}>
                          {fishConditionLabel(item.analysis.health_condition)}
                        </Badge>
                      </div>

                      {item.analysis.suspected_issue ? (
                        <p className="mt-3 text-sm font-medium text-forest-dark">
                          Suspected: {item.analysis.suspected_issue}
                        </p>
                      ) : null}

                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
                        {item.analysis.confidence_note}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-earth-light/60 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setResult(item.analysis);
                          setActiveTab("species");
                        }}
                        className="text-xs font-semibold text-forest underline underline-offset-2"
                      >
                        Inspect Details
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(item.id)}
                        className="text-muted hover:text-stress-severe"
                        aria-label="Delete observation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "analytics" ? (
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                Aquaculture Health Metrics
              </h2>
              <p className="mt-1 text-sm text-muted">
                Aggregated statistics based on actual pond observations.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div className="rounded-lg border border-earth-light bg-surface p-6">
                <div className="flex items-center gap-2 text-muted">
                  <Activity className="h-4 w-4 text-forest" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Examinations</span>
                </div>
                <p className="mt-2 font-display text-3xl font-semibold text-ink">{analytics.total}</p>
                <p className="mt-1 text-xs text-muted">Specimens analyzed</p>
              </div>

              <div className="rounded-lg border border-earth-light bg-surface p-6">
                <div className="flex items-center gap-2 text-muted">
                  <ShieldCheck className="h-4 w-4 text-stress-low" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Healthy Specimen Ratio</span>
                </div>
                <p className="mt-2 font-display text-3xl font-semibold text-stress-low">
                  {analytics.total > 0
                    ? `${Math.round((analytics.healthyCount / analytics.total) * 100)}%`
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-muted">{analytics.healthyCount} specimens healthy</p>
              </div>

              <div className="rounded-lg border border-earth-light bg-surface p-6">
                <div className="flex items-center gap-2 text-muted">
                  <ShieldAlert className="h-4 w-4 text-stress-high" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Disease / Infection Cases</span>
                </div>
                <p className="mt-2 font-display text-3xl font-semibold text-stress-high">
                  {analytics.diseaseCount}
                </p>
                <p className="mt-1 text-xs text-muted">{analytics.stressCount} showing water stress signs</p>
              </div>
            </div>
          </div>
        ) : null}
      </Section>
    </>
  );
}
