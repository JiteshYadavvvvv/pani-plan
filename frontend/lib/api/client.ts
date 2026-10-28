import {
  advisoryRequestSchema,
  advisoryResponseSchema,
  benchmarkRequestSchema,
  benchmarkResponseSchema,
  cropAnalysisResponseSchema,
  cropOutSchema,
  districtOutSchema,
  observationOutSchema,
  waterStressMapPointSchema,
  weatherResponseSchema,
  type AdvisoryRequest,
  type AdvisoryResponse,
  type BenchmarkRequest,
  type BenchmarkResponse,
  type CropAnalysisResponse,
  type CropOut,
  type DistrictOut,
  type ObservationCreate,
  type ObservationOut,
  type WaterStressMapPoint,
  type WeatherResponse,
} from "./schemas";
import { z } from "zod";

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "");
const API_BASE_URL =
  configuredBaseUrl || (process.env.NODE_ENV !== "production" ? "http://localhost:8000" : undefined);
const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  status: number;
  kind: "config" | "network" | "timeout" | "server" | "validation";
  constructor(kind: "config" | "network" | "timeout" | "server" | "validation", status: number) {
    super(kind);
    this.kind = kind;
    this.status = status;
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
    throw new ApiError("server", response.status);
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
  const timer = setTimeout(() => controller.abort(), 30_000);
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
  if (response.status === 503) throw new ApiError("config", 503);
  if (response.status === 429) throw new ApiError("server", 429);
  if (!response.ok) throw new ApiError("server", response.status);
  const json = await response.json();
  const parsed = cropAnalysisResponseSchema.safeParse(json);
  if (!parsed.success) throw new ApiError("validation", response.status);
  return parsed.data;
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
