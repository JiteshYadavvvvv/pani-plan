import math
from datetime import date
from typing import Literal

from datasets import CROPS, IRRIGATION_EFFICIENCY, SOIL_PROFILES, CropProfile, GrowthStage, SoilProfile

StressLevel = Literal["low", "moderate", "high", "severe"]
GSC_MJ_PER_M2_MIN = 0.0820
MANAGEMENT_ALLOWED_DEPLETION = 0.5
FALLBACK_SEASON_RAIN_DAYS = 180
EFFECTIVE_RAINFALL_FRACTION = 0.75


def extraterrestrial_radiation_mj(lat_deg: float, day_of_year: int) -> float:
    phi = math.radians(lat_deg)
    dr = 1 + 0.033 * math.cos(2 * math.pi * day_of_year / 365)
    delta = 0.409 * math.sin(2 * math.pi * day_of_year / 365 - 1.39)
    cos_ws = -math.tan(phi) * math.tan(delta)
    ws = math.acos(max(-1.0, min(1.0, cos_ws)))
    return (
        (24 * 60 / math.pi)
        * GSC_MJ_PER_M2_MIN
        * dr
        * (ws * math.sin(phi) * math.sin(delta) + math.cos(phi) * math.cos(delta) * math.sin(ws))
    )


def eto_hargreaves_samani(tmax_c: float, tmin_c: float, lat_deg: float, day_of_year: int) -> float:
    tmean = (tmax_c + tmin_c) / 2
    ra_mj = extraterrestrial_radiation_mj(lat_deg, day_of_year)
    ra_mm = 0.408 * ra_mj
    return 0.0023 * ra_mm * (tmean + 17.8) * math.sqrt(max(tmax_c - tmin_c, 0.1))


def crop_coefficient(crop: CropProfile, stage: GrowthStage) -> float:
    if stage == "initial":
        return crop.kc_initial
    if stage == "development":
        return (crop.kc_initial + crop.kc_mid) / 2
    if stage == "mid_season":
        return crop.kc_mid
    return (crop.kc_mid + crop.kc_end) / 2


def effective_rainfall_mm_per_day(
    manual_rainfall_last_7_days_mm: float | None,
    typical_seasonal_rainfall_mm: float,
) -> tuple[float, bool]:
    if manual_rainfall_last_7_days_mm is not None:
        return (manual_rainfall_last_7_days_mm * EFFECTIVE_RAINFALL_FRACTION) / 7, False
    seasonal_daily = typical_seasonal_rainfall_mm / FALLBACK_SEASON_RAIN_DAYS
    return seasonal_daily * EFFECTIVE_RAINFALL_FRACTION, True


def classify_stress(deficit_ratio: float) -> StressLevel:
    if deficit_ratio < 0.3:
        return "low"
    if deficit_ratio < 0.6:
        return "moderate"
    if deficit_ratio < 0.85:
        return "high"
    return "severe"


class AdvisoryResult:
    def __init__(
        self,
        eto_mm_day: float,
        kc: float,
        etc_mm_day: float,
        effective_rainfall_mm_day: float,
        net_irrigation_mm_day: float,
        irrigation_interval_days: float,
        gross_irrigation_mm: float,
        total_water_liters: float,
        stress_level: StressLevel,
        used_sample_climate: bool,
    ) -> None:
        self.eto_mm_day = eto_mm_day
        self.kc = kc
        self.etc_mm_day = etc_mm_day
        self.effective_rainfall_mm_day = effective_rainfall_mm_day
        self.net_irrigation_mm_day = net_irrigation_mm_day
        self.irrigation_interval_days = irrigation_interval_days
        self.gross_irrigation_mm = gross_irrigation_mm
        self.total_water_liters = total_water_liters
        self.stress_level = stress_level
        self.used_sample_climate = used_sample_climate


def compute_advisory(
    crop_id: str,
    growth_stage: GrowthStage,
    soil_type: str,
    irrigation_method: str,
    area_hectares: float,
    lat_deg: float,
    typical_tmax_c: float,
    typical_tmin_c: float,
    typical_seasonal_rainfall_mm: float,
    manual_tmax_c: float | None = None,
    manual_tmin_c: float | None = None,
    manual_rainfall_last_7_days_mm: float | None = None,
    reference_date: date | None = None,
) -> AdvisoryResult:
    crop = CROPS[crop_id]
    soil: SoilProfile = SOIL_PROFILES[soil_type]
    efficiency = IRRIGATION_EFFICIENCY[irrigation_method]

    tmax = manual_tmax_c if manual_tmax_c is not None else typical_tmax_c
    tmin = manual_tmin_c if manual_tmin_c is not None else typical_tmin_c
    used_sample_climate = manual_tmax_c is None or manual_tmin_c is None

    day_of_year = (reference_date or date.today()).timetuple().tm_yday
    eto = eto_hargreaves_samani(tmax, tmin, lat_deg, day_of_year)
    kc = crop_coefficient(crop, growth_stage)
    etc = kc * eto

    peff_day, used_rainfall_fallback = effective_rainfall_mm_per_day(
        manual_rainfall_last_7_days_mm, typical_seasonal_rainfall_mm
    )
    used_sample_climate = used_sample_climate or used_rainfall_fallback

    nir_day = max(etc - peff_day, 0.0)

    raw_mm = soil.available_water_capacity_mm_per_m * crop.root_depth_m * MANAGEMENT_ALLOWED_DEPLETION
    interval_days = min(raw_mm / nir_day, 21.0) if nir_day > 0.01 else 21.0

    gross_irrigation_mm = (nir_day * interval_days) / efficiency
    total_water_liters = gross_irrigation_mm * area_hectares * 10_000

    deficit_ratio = min(nir_day / etc, 1.0) if etc > 0 else 0.0
    stress_level = classify_stress(deficit_ratio)

    return AdvisoryResult(
        eto_mm_day=round(eto, 2),
        kc=round(kc, 2),
        etc_mm_day=round(etc, 2),
        effective_rainfall_mm_day=round(peff_day, 2),
        net_irrigation_mm_day=round(nir_day, 2),
        irrigation_interval_days=round(interval_days, 1),
        gross_irrigation_mm=round(gross_irrigation_mm, 2),
        total_water_liters=round(total_water_liters, 1),
        stress_level=stress_level,
        used_sample_climate=used_sample_climate,
    )
