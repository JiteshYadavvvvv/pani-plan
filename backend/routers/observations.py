from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()


class ObservationCreate(BaseModel):
    model_config = {"extra": "ignore"}

    field_label: str
    district_id: str
    crop_id: str
    growth_stage: str
    advisory_result: dict[str, Any] = {}
    crop_analysis_result: dict[str, Any] | None = None
    notes: str | None = None


class ObservationOut(BaseModel):
    model_config = {"extra": "ignore"}

    id: str
    field_label: str
    district_id: str
    crop_id: str
    created_at: str


class ObservationsStatus(BaseModel):
    configured: bool


def _get_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        return None
    from supabase import create_client
    return create_client(url, key)


@router.get("/api/observations/status", response_model=ObservationsStatus)
def observations_status() -> ObservationsStatus:
    client = _get_client()
    return ObservationsStatus(configured=client is not None)


@router.post("/api/observations", response_model=ObservationOut)
def create_observation(body: ObservationCreate) -> ObservationOut:
    client = _get_client()
    if client is None:
        raise HTTPException(
            status_code=503,
            detail={"detail": "Persistence not configured", "configured": False},
        )

    record = body.model_dump()

    try:
        result = client.table("observations").insert(record).execute()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Database error: {exc}")

    row = result.data[0]
    return ObservationOut(
        id=str(row["id"]),
        field_label=row["field_label"],
        district_id=row["district_id"],
        crop_id=row["crop_id"],
        created_at=row["created_at"],
    )


@router.get("/api/observations", response_model=list[ObservationOut])
def list_observations(limit: int = Query(20)) -> list[ObservationOut]:
    client = _get_client()
    if client is None:
        raise HTTPException(
            status_code=503,
            detail={"detail": "Persistence not configured", "configured": False},
        )

    try:
        result = (
            client.table("observations")
            .select("id,field_label,district_id,crop_id,created_at")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Database error: {exc}")

    return [
        ObservationOut(
            id=str(row["id"]),
            field_label=row["field_label"],
            district_id=row["district_id"],
            crop_id=row["crop_id"],
            created_at=row["created_at"],
        )
        for row in result.data
    ]
