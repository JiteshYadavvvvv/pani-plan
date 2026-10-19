from fastapi import APIRouter

from parallel_engine import run_benchmark_suite
from schemas import BenchmarkRequest, BenchmarkResponse

router = APIRouter()


@router.post("/api/benchmark", response_model=BenchmarkResponse)
def run_benchmark(payload: BenchmarkRequest) -> BenchmarkResponse:
    return run_benchmark_suite(payload.workload_size, payload.max_workers)
