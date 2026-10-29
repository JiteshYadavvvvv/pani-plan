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
    typical_water_need_mm: str = "450–650 mm"
    fao_source: str = "FAO Irrigation and Drainage Paper No. 56 (Table 12 & 17)"


CROPS: dict[str, CropProfile] = {
    "rice": CropProfile("rice", "Rice (Paddy)", "cereal", 1.05, 1.20, 0.90, 0.60, 150, "900–1200 mm"),
    "wheat": CropProfile("wheat", "Wheat", "cereal", 0.40, 1.15, 0.40, 1.50, 135, "450–650 mm"),
    "cotton": CropProfile("cotton", "Cotton", "cash_crop", 0.35, 1.18, 0.65, 1.70, 195, "700–1300 mm"),
    "sugarcane": CropProfile("sugarcane", "Sugarcane", "cash_crop", 0.40, 1.25, 0.75, 1.50, 365, "1500–2500 mm"),
    "maize": CropProfile("maize", "Maize", "cereal", 0.30, 1.20, 0.50, 1.00, 125, "500–800 mm"),
    "soybean": CropProfile("soybean", "Soybean", "oilseed", 0.40, 1.15, 0.50, 0.60, 130, "450–700 mm"),
    "groundnut": CropProfile("groundnut", "Groundnut", "oilseed", 0.40, 1.15, 0.60, 0.50, 130, "500–700 mm"),
    "chickpea": CropProfile("chickpea", "Chickpea (Gram)", "pulse", 0.40, 1.00, 0.35, 0.60, 100, "300–450 mm"),
    "mustard": CropProfile("mustard", "Mustard", "oilseed", 0.35, 1.10, 0.35, 0.60, 100, "300–450 mm"),
    "potato": CropProfile("potato", "Potato", "vegetable", 0.50, 1.15, 0.75, 0.40, 130, "500–700 mm"),
    "onion": CropProfile("onion", "Onion", "vegetable", 0.50, 1.05, 0.80, 0.30, 150, "350–550 mm"),
    "tomato": CropProfile("tomato", "Tomato", "vegetable", 0.60, 1.15, 0.80, 0.50, 145, "400–600 mm"),
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
    cgwb_stage_of_extraction_pct: float = 65.0
    cgwb_category: str = "Safe"
    annual_extractable_gw_mcm: float = 1200.0
    gw_extraction_for_irrigation_mcm: float = 750.0
    source_citation: str = "Central Ground Water Board (CGWB), Ministry of Jal Shakti, 2023-2024"
    data_period: str = "2023-2024"


DISTRICTS: dict[str, DistrictProfile] = {
    "ludhiana": DistrictProfile("ludhiana", "Ludhiana", "Punjab", 30.9010, 75.8573, "sandy_loam", 32, 18, 650, 95, ["wheat", "rice", "cotton"], 165.2, "Over-Exploited", 1420.5, 2210.0),
    "nashik": DistrictProfile("nashik", "Nashik", "Maharashtra", 19.9975, 73.7898, "loam", 33, 19, 700, 55, ["onion", "tomato", "soybean"], 72.4, "Semi-Critical", 1850.0, 1220.0),
    "belagavi": DistrictProfile("belagavi", "Belagavi", "Karnataka", 15.8497, 74.4977, "clay_loam", 31, 20, 850, 40, ["sugarcane", "maize", "soybean"], 68.1, "Safe", 1680.0, 1050.0),
    "coimbatore": DistrictProfile("coimbatore", "Coimbatore", "Tamil Nadu", 11.0168, 76.9558, "loam", 33, 22, 650, 85, ["cotton", "maize", "sugarcane"], 94.6, "Critical", 820.0, 715.0),
    "lucknow": DistrictProfile("lucknow", "Lucknow", "Uttar Pradesh", 26.8467, 80.9462, "loam", 34, 19, 900, 50, ["wheat", "rice", "mustard"], 78.5, "Semi-Critical", 940.0, 680.0),
    "jaipur": DistrictProfile("jaipur", "Jaipur", "Rajasthan", 26.9124, 75.7873, "sandy", 36, 20, 550, 98, ["wheat", "mustard", "chickpea"], 198.4, "Over-Exploited", 780.0, 1490.0),
    "indore": DistrictProfile("indore", "Indore", "Madhya Pradesh", 22.7196, 75.8577, "clay_loam", 33, 18, 950, 60, ["soybean", "wheat", "cotton"], 82.3, "Semi-Critical", 610.0, 470.0),
    "rajkot": DistrictProfile("rajkot", "Rajkot", "Gujarat", 22.3039, 70.8022, "sandy_loam", 34, 20, 600, 68, ["groundnut", "cotton", "wheat"], 88.7, "Semi-Critical", 1120.0, 920.0),
    "guntur": DistrictProfile("guntur", "Guntur", "Andhra Pradesh", 16.3067, 80.4365, "clay", 34, 22, 950, 48, ["rice", "cotton", "chickpea"], 52.8, "Safe", 1450.0, 690.0),
    "nizamabad": DistrictProfile("nizamabad", "Nizamabad", "Telangana", 18.6725, 78.0941, "clay_loam", 34, 21, 1050, 44, ["rice", "maize", "sugarcane"], 58.6, "Safe", 980.0, 520.0),
    "bardhaman": DistrictProfile("bardhaman", "Bardhaman", "West Bengal", 23.2324, 87.8615, "clay", 33, 20, 1400, 25, ["rice", "potato", "mustard"], 42.1, "Safe", 2150.0, 810.0),
    "patna": DistrictProfile("patna", "Patna", "Bihar", 25.5941, 85.1376, "loam", 33, 18, 1150, 38, ["rice", "wheat", "maize"], 48.3, "Safe", 1320.0, 580.0),
    "karnal": DistrictProfile("karnal", "Karnal", "Haryana", 29.6857, 76.9905, "sandy_loam", 33, 17, 700, 92, ["wheat", "rice", "sugarcane"], 142.8, "Over-Exploited", 1100.0, 1480.0),
    "nagpur": DistrictProfile("nagpur", "Nagpur", "Maharashtra", 21.1458, 79.0882, "clay", 34, 19, 1050, 46, ["cotton", "soybean", "chickpea"], 56.4, "Safe", 1280.0, 660.0),
    "hassan": DistrictProfile("hassan", "Hassan", "Karnataka", 13.0072, 76.1004, "loam", 29, 18, 900, 35, ["maize", "groundnut", "potato"], 46.2, "Safe", 1190.0, 490.0),
    "ahmednagar": DistrictProfile("ahmednagar", "Ahmednagar", "Maharashtra", 19.0948, 74.7480, "sandy_loam", 33, 18, 550, 88, ["onion", "sugarcane", "wheat"], 92.1, "Critical", 1750.0, 1510.0),
    "hoshiarpur": DistrictProfile("hoshiarpur", "Hoshiarpur", "Punjab", 31.5343, 75.9115, "loam", 32, 17, 950, 62, ["wheat", "maize", "sugarcane"], 88.3, "Semi-Critical", 1310.0, 1080.0),
    "kota": DistrictProfile("kota", "Kota", "Rajasthan", 25.2138, 75.8648, "sandy", 35, 19, 750, 90, ["wheat", "soybean", "mustard"], 110.5, "Over-Exploited", 860.0, 910.0),
}

IS_SAMPLE_DATA = False
