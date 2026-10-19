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

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function requestJson<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError("network", 0);
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
  return requestJson("/api/benchmark", benchmarkResponseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validated),
  });
}
