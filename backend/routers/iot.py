from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

_registered_devices: dict[str, dict[str, Any]] = {}
_latest_telemetry: dict[str, dict[str, Any]] = {}


class DeviceRegistrationRequest(BaseModel):
    device_id: str = Field(min_length=3, max_length=64)
    field_id: str
    sensor_model: str = "Capacitive Soil Moisture Sensor v1.2"
    location_description: str | None = None


class DeviceRegistrationResponse(BaseModel):
    device_id: str
    field_id: str
    api_token: str
    sensor_model: str
    registered_at: str
    ingest_endpoint: str


class TelemetryIngestPayload(BaseModel):
    device_id: str
    soil_moisture_pct: float = Field(ge=0.0, le=100.0)
    soil_temperature_c: float | None = Field(default=None, ge=-10.0, le=60.0)
    battery_voltage_v: float | None = Field(default=None, ge=1.0, le=6.0)
    signal_rssi_dbm: int | None = Field(default=None, ge=-130, le=0)
    timestamp: str | None = None


class TelemetryResponse(BaseModel):
    status: str
    device_id: str
    recorded_at: str
    water_depletion_risk: Literal["none", "moderate", "critical"]
    actionable_advice: str


class FieldIoTStatus(BaseModel):
    has_sensor: bool
    field_id: str
    device_id: str | None
    sensor_model: str | None
    connection_status: Literal["online", "idle", "offline", "unlinked"]
    latest_reading: dict[str, Any] | None
    sensor_recommendation: str | None


@router.post("/api/iot/register-device", response_model=DeviceRegistrationResponse)
def register_device(req: DeviceRegistrationRequest) -> DeviceRegistrationResponse:
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    token = f"iot_{secrets.token_hex(16)}"

    record = {
        "device_id": req.device_id,
        "field_id": req.field_id,
        "api_token": token,
        "sensor_model": req.sensor_model,
        "registered_at": now_iso,
        "location_description": req.location_description,
    }
    _registered_devices[req.device_id] = record

    return DeviceRegistrationResponse(
        device_id=req.device_id,
        field_id=req.field_id,
        api_token=token,
        sensor_model=req.sensor_model,
        registered_at=now_iso,
        ingest_endpoint="/api/iot/ingest",
    )


@router.post("/api/iot/ingest", response_model=TelemetryResponse)
def ingest_telemetry(
    payload: TelemetryIngestPayload,
    x_sensor_token: str | None = Header(None),
) -> TelemetryResponse:
    dev = _registered_devices.get(payload.device_id)
    if dev is not None and x_sensor_token:
        if dev.get("api_token") != x_sensor_token:
            raise HTTPException(status_code=401, detail="Invalid sensor API token.")

    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    rec_time = payload.timestamp or now_iso

    moisture = payload.soil_moisture_pct
    if moisture < 20.0:
        risk: Literal["none", "moderate", "critical"] = "critical"
        advice = "Soil moisture is below permanent wilting threshold (< 20%). Immediate irrigation required to prevent crop stress."
    elif moisture < 35.0:
        risk = "moderate"
        advice = "Soil moisture is approaching management allowed depletion (MAD). Prepare irrigation pump within 24 hours."
    else:
        risk = "none"
        advice = "Soil moisture is in the optimal root-zone available capacity range. No immediate irrigation needed."

    telemetry_record = {
        "device_id": payload.device_id,
        "soil_moisture_pct": payload.soil_moisture_pct,
        "soil_temperature_c": payload.soil_temperature_c,
        "battery_voltage_v": payload.battery_voltage_v,
        "signal_rssi_dbm": payload.signal_rssi_dbm,
        "recorded_at": rec_time,
        "received_at": now_iso,
        "water_depletion_risk": risk,
    }

    _latest_telemetry[payload.device_id] = telemetry_record

    return TelemetryResponse(
        status="success",
        device_id=payload.device_id,
        recorded_at=rec_time,
        water_depletion_risk=risk,
        actionable_advice=advice,
    )


@router.get("/api/iot/field/{field_id}", response_model=FieldIoTStatus)
def get_field_sensor_status(field_id: str) -> FieldIoTStatus:
    matched_device = None
    for d in _registered_devices.values():
        if d.get("field_id") == field_id:
            matched_device = d
            break

    if not matched_device:
        return FieldIoTStatus(
            has_sensor=False,
            field_id=field_id,
            device_id=None,
            sensor_model=None,
            connection_status="unlinked",
            latest_reading=None,
            sensor_recommendation="No physical soil moisture node is currently linked to this field. You can register an ESP32 or LoRaWAN node in settings.",
        )

    device_id = matched_device["device_id"]
    reading = _latest_telemetry.get(device_id)

    if not reading:
        return FieldIoTStatus(
            has_sensor=True,
            field_id=field_id,
            device_id=device_id,
            sensor_model=matched_device.get("sensor_model"),
            connection_status="offline",
            latest_reading=None,
            sensor_recommendation="Sensor node registered, but no telemetry packets have been received yet. Check battery and power on hardware.",
        )

    moisture = reading["soil_moisture_pct"]
    if moisture < 20.0:
        rec = f"Critical dryness detected ({moisture:.1f}% volumetric moisture). Trigger irrigation immediately."
    elif moisture < 35.0:
        rec = f"Depleting moisture ({moisture:.1f}% volumetric moisture). Plan watering in the next 24 hours."
    else:
        rec = f"Healthy root-zone moisture ({moisture:.1f}% volumetric moisture). Continue current schedule."

    return FieldIoTStatus(
        has_sensor=True,
        field_id=field_id,
        device_id=device_id,
        sensor_model=matched_device.get("sensor_model"),
        connection_status="online",
        latest_reading=reading,
        sensor_recommendation=rec,
    )


@router.get("/api/iot/devices")
def list_devices() -> list[dict[str, Any]]:
    results = []
    for dev_id, dev in _registered_devices.items():
        results.append(
            {
                "device_id": dev_id,
                "field_id": dev["field_id"],
                "sensor_model": dev["sensor_model"],
                "registered_at": dev["registered_at"],
                "has_telemetry": dev_id in _latest_telemetry,
                "latest_reading": _latest_telemetry.get(dev_id),
            }
        )
    return results

