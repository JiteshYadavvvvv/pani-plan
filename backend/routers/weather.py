from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from datasets import DISTRICTS

router = APIRouter()

_weather_cache: dict[str, tuple[dict, float]] = {}
_CACHE_TTL = 600.0


class WeatherResponse(BaseModel):
    model_config = {"extra": "forbid"}

    district_id: str
    district_name: str
    lat: float
    lng: float
    current: dict[str, Any]
    forecast: list[dict[str, Any]]
    source: str
    cached: bool
    fetched_at: str


@router.get("/api/weather", response_model=WeatherResponse)
def get_weather(district_id: str = Query(...)) -> WeatherResponse:
    district = DISTRICTS.get(district_id)
    if district is None:
        raise HTTPException(status_code=404, detail=f"District '{district_id}' not found")

    now = time.monotonic()
    cached_entry = _weather_cache.get(district_id)
    if cached_entry is not None:
        cached_data, cached_at = cached_entry
        if now - cached_at < _CACHE_TTL:
            return WeatherResponse(**cached_data, cached=True)

    params = urllib.parse.urlencode(
        {
            "latitude": district.lat,
            "longitude": district.lng,
            "current": "temperature_2m,precipitation,weathercode,wind_speed_10m",
            "daily": "precipitation_sum,temperature_2m_max,temperature_2m_min,weathercode",
            "forecast_days": 3,
            "timezone": "auto",
        }
    )
    url = f"https://api.open-meteo.com/v1/forecast?{params}"

    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            raw = json.loads(resp.read().decode())
    except Exception:
        raise HTTPException(status_code=502, detail="Weather service temporarily unavailable")

    fetched_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    current_raw = raw.get("current", {})
    current = {
        "temperature_c": current_raw.get("temperature_2m"),
        "precipitation_mm": current_raw.get("precipitation"),
        "weathercode": current_raw.get("weathercode"),
        "wind_speed_kmh": current_raw.get("wind_speed_10m"),
        "observed_at": current_raw.get("time"),
    }

    daily_raw = raw.get("daily", {})
    times = daily_raw.get("time", [])
    forecast = [
        {
            "date": times[i],
            "temp_max_c": daily_raw.get("temperature_2m_max", [])[i],
            "temp_min_c": daily_raw.get("temperature_2m_min", [])[i],
            "precipitation_mm": daily_raw.get("precipitation_sum", [])[i],
            "weathercode": daily_raw.get("weathercode", [])[i],
        }
        for i in range(len(times))
    ]

    payload: dict[str, Any] = {
        "district_id": district_id,
        "district_name": district.name,
        "lat": district.lat,
        "lng": district.lng,
        "current": current,
        "forecast": forecast,
        "source": "Open-Meteo",
        "fetched_at": fetched_at,
    }

    _weather_cache[district_id] = (payload, now)

    return WeatherResponse(**payload, cached=False)
