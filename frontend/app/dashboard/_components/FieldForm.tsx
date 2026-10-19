"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle } from "lucide-react";
import { z } from "zod";
import { growthStageSchema, irrigationMethodSchema, type CropOut, type DistrictOut } from "@/lib/api/schemas";
import { Button } from "@/components/ui/Button";

export const fieldFormSchema = z.object({
  label: z.string().trim().min(1).max(60),
  district_id: z.string().min(1),
  crop_id: z.string().min(1),
  growth_stage: growthStageSchema,
  irrigation_method: irrigationMethodSchema,
  area_hectares: z.coerce.number().gt(0).lte(10000),
});

export type FieldFormValues = z.infer<typeof fieldFormSchema>;

export interface FieldFormCopy {
  addFormHeading: string;
  fieldLabelLabel: string;
  fieldLabelPlaceholder: string;
  districtLabel: string;
  districtPlaceholder: string;
  cropLabel: string;
  cropPlaceholder: string;
  recommendedSuffix: string;
  growthStageLabel: string;
  irrigationMethodLabel: string;
  areaLabel: string;
  addButton: string;
  adding: string;
  requiredError: string;
  labelRequiredError: string;
  areaRangeError: string;
  growthStage: Record<FieldFormValues["growth_stage"], string>;
  irrigationMethod: Record<FieldFormValues["irrigation_method"], string>;
}

const DEFAULT_VALUES: FieldFormValues = {
  label: "",
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

export function FieldForm({
  districts,
  crops,
  adding,
  onAdd,
  copy,
}: {
  districts: DistrictOut[];
  crops: CropOut[];
  adding: boolean;
  onAdd: (values: FieldFormValues) => void;
  copy: FieldFormCopy;
}) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FieldFormValues>({
    resolver: zodResolver(fieldFormSchema),
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

  const growthStageOptions = Object.entries(copy.growthStage) as [FieldFormValues["growth_stage"], string][];
  const irrigationMethodOptions = Object.entries(copy.irrigationMethod) as [
    FieldFormValues["irrigation_method"],
    string,
  ][];

  const inputClasses =
    "w-full rounded border border-earth-light bg-ivory px-3.5 py-2.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";
  const labelClasses = "text-sm font-medium text-ink";
  const errorClasses = "text-xs font-medium text-stress-severe";

  return (
    <form
      onSubmit={handleSubmit((values) => {
        onAdd(values);
        reset(DEFAULT_VALUES);
      })}
      className="flex flex-col gap-5"
      noValidate
    >
      <h3 className="font-display text-xl font-semibold text-ink">{copy.addFormHeading}</h3>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="field_label" className={labelClasses}>
          {copy.fieldLabelLabel}
        </label>
        <input
          id="field_label"
          type="text"
          placeholder={copy.fieldLabelPlaceholder}
          className={inputClasses}
          {...register("label")}
        />
        {errors.label ? <p className={errorClasses}>{copy.labelRequiredError}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="field_district_id" className={labelClasses}>
          {copy.districtLabel}
        </label>
        <select id="field_district_id" className={inputClasses} {...register("district_id")}>
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
        <label htmlFor="field_crop_id" className={labelClasses}>
          {copy.cropLabel}
        </label>
        <select id="field_crop_id" className={inputClasses} {...register("crop_id")}>
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
          <label htmlFor="field_growth_stage" className={labelClasses}>
            {copy.growthStageLabel}
          </label>
          <select
            id="field_growth_stage"
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
          <label htmlFor="field_irrigation_method" className={labelClasses}>
            {copy.irrigationMethodLabel}
          </label>
          <select
            id="field_irrigation_method"
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
        <label htmlFor="field_area_hectares" className={labelClasses}>
          {copy.areaLabel}
        </label>
        <input
          id="field_area_hectares"
          type="number"
          step={0.1}
          min={0}
          max={10000}
          inputMode="decimal"
          className={`${inputClasses} max-w-xs`}
          {...register("area_hectares", { setValueAs: toOptionalNumber })}
        />
        {errors.area_hectares ? <p className={errorClasses}>{copy.areaRangeError}</p> : null}
      </div>

      <Button type="submit" size="lg" disabled={adding} className="justify-center">
        <PlusCircle className="h-5 w-5" />
        {adding ? copy.adding : copy.addButton}
      </Button>
    </form>
  );
}
