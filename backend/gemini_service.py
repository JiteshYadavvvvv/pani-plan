from __future__ import annotations

import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

API_VERSIONS = ["v1beta", "v1"]
KNOWN_VISION_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash-001",
    "gemini-2.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
    "gemini-2.0-flash-lite",
]

_ACTIVE_MODEL_CACHE: tuple[str, str] | None = None


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


def _get_preferred_models() -> list[str]:
    custom_model = os.environ.get("GEMINI_MODEL")
    if custom_model:
        custom_model = custom_model.strip()
        models = [custom_model]
        for m in KNOWN_VISION_MODELS:
            if m != custom_model:
                models.append(m)
        return models
    return list(KNOWN_VISION_MODELS)


def _build_url(version: str, model_name: str, action: str, api_key: str) -> str:
    clean_model = model_name if model_name.startswith("models/") else f"models/{model_name}"
    return f"https://generativelanguage.googleapis.com/{version}/{clean_model}:{action}?key={api_key}"


def _list_available_models(api_key: str, version: str) -> list[str]:
    url = f"https://generativelanguage.googleapis.com/{version}/models?key={api_key}"
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        raw_models = data.get("models", [])
        available = []
        for item in raw_models:
            methods = item.get("supportedGenerationMethods", [])
            if "generateContent" in methods:
                name = item.get("name", "")
                if name.startswith("models/"):
                    name = name[7:]
                if name:
                    available.append(name)
        return available
    except Exception:
        return []


def _sort_models_by_preference(available: list[str]) -> list[str]:
    def rank(m: str) -> int:
        lower = m.lower()
        if "2.0-flash" in lower:
            return 0
        if "1.5-flash-latest" in lower:
            return 1
        if "1.5-flash" in lower:
            return 2
        if "flash" in lower:
            return 3
        if "1.5-pro" in lower:
            return 4
        if "pro" in lower:
            return 5
        return 10

    return sorted(available, key=rank)


def _test_model_inference(version: str, model_name: str, api_key: str) -> bool:
    url = _build_url(version, model_name, "generateContent", api_key)
    payload = {
        "contents": [{"role": "user", "parts": [{"text": "Hello"}]}],
        "generationConfig": {"maxOutputTokens": 2},
    }
    encoded = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=encoded,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=8) as resp:
        body = json.loads(resp.read().decode("utf-8"))
        candidates = body.get("candidates", [])
        return len(candidates) > 0


def _resolve_working_model(api_key: str) -> tuple[str, str]:
    global _ACTIVE_MODEL_CACHE
    if _ACTIVE_MODEL_CACHE:
        ver, mod = _ACTIVE_MODEL_CACHE
        try:
            if _test_model_inference(ver, mod, api_key):
                return ver, mod
        except Exception:
            _ACTIVE_MODEL_CACHE = None

    custom_model = os.environ.get("GEMINI_MODEL")
    candidate_pairs: list[tuple[str, str]] = []

    if custom_model:
        for ver in API_VERSIONS:
            candidate_pairs.append((ver, custom_model.strip()))

    for ver in API_VERSIONS:
        discovered = _list_available_models(api_key, ver)
        if discovered:
            sorted_discovered = _sort_models_by_preference(discovered)
            for m in sorted_discovered:
                candidate_pairs.append((ver, m))

    preferred_defaults = _get_preferred_models()
    for ver in API_VERSIONS:
        for m in preferred_defaults:
            pair = (ver, m)
            if pair not in candidate_pairs:
                candidate_pairs.append(pair)

    last_http_err: urllib.error.HTTPError | None = None
    all_404 = True

    for ver, mod in candidate_pairs:
        try:
            if _test_model_inference(ver, mod, api_key):
                _ACTIVE_MODEL_CACHE = (ver, mod)
                return ver, mod
        except urllib.error.HTTPError as err:
            last_http_err = err
            if err.code != 404:
                all_404 = False
            if err.code in (400, 401, 403, 429):
                raise err
        except Exception:
            continue

    if last_http_err and all_404:
        raise urllib.error.HTTPError(
            last_http_err.url,
            404,
            "No compatible Gemini model found for this key across tested versions and models.",
            last_http_err.hdrs,
            None,
        )

    if last_http_err:
        raise last_http_err

    raise RuntimeError("Failed to connect to any Gemini model candidate.")


def test_gemini_connection() -> dict[str, Any]:
    api_key = get_api_key()
    if not api_key:
        return {
            "configured": False,
            "status": "unconfigured",
            "message": "GEMINI_API_KEY environment variable is not configured on the backend.",
            "model": "None",
            "masked_key": "None",
        }

    try:
        ver, mod = _resolve_working_model(api_key)
        return {
            "configured": True,
            "status": "connected",
            "message": f"Successfully verified Google Gemini API inference with model {mod} ({ver}).",
            "model": mod,
            "masked_key": get_masked_key(),
        }
    except urllib.error.HTTPError as err:
        try:
            err_body = json.loads(err.read().decode("utf-8"))
            err_message = err_body.get("error", {}).get("message", err.reason)
        except Exception:
            err_message = str(err.reason)

        if err.code == 400:
            return {
                "configured": True,
                "status": "invalid_key",
                "message": f"Gemini API key is invalid or restricted: {err_message}",
                "model": "None",
                "masked_key": get_masked_key(),
            }
        if err.code in (401, 403):
            return {
                "configured": True,
                "status": "permission_denied",
                "message": f"Gemini API permission denied: {err_message}",
                "model": "None",
                "masked_key": get_masked_key(),
            }
        if err.code == 404:
            return {
                "configured": True,
                "status": "model_not_found",
                "message": f"Gemini API returned 404: No compatible model found. Please verify Google AI Studio project access or set GEMINI_MODEL.",
                "model": "None",
                "masked_key": get_masked_key(),
            }
        if err.code == 429:
            return {
                "configured": True,
                "status": "quota_exceeded",
                "message": f"Gemini API quota exceeded or rate limited: {err_message}",
                "model": "None",
                "masked_key": get_masked_key(),
            }
        return {
            "configured": True,
            "status": "upstream_error",
            "message": f"Gemini API returned HTTP {err.code}: {err_message}",
            "model": "None",
            "masked_key": get_masked_key(),
        }
    except Exception as exc:
        msg = str(exc)
        if "404" in msg or "not found" in msg.lower():
            status = "model_not_found"
        else:
            status = "network_error"
        return {
            "configured": True,
            "status": status,
            "message": f"Could not reach Google Gemini API: {msg}",
            "model": "None",
            "masked_key": get_masked_key(),
        }


def _get_execution_candidate_pairs(api_key: str) -> list[tuple[str, str]]:
    global _ACTIVE_MODEL_CACHE
    pairs: list[tuple[str, str]] = []
    if _ACTIVE_MODEL_CACHE:
        pairs.append(_ACTIVE_MODEL_CACHE)

    custom_model = os.environ.get("GEMINI_MODEL")
    if custom_model:
        for ver in API_VERSIONS:
            pair = (ver, custom_model.strip())
            if pair not in pairs:
                pairs.append(pair)

    defaults = _get_preferred_models()
    for ver in API_VERSIONS:
        for m in defaults:
            pair = (ver, m)
            if pair not in pairs:
                pairs.append(pair)

    return pairs


def call_gemini_multimodal(
    prompt_text: str,
    image_bytes: bytes,
    mime_type: str,
    system_instruction: str | None = None,
) -> tuple[dict[str, Any], str]:
    global _ACTIVE_MODEL_CACHE
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
    candidate_pairs = _get_execution_candidate_pairs(api_key)
    last_error_detail: str | None = None
    all_404 = True

    for ver, mod in candidate_pairs:
        url = _build_url(ver, mod, "generateContent", api_key)
        req = urllib.request.Request(
            url,
            data=encoded_payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
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
            _ACTIVE_MODEL_CACHE = (ver, mod)
            return parsed_json, mod

        except urllib.error.HTTPError as err:
            try:
                err_body = json.loads(err.read().decode("utf-8"))
                detail_msg = err_body.get("error", {}).get("message", err.reason)
            except Exception:
                detail_msg = str(err.reason)

            last_error_detail = f"HTTP {err.code}: {detail_msg}"
            if err.code != 404:
                all_404 = False

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

    if all_404:
        raise RuntimeError(
            "Gemini API returned 404 (Not Found): No tested model was available for this API key. "
            "Please check model availability in your Google AI Studio project or set GEMINI_MODEL."
        )

    raise RuntimeError(f"Gemini multimodal processing failed: {last_error_detail}")


def call_gemini_json(
    prompt_text: str,
    system_instruction: str | None = None,
) -> tuple[dict[str, Any], str]:
    global _ACTIVE_MODEL_CACHE
    api_key = get_api_key()
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not configured on the backend.")

    payload: dict[str, Any] = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt_text}],
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
    candidate_pairs = _get_execution_candidate_pairs(api_key)
    last_error_detail: str | None = None
    all_404 = True

    for ver, mod in candidate_pairs:
        url = _build_url(ver, mod, "generateContent", api_key)
        req = urllib.request.Request(
            url,
            data=encoded_payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))

            candidates = resp_data.get("candidates", [])
            if not candidates:
                feedback = resp_data.get("promptFeedback", {})
                block_reason = feedback.get("blockReason", "No candidates returned")
                raise RuntimeError(f"Gemini declined to generate response: {block_reason}")

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
            _ACTIVE_MODEL_CACHE = (ver, mod)
            return parsed_json, mod

        except urllib.error.HTTPError as err:
            try:
                err_body = json.loads(err.read().decode("utf-8"))
                detail_msg = err_body.get("error", {}).get("message", err.reason)
            except Exception:
                detail_msg = str(err.reason)

            last_error_detail = f"HTTP {err.code}: {detail_msg}"
            if err.code != 404:
                all_404 = False

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

    if all_404:
        raise RuntimeError(
            "Gemini API returned 404 (Not Found): No tested model was available for this API key. "
            "Please check model availability in your Google AI Studio project or set GEMINI_MODEL."
        )

    raise RuntimeError(f"Gemini text processing failed: {last_error_detail}")
