from fastapi import APIRouter, HTTPException

from datasets import CROPS, DISTRICTS
from schemas import AdvisoryRequest, AdvisoryResponse
from water_calc import compute_advisory

router = APIRouter()


@router.post("/api/advisory", response_model=AdvisoryResponse)
def create_advisory(payload: AdvisoryRequest) -> AdvisoryResponse:
    district = DISTRICTS.get(payload.district_id)
    if district is None:
        raise HTTPException(status_code=404, detail="Unknown district_id")
    crop = CROPS.get(payload.crop_id)
    if crop is None:
        raise HTTPException(status_code=404, detail="Unknown crop_id")

    result = compute_advisory(
        crop_id=payload.crop_id,
        growth_stage=payload.growth_stage,
        soil_type=payload.soil_type_override or district.dominant_soil,
        irrigation_method=payload.irrigation_method,
        area_hectares=payload.area_hectares,
        lat_deg=district.lat,
        typical_tmax_c=district.typical_tmax_c,
        typical_tmin_c=district.typical_tmin_c,
        typical_seasonal_rainfall_mm=district.typical_seasonal_rainfall_mm,
        manual_tmax_c=payload.manual_tmax_c,
        manual_tmin_c=payload.manual_tmin_c,
        manual_rainfall_last_7_days_mm=payload.manual_rainfall_last_7_days_mm,
    )

    return AdvisoryResponse(
        district_name=district.name,
        crop_name=crop.name,
        eto_mm_day=result.eto_mm_day,
        kc=result.kc,
        etc_mm_day=result.etc_mm_day,
        effective_rainfall_mm_day=result.effective_rainfall_mm_day,
        net_irrigation_mm_day=result.net_irrigation_mm_day,
        irrigation_interval_days=result.irrigation_interval_days,
        gross_irrigation_mm=result.gross_irrigation_mm,
        total_water_liters=result.total_water_liters,
        stress_level=result.stress_level,
        used_sample_climate=result.used_sample_climate,
    )
