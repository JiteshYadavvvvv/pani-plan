import {
  advisoryRequestSchema,
  advisoryResponseSchema,
  benchmarkRequestSchema,
  benchmarkResponseSchema,
  cropOutSchema,
  districtOutSchema,
  waterStressMapPointSchema,
  type AdvisoryRequest,
  type AdvisoryResponse,
  type BenchmarkRequest,
  type BenchmarkResponse,
  type CropOut,
  type DistrictOut,
  type WaterStressMapPoint,
} from "./schemas";
import { z } from "zod";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  status: number;
  kind: "network" | "timeout" | "server" | "validation";
  constructor(kind: "network" | "timeout" | "server" | "validation", status: number) {
    super(kind);
    this.kind = kind;
    this.status = status;
  }
}

async function requestJson<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
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
