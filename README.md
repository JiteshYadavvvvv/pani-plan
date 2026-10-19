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
echo "CORS_ORIGINS=http://localhost:3000,https://pani-plan.vercel.app" > .env
uvicorn main:app --reload --port 8000
```

The API is served at `http://localhost:8000`. Health check: `GET /api/health`. `backend/.env` is gitignored and local-only; the production backend deployment reads `CORS_ORIGINS` from its own Vercel project settings (falling back to the same default if unset).

## Running the frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000" > .env
npm run dev
```

The app is served at `http://localhost:3000`. `frontend/.env` is gitignored and local-only; it must point `NEXT_PUBLIC_API_BASE_URL` at whichever backend you're running against. In production (Vercel), set `NEXT_PUBLIC_API_BASE_URL=https://backend-f8cz.vercel.app` as a project environment variable in the frontend's Vercel dashboard — this is required for the deployed site to work, since `.env` files are never read for Vercel builds.

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
