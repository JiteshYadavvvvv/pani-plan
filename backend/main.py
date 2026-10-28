import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import advisory, explore, lab, crop_analysis, weather, observations

app = FastAPI(title="PaaniPlan API", version="1.0.0")

default_origins = "http://localhost:3000,https://pani-plan.vercel.app"
allowed_origins = os.environ.get("CORS_ORIGINS", default_origins).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(advisory.router)
app.include_router(explore.router)
app.include_router(lab.router)
app.include_router(crop_analysis.router)
app.include_router(weather.router)
app.include_router(observations.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
