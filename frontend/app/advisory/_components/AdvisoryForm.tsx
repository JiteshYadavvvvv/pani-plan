"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Sprout } from "lucide-react";
import { clsx } from "clsx";
import { advisoryRequestSchema, type AdvisoryRequest, type CropOut, type DistrictOut } from "@/lib/api/schemas";
import { SampleDataBadge } from "@/components/ui/SampleDataBadge";
import { Button } from "@/components/ui/Button";

export interface AdvisoryFormCopy {
  formHeading: string;
  districtLabel: string;
  districtPlaceholder: string;
  cropLabel: string;
  cropPlaceholder: string;
  recommendedSuffix: string;
  growthStageLabel: string;
  irrigationMethodLabel: string;
  areaLabel: string;
  advancedToggle: string;
  advancedNote: string;
  tmaxLabel: string;
  tminLabel: string;
  rainfallLabel: string;
  submit: string;
  submitting: string;
  requiredError: string;
  areaRangeError: string;
  climateRangeError: string;
  growthStage: Record<AdvisoryRequest["growth_stage"], string>;
  irrigationMethod: Record<AdvisoryRequest["irrigation_method"], string>;
}

const DEFAULT_VALUES: AdvisoryRequest = {
  district_id: "",
  crop_id: "",
  growth_stage: "development",
  irrigation_method: "drip",
  area_hectares: 1,
};

function toOptionalNumber(value: unknown): number | undefined {
  if (value === "" || value === null || typeof value === "undefined") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function AdvisoryForm({
  districts,
  crops,
  submitting,
  onSubmit,
  copy,
}: {
  districts: DistrictOut[];
  crops: CropOut[];
  submitting: boolean;
  onSubmit: (values: AdvisoryRequest) => void;
  copy: AdvisoryFormCopy;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AdvisoryRequest>({
    resolver: zodResolver(advisoryRequestSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onSubmit",
  });

  const selectedDistrictId = watch("district_id");

  const orderedCrops = useMemo(() => {
    const district = districts.find((candidate) => candidate.district_id === selectedDistrictId);
    const primarySet = new Set(district?.primary_crops ?? []);
    return [...crops].sort((a, b) => {
      const aPrimary = primarySet.has(a.crop_id) ? 0 : 1;
      const bPrimary = primarySet.has(b.crop_id) ? 0 : 1;
      if (aPrimary !== bPrimary) return aPrimary - bPrimary;
      return a.name.localeCompare(b.name);
    });
  }, [crops, districts, selectedDistrictId]);

  const selectedDistrict = districts.find((candidate) => candidate.district_id === selectedDistrictId);

  const growthStageOptions = Object.entries(copy.growthStage) as [AdvisoryRequest["growth_stage"], string][];
  const irrigationMethodOptions = Object.entries(copy.irrigationMethod) as [
    AdvisoryRequest["irrigation_method"],
    string,
  ][];

  const inputClasses =
    "w-full rounded border border-earth-light bg-ivory px-3.5 py-2.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";
  const labelClasses = "text-sm font-medium text-ink";
  const errorClasses = "text-xs font-medium text-stress-severe";

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values))}
      className="flex flex-col gap-5"
      noValidate
    >
      <h3 className="font-display text-xl font-semibold text-ink">{copy.formHeading}</h3>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="district_id" className={labelClasses}>
          {copy.districtLabel}
        </label>
        <select id="district_id" className={inputClasses} {...register("district_id")}>
          <option value="">{copy.districtPlaceholder}</option>
          {districts.map((district) => (
            <option key={district.district_id} value={district.district_id}>
              {district.name}, {district.state}
            </option>
          ))}
        </select>
        {errors.district_id ? <p className={errorClasses}>{copy.requiredError}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="crop_id" className={labelClasses}>
          {copy.cropLabel}
        </label>
        <select id="crop_id" className={inputClasses} {...register("crop_id")}>
          <option value="">{copy.cropPlaceholder}</option>
          {orderedCrops.map((crop) => {
            const isRecommended = Boolean(selectedDistrict?.primary_crops.includes(crop.crop_id));
            return (
              <option key={crop.crop_id} value={crop.crop_id}>
                {crop.name}
                {isRecommended ? ` (${copy.recommendedSuffix})` : ""}
              </option>
            );
          })}
        </select>
        {errors.crop_id ? <p className={errorClasses}>{copy.requiredError}</p> : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="growth_stage" className={labelClasses}>
            {copy.growthStageLabel}
          </label>
          <select
            id="growth_stage"
            className={inputClasses}
            defaultValue={DEFAULT_VALUES.growth_stage}
            {...register("growth_stage")}
          >
            {growthStageOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="irrigation_method" className={labelClasses}>
            {copy.irrigationMethodLabel}
          </label>
          <select
            id="irrigation_method"
            className={inputClasses}
            defaultValue={DEFAULT_VALUES.irrigation_method}
            {...register("irrigation_method")}
          >
            {irrigationMethodOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="area_hectares" className={labelClasses}>
          {copy.areaLabel}
        </label>
        <input
          id="area_hectares"
          type="number"
          step={0.1}
          min={0}
          max={10000}
          inputMode="decimal"
          className={clsx(inputClasses, "max-w-xs")}
          {...register("area_hectares", { setValueAs: toOptionalNumber })}
        />
        {errors.area_hectares ? <p className={errorClasses}>{copy.areaRangeError}</p> : null}
      </div>

      <div className="rounded border border-earth-light">
        <button
          type="button"
          onClick={() => setShowAdvanced((open) => !open)}
          aria-expanded={showAdvanced}
          aria-controls="advisory-advanced-panel"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="text-sm font-semibold text-forest-dark">{copy.advancedToggle}</span>
          <ChevronDown
            className={clsx(
              "h-4 w-4 flex-none text-forest transition-transform duration-200",
              showAdvanced && "rotate-180"
            )}
          />
        </button>
        <div
          id="advisory-advanced-panel"
          className={clsx(
            "grid overflow-hidden transition-all duration-300 ease-out",
            showAdvanced ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="min-h-0">
            <div className="flex flex-col gap-4 border-t border-earth-light px-4 py-4">
              <div className="flex flex-wrap items-start gap-2">
                <p className="flex-1 text-xs leading-relaxed text-muted">{copy.advancedNote}</p>
                <SampleDataBadge />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="manual_tmax_c" className={labelClasses}>
                    {copy.tmaxLabel}
                  </label>
                  <input
                    id="manual_tmax_c"
                    type="number"
                    step={0.1}
                    inputMode="decimal"
                    className={inputClasses}
                    {...register("manual_tmax_c", { setValueAs: toOptionalNumber })}
                  />
                  {errors.manual_tmax_c ? <p className={errorClasses}>{copy.climateRangeError}</p> : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="manual_tmin_c" className={labelClasses}>
                    {copy.tminLabel}
                  </label>
                  <input
                    id="manual_tmin_c"
                    type="number"
                    step={0.1}
                    inputMode="decimal"
                    className={inputClasses}
                    {...register("manual_tmin_c", { setValueAs: toOptionalNumber })}
                  />
                  {errors.manual_tmin_c ? <p className={errorClasses}>{copy.climateRangeError}</p> : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="manual_rainfall_last_7_days_mm" className={labelClasses}>
                    {copy.rainfallLabel}
                  </label>
                  <input
                    id="manual_rainfall_last_7_days_mm"
                    type="number"
                    step={0.1}
                    min={0}
                    inputMode="decimal"
                    className={inputClasses}
                    {...register("manual_rainfall_last_7_days_mm", { setValueAs: toOptionalNumber })}
                  />
                  {errors.manual_rainfall_last_7_days_mm ? (
                    <p className={errorClasses}>{copy.climateRangeError}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Button type="submit" size="lg" disabled={submitting} className="justify-center">
        <Sprout className="h-5 w-5" />
        {submitting ? copy.submitting : copy.submit}
      </Button>
    </form>
  );
}
