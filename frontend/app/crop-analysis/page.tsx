"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Camera, CheckCircle, Upload, X } from "lucide-react";
import gsap from "gsap";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/lib/motion/Reveal";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ApiError, saveObservation, submitCropAnalysis } from "@/lib/api/client";
import type { CropAnalysisResponse } from "@/lib/api/schemas";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const inputClasses =
  "w-full rounded border border-earth-light bg-ivory px-3.5 py-2.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";
const labelClasses = "text-sm font-medium text-ink";

type ConditionType = CropAnalysisResponse["condition_type"];
type ImageQuality = CropAnalysisResponse["image_quality"];

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

type SaveStatus = "idle" | "saving" | "saved" | "not_configured" | "error";

export default function CropAnalysisPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [cropName, setCropName] = useState("");
  const [location, setLocation] = useState("");
  const [growthStage, setGrowthStage] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CropAnalysisResponse | null>(null);
  const [errorKind, setErrorKind] = useState<"config" | "ratelimit" | "generic" | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const resultRef = useRef<HTMLDivElement>(null);

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
        setErrorKind("generic");
        return;
      }
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setErrorKind(null);
    },
    [imagePreviewUrl]
  );

  const handleRemoveImage = useCallback(() => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setResult(null);
    setErrorKind(null);
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
          if (err.kind === "config" || err.status === 503) {
            setErrorKind("config");
          } else if (err.status === 429) {
            setErrorKind("ratelimit");
          } else {
            setErrorKind("generic");
          }
        } else {
          setErrorKind("generic");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [imageFile, cropName, location, growthStage, symptoms]
  );

  const handleSave = useCallback(async () => {
    if (!result) return;
    setSaveStatus("saving");
    try {
      await saveObservation({
        field_label: `${cropName.trim() || "Unknown crop"} — ${location.trim() || "Unknown location"}`,
        district_id: location.trim() || "unknown",
        crop_id: cropName.trim() || "unknown",
        growth_stage: growthStage || "unknown",
        advisory_result: {},
        crop_analysis_result: result as unknown as Record<string, unknown>,
      });
      setSaveStatus("saved");
    } catch (err) {
      if (err instanceof ApiError && (err.kind === "config" || err.status === 503)) {
        setSaveStatus("not_configured");
      } else {
        setSaveStatus("error");
      }
    }
  }, [result, cropName, location, growthStage]);

  const errorMessage =
    errorKind === "config"
      ? "Crop analysis is not configured for this deployment. Please set up the Gemini API key on the backend."
      : errorKind === "ratelimit"
        ? "Too many requests. Please wait a moment before trying again."
        : "Something went wrong analysing the image. Please try again.";

  return (
    <>
      <Section tone="forest" className="pb-16 pt-16">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold-light">
            AI crop health
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Diagnose crop stress from a photo
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-sage-light">
            Upload a clear photo of your crop, describe what you observe, and let AI identify
            potential disease, pest damage, or abiotic stress — with transparent confidence notes and
            actionable recommendations.
          </p>
        </Reveal>
      </Section>

      <Section tone="ivory">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="rounded-lg border border-earth-light bg-surface p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              <h2 className="font-display text-xl font-semibold text-ink">Your crop photo</h2>

              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="rounded-lg border-2 border-dashed border-earth-light bg-ivory transition-colors hover:border-forest"
              >
                {imagePreviewUrl && imageFile ? (
                  <div className="flex flex-col gap-3 p-4">
                    <img
                      src={imagePreviewUrl}
                      alt="Crop preview"
                      className="max-h-48 w-full rounded object-contain"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-xs text-muted">{imageFile.name}</span>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="flex items-center gap-1 rounded border border-earth-light px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-sage-light"
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
                    <Camera className="h-10 w-10 text-sage" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-medium text-ink">
                        Drop a photo here or{" "}
                        <span className="text-forest underline underline-offset-2">browse</span>
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        JPEG, PNG or WebP · max 10 MB · clear crop photo works best
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded border border-earth-light bg-ivory px-3 py-1.5 text-xs font-medium text-muted">
                      <Upload className="h-3.5 w-3.5" />
                      Select image
                    </div>
                  </label>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClasses}>Crop name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Rice, Wheat, Cotton"
                  className={inputClasses}
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClasses}>Location (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Nashik, Maharashtra"
                  className={inputClasses}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClasses}>Growth stage (optional)</label>
                <select
                  className={inputClasses}
                  value={growthStage}
                  onChange={(e) => setGrowthStage(e.target.value)}
                >
                  <option value="">Select a stage</option>
                  <option value="Initial">Initial</option>
                  <option value="Development">Development</option>
                  <option value="Mid-season">Mid-season</option>
                  <option value="Late-season">Late-season</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClasses}>Observed symptoms (optional)</label>
                <textarea
                  rows={3}
                  placeholder="Describe what you see — yellowing, spots, wilting, unusual marks…"
                  className={clsx(inputClasses, "resize-y")}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>

              {errorKind ? <ErrorNotice message={errorMessage} /> : null}

              <Button
                type="submit"
                size="lg"
                disabled={!imageFile || submitting}
                className="justify-center"
              >
                {submitting ? (
                  <>
                    <Spinner className="h-5 w-5" />
                    Analysing…
                  </>
                ) : (
                  <>
                    <Camera className="h-5 w-5" />
                    Analyse crop photo
                  </>
                )}
              </Button>
            </form>
          </div>

          <div>
            {submitting ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-lg border border-earth-light bg-surface p-8">
                <Spinner className="h-7 w-7" />
                <p className="text-sm text-muted">Analysing your photo with AI…</p>
              </div>
            ) : result ? (
              <div
                ref={resultRef}
                className="flex flex-col gap-6 rounded-lg border border-earth-light bg-surface p-6 sm:p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="font-display text-xl font-semibold text-ink">Analysis result</h2>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={conditionBadgeTone(result.condition_type)}>
                      {conditionLabel(result.condition_type)}
                    </Badge>
                    <Badge tone={imageQualityTone(result.image_quality)}>
                      Image: {imageQualityLabel(result.image_quality)}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Crop identified
                  </p>
                  <p className="font-display text-lg font-semibold text-ink">
                    {result.crop_identified ?? "Could not identify crop"}
                  </p>
                </div>

                {result.suspected_issue ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Suspected issue
                    </p>
                    <p className="text-sm font-medium text-ink">{result.suspected_issue}</p>
                  </div>
                ) : null}

                <div className="rounded border border-forest/20 bg-ivory p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Confidence note
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-forest-dark">
                    {result.confidence_note}
                  </p>
                </div>

                {result.abiotic_factors.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Abiotic factors
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.abiotic_factors.map((factor) => (
                        <span
                          key={factor}
                          className="rounded border border-earth-light bg-sage-light px-2.5 py-1 text-xs font-medium text-forest-dark"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {result.recommendations.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Recommendations
                    </p>
                    <ol className="flex flex-col gap-2">
                      {result.recommendations.map((rec, i) => (
                        <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink">
                          <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-forest text-xs font-bold text-ivory">
                            {i + 1}
                          </span>
                          {rec}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {result.needs_expert ? (
                  <div className="flex items-start gap-3 rounded border border-gold bg-gold-light/50 p-4">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-none text-forest" />
                    <p className="text-sm font-medium text-forest-dark">
                      Consult a local agricultural expert for confirmation
                    </p>
                  </div>
                ) : null}

                <p className="text-xs leading-relaxed text-muted">{result.uncertainty_note}</p>

                <p className="text-xs text-muted">
                  Analysis by {result.provider} · AI-generated · Not a definitive diagnosis
                </p>

                <div className="border-t border-earth-light pt-4">
                  {saveStatus === "idle" || saveStatus === "saving" || saveStatus === "error" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSave}
                      disabled={saveStatus === "saving"}
                    >
                      {saveStatus === "saving" ? (
                        <>
                          <Spinner className="h-4 w-4" />
                          Saving…
                        </>
                      ) : (
                        "Save observation"
                      )}
                    </Button>
                  ) : null}
                  {saveStatus === "error" ? (
                    <p className="mt-2 text-xs text-stress-severe">
                      Could not save. Please try again.
                    </p>
                  ) : null}
                  {saveStatus === "saved" ? (
                    <p className="text-sm font-medium text-forest">Saved successfully.</p>
                  ) : null}
                  {saveStatus === "not_configured" ? (
                    <p className="text-sm text-muted">
                      Persistence not configured. Set up Supabase to save observations.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-earth-light bg-surface p-8 text-center">
                <Camera className="h-8 w-8 text-sage" strokeWidth={1.5} />
                <p className="font-display text-lg font-semibold text-ink">
                  Your analysis will appear here
                </p>
                <p className="max-w-sm text-sm leading-relaxed text-muted">
                  Upload a photo of your crop and press Analyse to get an AI-powered condition
                  assessment with recommendations.
                </p>
              </div>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
