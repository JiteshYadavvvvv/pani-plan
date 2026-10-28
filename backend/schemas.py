from typing import Literal

from pydantic import BaseModel, Field


class AdvisoryRequest(BaseModel):
    district_id: str
    crop_id: str
    growth_stage: Literal["initial", "development", "mid_season", "late_season"]
    irrigation_method: Literal["drip", "sprinkler", "flood"]
    area_hectares: float = Field(gt=0, le=10_000)
    soil_type_override: Literal["sandy", "sandy_loam", "loam", "clay_loam", "clay"] | None = None
    manual_tmax_c: float | None = Field(default=None, ge=-10, le=55)
    manual_tmin_c: float | None = Field(default=None, ge=-20, le=45)
    manual_rainfall_last_7_days_mm: float | None = Field(default=None, ge=0, le=1000)


class AdvisoryResponse(BaseModel):
    district_name: str
    crop_name: str
    eto_mm_day: float
    kc: float
    etc_mm_day: float
    effective_rainfall_mm_day: float
    net_irrigation_mm_day: float
    irrigation_interval_days: float
    gross_irrigation_mm: float
    total_water_liters: float
    stress_level: Literal["low", "moderate", "high", "severe"]
    used_sample_climate: bool
    is_sample_data: bool = False


class CropOut(BaseModel):
    crop_id: str
    name: str
    category: str
    root_depth_m: float
    typical_season_days: int


class DistrictOut(BaseModel):
    district_id: str
    name: str
    state: str
    lat: float
    lng: float
    dominant_soil: str
    baseline_water_stress_index: int
    primary_crops: list[str]
    is_sample_data: bool = False


class WaterStressMapPoint(BaseModel):
    district_id: str
    name: str
    state: str
    lat: float
    lng: float
    stress_index: int
    stress_level: Literal["low", "moderate", "high", "severe"]
    primary_crops: list[str]
    is_sample_data: bool = False


class BenchmarkRequest(BaseModel):
    workload_size: int = Field(default=2000, ge=100, le=20_000)
    max_workers: int | None = Field(default=None, ge=1, le=16)


class BenchmarkRunOut(BaseModel):
    mode: Literal["serial", "multiprocess", "vectorized"]
    workers: int
    time_seconds: float
    speedup: float


class AmdahlPoint(BaseModel):
    workers: int
    theoretical_speedup: float


class BenchmarkResponse(BaseModel):
    results: list[BenchmarkRunOut]
    amdahl_curve: list[AmdahlPoint]
    estimated_serial_fraction: float
    cpu_count: int
    workload_size: int
