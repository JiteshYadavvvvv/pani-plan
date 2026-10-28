from __future__ import annotations

import base64
import json
import os
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 10_000_000


class CropAnalysisStatus(BaseModel):
    configured: bool
    provider: str
    model: str


class CropAnalysisResponse(BaseModel):
    model_config = {"extra": "ignore"}

    crop_identified: str | None
    condition_type: str
    suspected_issue: str | None
    visible_symptoms: list[str] = []
    potential_causes: list[str] = []
    confidence_note: str
    abiotic_factors: list[str] = []
    recommendations: list[str] = []
    preventive_measures: list[str] = []
    uncertainty_note: str
    needs_expert: bool
    image_quality: str
    provider: str
    context_used: dict[str, Any] = {}


@router.get("/api/crop-analysis/status", response_model=CropAnalysisStatus)
def crop_analysis_status() -> CropAnalysisStatus:
    configured = bool(os.environ.get("GEMINI_API_KEY"))
    return CropAnalysisStatus(
        configured=configured,
        provider="gemini-1.5-flash",
        model="gemini-1.5-flash",
    )


@router.post("/api/crop-analysis", response_model=CropAnalysisResponse)
async def crop_analysis(
    image: UploadFile = File(...),
    crop_name: str | None = Form(None),
    location: str | None = Form(None),
    growth_stage: str | None = Form(None),
    symptoms: str | None = Form(None),
) -> CropAnalysisResponse:
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type '{image.content_type}'. Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}",
        )

    image_bytes = await image.read()
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image exceeds maximum size of 10MB")

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Crop analysis service not configured. Set GEMINI_API_KEY on the backend.",
        )

    import google.generativeai as genai
    from google.api_core.exceptions import ResourceExhausted

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        "gemini-1.5-flash",
        generation_config={"response_mime_type": "application/json"},
    )

    prompt_text = (
        "You are an agricultural plant pathologist and agronomist. Analyze this crop/leaf photograph "
        "and provide an honest, evidence-grounded assessment. Return strictly valid JSON with no markdown formatting.\n\n"
        f"Farmer context: crop={crop_name or 'unspecified'}, location={location or 'unspecified'}, "
        f"growth_stage={growth_stage or 'unspecified'}, symptoms_described={symptoms or 'unspecified'}.\n\n"
        "Return a JSON object with exactly these fields:\n"
        "- crop_identified: string or null\n"
        "- condition_type: one of ['healthy', 'suspected_disease', 'abiotic_stress', 'pest_damage', 'poor_image_quality', 'inconclusive']\n"
        "- suspected_issue: string or null\n"
        "- visible_symptoms: array of strings\n"
        "- potential_causes: array of strings\n"
        "- confidence_note: string\n"
        "- abiotic_factors: array of strings\n"
        "- recommendations: array of 2-4 strings\n"
        "- preventive_measures: array of 1-3 strings\n"
        "- uncertainty_note: string\n"
        "- needs_expert: boolean\n"
        "- image_quality: one of ['good', 'fair', 'poor']\n\n"
        "Guidelines:\n"
        "1. Do not claim definitive diagnoses. Use phrasing like 'suspected', 'possible', 'symptoms consistent with'.\n"
        "2. Do not recommend harsh chemical treatments without local testing. Recommend cultural and biological controls first.\n"
        "3. If image is blurry or unclear, set condition_type to 'poor_image_quality' or 'inconclusive'."
    )

    image_part = {
        "inline_data": {
            "mime_type": image.content_type,
            "data": base64.b64encode(image_bytes).decode(),
        }
    }

    try:
        response = model.generate_content(
            contents=[
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt_text},
                        image_part,
                    ],
                }
            ]
        )
        result_text = response.text
    except ResourceExhausted:
        raise HTTPException(status_code=429, detail="Crop analysis rate limit reached. Please wait a minute and retry.")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Crop analysis service error: {exc}")

    clean_text = result_text.strip()
    if clean_text.startswith("```"):
        lines = clean_text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        clean_text = "\n".join(lines).strip()

    try:
        parsed = json.loads(clean_text)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="Crop analysis service returned an unparseable response.",
        )

    context_used: dict[str, Any] = {}
    if crop_name:
        context_used["crop_name"] = crop_name
    if location:
        context_used["location"] = location
    if growth_stage:
        context_used["growth_stage"] = growth_stage
    if symptoms:
        context_used["symptoms"] = symptoms

    return CropAnalysisResponse(
        crop_identified=parsed.get("crop_identified"),
        condition_type=parsed.get("condition_type", "inconclusive"),
        suspected_issue=parsed.get("suspected_issue"),
        visible_symptoms=parsed.get("visible_symptoms", []),
        potential_causes=parsed.get("potential_causes", []),
        confidence_note=parsed.get("confidence_note", "Visual inspection only."),
        abiotic_factors=parsed.get("abiotic_factors", []),
        recommendations=parsed.get("recommendations", []),
        preventive_measures=parsed.get("preventive_measures", []),
        uncertainty_note=parsed.get("uncertainty_note", "Visual inspection cannot substitute for laboratory tissue testing."),
        needs_expert=bool(parsed.get("needs_expert", True)),
        image_quality=parsed.get("image_quality", "fair"),
        provider="gemini-1.5-flash",
        context_used=context_used,
    )
