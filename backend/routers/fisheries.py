from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from gemini_service import call_gemini_multimodal

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 10_000_000


class WaterQualityStandard(BaseModel):
    parameter: str
    optimal_range: str
    acceptable_range: str
    critical_threshold: str
    unit: str
    source: str


WATER_QUALITY_STANDARDS: list[WaterQualityStandard] = [
    WaterQualityStandard(
        parameter="Dissolved Oxygen (DO)",
        optimal_range="5.0 – 8.0",
        acceptable_range="3.5 – 5.0",
        critical_threshold="< 3.0 (Hypoxia risk)",
        unit="mg/L (ppm)",
        source="ICAR-CIFA & FAO Fisheries Technical Paper 474",
    ),
    WaterQualityStandard(
        parameter="Water Temperature",
        optimal_range="24.0 – 30.0",
        acceptable_range="20.0 – 32.0",
        critical_threshold="< 18.0 or > 35.0 (Thermal stress)",
        unit="°C",
        source="ICAR-CIFA Standard Freshwater Aquaculture Guidelines",
    ),
    WaterQualityStandard(
        parameter="pH Level",
        optimal_range="7.0 – 8.0",
        acceptable_range="6.5 – 8.5",
        critical_threshold="< 6.0 or > 9.0 (Acid/Alkaline stress)",
        unit="pH scale",
        source="FAO Aquaculture Water Quality Manual",
    ),
    WaterQualityStandard(
        parameter="Total Ammonia Nitrogen (TAN)",
        optimal_range="0.0 – 0.05",
        acceptable_range="0.05 – 0.2",
        critical_threshold="> 0.5 (Gill toxicity)",
        unit="mg/L",
        source="ICAR-CIFA Guidelines for Carp & Tilapia",
    ),
    WaterQualityStandard(
        parameter="Alkalinity (CaCO3)",
        optimal_range="80 – 150",
        acceptable_range="50 – 200",
        critical_threshold="< 30 (Buffer depletion)",
        unit="mg/L",
        source="FAO Fisheries Circular 886",
    ),
    WaterQualityStandard(
        parameter="Secchi Disk Transparency",
        optimal_range="30 – 40",
        acceptable_range="25 – 45",
        critical_threshold="< 20 (Algal bloom) or > 50 (Low plankton)",
        unit="cm",
        source="ICAR-CIFA Pond Management Handbook",
    ),
]


class FishAnalysisResponse(BaseModel):
    model_config = {"extra": "ignore"}

    species_identified: str | None
    common_name: str | None
    scientific_name: str | None
    health_condition: Literal[
        "healthy",
        "suspected_disease",
        "parasitic_infection",
        "water_stress_signs",
        "inconclusive",
    ]
    suspected_issue: str | None
    visible_characteristics: list[str] = []
    potential_causes: list[str] = []
    confidence_level: Literal["high", "moderate", "low", "uncertain"] = "uncertain"
    confidence_note: str
    recommendations: list[str] = []
    preventive_measures: list[str] = []
    water_quality_guidance: str | None = None
    uncertainty_note: str
    needs_expert: bool = True
    image_quality: Literal["good", "fair", "poor"] = "fair"
    provider: str = "gemini-1.5-flash"
    context_used: dict[str, Any] = {}


class WaterQualityCheckRequest(BaseModel):
    dissolved_oxygen_mg_l: float | None = Field(default=None, ge=0, le=25)
    temperature_c: float | None = Field(default=None, ge=0, le=50)
    ph: float | None = Field(default=None, ge=0, le=14)
    ammonia_mg_l: float | None = Field(default=None, ge=0, le=20)
    alkalinity_mg_l: float | None = Field(default=None, ge=0, le=500)
    pond_depth_m: float | None = Field(default=None, ge=0.2, le=10)


class ParameterEvaluation(BaseModel):
    parameter: str
    measured_value: float
    status: Literal["optimal", "acceptable", "critical"]
    guidance: str


class WaterQualityCheckResponse(BaseModel):
    overall_status: Literal["optimal", "acceptable", "critical", "insufficient_data"]
    evaluations: list[ParameterEvaluation]
    corrective_actions: list[str]
    source: str = "ICAR-CIFA & FAO Fisheries Standards"


@router.get("/api/fisheries/water-quality-standards", response_model=list[WaterQualityStandard])
def list_water_quality_standards() -> list[WaterQualityStandard]:
    return WATER_QUALITY_STANDARDS


@router.post("/api/fisheries/water-quality-check", response_model=WaterQualityCheckResponse)
def evaluate_water_quality(body: WaterQualityCheckRequest) -> WaterQualityCheckResponse:
    evaluations: list[ParameterEvaluation] = []
    corrective_actions: list[str] = []
    has_critical = False
    has_acceptable = False

    if body.dissolved_oxygen_mg_l is not None:
        do_val = body.dissolved_oxygen_mg_l
        if do_val >= 5.0:
            status = "optimal"
            guide = "Dissolved oxygen is healthy and supports active feeding and metabolism."
        elif do_val >= 3.5:
            status = "acceptable"
            has_acceptable = True
            guide = "Dissolved oxygen is marginal; monitor early morning levels before sunrise."
            corrective_actions.append("Operate aerators or paddle-wheels during early morning hours.")
        else:
            status = "critical"
            has_critical = True
            guide = "Critical hypoxia hazard. Fish mortality risk is elevated."
            corrective_actions.append("Emergency aeration required immediately. Avoid feeding until DO exceeds 4.0 mg/L.")
        evaluations.append(ParameterEvaluation(parameter="Dissolved Oxygen", measured_value=do_val, status=status, guidance=guide))

    if body.temperature_c is not None:
        t_val = body.temperature_c
        if 24.0 <= t_val <= 30.0:
            status = "optimal"
            guide = "Temperature is in prime range for tropical aquaculture species."
        elif 20.0 <= t_val <= 32.0:
            status = "acceptable"
            has_acceptable = True
            guide = "Acceptable range, though digestive rate and growth may moderate."
        else:
            status = "critical"
            has_critical = True
            guide = "Thermal stress threshold reached; adjust water depth and shading."
            corrective_actions.append("Maintain pond depth above 1.5m to buffer daily temperature fluctuations.")
        evaluations.append(ParameterEvaluation(parameter="Water Temperature", measured_value=t_val, status=status, guidance=guide))

    if body.ph is not None:
        ph_val = body.ph
        if 7.0 <= ph_val <= 8.0:
            status = "optimal"
            guide = "Pond water pH is balanced with minimal un-ionized ammonia toxicity."
        elif 6.5 <= ph_val <= 8.5:
            status = "acceptable"
            has_acceptable = True
            guide = "Acceptable range, observe for diurnal fluctuations caused by phytoplankton."
        else:
            status = "critical"
            has_critical = True
            guide = "Critical pH imbalance; affects gill membranes and ammonia-ammonium ratio."
            if ph_val < 6.5:
                corrective_actions.append("Apply agricultural limestone (CaCO3) at 200–300 kg/ha to raise alkalinity and buffer pH.")
            else:
                corrective_actions.append("Exchange 15–20% bottom water or add organic matter/gypsum to moderate alkaline surge.")
        evaluations.append(ParameterEvaluation(parameter="pH Level", measured_value=ph_val, status=status, guidance=guide))

    if body.ammonia_mg_l is not None:
        amm_val = body.ammonia_mg_l
        if amm_val <= 0.05:
            status = "optimal"
            guide = "Ammonia level is safe with no toxic accumulation."
        elif amm_val <= 0.2:
            status = "acceptable"
            has_acceptable = True
            guide = "Moderate ammonia presence; reduce feed rate to prevent bacterial surge."
            corrective_actions.append("Reduce feeding ration by 25–40% until ammonia readings stabilize.")
        else:
            status = "critical"
            has_critical = True
            guide = "Toxic ammonia level. Risk of gill hyperplasia and lethargy."
            corrective_actions.append("Perform emergency partial water exchange (25%) and suspend feeding for 24 hours.")
        evaluations.append(ParameterEvaluation(parameter="Total Ammonia Nitrogen", measured_value=amm_val, status=status, guidance=guide))

    if not evaluations:
        return WaterQualityCheckResponse(
            overall_status="insufficient_data",
            evaluations=[],
            corrective_actions=["Enter at least one parameter (e.g. Dissolved Oxygen or pH) to evaluate water safety."],
        )

    if has_critical:
        overall = "critical"
    elif has_acceptable:
        overall = "acceptable"
    else:
        overall = "optimal"

    return WaterQualityCheckResponse(
        overall_status=overall,
        evaluations=evaluations,
        corrective_actions=corrective_actions if corrective_actions else ["Maintain regular monitoring schedule and standard feeding regimens."],
    )


@router.post("/api/fisheries/assess", response_model=FishAnalysisResponse)
async def assess_fish_photo(
    image: UploadFile = File(...),
    suspected_species: str | None = Form(None),
    pond_type: str | None = Form(None),
    water_source: str | None = Form(None),
    symptoms: str | None = Form(None),
) -> FishAnalysisResponse:
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
        "You are an expert aquaculture biologist, ichthyologist, and fish health specialist. "
        "Analyze this fish or aquaculture photograph and return a verified scientific assessment.\n\n"
        f"Farmer Context Provided:\n"
        f"- Suspected species: {suspected_species or 'Unspecified'}\n"
        f"- Pond/system type: {pond_type or 'Freshwater earthen pond / unspecified'}\n"
        f"- Water source: {water_source or 'Borewell / canal / unspecified'}\n"
        f"- Observed symptoms: {symptoms or 'None described'}\n\n"
        "Return strictly valid JSON with no markdown and no code fences, adhering to this exact schema:\n"
        "{\n"
        '  "species_identified": string or null,\n'
        '  "common_name": string or null,\n'
        '  "scientific_name": string or null,\n'
        '  "health_condition": "healthy" | "suspected_disease" | "parasitic_infection" | "water_stress_signs" | "inconclusive",\n'
        '  "suspected_issue": string or null,\n'
        '  "visible_characteristics": [string],\n'
        '  "potential_causes": [string],\n'
        '  "confidence_level": "high" | "moderate" | "low" | "uncertain",\n'
        '  "confidence_note": string,\n'
        '  "recommendations": [string],\n'
        '  "preventive_measures": [string],\n'
        '  "water_quality_guidance": string or null,\n'
        '  "uncertainty_note": string,\n'
        '  "needs_expert": boolean,\n'
        '  "image_quality": "good" | "fair" | "poor"\n'
        "}\n\n"
        "Scientific Guidelines:\n"
        "1. Never claim a definitive diagnosis of fish pathology from an external photograph alone; internal bacterial or viral infections (e.g. Aeromonas, Columnaris, EUS, Tilapia Lake Virus) require microbiological dissection and PCR.\n"
        "2. If the photo does not clearly show a fish or aquatic organism, set health_condition to 'inconclusive'.\n"
        "3. Prioritize pond water quality management, aeration, salt dip treatments, and biosecurity over unregulated antibiotics.\n"
        "4. Explicitly advise consulting a certified fisheries research institute (such as ICAR-CIFA or State Fisheries Extension Officer) before treating entire ponds."
    )

    try:
        parsed, model_used = call_gemini_multimodal(
            prompt_text=prompt,
            image_bytes=image_bytes,
            mime_type=image.content_type,
            system_instruction="You are an aquaculture diagnostic specialist. Return only structured valid JSON.",
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except PermissionError:
        raise HTTPException(
            status_code=403,
            detail="Gemini API authentication failed. Verify GEMINI_API_KEY in your backend deployment.",
        )
    except RuntimeError as run_err:
        msg = str(run_err)
        if "rate limit" in msg.lower() or "quota" in msg.lower():
            raise HTTPException(status_code=429, detail="Gemini API rate limit reached. Please retry in 1 minute.")
        if "not configured" in msg.lower():
            raise HTTPException(status_code=503, detail="Gemini API key is not configured on the backend server.")
        raise HTTPException(status_code=502, detail=f"Gemini API upstream error: {msg}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected error processing fish photo: {exc}")

    context: dict[str, Any] = {}
    if suspected_species:
        context["suspected_species"] = suspected_species
    if pond_type:
        context["pond_type"] = pond_type
    if water_source:
        context["water_source"] = water_source
    if symptoms:
        context["symptoms"] = symptoms

    condition = parsed.get("health_condition", "inconclusive")
    if condition not in (
        "healthy",
        "suspected_disease",
        "parasitic_infection",
        "water_stress_signs",
        "inconclusive",
    ):
        condition = "inconclusive"

    conf_level = parsed.get("confidence_level", "uncertain")
    if conf_level not in ("high", "moderate", "low", "uncertain"):
        conf_level = "uncertain"

    img_qual = parsed.get("image_quality", "fair")
    if img_qual not in ("good", "fair", "poor"):
        img_qual = "fair"

    return FishAnalysisResponse(
        species_identified=parsed.get("species_identified"),
        common_name=parsed.get("common_name"),
        scientific_name=parsed.get("scientific_name"),
        health_condition=condition,
        suspected_issue=parsed.get("suspected_issue"),
        visible_characteristics=parsed.get("visible_characteristics") or [],
        potential_causes=parsed.get("potential_causes") or [],
        confidence_level=conf_level,
        confidence_note=parsed.get("confidence_note") or "Visual anatomical inspection only.",
        recommendations=parsed.get("recommendations") or [],
        preventive_measures=parsed.get("preventive_measures") or [],
        water_quality_guidance=parsed.get("water_quality_guidance"),
        uncertainty_note=parsed.get("uncertainty_note") or "Microbiological culture or PCR is required for definitive pathology.",
        needs_expert=bool(parsed.get("needs_expert", True)),
        image_quality=img_qual,
        provider=model_used,
        context_used=context,
    )

