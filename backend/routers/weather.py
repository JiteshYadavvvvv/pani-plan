from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from datasets import DISTRICTS
from gemini_service import call_gemini_json, get_api_key

router = APIRouter()

_weather_cache: dict[str, tuple[dict, float]] = {}
_CACHE_TTL = 600.0


class WeatherResponse(BaseModel):
    model_config = {"extra": "ignore"}

    district_id: str
    district_name: str
    lat: float
    lng: float
    current: dict[str, Any]
    forecast: list[dict[str, Any]]
    source: str
    cached: bool
    fetched_at: str


class WeatherAdvisoryRequest(BaseModel):
    district_id: str
    crop_name: str | None = None
    growth_stage: str | None = None
    soil_type: str | None = None
    language: str = Field(default="en")


class WeatherAdvisoryResponse(BaseModel):
    model_config = {"extra": "ignore"}

    district_id: str
    district_name: str
    forecast_source: str
    forecast_period: str
    summary_headline: str
    rainfall_analysis: str
    heat_stress_assessment: str
    irrigation_recommendation: str
    next_review_date: str
    uncertainty_note: str
    provider: str
    is_ai_generated: bool
    total_expected_rain_mm: float


def _fetch_live_weather(district_id: str) -> dict[str, Any]:
    district = DISTRICTS.get(district_id)
    if district is None:
        raise HTTPException(status_code=404, detail=f"District '{district_id}' not found")

    now = time.monotonic()
    cached_entry = _weather_cache.get(district_id)
    if cached_entry is not None:
        cached_data, cached_at = cached_entry
        if now - cached_at < _CACHE_TTL:
            cached_data["cached"] = True
            return cached_data

    params = urllib.parse.urlencode(
        {
            "latitude": district.lat,
            "longitude": district.lng,
            "current": "temperature_2m,relative_humidity_2m,precipitation,weathercode,wind_speed_10m",
            "daily": "precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,weathercode,wind_speed_10m_max",
            "forecast_days": 7,
            "timezone": "auto",
        }
    )
    url = f"https://api.open-meteo.com/v1/forecast?{params}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "PaaniPlan/1.0 (Agricultural Hydrology)"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            raw = json.loads(resp.read().decode())
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Weather service temporarily unavailable: {exc}")

    fetched_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    current_raw = raw.get("current", {})
    current = {
        "temperature_c": current_raw.get("temperature_2m"),
        "relative_humidity_pct": current_raw.get("relative_humidity_2m"),
        "precipitation_mm": current_raw.get("precipitation"),
        "weathercode": current_raw.get("weathercode"),
        "wind_speed_kmh": current_raw.get("wind_speed_10m"),
        "observed_at": current_raw.get("time"),
    }

    daily_raw = raw.get("daily", {})
    times = daily_raw.get("time", [])
    max_temps = daily_raw.get("temperature_2m_max", [])
    min_temps = daily_raw.get("temperature_2m_min", [])
    precip_sums = daily_raw.get("precipitation_sum", [])
    precip_probs = daily_raw.get("precipitation_probability_max", [])
    weather_codes = daily_raw.get("weathercode", [])
    wind_max = daily_raw.get("wind_speed_10m_max", [])

    forecast = []
    for i in range(len(times)):
        forecast.append(
            {
                "date": times[i],
                "temp_max_c": max_temps[i] if i < len(max_temps) else None,
                "temp_min_c": min_temps[i] if i < len(min_temps) else None,
                "precipitation_mm": precip_sums[i] if i < len(precip_sums) else 0.0,
                "precipitation_probability_pct": precip_probs[i] if i < len(precip_probs) else None,
                "weathercode": weather_codes[i] if i < len(weather_codes) else 0,
                "wind_speed_max_kmh": wind_max[i] if i < len(wind_max) else None,
            }
        )

    payload: dict[str, Any] = {
        "district_id": district_id,
        "district_name": district.name,
        "lat": district.lat,
        "lng": district.lng,
        "current": current,
        "forecast": forecast,
        "source": "Open-Meteo High-Resolution Numerical Model",
        "fetched_at": fetched_at,
        "cached": False,
    }

    _weather_cache[district_id] = (dict(payload), now)
    return payload


@router.get("/api/weather", response_model=WeatherResponse)
def get_weather(district_id: str = Query(...)) -> WeatherResponse:
    data = _fetch_live_weather(district_id)
    return WeatherResponse(**data)


@router.post("/api/weather/ai-advisory", response_model=WeatherAdvisoryResponse)
def get_weather_advisory(req: WeatherAdvisoryRequest) -> WeatherAdvisoryResponse:
    weather = _fetch_live_weather(req.district_id)
    forecast = weather.get("forecast", [])
    total_rain = sum(f.get("precipitation_mm", 0.0) or 0.0 for f in forecast)
    max_temps = [f.get("temp_max_c") for f in forecast if f.get("temp_max_c") is not None]
    peak_temp = max(max_temps) if max_temps else 32.0

    start_date = forecast[0]["date"] if forecast else "Today"
    end_date = forecast[-1]["date"] if forecast else "7 days"
    period_str = f"{start_date} to {end_date} (7-day forecast)"

    crop_name = req.crop_name or "General field crops"
    growth_stage = req.growth_stage or "Current stage"
    soil_type = req.soil_type or "Loam"

    breakdown_items = [f"{f.get('date')}: {f.get('precipitation_mm', 0)}mm" for f in forecast]
    breakdown_str = ", ".join(breakdown_items)

    api_key = get_api_key()
    if api_key:
        prompt = (
            f"You are an expert agrometeorologist for Indian agriculture. "
            f"Analyze this verified 7-day weather forecast from Open-Meteo for {weather['district_name']} district and "
            f"generate a grounded irrigation advisory in language '{req.language}'.\n\n"
            f"Verified Weather Forecast Data:\n"
            f"- Total expected 7-day rainfall: {total_rain:.1f} mm\n"
            f"- Peak daytime temperature: {peak_temp:.1f} °C\n"
            f"- Current temperature: {weather['current'].get('temperature_c', 'N/A')} °C, humidity: {weather['current'].get('relative_humidity_pct', 'N/A')}%\n"
            f"- Daily rainfall breakdown: {breakdown_str}\n\n"
            f"Farmer Context:\n"
            f"- Crop: {crop_name}\n"
            f"- Growth stage: {growth_stage}\n"
            f"- Soil type: {soil_type}\n\n"
            f"Adhere strictly to this JSON schema with no markdown fences:\n"
            "{\n"
            '  "summary_headline": string,\n'
            '  "rainfall_analysis": string,\n'
            '  "heat_stress_assessment": string,\n'
            '  "irrigation_recommendation": string,\n'
            '  "next_review_date": string,\n'
            '  "uncertainty_note": string\n'
            "}\n"
            "Rules:\n"
            "1. Ground advice strictly in the numerical forecast data provided.\n"
            "2. If total rain > 15mm, advise evaluating postponement of surface watering.\n"
            "3. If temperatures exceed 37°C, advise morning or evening irrigation to minimize evaporative loss.\n"
            f"4. Language of generated fields should be in requested language code: {req.language}"
        )

        try:
            parsed, model_used = call_gemini_json(
                prompt_text=prompt,
                system_instruction="You are an agricultural meteorological advisor. Return strictly valid JSON."
            )
            return WeatherAdvisoryResponse(
                district_id=req.district_id,
                district_name=weather["district_name"],
                forecast_source=weather["source"],
                forecast_period=period_str,
                summary_headline=parsed.get("summary_headline", f"7-Day Weather Advisory for {weather['district_name']}"),
                rainfall_analysis=parsed.get("rainfall_analysis", f"Expected cumulative rainfall of {total_rain:.1f} mm over the next 7 days."),
                heat_stress_assessment=parsed.get("heat_stress_assessment", f"Maximum daytime temperature reaches {peak_temp:.1f} °C."),
                irrigation_recommendation=parsed.get("irrigation_recommendation", "Adjust irrigation timing to match actual soil moisture status."),
                next_review_date=parsed.get("next_review_date", forecast[2]["date"] if len(forecast) > 2 else "3 days"),
                uncertainty_note=parsed.get("uncertainty_note", "Forecast probabilities beyond 3 days carry standard numerical modeling variance; monitor sky conditions."),
                provider=model_used,
                is_ai_generated=True,
                total_expected_rain_mm=round(total_rain, 1),
            )
        except Exception:
            pass

    if total_rain >= 20.0:
        rec = f"Significant rainfall of ~{total_rain:.1f} mm is forecast across the next 7 days. Postpone scheduled irrigation to avoid waterlogging and root hypoxia."
    elif total_rain >= 8.0:
        rec = f"Moderate rainfall (~{total_rain:.1f} mm) is expected. Reduce the planned irrigation volume by ~35% and monitor soil moisture before the next watering."
    elif peak_temp >= 36.0:
        rec = f"Hot weather forecast with peak temperatures of {peak_temp:.1f} °C. Evapotranspiration will be accelerated. Irrigate during early morning or late evening hours to minimize evaporative losses."
    else:
        rec = f"Normal weather conditions with minimal rainfall ({total_rain:.1f} mm) and moderate temperatures ({peak_temp:.1f} °C max). Proceed with the standard FAO-56 irrigation schedule."

    return WeatherAdvisoryResponse(
        district_id=req.district_id,
        district_name=weather["district_name"],
        forecast_source=weather["source"],
        forecast_period=period_str,
        summary_headline=f"Agronomic Weather Advisory ({weather['district_name']})",
        rainfall_analysis=f"Total forecasted 7-day precipitation is {total_rain:.1f} mm across {len(forecast)} forecast days.",
        heat_stress_assessment=f"Peak daytime temperature expected at {peak_temp:.1f} °C.",
        irrigation_recommendation=rec,
        next_review_date=forecast[2]["date"] if len(forecast) > 2 else "In 3 days",
        uncertainty_note="Open-Meteo numerical model forecast. Check real precipitation and soil moisture before turning on high-volume irrigation pumps.",
        provider="deterministic-agronomic-engine",
        is_ai_generated=False,
        total_expected_rain_mm=round(total_rain, 1),
    )
