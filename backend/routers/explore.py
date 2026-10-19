from fastapi import APIRouter

from datasets import CROPS, DISTRICTS
from schemas import CropOut, DistrictOut, WaterStressMapPoint

router = APIRouter()


def _stress_level_from_index(index: int) -> str:
    if index < 40:
        return "low"
    if index < 60:
        return "moderate"
    if index < 80:
        return "high"
    return "severe"


@router.get("/api/crops", response_model=list[CropOut])
def list_crops() -> list[CropOut]:
    return [
        CropOut(
            crop_id=c.crop_id,
            name=c.name,
            category=c.category,
            root_depth_m=c.root_depth_m,
            typical_season_days=c.typical_season_days,
        )
        for c in CROPS.values()
    ]


@router.get("/api/districts", response_model=list[DistrictOut])
def list_districts() -> list[DistrictOut]:
    return [
        DistrictOut(
            district_id=d.district_id,
            name=d.name,
            state=d.state,
            lat=d.lat,
            lng=d.lng,
            dominant_soil=d.dominant_soil,
            baseline_water_stress_index=d.baseline_water_stress_index,
            primary_crops=d.primary_crops,
        )
        for d in DISTRICTS.values()
    ]


@router.get("/api/water-stress-map", response_model=list[WaterStressMapPoint])
def water_stress_map() -> list[WaterStressMapPoint]:
    return [
        WaterStressMapPoint(
            district_id=d.district_id,
            name=d.name,
            state=d.state,
            lat=d.lat,
            lng=d.lng,
            stress_index=d.baseline_water_stress_index,
            stress_level=_stress_level_from_index(d.baseline_water_stress_index),
            primary_crops=d.primary_crops,
        )
        for d in DISTRICTS.values()
    ]
