import { z } from "zod";

export const growthStageSchema = z.enum(["initial", "development", "mid_season", "late_season"]);
export const irrigationMethodSchema = z.enum(["drip", "sprinkler", "flood"]);
export const soilTypeSchema = z.enum(["sandy", "sandy_loam", "loam", "clay_loam", "clay"]);
export const stressLevelSchema = z.enum(["low", "moderate", "high", "severe"]);

export const advisoryRequestSchema = z.object({
  district_id: z.string().min(1),
  crop_id: z.string().min(1),
  growth_stage: growthStageSchema,
  irrigation_method: irrigationMethodSchema,
  area_hectares: z.coerce.number().gt(0).lte(10000),
  soil_type_override: soilTypeSchema.optional(),
  manual_tmax_c: z.coerce.number().min(-10).max(55).optional(),
  manual_tmin_c: z.coerce.number().min(-20).max(45).optional(),
  manual_rainfall_last_7_days_mm: z.coerce.number().min(0).max(1000).optional(),
});
export type AdvisoryRequest = z.infer<typeof advisoryRequestSchema>;

export const advisoryResponseSchema = z.object({
  district_name: z.string(),
  crop_name: z.string(),
  eto_mm_day: z.number(),
  kc: z.number(),
  etc_mm_day: z.number(),
  effective_rainfall_mm_day: z.number(),
  net_irrigation_mm_day: z.number(),
  irrigation_interval_days: z.number(),
  gross_irrigation_mm: z.number(),
  total_water_liters: z.number(),
  stress_level: stressLevelSchema,
  used_sample_climate: z.boolean(),
  is_sample_data: z.boolean(),
});
export type AdvisoryResponse = z.infer<typeof advisoryResponseSchema>;

export const cropOutSchema = z.object({
  crop_id: z.string(),
  name: z.string(),
  category: z.string(),
  root_depth_m: z.number(),
  typical_season_days: z.number(),
});
export type CropOut = z.infer<typeof cropOutSchema>;

export const districtOutSchema = z.object({
  district_id: z.string(),
  name: z.string(),
  state: z.string(),
  lat: z.number(),
  lng: z.number(),
  dominant_soil: soilTypeSchema,
  baseline_water_stress_index: z.number(),
  primary_crops: z.array(z.string()),
  is_sample_data: z.boolean(),
});
export type DistrictOut = z.infer<typeof districtOutSchema>;

export const waterStressMapPointSchema = z.object({
  district_id: z.string(),
  name: z.string(),
  state: z.string(),
  lat: z.number(),
  lng: z.number(),
  stress_index: z.number(),
  stress_level: stressLevelSchema,
  primary_crops: z.array(z.string()),
  is_sample_data: z.boolean(),
});
export type WaterStressMapPoint = z.infer<typeof waterStressMapPointSchema>;

export const benchmarkRequestSchema = z.object({
  workload_size: z.coerce.number().int().min(100).max(20000).default(2000),
  max_workers: z.coerce.number().int().min(1).max(16).optional(),
});
export type BenchmarkRequest = z.infer<typeof benchmarkRequestSchema>;

export const benchmarkRunSchema = z.object({
  mode: z.enum(["serial", "multiprocess", "vectorized"]),
  workers: z.number(),
  time_seconds: z.number(),
  speedup: z.number(),
});

export const amdahlPointSchema = z.object({
  workers: z.number(),
  theoretical_speedup: z.number(),
});

export const benchmarkResponseSchema = z.object({
  results: z.array(benchmarkRunSchema),
  amdahl_curve: z.array(amdahlPointSchema),
  estimated_serial_fraction: z.number(),
  cpu_count: z.number(),
  workload_size: z.number(),
});
export type BenchmarkResponse = z.infer<typeof benchmarkResponseSchema>;

export const cropAnalysisResponseSchema = z.object({
  crop_identified: z.string().nullable(),
  condition_type: z.enum(["healthy", "suspected_disease", "abiotic_stress", "pest_damage", "poor_image_quality", "inconclusive"]),
  suspected_issue: z.string().nullable(),
  visible_symptoms: z.array(z.string()).default([]),
  potential_causes: z.array(z.string()).default([]),
  confidence_note: z.string(),
  abiotic_factors: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  preventive_measures: z.array(z.string()).default([]),
  uncertainty_note: z.string(),
  needs_expert: z.boolean(),
  image_quality: z.enum(["good", "fair", "poor"]),
  provider: z.string(),
  context_used: z.record(z.string()).default({}),
});
export type CropAnalysisResponse = z.infer<typeof cropAnalysisResponseSchema>;

export const weatherCurrentSchema = z.object({
  temperature_c: z.number(),
  precipitation_mm: z.number(),
  weathercode: z.number(),
  wind_speed_kmh: z.number(),
  observed_at: z.string(),
});

export const weatherForecastDaySchema = z.object({
  date: z.string(),
  temp_max_c: z.number(),
  temp_min_c: z.number(),
  precipitation_mm: z.number(),
  weathercode: z.number(),
});

export const weatherResponseSchema = z.object({
  district_id: z.string(),
  district_name: z.string(),
  lat: z.number(),
  lng: z.number(),
  current: weatherCurrentSchema,
  forecast: z.array(weatherForecastDaySchema),
  source: z.string(),
  cached: z.boolean(),
  fetched_at: z.string(),
});
export type WeatherResponse = z.infer<typeof weatherResponseSchema>;

export const observationCreateSchema = z.object({
  field_label: z.string().min(1),
  district_id: z.string().min(1),
  crop_id: z.string().min(1),
  growth_stage: z.string(),
  advisory_result: z.record(z.unknown()),
  crop_analysis_result: z.record(z.unknown()).nullable().optional(),
  notes: z.string().optional(),
});
export type ObservationCreate = z.infer<typeof observationCreateSchema>;

export const observationOutSchema = z.object({
  id: z.string(),
  field_label: z.string(),
  district_id: z.string(),
  crop_id: z.string(),
  created_at: z.string(),
});
export type ObservationOut = z.infer<typeof observationOutSchema>;
