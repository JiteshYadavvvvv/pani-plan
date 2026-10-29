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
  is_sample_data: z.boolean().default(false),
});
export type AdvisoryResponse = z.infer<typeof advisoryResponseSchema>;

export const cropOutSchema = z.object({
  crop_id: z.string(),
  name: z.string(),
  category: z.string(),
  root_depth_m: z.number(),
  typical_season_days: z.number(),
  typical_water_need_mm: z.string().default("450–650 mm"),
  fao_source: z.string().default("FAO Irrigation and Drainage Paper No. 56"),
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
  cgwb_stage_of_extraction_pct: z.number().default(65.0),
  cgwb_category: z.string().default("Safe"),
  annual_extractable_gw_mcm: z.number().default(1200.0),
  gw_extraction_for_irrigation_mcm: z.number().default(750.0),
  source_citation: z.string().default("Central Ground Water Board (CGWB), Ministry of Jal Shakti, 2023-2024"),
  data_period: z.string().default("2023-2024"),
  is_sample_data: z.boolean().default(false),
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
  cgwb_stage_of_extraction_pct: z.number().default(65.0),
  cgwb_category: z.string().default("Safe"),
  annual_extractable_gw_mcm: z.number().default(1200.0),
  gw_extraction_for_irrigation_mcm: z.number().default(750.0),
  source_citation: z.string().default("Central Ground Water Board (CGWB), Ministry of Jal Shakti, 2023-2024"),
  data_period: z.string().default("2023-2024"),
  is_sample_data: z.boolean().default(false),
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

export const diagnosticResponseSchema = z.object({
  configured: z.boolean(),
  status: z.string(),
  message: z.string(),
  model: z.string().default("gemini-1.5-flash"),
  masked_key: z.string().default("None"),
});
export type DiagnosticResponse = z.infer<typeof diagnosticResponseSchema>;

export const cropAnalysisResponseSchema = z.object({
  crop_identified: z.string().nullable(),
  condition_type: z.enum([
    "healthy",
    "suspected_disease",
    "abiotic_stress",
    "pest_damage",
    "poor_image_quality",
    "inconclusive",
  ]),
  suspected_issue: z.string().nullable(),
  visible_symptoms: z.array(z.string()).default([]),
  affected_parts: z.array(z.string()).default([]),
  potential_causes: z.array(z.string()).default([]),
  alternative_explanations: z.array(z.string()).default([]),
  confidence_level: z.enum(["high", "moderate", "low", "uncertain"]).default("uncertain"),
  confidence_note: z.string(),
  abiotic_factors: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  preventive_measures: z.array(z.string()).default([]),
  irrigation_guidance: z.string().nullable().optional(),
  follow_up_advice: z.array(z.string()).default([]),
  uncertainty_note: z.string(),
  needs_expert: z.boolean().default(true),
  image_quality: z.enum(["good", "fair", "poor"]).default("fair"),
  provider: z.string().default("gemini-1.5-flash"),
  context_used: z.record(z.string()).default({}),
});
export type CropAnalysisResponse = z.infer<typeof cropAnalysisResponseSchema>;

export const fishAnalysisResponseSchema = z.object({
  species_identified: z.string().nullable(),
  common_name: z.string().nullable(),
  scientific_name: z.string().nullable(),
  health_condition: z.enum([
    "healthy",
    "suspected_disease",
    "parasitic_infection",
    "water_stress_signs",
    "inconclusive",
  ]),
  suspected_issue: z.string().nullable(),
  visible_characteristics: z.array(z.string()).default([]),
  potential_causes: z.array(z.string()).default([]),
  confidence_level: z.enum(["high", "moderate", "low", "uncertain"]).default("uncertain"),
  confidence_note: z.string(),
  recommendations: z.array(z.string()).default([]),
  preventive_measures: z.array(z.string()).default([]),
  water_quality_guidance: z.string().nullable().optional(),
  uncertainty_note: z.string(),
  needs_expert: z.boolean().default(true),
  image_quality: z.enum(["good", "fair", "poor"]).default("fair"),
  provider: z.string().default("gemini-1.5-flash"),
  context_used: z.record(z.string()).default({}),
});
export type FishAnalysisResponse = z.infer<typeof fishAnalysisResponseSchema>;

export const waterQualityStandardSchema = z.object({
  parameter: z.string(),
  optimal_range: z.string(),
  acceptable_range: z.string(),
  critical_threshold: z.string(),
  unit: z.string(),
  source: z.string(),
});
export type WaterQualityStandard = z.infer<typeof waterQualityStandardSchema>;

export const waterQualityEvaluationSchema = z.object({
  parameter: z.string(),
  measured_value: z.number(),
  status: z.enum(["optimal", "acceptable", "critical"]),
  guidance: z.string(),
});
export type WaterQualityEvaluation = z.infer<typeof waterQualityEvaluationSchema>;

export const waterQualityCheckResponseSchema = z.object({
  overall_status: z.enum(["optimal", "acceptable", "critical", "insufficient_data"]),
  evaluations: z.array(waterQualityEvaluationSchema),
  corrective_actions: z.array(z.string()),
  source: z.string(),
});
export type WaterQualityCheckResponse = z.infer<typeof waterQualityCheckResponseSchema>;

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

export const weatherAdvisoryResponseSchema = z.object({
  district_id: z.string(),
  district_name: z.string(),
  forecast_source: z.string(),
  forecast_period: z.string(),
  summary_headline: z.string(),
  rainfall_analysis: z.string(),
  heat_stress_assessment: z.string(),
  irrigation_recommendation: z.string(),
  next_review_date: z.string(),
  uncertainty_note: z.string(),
  provider: z.string(),
  is_ai_generated: z.boolean(),
  total_expected_rain_mm: z.number(),
});
export type WeatherAdvisoryResponse = z.infer<typeof weatherAdvisoryResponseSchema>;

export const subscriptionResponseSchema = z.object({
  id: z.string(),
  phone_masked: z.string(),
  channel: z.string(),
  district_name: z.string(),
  crop_name: z.string(),
  preferred_language: z.string(),
  status: z.enum(["active", "unsubscribed"]),
  created_at: z.string(),
  provider_status: z.string(),
});
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;

export const notificationStatusResponseSchema = z.object({
  sms_configured: z.boolean(),
  whatsapp_configured: z.boolean(),
  active_subscribers_count: z.number(),
  sms_gateway: z.string(),
  whatsapp_gateway: z.string(),
});
export type NotificationStatusResponse = z.infer<typeof notificationStatusResponseSchema>;

export const notificationDispatchPreviewSchema = z.object({
  channel: z.string(),
  phone_masked: z.string(),
  language: z.string(),
  advisory_text: z.string(),
  dispatched: z.boolean(),
  provider: z.string(),
  status_detail: z.string(),
});
export type NotificationDispatchPreview = z.infer<typeof notificationDispatchPreviewSchema>;

export const fieldIoTStatusSchema = z.object({
  has_sensor: z.boolean(),
  field_id: z.string(),
  device_id: z.string().nullable(),
  sensor_model: z.string().nullable(),
  connection_status: z.enum(["online", "idle", "offline", "unlinked"]),
  latest_reading: z.record(z.unknown()).nullable(),
  sensor_recommendation: z.string().nullable(),
});
export type FieldIoTStatus = z.infer<typeof fieldIoTStatusSchema>;

export const localizedMlResponseSchema = z.object({
  district_id: z.string(),
  district_name: z.string(),
  crop_name: z.string(),
  fao56_baseline_eto_mm_day: z.number(),
  ml_adjusted_eto_mm_day: z.number(),
  correction_delta_mm_day: z.number(),
  correction_factor: z.number(),
  uncertainty_margin_mm_day: z.number(),
  baseline_etc_mm_day: z.number(),
  ml_adjusted_etc_mm_day: z.number(),
  scientific_explanation: z.string(),
  model_provenance: z.string(),
});
export type LocalizedMlResponse = z.infer<typeof localizedMlResponseSchema>;

export const districtAdvisorySummarySchema = z.object({
  district_id: z.string(),
  district_name: z.string(),
  state: z.string(),
  representative_crop: z.string(),
  eto_mm_day: z.number(),
  etc_mm_day: z.number(),
  net_irrigation_mm_day: z.number(),
  dispatch_priority: z.enum(["urgent", "standard", "standby"]),
});
export type DistrictAdvisorySummary = z.infer<typeof districtAdvisorySummarySchema>;

export const batchDispatchRunResponseSchema = z.object({
  batch_id: z.string(),
  executed_at: z.string(),
  mode_used: z.string(),
  total_calculations: z.number(),
  elapsed_time_ms: z.number(),
  throughput_calcs_per_sec: z.number(),
  worker_count: z.number(),
  district_summaries: z.array(districtAdvisorySummarySchema),
  execution_notes: z.string(),
});
export type BatchDispatchRunResponse = z.infer<typeof batchDispatchRunResponseSchema>;
