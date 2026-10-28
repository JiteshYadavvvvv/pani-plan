"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Camera,
  CheckCircle,
  Database,
  Droplets,
  FileText,
  HelpCircle,
  Leaf,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Upload,
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
  fetchCropAnalysisDiagnostic,
  saveObservation,
  submitCropAnalysis,
} from "@/lib/api/client";
import type { CropAnalysisResponse, DiagnosticResponse } from "@/lib/api/schemas";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const STORAGE_KEY = "paaniplan-crop-observations";

const inputClasses =
  "w-full rounded border border-earth-light bg-ivory px-3.5 py-2.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";
const labelClasses = "text-sm font-medium text-ink";

type ConditionType = CropAnalysisResponse["condition_type"];
type ImageQuality = CropAnalysisResponse["image_quality"];

interface StoredObservation {
  id: string;
  createdAt: string;
  cropName: string;
  location: string;
  growthStage: string;
  symptoms: string;
  analysis: CropAnalysisResponse;
  cloudSynced: boolean;
}

function conditionBadgeTone(
  condition: ConditionType
): "low" | "moderate" | "high" | "severe" | "neutral" | "gold" {
  if (condition === "healthy") return "low";
  if (condition === "suspected_disease") return "high";
  if (condition === "abiotic_stress") return "moderate";
  if (condition === "pest_damage") return "severe";
  if (condition === "poor_image_quality") return "gold";
  return "neutral";
}

function conditionLabel(condition: ConditionType): string {
  if (condition === "healthy") return "Healthy";
  if (condition === "suspected_disease") return "Suspected Disease";
  if (condition === "abiotic_stress") return "Abiotic Stress";
  if (condition === "pest_damage") return "Pest Damage";
  if (condition === "poor_image_quality") return "Poor Image Quality";
  return "Inconclusive";
}

function imageQualityLabel(quality: ImageQuality): string {
  if (quality === "good") return "Good";
  if (quality === "fair") return "Fair";
  return "Poor";
}

function imageQualityTone(quality: ImageQuality): "low" | "moderate" | "severe" {
  if (quality === "good") return "low";
  if (quality === "fair") return "moderate";
  return "severe";
}

function readStoredObservations(): StoredObservation[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredObservations(records: StoredObservation[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

export default function CropAnalysisPage() {
  const [activeTab, setActiveTab] = useState<"assess" | "history" | "analytics" | "diagnostics">("assess");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [cropName, setCropName] = useState("");
  const [location, setLocation] = useState("");
  const [growthStage, setGrowthStage] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CropAnalysisResponse | null>(null);
  const [errorKind, setErrorKind] = useState<"config" | "ratelimit" | "generic" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved_cloud" | "saved_local" | "error">("idle");
  const [observations, setObservations] = useState<StoredObservation[]>([]);
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticResponse | null>(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setObservations(readStoredObservations());
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

  const runDiagnostic = useCallback(() => {
    setDiagnosticLoading(true);
    fetchCropAnalysisDiagnostic()
      .then((data) => {
        setDiagnosticInfo(data);
      })
      .catch((err) => {
        setDiagnosticInfo({
          configured: false,
          status: "unreachable",
          message: err instanceof Error ? err.message : "Failed to connect to backend diagnostic route",
          model: "gemini-1.5-flash",
          masked_key: "None",
        });
      })
      .finally(() => {
        setDiagnosticLoading(false);
      });
  }, []);

  const handleFileChange = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      if (file.size > MAX_FILE_BYTES) {
        setErrorKind("generic");
        setErrorMessage("Image must be smaller than 10 MB.");
        return;
      }
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setErrorKind(null);
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
    setErrorKind(null);
    setErrorMessage(null);
    setSaveStatus("idle");
  }, [imagePreviewUrl]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      handleFileChange(file);
    },
    [handleFileChange]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!imageFile) return;
      setSubmitting(true);
      setErrorKind(null);
      setErrorMessage(null);
      setResult(null);
      setSaveStatus("idle");

      const fd = new FormData();
      fd.append("image", imageFile);
      if (cropName.trim()) fd.append("crop_name", cropName.trim());
      if (location.trim()) fd.append("location", location.trim());
      if (growthStage) fd.append("growth_stage", growthStage);
      if (symptoms.trim()) fd.append("symptoms", symptoms.trim());

      try {
        const data = await submitCropAnalysis(fd);
        setResult(data);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.serverMessage) {
            setErrorKind("generic");
            setErrorMessage(err.serverMessage);
          } else if (err.kind === "config" || err.status === 503) {
            setErrorKind("config");
            setErrorMessage(
              "Gemini API is not configured on the backend. Please add GEMINI_API_KEY in the Vercel backend environment variables and redeploy."
            );
          } else if (err.status === 429) {
            setErrorKind("ratelimit");
            setErrorMessage("Gemini API rate limit reached. Please wait a minute and try again.");
          } else if (err.status === 400) {
            setErrorKind("generic");
            setErrorMessage("Invalid image format or parameters. Supported formats: JPEG, PNG, WebP.");
          } else {
            setErrorKind("generic");
            setErrorMessage("Backend analysis service error. Please run the diagnostics tab or check server logs.");
          }
        } else {
          setErrorKind("generic");
          setErrorMessage("Failed to connect to backend server. Please check your internet connection.");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [imageFile, cropName, location, growthStage, symptoms]
  );

  const handleSaveObservation = useCallback(async () => {
    if (!result) return;
    setSaveStatus("saving");

    const newRecord: StoredObservation = {
      id: crypto.randomUUID ? crypto.randomUUID() : `obs-${Date.now()}`,
      createdAt: new Date().toISOString(),
      cropName: result.crop_identified || cropName.trim() || "Unspecified Crop",
      location: location.trim() || "Field 1",
      growthStage: growthStage || "Unspecified",
      symptoms: symptoms.trim() || "None reported",
      analysis: result,
      cloudSynced: false,
    };

    let cloudOk = false;
    try {
      await saveObservation({
        field_label: `${newRecord.cropName} — ${newRecord.location}`,
        district_id: location.trim().toLowerCase().replace(/\s+/g, "_") || "field_1",
        crop_id: (result.crop_identified || cropName || "crop").toLowerCase().replace(/\s+/g, "_"),
        growth_stage: growthStage || "unspecified",
        advisory_result: {},
        crop_analysis_result: result as unknown as Record<string, unknown>,
        notes: symptoms.trim() || undefined,
      });
      cloudOk = true;
    } catch {
      cloudOk = false;
    }

    newRecord.cloudSynced = cloudOk;

    setObservations((prev) => {
      const updated = [newRecord, ...prev];
      writeStoredObservations(updated);
      return updated;
    });

    setSaveStatus(cloudOk ? "saved_cloud" : "saved_local");
  }, [result, cropName, location, growthStage, symptoms]);

  const handleDeleteRecord = useCallback((id: string) => {
    setObservations((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      writeStoredObservations(updated);
      return updated;
    });
  }, []);

  const analytics = useMemo(() => {
    const total = observations.length;
    if (total === 0) {
      return {
        total: 0,
        healthyCount: 0,
        stressedCount: 0,
        conditionCounts: {
          healthy: 0,
          suspected_disease: 0,
          abiotic_stress: 0,
          pest_damage: 0,
          inconclusive: 0,
          poor_image_quality: 0,
        },
      };
    }

    const counts = {
      healthy: 0,
      suspected_disease: 0,
      abiotic_stress: 0,
      pest_damage: 0,
      inconclusive: 0,
      poor_image_quality: 0,
    };

    observations.forEach((obs) => {
      const cond = obs.analysis.condition_type;
      if (cond in counts) {
        counts[cond]++;
      }
    });

    const healthyCount = counts.healthy;
    const stressedCount = total - healthyCount;

    return {
      total,
      healthyCount,
      stressedCount,
      conditionCounts: counts,
    };
  }, [observations]);

  return (
    <>
      <Section tone="forest" className="pb-14 pt-16">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold-light">
                Agricultural Intelligence
              </p>
              <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
                Crop &amp; Leaf Health Analysis
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-sage-light">
                Multimodal photo diagnosis grounded in agronomic science. Identify crop stress,
                symptoms, and abiotic factors with clear uncertainty boundaries and actionable field steps.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 border-b border-forest-dark/40 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("assess")}
              className={clsx(
                "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "assess"
                  ? "bg-ivory text-forest font-semibold"
                  : "text-sage-light hover:bg-forest-dark/40 hover:text-ivory"
              )}
            >
              <Camera className="h-4 w-4" />
              Assess Photograph
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
              Observation Log ({observations.length})
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
              Health Analytics
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("diagnostics");
                if (!diagnosticInfo) runDiagnostic();
              }}
              className={clsx(
                "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "diagnostics"
                  ? "bg-ivory text-forest font-semibold"
                  : "text-sage-light hover:bg-forest-dark/40 hover:text-ivory"
              )}
            >
              <Stethoscope className="h-4 w-4" />
              Backend Diagnostics
            </button>
          </div>
        </Reveal>
      </Section>

      <Section tone="ivory">
        {activeTab === "assess" ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div className="rounded-lg border border-earth-light bg-surface p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-ink">Crop Photograph</h2>
                  <span className="text-xs font-medium text-muted">JPEG, PNG, WebP · max 10MB</span>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="rounded-lg border-2 border-dashed border-earth-light bg-ivory transition-colors hover:border-forest"
                >
                  {imagePreviewUrl && imageFile ? (
                    <div className="flex flex-col gap-3 p-4">
                      <Image
                        src={imagePreviewUrl}
                        alt="Crop preview"
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
                        <Camera className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">
                          Upload crop or leaf photo or{" "}
                          <span className="text-forest underline underline-offset-2">browse files</span>
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Take a clear, close-up photograph in natural light for highest accuracy
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
                  <label className={labelClasses}>Crop name (if known)</label>
                  <input
                    type="text"
                    placeholder="e.g. Rice, Wheat, Cotton, Tomato, Mustard"
                    className={inputClasses}
                    value={cropName}
                    onChange={(e) => setCropName(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClasses}>Location / Field</label>
                    <input
                      type="text"
                      placeholder="e.g. Nashik, Field North"
                      className={inputClasses}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={labelClasses}>Growth stage</label>
                    <select
                      className={inputClasses}
                      value={growthStage}
                      onChange={(e) => setGrowthStage(e.target.value)}
                    >
                      <option value="">Select if known</option>
                      <option value="Initial">Initial / Seedling</option>
                      <option value="Development">Vegetative Development</option>
                      <option value="Mid-season">Flowering / Mid-season</option>
                      <option value="Late-season">Ripening / Late-season</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClasses}>Symptoms observed</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Yellowing margins, brown spots on upper leaves, wilting despite moisture"
                    className={clsx(inputClasses, "resize-y")}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                  />
                </div>

                {errorKind ? (
                  <div className="rounded-lg border border-stress-severe/30 bg-stress-severe-bg/50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-stress-severe" />
                      <div>
                        <p className="text-sm font-semibold text-stress-severe">Assessment Notice</p>
                        <p className="mt-1 text-xs leading-relaxed text-ink">{errorMessage}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("diagnostics");
                            runDiagnostic();
                          }}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-forest underline"
                        >
                          Check Backend Diagnostic Status &rarr;
                        </button>
                      </div>
                    </div>
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
                      Analyzing with Gemini Vision…
                    </>
                  ) : (
                    <>
                      <Camera className="h-5 w-5" />
                      Run Crop Health Assessment
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
                    <p className="font-display text-lg font-semibold text-ink">Examining Leaf Biomarkers</p>
                    <p className="mt-1 max-w-sm text-sm text-muted">
                      Sending multimodal payload to Gemini 1.5 Flash. Evaluating visual symptoms, discoloration, and abiotic factors.
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
                        Condition Assessment
                      </span>
                      <h2 className="mt-0.5 font-display text-2xl font-semibold text-ink">
                        {result.crop_identified ?? "Crop Identified from Photograph"}
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={conditionBadgeTone(result.condition_type)}>
                        {conditionLabel(result.condition_type)}
                      </Badge>
                      <Badge tone={imageQualityTone(result.image_quality)}>
                        Photo: {imageQualityLabel(result.image_quality)}
                      </Badge>
                    </div>
                  </div>

                  {result.suspected_issue ? (
                    <div className="rounded-lg border border-stress-high-border bg-stress-high-bg/40 p-4">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="mt-0.5 h-5 w-5 flex-none text-stress-high" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-stress-high">
                            Suspected Issue Detected
                          </p>
                          <p className="font-display text-lg font-semibold text-ink">
                            {result.suspected_issue}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {result.visible_symptoms && result.visible_symptoms.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Visible Symptoms Detected
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {result.visible_symptoms.map((symp, i) => (
                          <span
                            key={i}
                            className="rounded border border-earth-light bg-ivory px-2.5 py-1 text-xs font-medium text-ink"
                          >
                            {symp}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {result.affected_parts && result.affected_parts.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Affected Plant Parts
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {result.affected_parts.map((part, i) => (
                          <span
                            key={i}
                            className="rounded border border-earth-light bg-sage-light/60 px-2 py-0.5 text-xs text-forest-dark"
                          >
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {result.potential_causes && result.potential_causes.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Potential Causes
                      </p>
                      <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-ink">
                        {result.potential_causes.map((cause, i) => (
                          <li key={i}>{cause}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {result.alternative_explanations && result.alternative_explanations.length > 0 ? (
                    <div className="rounded border border-earth-light bg-ivory/60 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Alternative Possibilities
                      </p>
                      <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-ink">
                        {result.alternative_explanations.map((alt, i) => (
                          <li key={i}>{alt}</li>
                        ))}
                      </ul>
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

                  {result.abiotic_factors && result.abiotic_factors.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Abiotic &amp; Environmental Factors
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {result.abiotic_factors.map((factor, i) => (
                          <span
                            key={i}
                            className="rounded border border-gold/30 bg-gold-light/40 px-2.5 py-1 text-xs font-medium text-forest-dark"
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {result.recommendations && result.recommendations.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Recommended Immediate Steps
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
                        Agronomic Preventive Measures
                      </p>
                      <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-ink">
                        {result.preventive_measures.map((prev, i) => (
                          <li key={i}>{prev}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {result.irrigation_guidance ? (
                    <div className="rounded border border-forest/20 bg-sage-light/40 p-3.5">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-forest" />
                        <p className="text-xs font-bold uppercase tracking-wider text-forest-dark">
                          Irrigation &amp; Moisture Advice
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-ink">{result.irrigation_guidance}</p>
                    </div>
                  ) : null}

                  {result.follow_up_advice && result.follow_up_advice.length > 0 ? (
                    <div className="rounded border border-earth-light bg-surface p-3 text-xs text-muted">
                      <p className="font-semibold text-ink">Follow-Up Suggestions:</p>
                      <ul className="mt-1 list-inside list-disc space-y-0.5">
                        {result.follow_up_advice.map((advice, i) => (
                          <li key={i}>{advice}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {result.needs_expert ? (
                    <div className="flex items-start gap-3 rounded border border-gold bg-gold-light/40 p-4">
                      <HelpCircle className="mt-0.5 h-5 w-5 flex-none text-forest" />
                      <p className="text-sm font-medium leading-relaxed text-forest-dark">
                        Expert validation advised: Confirm with a local Krishi Vigyan Kendra (KVK) agronomist or agricultural extension officer before applying chemical treatments.
                      </p>
                    </div>
                  ) : null}

                  <div className="border-t border-earth-light/60 pt-3 text-xs text-muted">
                    <p className="leading-relaxed">{result.uncertainty_note}</p>
                    <p className="mt-1 font-medium text-forest-dark">
                      Engine: {result.provider} · Multimodal AI assessment · Demonstrative agricultural reference
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
                            Save to Field Records
                          </>
                        )}
                      </Button>
                    ) : null}

                    {saveStatus === "saved_cloud" ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-forest">
                        <CheckCircle className="h-4 w-4" />
                        Saved locally &amp; synced to cloud Supabase
                      </div>
                    ) : null}

                    {saveStatus === "saved_local" ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
                        <CheckCircle className="h-4 w-4 text-forest" />
                        Saved to local field records (Supabase cloud sync unconfigured)
                      </div>
                    ) : null}

                    {saveStatus === "error" ? (
                      <p className="text-xs text-stress-severe">Could not save record. Please retry.</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-earth-light bg-surface p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-light/50 text-forest">
                    <Leaf className="h-6 w-6" />
                  </div>
                  <p className="font-display text-lg font-semibold text-ink">
                    No Assessment Run Yet
                  </p>
                  <p className="max-w-sm text-sm leading-relaxed text-muted">
                    Select a crop photograph from your device, provide optional location and symptoms, and click Run Assessment.
                  </p>
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
                  Field Observation Records
                </h2>
                <p className="mt-1 text-sm text-muted">
                  History of crop assessments conducted on this device.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab("assess")}>
                <Camera className="h-4 w-4" />
                New Assessment
              </Button>
            </div>

            {observations.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-earth-light bg-surface p-8 text-center">
                <FileText className="h-8 w-8 text-sage" />
                <p className="font-display text-lg font-semibold text-ink">No observations recorded yet</p>
                <p className="max-w-sm text-sm text-muted">
                  Perform a crop analysis and click &quot;Save to Field Records&quot; to build your persistent field health history.
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
                          <p className="font-display text-lg font-semibold text-ink">{item.cropName}</p>
                          <p className="text-xs text-muted">{item.location} · {new Date(item.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Badge tone={conditionBadgeTone(item.analysis.condition_type)}>
                          {conditionLabel(item.analysis.condition_type)}
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
                      <span className="text-[11px] text-muted">
                        {item.cloudSynced ? "Cloud Synced" : "Local Record"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResult(item.analysis);
                            setActiveTab("assess");
                          }}
                          className="text-xs font-semibold text-forest underline underline-offset-2"
                        >
                          View Full Details
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
                Crop Health Analytics &amp; Trends
              </h2>
              <p className="mt-1 text-sm text-muted">
                Aggregated summary of recorded plant health diagnoses across your monitored fields.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div className="rounded-lg border border-earth-light bg-surface p-6">
                <div className="flex items-center gap-2 text-muted">
                  <Activity className="h-4 w-4 text-forest" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Scans</span>
                </div>
                <p className="mt-2 font-display text-3xl font-semibold text-ink">{analytics.total}</p>
                <p className="mt-1 text-xs text-muted">Photographs evaluated</p>
              </div>

              <div className="rounded-lg border border-earth-light bg-surface p-6">
                <div className="flex items-center gap-2 text-muted">
                  <ShieldCheck className="h-4 w-4 text-stress-low" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Healthy Crop Ratio</span>
                </div>
                <p className="mt-2 font-display text-3xl font-semibold text-stress-low">
                  {analytics.total > 0
                    ? `${Math.round((analytics.healthyCount / analytics.total) * 100)}%`
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-muted">{analytics.healthyCount} healthy observations</p>
              </div>

              <div className="rounded-lg border border-earth-light bg-surface p-6">
                <div className="flex items-center gap-2 text-muted">
                  <ShieldAlert className="h-4 w-4 text-stress-high" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Stress / Disease Ratio</span>
                </div>
                <p className="mt-2 font-display text-3xl font-semibold text-stress-high">
                  {analytics.total > 0
                    ? `${Math.round((analytics.stressedCount / analytics.total) * 100)}%`
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-muted">{analytics.stressedCount} required farmer attention</p>
              </div>
            </div>

            <div className="rounded-lg border border-earth-light bg-surface p-6">
              <h3 className="font-display text-lg font-semibold text-ink">Condition Breakdown</h3>
              <p className="mt-1 text-xs text-muted">Distribution of identified crop conditions</p>

              {analytics.total === 0 ? (
                <p className="mt-6 text-sm text-muted">No observations recorded yet to generate analytics.</p>
              ) : (
                <div className="mt-6 flex flex-col gap-4">
                  {(
                    [
                      { key: "healthy", label: "Healthy", color: "bg-forest", count: analytics.conditionCounts.healthy },
                      { key: "abiotic_stress", label: "Abiotic Stress", color: "bg-gold", count: analytics.conditionCounts.abiotic_stress },
                      { key: "suspected_disease", label: "Suspected Disease", color: "bg-stress-high", count: analytics.conditionCounts.suspected_disease },
                      { key: "pest_damage", label: "Pest Damage", color: "bg-stress-severe", count: analytics.conditionCounts.pest_damage },
                      { key: "inconclusive", label: "Inconclusive / Other", color: "bg-earth", count: analytics.conditionCounts.inconclusive + analytics.conditionCounts.poor_image_quality },
                    ] as const
                  ).map((item) => {
                    const pct = analytics.total > 0 ? Math.round((item.count / analytics.total) * 100) : 0;
                    return (
                      <div key={item.key} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-ink">{item.label}</span>
                          <span className="text-muted">{item.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-cream">
                          <div className={clsx("h-full rounded-full transition-all duration-500", item.color)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "diagnostics" ? (
          <div className="mx-auto max-w-2xl rounded-lg border border-earth-light bg-surface p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-earth-light/60 pb-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">
                  Gemini API Health &amp; Diagnostic
                </h2>
                <p className="text-xs text-muted">
                  Live verification of backend API key configuration and Google Generative Language service reachability.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={runDiagnostic} disabled={diagnosticLoading}>
                <RefreshCw className={clsx("h-4 w-4", diagnosticLoading && "animate-spin")} />
                Run Test
              </Button>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {diagnosticLoading ? (
                <div className="flex min-h-[140px] items-center justify-center">
                  <Spinner className="h-7 w-7" />
                </div>
              ) : diagnosticInfo ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between rounded border border-earth-light bg-ivory p-3.5">
                    <span className="text-xs font-semibold text-muted">Configuration Status</span>
                    <Badge tone={diagnosticInfo.configured ? "forest" : "severe"}>
                      {diagnosticInfo.configured ? "Key Configured" : "Missing Key"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between rounded border border-earth-light bg-ivory p-3.5">
                    <span className="text-xs font-semibold text-muted">Connection Status</span>
                    <Badge tone={diagnosticInfo.status === "connected" ? "forest" : "severe"}>
                      {diagnosticInfo.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between rounded border border-earth-light bg-ivory p-3.5">
                    <span className="text-xs font-semibold text-muted">Active Model</span>
                    <span className="font-mono text-xs font-semibold text-ink">{diagnosticInfo.model}</span>
                  </div>

                  <div className="flex items-center justify-between rounded border border-earth-light bg-ivory p-3.5">
                    <span className="text-xs font-semibold text-muted">Key Preview</span>
                    <span className="font-mono text-xs text-muted">{diagnosticInfo.masked_key}</span>
                  </div>

                  <div className="rounded border border-earth-light bg-surface p-4 text-xs leading-relaxed">
                    <p className="font-semibold text-ink">Diagnostic Message:</p>
                    <p className="mt-1 text-muted">{diagnosticInfo.message}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">Click &quot;Run Test&quot; to inspect connection status.</p>
              )}
            </div>
          </div>
        ) : null}
      </Section>
    </>
  );
}
