from __future__ import annotations

import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
PRIMARY_MODEL = "gemini-1.5-flash"
FALLBACK_MODEL = "gemini-1.5-pro"


def get_api_key() -> str | None:
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        key = key.strip()
    return key if key else None


def get_masked_key() -> str:
    key = get_api_key()
    if not key:
        return "Not configured"
    if len(key) <= 8:
        return "****"
    return f"{key[:6]}...{key[-4:]}"


def test_gemini_connection() -> dict[str, Any]:
    api_key = get_api_key()
    if not api_key:
        return {
            "configured": False,
            "status": "unconfigured",
            "message": "GEMINI_API_KEY environment variable is not set.",
            "masked_key": "None",
        }

    url = f"{GEMINI_API_BASE}/{PRIMARY_MODEL}?key={api_key}"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            display_name = data.get("displayName", PRIMARY_MODEL)
            return {
                "configured": True,
                "status": "connected",
                "message": f"Successfully connected to Google Gemini API ({display_name}).",
                "model": PRIMARY_MODEL,
                "masked_key": get_masked_key(),
            }
    except urllib.error.HTTPError as err:
        try:
            err_body = json.loads(err.read().decode("utf-8"))
            err_message = err_body.get("error", {}).get("message", err.reason)
        except Exception:
            err_message = err.reason

        if err.code == 400:
            return {
                "configured": True,
                "status": "invalid_key",
                "message": f"Gemini API key is invalid or restricted: {err_message}",
                "masked_key": get_masked_key(),
            }
        if err.code == 403:
            return {
                "configured": True,
                "status": "permission_denied",
                "message": f"Gemini API permission denied: {err_message}",
                "masked_key": get_masked_key(),
            }
        if err.code == 429:
            return {
                "configured": True,
                "status": "quota_exceeded",
                "message": f"Gemini API quota exceeded or rate limited: {err_message}",
                "masked_key": get_masked_key(),
            }
        return {
            "configured": True,
            "status": "upstream_error",
            "message": f"Gemini API returned HTTP {err.code}: {err_message}",
            "masked_key": get_masked_key(),
        }
    except Exception as exc:
        return {
            "configured": True,
            "status": "network_error",
            "message": f"Could not reach Google Gemini API: {exc}",
            "masked_key": get_masked_key(),
        }


def call_gemini_multimodal(
    prompt_text: str,
    image_bytes: bytes,
    mime_type: str,
    system_instruction: str | None = None,
) -> tuple[dict[str, Any], str]:
    api_key = get_api_key()
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not configured on the backend.")

    b64_data = base64.b64encode(image_bytes).decode("utf-8")

    payload: dict[str, Any] = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt_text},
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": b64_data,
                        }
                    },
                ],
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2,
        },
    }

    if system_instruction:
        payload["systemInstruction"] = {
            "role": "system",
            "parts": [{"text": system_instruction}],
        }

    encoded_payload = json.dumps(payload).encode("utf-8")

    models_to_try = [PRIMARY_MODEL, FALLBACK_MODEL]
    last_error: Exception | None = None

    for model_name in models_to_try:
        url = f"{GEMINI_API_BASE}/{model_name}:generateContent?key={api_key}"
        req = urllib.request.Request(
            url,
            data=encoded_payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))

            candidates = resp_data.get("candidates", [])
            if not candidates:
                feedback = resp_data.get("promptFeedback", {})
                block_reason = feedback.get("blockReason", "No candidates returned")
                raise RuntimeError(f"Gemini declined to analyze image: {block_reason}")

            part_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            if not part_text:
                raise RuntimeError("Gemini returned an empty response.")

            clean_text = part_text.strip()
            if clean_text.startswith("```"):
                lines = clean_text.splitlines()
                if lines and lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                clean_text = "\n".join(lines).strip()

            parsed_json = json.loads(clean_text)
            return parsed_json, model_name

        except urllib.error.HTTPError as err:
            last_error = err
            try:
                err_body = json.loads(err.read().decode("utf-8"))
                detail_msg = err_body.get("error", {}).get("message", err.reason)
            except Exception:
                detail_msg = err.reason

            if err.code == 404:
                continue
            if err.code == 400:
                raise ValueError(f"Gemini API Bad Request: {detail_msg}")
            if err.code in (401, 403):
                raise PermissionError(f"Gemini API authentication failed: {detail_msg}")
            if err.code == 429:
                raise RuntimeError(f"Gemini API rate limit or quota exceeded: {detail_msg}")
            raise RuntimeError(f"Gemini API error (HTTP {err.code}): {detail_msg}")

        except json.JSONDecodeError as err:
            raise ValueError(f"Gemini returned non-JSON text: {err}")

    if last_error:
        raise last_error
    raise RuntimeError("All Gemini models failed to process the request.")

