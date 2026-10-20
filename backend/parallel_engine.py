import os
import time
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass

import numpy as np


@dataclass
class WorkloadRecord:
    tmax_c: float
    tmin_c: float
    lat_deg: float
    day_of_year: int
    kc: float
    rainfall_mm_day: float


@dataclass
class BenchmarkRun:
    mode: str
    workers: int
    time_seconds: float
    speedup: float


def generate_workload(n: int) -> list[WorkloadRecord]:
    rng = np.random.default_rng()
    tmax = rng.uniform(26, 42, n)
    tmin = tmax - rng.uniform(6, 16, n)
    lat = rng.uniform(8, 33, n)
    doy = rng.integers(1, 366, n)
    kc = rng.uniform(0.3, 1.25, n)
    rain = rng.uniform(0, 12, n)
    return [
        WorkloadRecord(float(tmax[i]), float(tmin[i]), float(lat[i]), int(doy[i]), float(kc[i]), float(rain[i]))
        for i in range(n)
    ]


def _etc_for_record(r: WorkloadRecord) -> float:
    phi = np.radians(r.lat_deg)
    dr = 1 + 0.033 * np.cos(2 * np.pi * r.day_of_year / 365)
    delta = 0.409 * np.sin(2 * np.pi * r.day_of_year / 365 - 1.39)
    cos_ws = np.clip(-np.tan(phi) * np.tan(delta), -1.0, 1.0)
    ws = np.arccos(cos_ws)
    ra_mj = (24 * 60 / np.pi) * 0.0820 * dr * (ws * np.sin(phi) * np.sin(delta) + np.cos(phi) * np.cos(delta) * np.sin(ws))
    ra_mm = 0.408 * ra_mj
    tmean = (r.tmax_c + r.tmin_c) / 2
    eto = 0.0023 * ra_mm * (tmean + 17.8) * np.sqrt(max(r.tmax_c - r.tmin_c, 0.1))
    etc = r.kc * eto
    return float(max(etc - r.rainfall_mm_day * 0.75 / 7, 0.0))


def _process_chunk(records: list[WorkloadRecord]) -> list[float]:
    return [_etc_for_record(r) for r in records]


def run_serial(records: list[WorkloadRecord]) -> tuple[list[float], float]:
    start = time.perf_counter()
    results = _process_chunk(records)
    return results, time.perf_counter() - start


def run_multiprocess(records: list[WorkloadRecord], workers: int) -> tuple[list[float], float]:
    chunks: list[list[WorkloadRecord]] = [list(c) for c in np.array_split(np.array(records, dtype=object), workers) if len(c) > 0]
    start = time.perf_counter()
    with ProcessPoolExecutor(max_workers=workers) as pool:
        chunk_results = list(pool.map(_process_chunk, chunks))
    elapsed = time.perf_counter() - start
    results = [v for chunk in chunk_results for v in chunk]
    return results, elapsed


def run_vectorized(records: list[WorkloadRecord]) -> tuple[list[float], float]:
    start = time.perf_counter()
    tmax = np.array([r.tmax_c for r in records])
    tmin = np.array([r.tmin_c for r in records])
    lat = np.array([r.lat_deg for r in records])
    doy = np.array([r.day_of_year for r in records])
    kc = np.array([r.kc for r in records])
    rain = np.array([r.rainfall_mm_day for r in records])

    phi = np.radians(lat)
    dr = 1 + 0.033 * np.cos(2 * np.pi * doy / 365)
    delta = 0.409 * np.sin(2 * np.pi * doy / 365 - 1.39)
    cos_ws = np.clip(-np.tan(phi) * np.tan(delta), -1.0, 1.0)
    ws = np.arccos(cos_ws)
    ra_mj = (24 * 60 / np.pi) * 0.0820 * dr * (ws * np.sin(phi) * np.sin(delta) + np.cos(phi) * np.cos(delta) * np.sin(ws))
    ra_mm = 0.408 * ra_mj
    tmean = (tmax + tmin) / 2
    eto = 0.0023 * ra_mm * (tmean + 17.8) * np.sqrt(np.maximum(tmax - tmin, 0.1))
    etc = kc * eto
    nir = np.maximum(etc - rain * 0.75 / 7, 0.0)
    elapsed = time.perf_counter() - start
    return nir.tolist(), elapsed


def estimate_serial_fraction(points: list[tuple[int, float]]) -> float:
    candidates = [c / 1000 for c in range(0, 1001)]
    best_s, best_err = 0.5, float("inf")
    for s in candidates:
        err = 0.0
        for p, speedup in points:
            if p <= 1:
                continue
            predicted = 1 / (s + (1 - s) / p)
            err += (speedup - predicted) ** 2
        if err < best_err:
            best_err = err
            best_s = s
    return best_s


def amdahl_curve(serial_fraction: float, max_workers: int) -> list[dict]:
    return [
        {"workers": p, "theoretical_speedup": round(1 / (serial_fraction + (1 - serial_fraction) / p), 3)}
        for p in range(1, max_workers + 1)
    ]


def run_benchmark_suite(workload_size: int, max_workers: int | None = None) -> dict:
    available_cores = os.cpu_count() or 1
    capped_workers = min(max_workers or available_cores, available_cores, 8)
    worker_counts = sorted({1, 2, max(2, capped_workers // 2), capped_workers})
    worker_counts = [w for w in worker_counts if w <= capped_workers]

    records = generate_workload(workload_size)

    serial_results, serial_time = run_serial(records)
    runs: list[BenchmarkRun] = [BenchmarkRun("serial", 1, round(serial_time, 5), 1.0)]

    for workers in worker_counts:
        if workers == 1:
            continue
        try:
            _, elapsed = run_multiprocess(records, workers)
        except Exception:
            continue
        speedup = serial_time / elapsed if elapsed > 0 else 0.0
        runs.append(BenchmarkRun("multiprocess", workers, round(elapsed, 5), round(speedup, 3)))

    _, vec_time = run_vectorized(records)
    vec_speedup = serial_time / vec_time if vec_time > 0 else 0.0
    runs.append(BenchmarkRun("vectorized", 1, round(vec_time, 5), round(vec_speedup, 3)))

    measured_points = [(r.workers, r.speedup) for r in runs if r.mode == "multiprocess"]
    serial_fraction = estimate_serial_fraction(measured_points) if measured_points else 1.0

    return {
        "results": runs,
        "amdahl_curve": amdahl_curve(serial_fraction, max(capped_workers, 8)),
        "estimated_serial_fraction": round(serial_fraction, 3),
        "cpu_count": available_cores,
        "workload_size": workload_size,
    }
