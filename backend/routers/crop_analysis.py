from __future__ import annotations

import os
from typing import Any, Literal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from gemini_service import call_gemini_multimodal, test_gemini_connection

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 10_000_000


class DiagnosticResponse(BaseModel):
    configured: bool
    status: str
    message: str
    model: str = "gemini-1.5-flash"
    masked_key: str = "None"


class CropAnalysisResponse(BaseModel):
    model_config = {"extra": "ignore"}

    crop_identified: str | None
    condition_type: Literal[
        "healthy",
        "suspected_disease",
        "abiotic_stress",
        "pest_damage",
        "poor_image_quality",
        "inconclusive",
    ]
    suspected_issue: str | None
    visible_symptoms: list[str] = []
    affected_parts: list[str] = []
    potential_causes: list[str] = []
    alternative_explanations: list[str] = []
    confidence_level: Literal["high", "moderate", "low", "uncertain"] = "uncertain"
    confidence_note: str
    abiotic_factors: list[str] = []
    recommendations: list[str] = []
    preventive_measures: list[str] = []
    irrigation_guidance: str | None = None
    follow_up_advice: list[str] = []
    uncertainty_note: str
    needs_expert: bool = True
    image_quality: Literal["good", "fair", "poor"] = "fair"
    provider: str = "gemini-1.5-flash"
    context_used: dict[str, Any] = {}


@router.get("/api/crop-analysis/diagnostic", response_model=DiagnosticResponse)
def crop_analysis_diagnostic() -> DiagnosticResponse:
    info = test_gemini_connection()
    return DiagnosticResponse(
        configured=info.get("configured", False),
        status=info.get("status", "unknown"),
        message=info.get("message", "No diagnostic message available"),
        model=info.get("model", "gemini-1.5-flash"),
        masked_key=info.get("masked_key", "None"),
    )


@router.get("/api/crop-analysis/status")
def crop_analysis_status() -> dict[str, Any]:
    key = os.environ.get("GEMINI_API_KEY")
    return {
        "configured": bool(key and key.strip()),
        "provider": "gemini-1.5-flash",
        "model": "gemini-1.5-flash",
    }


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
            detail=f"Unsupported image format: {image.content_type}. Please upload a JPEG, PNG, or WebP image.",
        )

    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Image size exceeds 10 MB limit ({len(image_bytes) / 1_000_000:.1f} MB uploaded).",
        )

    prompt = (
        "You are an expert plant pathologist, agronomist, and agricultural extension specialist. "
        "Analyze this crop, leaf, fruit, or plant photograph thoroughly and return an evidence-grounded assessment.\n\n"
        f"Farmer Context Provided:\n"
        f"- Self-reported crop: {crop_name or 'Unspecified'}\n"
        f"- Location/district: {location or 'Unspecified'}\n"
        f"- Growth stage: {growth_stage or 'Unspecified'}\n"
        f"- Observed field symptoms: {symptoms or 'None described'}\n\n"
        "Return strictly valid JSON with no markdown wrapping and no code fences, with exactly these keys:\n"
        "{\n"
        '  "crop_identified": string or null,\n'
        '  "condition_type": "healthy" | "suspected_disease" | "abiotic_stress" | "pest_damage" | "poor_image_quality" | "inconclusive",\n'
        '  "suspected_issue": string or null,\n'
        '  "visible_symptoms": [string],\n'
        '  "affected_parts": [string],\n'
        '  "potential_causes": [string],\n'
        '  "alternative_explanations": [string],\n'
        '  "confidence_level": "high" | "moderate" | "low" | "uncertain",\n'
        '  "confidence_note": string,\n'
        '  "abiotic_factors": [string],\n'
        '  "recommendations": [string],\n'
        '  "preventive_measures": [string],\n'
        '  "irrigation_guidance": string or null,\n'
        '  "follow_up_advice": [string],\n'
        '  "uncertainty_note": string,\n'
        '  "needs_expert": boolean,\n'
        '  "image_quality": "good" | "fair" | "poor"\n'
        "}\n\n"
        "Strict Agronomic Rules:\n"
        "1. Never diagnose a disease with 100% certainty from a photo alone; visual symptoms often overlap between nutritional deficits, fungal pathogens, and water stress.\n"
        "2. If the photo does not depict a plant or is out-of-focus, set condition_type to 'poor_image_quality' or 'inconclusive'.\n"
        "3. Provide practical cultural, physical, biological, and irrigation management recommendations first. Do not prescribe high-potency chemical pesticides without local soil/lab testing.\n"
        "4. In confidence_note and uncertainty_note, honestly clarify what can and cannot be confirmed without laboratory tissue analysis."
    )

    try:
        parsed, model_used = call_gemini_multimodal(
            prompt_text=prompt,
            image_bytes=image_bytes,
            mime_type=image.content_type,
            system_instruction="You are an agricultural diagnostic system. Return only structured valid JSON.",
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except PermissionError as perm_err:
        raise HTTPException(
            status_code=403,
            detail="Gemini API authentication failed. Verify GEMINI_API_KEY in your deployment environment variables.",
        )
    except RuntimeError as run_err:
        msg = str(run_err)
        if "rate limit" in msg.lower() or "quota" in msg.lower():
            raise HTTPException(status_code=429, detail="Gemini API rate limit reached. Please retry in 1 minute.")
        if "not configured" in msg.lower():
            raise HTTPException(status_code=503, detail="Gemini API key is not configured on the backend server.")
        raise HTTPException(status_code=502, detail=f"Gemini API upstream error: {msg}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected error processing crop photo: {exc}")

    context: dict[str, Any] = {}
    if crop_name:
        context["crop_name"] = crop_name
    if location:
        context["location"] = location
    if growth_stage:
        context["growth_stage"] = growth_stage
    if symptoms:
        context["symptoms"] = symptoms

    condition = parsed.get("condition_type", "inconclusive")
    if condition not in (
        "healthy",
        "suspected_disease",
        "abiotic_stress",
        "pest_damage",
        "poor_image_quality",
        "inconclusive",
    ):
        condition = "inconclusive"

    conf_level = parsed.get("confidence_level", "uncertain")
    if conf_level not in ("high", "moderate", "low", "uncertain"):
        conf_level = "uncertain"

    img_qual = parsed.get("image_quality", "fair")
    if img_qual not in ("good", "fair", "poor"):
        img_qual = "fair"

    return CropAnalysisResponse(
        crop_identified=parsed.get("crop_identified"),
        condition_type=condition,
        suspected_issue=parsed.get("suspected_issue"),
        visible_symptoms=parsed.get("visible_symptoms") or [],
        affected_parts=parsed.get("affected_parts") or [],
        potential_causes=parsed.get("potential_causes") or [],
        alternative_explanations=parsed.get("alternative_explanations") or [],
        confidence_level=conf_level,
        confidence_note=parsed.get("confidence_note") or "Visual observation only.",
        abiotic_factors=parsed.get("abiotic_factors") or [],
        recommendations=parsed.get("recommendations") or [],
        preventive_measures=parsed.get("preventive_measures") or [],
        irrigation_guidance=parsed.get("irrigation_guidance"),
        follow_up_advice=parsed.get("follow_up_advice") or [],
        uncertainty_note=parsed.get("uncertainty_note") or "Laboratory testing is recommended for definitive diagnosis.",
        needs_expert=bool(parsed.get("needs_expert", True)),
        image_quality=img_qual,
        provider=model_used,
        context_used=context,
    )
