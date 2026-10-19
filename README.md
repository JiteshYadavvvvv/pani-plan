# PaaniPlan

Ek line mein sinchai salah — practical, science-backed irrigation advice for Indian farms, built on real crop-water-balance formulas and a genuinely parallel computing engine.

## Project structure

```
pani-plan/
  backend/    FastAPI service: irrigation calculations, sample dataset, parallel-processing benchmark engine
  frontend/   Next.js 14 (App Router, TypeScript, Tailwind) application
```

## Running the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

The API is served at `http://localhost:8000`. Health check: `GET /api/health`.

## Running the frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The app is served at `http://localhost:3000`. `BACKEND_URL` in `frontend/.env` must point at the running backend (defaults to `http://localhost:8000`).

## What's real and what's a sample

- Irrigation math (`backend/water_calc.py`) is a genuine implementation of the Hargreaves-Samani reference evapotranspiration equation and the FAO-56 crop-coefficient method, computed fresh on every request.
- The district and crop dataset (`backend/datasets.py`) is a curated sample for demonstration — not a live government feed. Every API response that includes it is flagged `is_sample_data: true`, and the UI surfaces a "demo dataset" badge wherever it's shown.
- The Parallel Processing Lab (`backend/parallel_engine.py`) runs a real batch workload three ways — a serial loop, a multi-core pool via `concurrent.futures.ProcessPoolExecutor`, and a NumPy-vectorized pass — and times each one live with `time.perf_counter()`. There is no GPU mode and no staged numbers.

## Quality checks

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```
