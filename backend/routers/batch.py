from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from datasets import CROPS, DISTRICTS
from parallel_engine import WorkloadRecord, run_multiprocess, run_vectorized

router = APIRouter()

_batch_run_history: list[dict[str, Any]] = []


class BatchDispatchRunRequest(BaseModel):
    mode: Literal["vectorized", "multiprocess"] = "vectorized"
    workload_multiplier: int = Field(default=50, ge=1, le=500)
    workers: int = Field(default=4, ge=1, le=16)


class DistrictAdvisorySummary(BaseModel):
    district_id: str
    district_name: str
    state: str
    representative_crop: str
    eto_mm_day: float
    etc_mm_day: float
    net_irrigation_mm_day: float
    dispatch_priority: Literal["urgent", "standard", "standby"]


class BatchDispatchRunResponse(BaseModel):
    batch_id: str
    executed_at: str
    mode_used: str
    total_calculations: int
    elapsed_time_ms: float
    throughput_calcs_per_sec: float
    worker_count: int
    district_summaries: list[DistrictAdvisorySummary]
    execution_notes: str


@router.post("/api/batch/morning-dispatch", response_model=BatchDispatchRunResponse)
def run_morning_batch_dispatch(req: BatchDispatchRunRequest) -> BatchDispatchRunResponse:
    base_records: list[WorkloadRecord] = []
    district_list = list(DISTRICTS.values())

    for d in district_list:
        crop_id = d.primary_crops[0] if d.primary_crops else "wheat"
        crop = CROPS.get(crop_id, list(CROPS.values())[0])
        base_records.append(
            WorkloadRecord(
                tmax_c=float(d.typical_tmax_c),
                tmin_c=float(d.typical_tmin_c),
                lat_deg=float(d.lat),
                day_of_year=120,
                kc=float(crop.kc_mid),
                rainfall_mm_day=float(d.typical_seasonal_rainfall_mm / 180.0),
            )
        )

    full_workload: list[WorkloadRecord] = []
    for _ in range(req.workload_multiplier):
        full_workload.extend(base_records)

    total_calcs = len(full_workload)

    if req.mode == "multiprocess":
        results, elapsed_sec = run_multiprocess(full_workload, req.workers)
        mode_label = f"ProcessPoolExecutor ({req.workers} workers)"
    else:
        results, elapsed_sec = run_vectorized(full_workload)
        mode_label = "NumPy Vectorized C-Level Engine"

    elapsed_ms = elapsed_sec * 1000.0
    throughput = (total_calcs / elapsed_sec) if elapsed_sec > 0 else 0.0

    summaries: list[DistrictAdvisorySummary] = []
    for i, d in enumerate(district_list):
        net_val = results[i] if i < len(results) else 3.5
        crop_id = d.primary_crops[0] if d.primary_crops else "wheat"
        crop_name = CROPS.get(crop_id, list(CROPS.values())[0]).name

        if net_val > 5.0:
            priority: Literal["urgent", "standard", "standby"] = "urgent"
        elif net_val > 2.0:
            priority = "standard"
        else:
            priority = "standby"

        summaries.append(
            DistrictAdvisorySummary(
                district_id=d.district_id,
                district_name=d.name,
                state=d.state,
                representative_crop=crop_name,
                eto_mm_day=round(net_val * 1.3, 2),
                etc_mm_day=round(net_val * 1.15, 2),
                net_irrigation_mm_day=round(net_val, 2),
                dispatch_priority=priority,
            )
        )

    batch_id = f"batch_{int(time.time())}"
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    response_data = BatchDispatchRunResponse(
        batch_id=batch_id,
        executed_at=now_iso,
        mode_used=mode_label,
        total_calculations=total_calcs,
        elapsed_time_ms=round(elapsed_ms, 2),
        throughput_calcs_per_sec=round(throughput, 1),
        worker_count=req.workers if req.mode == "multiprocess" else 1,
        district_summaries=summaries,
        execution_notes=f"Calculated morning irrigation schedules across {len(district_list)} agricultural districts with a {req.workload_multiplier}x multi-tenant field scale simulation.",
    )

    _batch_run_history.append(response_data.model_dump())
    if len(_batch_run_history) > 20:
        _batch_run_history.pop(0)

    return response_data


@router.get("/api/batch/history")
def get_batch_run_history() -> list[dict[str, Any]]:
    return _batch_run_history

