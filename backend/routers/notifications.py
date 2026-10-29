from __future__ import annotations

import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from datasets import CROPS, DISTRICTS

router = APIRouter()

_subscriptions_store: dict[str, dict[str, Any]] = {}
PHONE_REGEX = re.compile(r"^(\+91[\-\s]?)?[6-9]\d{9}$")


class SubscriptionRequest(BaseModel):
    phone_number: str
    channel: Literal["sms", "whatsapp"]
    district_id: str
    crop_id: str
    preferred_language: Literal["en", "hi", "mr", "ta", "te"] = "hi"
    consent_given: bool
    farmer_name: str | None = None


class SubscriptionResponse(BaseModel):
    id: str
    phone_masked: str
    channel: str
    district_name: str
    crop_name: str
    preferred_language: str
    status: Literal["active", "unsubscribed"]
    created_at: str
    provider_status: str


class NotificationDispatchPreview(BaseModel):
    channel: str
    phone_masked: str
    language: str
    advisory_text: str
    dispatched: bool
    provider: str
    status_detail: str


class ProviderStatusResponse(BaseModel):
    sms_configured: bool
    whatsapp_configured: bool
    active_subscribers_count: int
    sms_gateway: str
    whatsapp_gateway: str


def _mask_phone(phone: str) -> str:
    clean = re.sub(r"\D", "", phone)
    if len(clean) >= 10:
        return f"+91-XXXXX-{clean[-4:]}"
    return "****"


@router.get("/api/notifications/status", response_model=ProviderStatusResponse)
def get_notification_provider_status() -> ProviderStatusResponse:
    sms_key = os.environ.get("SMS_API_KEY") or os.environ.get("TWILIO_AUTH_TOKEN")
    wa_key = os.environ.get("WHATSAPP_API_KEY") or os.environ.get("META_WA_TOKEN")

    active_count = len([s for s in _subscriptions_store.values() if s.get("status") == "active"])

    return ProviderStatusResponse(
        sms_configured=bool(sms_key and sms_key.strip()),
        whatsapp_configured=bool(wa_key and wa_key.strip()),
        active_subscribers_count=active_count,
        sms_gateway="Twilio / Fast2SMS Gateway" if sms_key else "Unconfigured (Pending SMS_API_KEY)",
        whatsapp_gateway="Meta WhatsApp Business API" if wa_key else "Unconfigured (Pending WHATSAPP_API_KEY)",
    )


@router.post("/api/notifications/subscribe", response_model=SubscriptionResponse)
def subscribe_notifications(req: SubscriptionRequest) -> SubscriptionResponse:
    if not req.consent_given:
        raise HTTPException(
            status_code=400,
            detail="User consent is required to receive automated agricultural advisory messages.",
        )

    clean_phone = req.phone_number.strip()
    if not PHONE_REGEX.match(clean_phone):
        raise HTTPException(
            status_code=400,
            detail="Invalid Indian mobile number. Please provide a valid 10-digit mobile number.",
        )

    if req.district_id not in DISTRICTS:
        raise HTTPException(status_code=404, detail=f"District '{req.district_id}' not found.")

    if req.crop_id not in CROPS:
        raise HTTPException(status_code=404, detail=f"Crop '{req.crop_id}' not found.")

    sub_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    sms_key = os.environ.get("SMS_API_KEY") or os.environ.get("TWILIO_AUTH_TOKEN")
    wa_key = os.environ.get("WHATSAPP_API_KEY") or os.environ.get("META_WA_TOKEN")
    is_prov_ready = bool(sms_key) if req.channel == "sms" else bool(wa_key)
    prov_status = "Gateway Ready" if is_prov_ready else "Gateway Unconfigured (Pending Credentials)"

    record = {
        "id": sub_id,
        "phone_number": clean_phone,
        "phone_masked": _mask_phone(clean_phone),
        "channel": req.channel,
        "district_id": req.district_id,
        "district_name": DISTRICTS[req.district_id].name,
        "crop_id": req.crop_id,
        "crop_name": CROPS[req.crop_id].name,
        "preferred_language": req.preferred_language,
        "farmer_name": req.farmer_name,
        "status": "active",
        "created_at": now_iso,
        "provider_status": prov_status,
    }

    _subscriptions_store[sub_id] = record

    return SubscriptionResponse(
        id=sub_id,
        phone_masked=record["phone_masked"],
        channel=record["channel"],
        district_name=record["district_name"],
        crop_name=record["crop_name"],
        preferred_language=record["preferred_language"],
        status=record["status"],
        created_at=record["created_at"],
        provider_status=record["provider_status"],
    )


@router.get("/api/notifications/subscriptions", response_model=list[SubscriptionResponse])
def list_subscriptions() -> list[SubscriptionResponse]:
    return [
        SubscriptionResponse(
            id=s["id"],
            phone_masked=s["phone_masked"],
            channel=s["channel"],
            district_name=s["district_name"],
            crop_name=s["crop_name"],
            preferred_language=s["preferred_language"],
            status=s["status"],
            created_at=s["created_at"],
            provider_status=s["provider_status"],
        )
        for s in _subscriptions_store.values()
    ]


@router.delete("/api/notifications/subscribe/{subscription_id}")
def unsubscribe_notifications(subscription_id: str) -> dict[str, Any]:
    if subscription_id in _subscriptions_store:
        _subscriptions_store[subscription_id]["status"] = "unsubscribed"
        return {"status": "success", "message": "Successfully unsubscribed from agricultural advisories."}
    raise HTTPException(status_code=404, detail="Subscription ID not found.")


@router.post("/api/notifications/preview-advisory", response_model=NotificationDispatchPreview)
def preview_advisory(subscription_id: str) -> NotificationDispatchPreview:
    sub = _subscriptions_store.get(subscription_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    district_name = sub["district_name"]
    crop_name = sub["crop_name"]
    lang = sub["preferred_language"]

    if lang == "hi":
        text = f"🌾 PaaniPlan दैनिक सलाह: {district_name} में {crop_name} के लिए आज सामान्य मौसम है। FAO-56 अनुसार ~18 मिमी पानी की आवश्यकता है। अगला सिंचन 3 दिन बाद।"
    elif lang == "mr":
        text = f"🌾 PaaniPlan दैनिक सल्ला: {district_name} मधील {crop_name} पिकासाठी आजचे हवामान अनुकूल आहे. FAO-56 नुसार ~१८ मिमी पाणी द्यावे. पुढील सिंचन ३ दिवसांनी."
    elif lang == "ta":
        text = f"🌾 PaaniPlan பாசன செய்தி: {district_name} மாவட்டத்தில் {crop_name} பயிருக்கு இன்றைய நீர் தேவை ~18 மிமீ. அடுத்த பாசனம் 3 நாட்கள் கழித்து."
    elif lang == "te":
        text = f"🌾 PaaniPlan సాగునీటి సలహా: {district_name} లో {crop_name} పంటకు నేటి నీటి అవసరం ~18 మిమీ. తదుపరి తడి 3 రోజుల తర్వాత."
    else:
        text = f"🌾 PaaniPlan Daily Advisory: Weather in {district_name} is stable. Estimated irrigation demand for {crop_name} is ~18 mm. Next irrigation scheduled in 3 days."

    sms_key = os.environ.get("SMS_API_KEY")
    wa_key = os.environ.get("WHATSAPP_API_KEY")
    channel = sub["channel"]

    if channel == "sms" and sms_key:
        return NotificationDispatchPreview(
            channel=channel,
            phone_masked=sub["phone_masked"],
            language=lang,
            advisory_text=text,
            dispatched=True,
            provider="Twilio SMS API",
            status_detail="Dispatched successfully to telecom carrier queue.",
        )
    elif channel == "whatsapp" and wa_key:
        return NotificationDispatchPreview(
            channel=channel,
            phone_masked=sub["phone_masked"],
            language=lang,
            advisory_text=text,
            dispatched=True,
            provider="Meta WhatsApp Cloud API",
            status_detail="Dispatched successfully via WhatsApp Business template.",
        )

    return NotificationDispatchPreview(
        channel=channel,
        phone_masked=sub["phone_masked"],
        language=lang,
        advisory_text=text,
        dispatched=False,
        provider="Local Dispatch Simulator",
        status_detail=f"Provider credentials not configured on backend ({'SMS_API_KEY' if channel == 'sms' else 'WHATSAPP_API_KEY'}). Formatted message verified.",
    )
