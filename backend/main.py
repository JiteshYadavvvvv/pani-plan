import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import advisory, explore, lab

app = FastAPI(title="PaaniPlan API", version="1.0.0")

allowed_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")

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


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
