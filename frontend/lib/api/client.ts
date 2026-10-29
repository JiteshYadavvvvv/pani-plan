import {
  advisoryRequestSchema,
  advisoryResponseSchema,
  benchmarkRequestSchema,
  benchmarkResponseSchema,
  cropAnalysisResponseSchema,
  cropOutSchema,
  diagnosticResponseSchema,
  districtOutSchema,
  fishAnalysisResponseSchema,
  observationOutSchema,
  waterQualityCheckResponseSchema,
  waterQualityStandardSchema,
  waterStressMapPointSchema,
  weatherResponseSchema,
  weatherAdvisoryResponseSchema,
  subscriptionResponseSchema,
  notificationStatusResponseSchema,
  notificationDispatchPreviewSchema,
  fieldIoTStatusSchema,
  localizedMlResponseSchema,
  batchDispatchRunResponseSchema,
  type AdvisoryRequest,
  type AdvisoryResponse,
  type BenchmarkRequest,
  type BenchmarkResponse,
  type CropAnalysisResponse,
  type CropOut,
  type DiagnosticResponse,
  type DistrictOut,
  type FishAnalysisResponse,
  type ObservationCreate,
  type ObservationOut,
  type WaterQualityCheckResponse,
  type WaterQualityStandard,
  type WaterStressMapPoint,
  type WeatherResponse,
  type WeatherAdvisoryResponse,
  type SubscriptionResponse,
  type NotificationStatusResponse,
  type NotificationDispatchPreview,
  type FieldIoTStatus,
  type LocalizedMlResponse,
  type BatchDispatchRunResponse,
} from "./schemas";
import { z } from "zod";

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "");
const API_BASE_URL =
  configuredBaseUrl || (process.env.NODE_ENV !== "production" ? "http://localhost:8000" : "https://backend-f8cz.vercel.app");
const DEFAULT_TIMEOUT_MS = 25_000;

export class ApiError extends Error {
  status: number;
  kind: "config" | "network" | "timeout" | "server" | "validation";
  serverMessage?: string;

  constructor(
    kind: "config" | "network" | "timeout" | "server" | "validation",
    status: number,
    serverMessage?: string
  ) {
    super(serverMessage || kind);
    this.kind = kind;
    this.status = status;
    this.serverMessage = serverMessage;
  }
}

export type ApiErrorCategory = "config" | "network" | "http" | "validation" | "unknown";

export function classifyApiError(error: unknown): ApiErrorCategory {
  if (!(error instanceof ApiError)) return "unknown";
  if (error.kind === "config") return "config";
  if (error.kind === "network" || error.kind === "timeout") return "network";
  if (error.kind === "validation") return "validation";
  return "http";
}

async function extractDetailMessage(response: Response): Promise<string | undefined> {
  try {
    const json = await response.clone().json();
    if (typeof json.detail === "string") return json.detail;
    if (json.detail && typeof json.detail.message === "string") return json.detail.message;
    if (typeof json.message === "string") return json.message;
  } catch {}
  return undefined;
}

async function requestJson<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError("config", 0);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("timeout", 0);
    }
    throw new ApiError("network", 0);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const detailMsg = await extractDetailMessage(response);
    throw new ApiError("server", response.status, detailMsg);
  }
  const json = await response.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError("validation", response.status);
  }
  return parsed.data;
}

export function fetchAdvisory(payload: AdvisoryRequest): Promise<AdvisoryResponse> {
  const validated = advisoryRequestSchema.parse(payload);
  return requestJson("/api/advisory", advisoryResponseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validated),
  });
}

export function fetchDistricts(): Promise<DistrictOut[]> {
  return requestJson("/api/districts", z.array(districtOutSchema));
}

export function fetchCrops(): Promise<CropOut[]> {
  return requestJson("/api/crops", z.array(cropOutSchema));
}

export function fetchWaterStressMap(): Promise<WaterStressMapPoint[]> {
  return requestJson("/api/water-stress-map", z.array(waterStressMapPointSchema));
}

export function fetchBenchmark(payload: BenchmarkRequest): Promise<BenchmarkResponse> {
  const validated = benchmarkRequestSchema.parse(payload);
  return requestJson(
    "/api/benchmark",
    benchmarkResponseSchema,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated),
    },
    30_000
  );
}

export async function submitCropAnalysis(formData: FormData): Promise<CropAnalysisResponse> {
  if (!API_BASE_URL) throw new ApiError("config", 0);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35_000);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/crop-analysis`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new ApiError("timeout", 0);
    throw new ApiError("network", 0);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const detailMsg = await extractDetailMessage(response);
    if (response.status === 503) throw new ApiError("config", 503, detailMsg);
    if (response.status === 429) throw new ApiError("server", 429, detailMsg);
    throw new ApiError("server", response.status, detailMsg);
  }
  const json = await response.json();
  const parsed = cropAnalysisResponseSchema.safeParse(json);
  if (!parsed.success) throw new ApiError("validation", response.status);
  return parsed.data;
}

export function fetchCropAnalysisDiagnostic(): Promise<DiagnosticResponse> {
  return requestJson("/api/crop-analysis/diagnostic", diagnosticResponseSchema);
}

export function fetchCropAnalysisStatus(): Promise<{ configured: boolean; provider: string; model: string }> {
  return requestJson(
    "/api/crop-analysis/status",
    z.object({
      configured: z.boolean(),
      provider: z.string(),
      model: z.string(),
    })
  );
}

export async function submitFishAnalysis(formData: FormData): Promise<FishAnalysisResponse> {
  if (!API_BASE_URL) throw new ApiError("config", 0);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35_000);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/fisheries/assess`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new ApiError("timeout", 0);
    throw new ApiError("network", 0);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const detailMsg = await extractDetailMessage(response);
    if (response.status === 503) throw new ApiError("config", 503, detailMsg);
    if (response.status === 429) throw new ApiError("server", 429, detailMsg);
    throw new ApiError("server", response.status, detailMsg);
  }
  const json = await response.json();
  const parsed = fishAnalysisResponseSchema.safeParse(json);
  if (!parsed.success) throw new ApiError("validation", response.status);
  return parsed.data;
}

export function fetchWaterQualityStandards(): Promise<WaterQualityStandard[]> {
  return requestJson("/api/fisheries/water-quality-standards", z.array(waterQualityStandardSchema));
}

export function evaluateWaterQuality(payload: {
  dissolved_oxygen_mg_l?: number;
  temperature_c?: number;
  ph?: number;
  ammonia_mg_l?: number;
  alkalinity_mg_l?: number;
  pond_depth_m?: number;
}): Promise<WaterQualityCheckResponse> {
  return requestJson("/api/fisheries/water-quality-check", waterQualityCheckResponseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchWeather(districtId: string): Promise<WeatherResponse> {
  return requestJson(`/api/weather?district_id=${encodeURIComponent(districtId)}`, weatherResponseSchema);
}

export async function saveObservation(payload: ObservationCreate): Promise<ObservationOut> {
  return requestJson("/api/observations", observationOutSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchObservations(): Promise<ObservationOut[]> {
  return requestJson("/api/observations", z.array(observationOutSchema));
}

export async function fetchWeatherAdvisory(payload: {
  district_id: string;
  crop_name?: string;
  growth_stage?: string;
  soil_type?: string;
  language?: string;
}): Promise<WeatherAdvisoryResponse> {
  return requestJson("/api/weather/ai-advisory", weatherAdvisoryResponseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function subscribeNotifications(payload: {
  phone_number: string;
  channel: "sms" | "whatsapp";
  district_id: string;
  crop_id: string;
  preferred_language: string;
  consent_given: boolean;
  farmer_name?: string;
}): Promise<SubscriptionResponse> {
  return requestJson("/api/notifications/subscribe", subscriptionResponseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchNotificationStatus(): Promise<NotificationStatusResponse> {
  return requestJson("/api/notifications/status", notificationStatusResponseSchema);
}

export function fetchSubscriptions(): Promise<SubscriptionResponse[]> {
  return requestJson("/api/notifications/subscriptions", z.array(subscriptionResponseSchema));
}

export async function unsubscribeNotification(subscriptionId: string): Promise<{ status: string }> {
  return requestJson(`/api/notifications/subscribe/${encodeURIComponent(subscriptionId)}`, z.object({ status: z.string() }), {
    method: "DELETE",
  });
}

export async function previewNotificationAdvisory(subscriptionId: string): Promise<NotificationDispatchPreview> {
  return requestJson(`/api/notifications/preview-advisory?subscription_id=${encodeURIComponent(subscriptionId)}`, notificationDispatchPreviewSchema, {
    method: "POST",
  });
}

export async function registerIoTDevice(payload: {
  device_id: string;
  field_id: string;
  sensor_model?: string;
  location_description?: string;
}): Promise<{ device_id: string; api_token: string; ingest_endpoint: string }> {
  return requestJson("/api/iot/register-device", z.object({
    device_id: z.string(),
    api_token: z.string(),
    ingest_endpoint: z.string(),
  }), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchFieldIoTStatus(fieldId: string): Promise<FieldIoTStatus> {
  return requestJson(`/api/iot/field/${encodeURIComponent(fieldId)}`, fieldIoTStatusSchema);
}

export async function ingestIoTReading(payload: {
  device_id: string;
  soil_moisture_pct: number;
  soil_temperature_c?: number;
  battery_voltage_v?: number;
}): Promise<{ status: string; water_depletion_risk: string; actionable_advice: string }> {
  return requestJson("/api/iot/ingest", z.object({
    status: z.string(),
    water_depletion_risk: z.string(),
    actionable_advice: z.string(),
  }), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchLocalizedMlAdvisory(payload: {
  district_id: string;
  crop_id: string;
  growth_stage?: string;
  manual_tmax_c?: number;
  manual_tmin_c?: number;
  soil_type?: string;
}): Promise<LocalizedMlResponse> {
  return requestJson("/api/ml/localized-advisory", localizedMlResponseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function runBatchDispatch(payload: {
  mode: "vectorized" | "multiprocess";
  workload_multiplier: number;
  workers: number;
}): Promise<BatchDispatchRunResponse> {
  return requestJson("/api/batch/morning-dispatch", batchDispatchRunResponseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
