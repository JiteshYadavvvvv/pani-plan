from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

SoilType = Literal["sandy", "sandy_loam", "loam", "clay_loam", "clay"]
GrowthStage = Literal["initial", "development", "mid_season", "late_season"]


@dataclass(frozen=True)
class SoilProfile:
    soil_type: SoilType
    label: str
    available_water_capacity_mm_per_m: float


SOIL_PROFILES: dict[SoilType, SoilProfile] = {
    "sandy": SoilProfile("sandy", "Sandy", 80.0),
    "sandy_loam": SoilProfile("sandy_loam", "Sandy Loam", 125.0),
    "loam": SoilProfile("loam", "Loam", 175.0),
    "clay_loam": SoilProfile("clay_loam", "Clay Loam", 190.0),
    "clay": SoilProfile("clay", "Clay", 210.0),
}

IRRIGATION_EFFICIENCY: dict[str, float] = {
    "drip": 0.90,
    "sprinkler": 0.75,
    "flood": 0.60,
}


@dataclass(frozen=True)
class CropProfile:
    crop_id: str
    name: str
    category: Literal["cereal", "cash_crop", "oilseed", "pulse", "vegetable"]
    kc_initial: float
    kc_mid: float
    kc_end: float
    root_depth_m: float
    typical_season_days: int


CROPS: dict[str, CropProfile] = {
    "rice": CropProfile("rice", "Rice (Paddy)", "cereal", 1.05, 1.20, 0.90, 0.60, 150),
    "wheat": CropProfile("wheat", "Wheat", "cereal", 0.40, 1.15, 0.40, 1.50, 135),
    "cotton": CropProfile("cotton", "Cotton", "cash_crop", 0.35, 1.18, 0.65, 1.70, 195),
    "sugarcane": CropProfile("sugarcane", "Sugarcane", "cash_crop", 0.40, 1.25, 0.75, 1.50, 365),
    "maize": CropProfile("maize", "Maize", "cereal", 0.30, 1.20, 0.50, 1.00, 125),
    "soybean": CropProfile("soybean", "Soybean", "oilseed", 0.40, 1.15, 0.50, 0.60, 130),
    "groundnut": CropProfile("groundnut", "Groundnut", "oilseed", 0.40, 1.15, 0.60, 0.50, 130),
    "chickpea": CropProfile("chickpea", "Chickpea (Gram)", "pulse", 0.40, 1.00, 0.35, 0.60, 100),
    "mustard": CropProfile("mustard", "Mustard", "oilseed", 0.35, 1.10, 0.35, 0.60, 100),
    "potato": CropProfile("potato", "Potato", "vegetable", 0.50, 1.15, 0.75, 0.40, 130),
    "onion": CropProfile("onion", "Onion", "vegetable", 0.50, 1.05, 0.80, 0.30, 150),
    "tomato": CropProfile("tomato", "Tomato", "vegetable", 0.60, 1.15, 0.80, 0.50, 145),
}


@dataclass(frozen=True)
class DistrictProfile:
    district_id: str
    name: str
    state: str
    lat: float
    lng: float
    dominant_soil: SoilType
    typical_tmax_c: float
    typical_tmin_c: float
    typical_seasonal_rainfall_mm: float
    baseline_water_stress_index: int
    primary_crops: list[str] = field(default_factory=list)


DISTRICTS: dict[str, DistrictProfile] = {
    "ludhiana": DistrictProfile("ludhiana", "Ludhiana", "Punjab", 30.9010, 75.8573, "sandy_loam", 32, 18, 650, 45, ["wheat", "rice", "cotton"]),
    "nashik": DistrictProfile("nashik", "Nashik", "Maharashtra", 19.9975, 73.7898, "loam", 33, 19, 700, 55, ["onion", "tomato", "soybean"]),
    "belagavi": DistrictProfile("belagavi", "Belagavi", "Karnataka", 15.8497, 74.4977, "clay_loam", 31, 20, 850, 40, ["sugarcane", "maize", "soybean"]),
    "coimbatore": DistrictProfile("coimbatore", "Coimbatore", "Tamil Nadu", 11.0168, 76.9558, "loam", 33, 22, 650, 60, ["cotton", "maize", "sugarcane"]),
    "lucknow": DistrictProfile("lucknow", "Lucknow", "Uttar Pradesh", 26.8467, 80.9462, "loam", 34, 19, 900, 50, ["wheat", "rice", "mustard"]),
    "jaipur": DistrictProfile("jaipur", "Jaipur", "Rajasthan", 26.9124, 75.7873, "sandy", 36, 20, 550, 75, ["wheat", "mustard", "chickpea"]),
    "indore": DistrictProfile("indore", "Indore", "Madhya Pradesh", 22.7196, 75.8577, "clay_loam", 33, 18, 950, 42, ["soybean", "wheat", "cotton"]),
    "rajkot": DistrictProfile("rajkot", "Rajkot", "Gujarat", 22.3039, 70.8022, "sandy_loam", 34, 20, 600, 68, ["groundnut", "cotton", "wheat"]),
    "guntur": DistrictProfile("guntur", "Guntur", "Andhra Pradesh", 16.3067, 80.4365, "clay", 34, 22, 950, 48, ["rice", "cotton", "chickpea"]),
    "nizamabad": DistrictProfile("nizamabad", "Nizamabad", "Telangana", 18.6725, 78.0941, "clay_loam", 34, 21, 1050, 44, ["rice", "maize", "sugarcane"]),
    "bardhaman": DistrictProfile("bardhaman", "Bardhaman", "West Bengal", 23.2324, 87.8615, "clay", 33, 20, 1400, 25, ["rice", "potato", "mustard"]),
    "patna": DistrictProfile("patna", "Patna", "Bihar", 25.5941, 85.1376, "loam", 33, 18, 1150, 38, ["rice", "wheat", "maize"]),
    "karnal": DistrictProfile("karnal", "Karnal", "Haryana", 29.6857, 76.9905, "sandy_loam", 33, 17, 700, 58, ["wheat", "rice", "sugarcane"]),
    "nagpur": DistrictProfile("nagpur", "Nagpur", "Maharashtra", 21.1458, 79.0882, "clay", 34, 19, 1050, 46, ["cotton", "soybean", "chickpea"]),
    "hassan": DistrictProfile("hassan", "Hassan", "Karnataka", 13.0072, 76.1004, "loam", 29, 18, 900, 35, ["maize", "groundnut", "potato"]),
    "ahmednagar": DistrictProfile("ahmednagar", "Ahmednagar", "Maharashtra", 19.0948, 74.7480, "sandy_loam", 33, 18, 550, 70, ["onion", "sugarcane", "wheat"]),
    "hoshiarpur": DistrictProfile("hoshiarpur", "Hoshiarpur", "Punjab", 31.5343, 75.9115, "loam", 32, 17, 950, 30, ["wheat", "maize", "sugarcane"]),
    "kota": DistrictProfile("kota", "Kota", "Rajasthan", 25.2138, 75.8648, "sandy", 35, 19, 750, 62, ["wheat", "soybean", "mustard"]),
}

IS_SAMPLE_DATA = False
