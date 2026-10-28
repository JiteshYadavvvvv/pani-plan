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


class CropAnalysisResponse(BaseModel):
    model_config = {"extra": "forbid"}

    crop_identified: str | None
    condition_type: str
    suspected_issue: str | None
    confidence_note: str
    abiotic_factors: list[str]
    recommendations: list[str]
    uncertainty_note: str
    needs_expert: bool
    image_quality: str
    provider: str
    context_used: dict[str, Any]


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
            detail="Crop analysis service not configured. Set GEMINI_API_KEY.",
        )

    import google.generativeai as genai
    from google.api_core.exceptions import ResourceExhausted

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt_text = (
        "You are an agricultural expert assistant. Analyze this crop/plant photograph and provide an honest, "
        "qualified assessment. Return ONLY valid JSON with no markdown or code fences. "
        f"Context provided by the farmer: crop={crop_name}, location={location}, "
        f"growth stage={growth_stage}, symptoms described={symptoms}.\n\n"
        "The JSON must have exactly these keys: crop_identified (string or null), "
        "condition_type (one of: healthy, suspected_disease, abiotic_stress, pest_damage, poor_image_quality, inconclusive), "
        "suspected_issue (string or null), confidence_note (string - be honest about uncertainty), "
        "abiotic_factors (array of strings), recommendations (array of 2-4 strings), "
        "uncertainty_note (string - state what cannot be determined from photo alone), "
        "needs_expert (boolean), image_quality (one of: good, fair, poor).\n\n"
        "Important: Do NOT claim definitive diagnoses. Use language like 'suspected', 'possible', 'appears to'. "
        "If the image is unclear or insufficient, say so. For any suspected disease or pest issue, always recommend "
        "confirming with a local agricultural extension officer."
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
        raise HTTPException(status_code=429, detail="Crop analysis rate limit exceeded. Please try again later.")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Crop analysis service error: {exc}")

    try:
        parsed = json.loads(result_text.strip())
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="Crop analysis service returned an unparseable response.",
        )

    context_used: dict[str, Any] = {}
    if crop_name is not None:
        context_used["crop_name"] = crop_name
    if location is not None:
        context_used["location"] = location
    if growth_stage is not None:
        context_used["growth_stage"] = growth_stage
    if symptoms is not None:
        context_used["symptoms"] = symptoms

    return CropAnalysisResponse(
        crop_identified=parsed.get("crop_identified"),
        condition_type=parsed["condition_type"],
        suspected_issue=parsed.get("suspected_issue"),
        confidence_note=parsed["confidence_note"],
        abiotic_factors=parsed.get("abiotic_factors", []),
        recommendations=parsed.get("recommendations", []),
        uncertainty_note=parsed["uncertainty_note"],
        needs_expert=parsed["needs_expert"],
        image_quality=parsed["image_quality"],
        provider="gemini-1.5-flash",
        context_used=context_used,
    )
