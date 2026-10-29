from __future__ import annotations

import json
import math
import os
import random
import sys
import types
import unittest
import urllib.error

if "fastapi" not in sys.modules:
    try:
        import fastapi
    except ModuleNotFoundError:
        fastapi = types.ModuleType("fastapi")
        class APIRouter:
            def get(self, *args, **kwargs):
                return lambda f: f
            def post(self, *args, **kwargs):
                return lambda f: f
            def delete(self, *args, **kwargs):
                return lambda f: f
        class HTTPException(Exception):
            def __init__(self, status_code, detail):
                super().__init__(detail)
                self.status_code = status_code
                self.detail = detail
        fastapi.APIRouter = APIRouter
        fastapi.HTTPException = HTTPException
        fastapi.File = lambda *a, **k: None
        fastapi.Form = lambda *a, **k: None
        fastapi.UploadFile = type("UploadFile", (), {})
        fastapi.Query = lambda *a, **k: None
        fastapi.Header = lambda *a, **k: None
        sys.modules["fastapi"] = fastapi

if "pydantic" not in sys.modules:
    try:
        import pydantic
    except ModuleNotFoundError:
        pydantic = types.ModuleType("pydantic")
        class BaseModel:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)
            def model_dump(self):
                return dict(self.__dict__)
        pydantic.BaseModel = BaseModel
        pydantic.Field = lambda *a, **k: k.get("default", None)
        sys.modules["pydantic"] = pydantic

if "numpy" not in sys.modules:
    try:
        import numpy
    except ModuleNotFoundError:
        np = types.ModuleType("numpy")
        np.pi = math.pi
        class NumArray(list):
            def tolist(self): return list(self)
            def __sub__(self, other):
                if isinstance(other, NumArray): return NumArray([a - b for a, b in zip(self, other)])
                return NumArray([a - other for a in self])
            def __add__(self, other):
                if isinstance(other, NumArray): return NumArray([a + b for a, b in zip(self, other)])
                return NumArray([a + other for a in self])
            def __mul__(self, other):
                if isinstance(other, NumArray): return NumArray([a * b for a, b in zip(self, other)])
                return NumArray([a * other for a in self])
            def __truediv__(self, other):
                if isinstance(other, NumArray): return NumArray([a / b for a, b in zip(self, other)])
                return NumArray([a / other for a in self])
            def __neg__(self):
                return NumArray([-a for a in self])
            def __radd__(self, other):
                return self.__add__(other)
            def __rmul__(self, other):
                return self.__mul__(other)
            def __rsub__(self, other):
                return NumArray([other - a for a in self])
        def _np_radians(x):
            return NumArray([math.radians(v) for v in x]) if isinstance(x, (list, NumArray)) else math.radians(x)
        def _np_cos(x):
            return NumArray([math.cos(v) for v in x]) if isinstance(x, (list, NumArray)) else math.cos(x)
        def _np_sin(x):
            return NumArray([math.sin(v) for v in x]) if isinstance(x, (list, NumArray)) else math.sin(x)
        def _np_tan(x):
            return NumArray([math.tan(v) for v in x]) if isinstance(x, (list, NumArray)) else math.tan(x)
        def _np_clip(x, a, b):
            if isinstance(x, (list, NumArray)): return NumArray([max(a, min(b, v)) for v in x])
            return max(a, min(b, x))
        def _np_arccos(x):
            if isinstance(x, (list, NumArray)): return NumArray([math.acos(max(-1.0, min(1.0, v))) for v in x])
            return math.acos(max(-1.0, min(1.0, x)))
        def _np_sqrt(x):
            if isinstance(x, (list, NumArray)): return NumArray([math.sqrt(max(0.0, v)) for v in x])
            return math.sqrt(max(0.0, x))
        def _np_max(a, b):
            if isinstance(a, (list, NumArray)): return NumArray([max(x, b) for x in a])
            return max(a, b)
        np.radians = _np_radians
        np.cos = _np_cos
        np.sin = _np_sin
        np.tan = _np_tan
        np.clip = _np_clip
        np.arccos = _np_arccos
        np.sqrt = _np_sqrt
        np.maximum = _np_max
        class RandomRng:
            def uniform(self, a, b, n): return NumArray([random.uniform(a, b) for _ in range(n)])
            def integers(self, a, b, n): return NumArray([random.randint(a, b) for _ in range(n)])
        class RandomMod:
            default_rng = lambda self: RandomRng()
        np.random = RandomMod()
        np.array = lambda x, **k: NumArray(x)
        np.array_split = lambda arr, n: [arr[i::n] for i in range(n)]
        sys.modules["numpy"] = np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datasets import CROPS, DISTRICTS, IS_SAMPLE_DATA, SOIL_PROFILES
from gemini_service import get_masked_key, test_gemini_connection, call_gemini_multimodal
from water_calc import compute_advisory
from routers.fisheries import WATER_QUALITY_STANDARDS
from routers.notifications import (
    SubscriptionRequest,
    subscribe_notifications,
    preview_advisory,
    PHONE_REGEX,
)
from routers.iot import (
    DeviceRegistrationRequest,
    TelemetryIngestPayload,
    register_device,
    ingest_telemetry,
    get_field_sensor_status,
)
from routers.ml_advisory import LocalizedMlRequest, compute_localized_ml_advisory
from routers.batch import BatchDispatchRunRequest, run_morning_batch_dispatch


class TestDatasetsAndModels(unittest.TestCase):
    def test_datasets_not_marked_as_fake_sample(self):
        self.assertFalse(IS_SAMPLE_DATA)

    def test_crops_integrity(self):
        self.assertGreater(len(CROPS), 5)
        for crop_id, crop in CROPS.items():
            self.assertEqual(crop.crop_id, crop_id)
            self.assertGreater(crop.root_depth_m, 0.0)
            self.assertGreater(crop.typical_season_days, 0)
            self.assertGreater(crop.kc_initial, 0.0)
            self.assertGreater(crop.kc_mid, 0.0)
            self.assertGreater(crop.kc_end, 0.0)
            self.assertIn("mm", crop.typical_water_need_mm)

    def test_districts_cgwb_groundwater_integrity(self):
        self.assertEqual(len(DISTRICTS), 18)
        valid_cgwb_cats = {"Safe", "Semi-Critical", "Critical", "Over-Exploited"}
        for district_id, district in DISTRICTS.items():
            self.assertEqual(district.district_id, district_id)
            self.assertGreater(district.lat, 8.0)
            self.assertLess(district.lat, 37.0)
            self.assertGreater(district.lng, 68.0)
            self.assertLess(district.lng, 98.0)
            self.assertIn(district.dominant_soil, SOIL_PROFILES)
            self.assertGreater(len(district.primary_crops), 0)
            self.assertIn(district.cgwb_category, valid_cgwb_cats)
            self.assertGreater(district.cgwb_stage_of_extraction_pct, 20.0)
            self.assertGreater(district.annual_extractable_gw_mcm, 100.0)
            self.assertIn("CGWB", district.source_citation)


class TestWaterCalculationEngine(unittest.TestCase):
    def test_wheat_calculation_standard_values(self):
        district = DISTRICTS["karnal"]
        result = compute_advisory(
            crop_id="wheat",
            growth_stage="mid_season",
            irrigation_method="sprinkler",
            area_hectares=1.5,
            soil_type=district.dominant_soil,
            lat_deg=district.lat,
            typical_tmax_c=district.typical_tmax_c,
            typical_tmin_c=district.typical_tmin_c,
            typical_seasonal_rainfall_mm=district.typical_seasonal_rainfall_mm,
            manual_tmax_c=25.0,
            manual_tmin_c=12.0,
            manual_rainfall_last_7_days_mm=0.0,
        )
        self.assertGreater(result.eto_mm_day, 0.0)
        self.assertGreater(result.etc_mm_day, 0.0)
        self.assertGreater(result.gross_irrigation_mm, 0.0)
        self.assertGreater(result.total_water_liters, 0.0)
        self.assertFalse(result.used_sample_climate)
        self.assertIn(result.stress_level, ["low", "moderate", "high", "severe"])

    def test_fallback_climate_detection(self):
        district = DISTRICTS["patna"]
        result = compute_advisory(
            crop_id="rice",
            growth_stage="initial",
            irrigation_method="flood",
            area_hectares=2.0,
            soil_type=district.dominant_soil,
            lat_deg=district.lat,
            typical_tmax_c=district.typical_tmax_c,
            typical_tmin_c=district.typical_tmin_c,
            typical_seasonal_rainfall_mm=district.typical_seasonal_rainfall_mm,
        )
        self.assertTrue(result.used_sample_climate)
        self.assertGreaterEqual(result.total_water_liters, 0.0)

        arid_district = DISTRICTS["ahmednagar"]
        arid_result = compute_advisory(
            crop_id="sugarcane",
            growth_stage="mid_season",
            irrigation_method="flood",
            area_hectares=1.0,
            soil_type=arid_district.dominant_soil,
            lat_deg=arid_district.lat,
            typical_tmax_c=arid_district.typical_tmax_c,
            typical_tmin_c=arid_district.typical_tmin_c,
            typical_seasonal_rainfall_mm=arid_district.typical_seasonal_rainfall_mm,
        )
        self.assertTrue(arid_result.used_sample_climate)
        self.assertGreater(arid_result.total_water_liters, 0.0)


class TestGeminiService(unittest.TestCase):
    def test_masked_key_unconfigured(self):
        old_env = os.environ.get("GEMINI_API_KEY")
        try:
            if "GEMINI_API_KEY" in os.environ:
                del os.environ["GEMINI_API_KEY"]
            self.assertEqual(get_masked_key(), "Not configured")
            status = test_gemini_connection()
            self.assertFalse(status["configured"])
            self.assertEqual(status["status"], "unconfigured")
        finally:
            if old_env is not None:
                os.environ["GEMINI_API_KEY"] = old_env

    def test_masked_key_configured(self):
        old_env = os.environ.get("GEMINI_API_KEY")
        try:
            os.environ["GEMINI_API_KEY"] = "AIzaSyDummyKeyForTestingPurposes1234"
            masked = get_masked_key()
            self.assertTrue(masked.startswith("AIzaSy"))
            self.assertTrue(masked.endswith("1234"))
            self.assertIn("...", masked)
        finally:
            if old_env is not None:
                os.environ["GEMINI_API_KEY"] = old_env
            elif "GEMINI_API_KEY" in os.environ:
                del os.environ["GEMINI_API_KEY"]

    def test_call_multimodal_raises_when_no_key(self):
        old_env = os.environ.get("GEMINI_API_KEY")
        try:
            if "GEMINI_API_KEY" in os.environ:
                del os.environ["GEMINI_API_KEY"]
            with self.assertRaises(ValueError) as ctx:
                call_gemini_multimodal("test prompt", b"dummy image bytes", "image/jpeg")
            self.assertIn("GEMINI_API_KEY", str(ctx.exception))
        finally:
            if old_env is not None:
                os.environ["GEMINI_API_KEY"] = old_env

    def test_connection_success_with_mock(self):
        from unittest.mock import patch, MagicMock
        old_env = os.environ.get("GEMINI_API_KEY")
        try:
            os.environ["GEMINI_API_KEY"] = "AIzaSyTestKey123"
            mock_resp = MagicMock()
            mock_resp.read.return_value = json.dumps({
                "candidates": [{"content": {"parts": [{"text": "Hello OK"}]}}]
            }).encode("utf-8")
            mock_resp.__enter__.return_value = mock_resp
            mock_resp.__exit__.return_value = None

            with patch("urllib.request.urlopen", return_value=mock_resp):
                status = test_gemini_connection()
                self.assertTrue(status["configured"])
                self.assertEqual(status["status"], "connected")
                self.assertIn("Successfully verified", status["message"])
        finally:
            if old_env is not None:
                os.environ["GEMINI_API_KEY"] = old_env
            elif "GEMINI_API_KEY" in os.environ:
                del os.environ["GEMINI_API_KEY"]

    def test_connection_invalid_key_400(self):
        from unittest.mock import patch
        import io
        old_env = os.environ.get("GEMINI_API_KEY")
        try:
            os.environ["GEMINI_API_KEY"] = "AIzaSyInvalidKey"
            err_json = json.dumps({"error": {"message": "API key not valid. Please pass a valid API key."}}).encode("utf-8")
            http_err = urllib.error.HTTPError(
                "https://generativelanguage.googleapis.com",
                400,
                "Bad Request",
                {},
                io.BytesIO(err_json)
            )

            with patch("urllib.request.urlopen", side_effect=http_err):
                status = test_gemini_connection()
                self.assertTrue(status["configured"])
                self.assertEqual(status["status"], "invalid_key")
                self.assertIn("invalid or restricted", status["message"])
        finally:
            if old_env is not None:
                os.environ["GEMINI_API_KEY"] = old_env
            elif "GEMINI_API_KEY" in os.environ:
                del os.environ["GEMINI_API_KEY"]

    def test_connection_all_404_model_not_found(self):
        from unittest.mock import patch
        import io
        old_env = os.environ.get("GEMINI_API_KEY")
        try:
            os.environ["GEMINI_API_KEY"] = "AIzaSyMissingModelKey"
            err_json = json.dumps({"error": {"message": "models/gemini-1.5-flash is not found"}}).encode("utf-8")
            http_err = urllib.error.HTTPError(
                "https://generativelanguage.googleapis.com",
                404,
                "Not Found",
                {},
                io.BytesIO(err_json)
            )

            with patch("urllib.request.urlopen", side_effect=http_err):
                status = test_gemini_connection()
                self.assertTrue(status["configured"])
                self.assertEqual(status["status"], "model_not_found")
                self.assertIn("No compatible model found", status["message"])
        finally:
            if old_env is not None:
                os.environ["GEMINI_API_KEY"] = old_env
            elif "GEMINI_API_KEY" in os.environ:
                del os.environ["GEMINI_API_KEY"]

    def test_call_multimodal_success_mock(self):
        from unittest.mock import patch, MagicMock
        old_env = os.environ.get("GEMINI_API_KEY")
        try:
            os.environ["GEMINI_API_KEY"] = "AIzaSyMultimodalTestKey"
            mock_resp = MagicMock()
            response_json = {
                "crop_identified": "Mustard",
                "condition_type": "healthy",
                "suspected_issue": None,
                "confidence_level": "high",
                "confidence_note": "No chlorosis detected.",
                "uncertainty_note": "Field lab test recommended.",
                "image_quality": "good",
                "needs_expert": False,
            }
            mock_resp.read.return_value = json.dumps({
                "candidates": [{"content": {"parts": [{"text": json.dumps(response_json)}]}}]
            }).encode("utf-8")
            mock_resp.__enter__.return_value = mock_resp
            mock_resp.__exit__.return_value = None

            with patch("urllib.request.urlopen", return_value=mock_resp):
                result, model = call_gemini_multimodal("test prompt", b"imgbytes", "image/jpeg")
                self.assertEqual(result["crop_identified"], "Mustard")
                self.assertEqual(result["condition_type"], "healthy")
                self.assertTrue(len(model) > 0)
        finally:
            if old_env is not None:
                os.environ["GEMINI_API_KEY"] = old_env
            elif "GEMINI_API_KEY" in os.environ:
                del os.environ["GEMINI_API_KEY"]


class TestFisheriesStandards(unittest.TestCase):
    def test_icar_cifa_standards(self):
        self.assertEqual(len(WATER_QUALITY_STANDARDS), 6)
        names = {s.parameter for s in WATER_QUALITY_STANDARDS}
        self.assertIn("Dissolved Oxygen (DO)", names)
        self.assertIn("Water Temperature", names)
        self.assertIn("pH Level", names)
        self.assertIn("Total Ammonia Nitrogen (TAN)", names)


class TestNotificationsRouter(unittest.TestCase):
    def test_phone_validation(self):
        self.assertTrue(bool(PHONE_REGEX.match("9876543210")))
        self.assertTrue(bool(PHONE_REGEX.match("+919876543210")))
        self.assertFalse(bool(PHONE_REGEX.match("12345")))
        self.assertFalse(bool(PHONE_REGEX.match("abcdefghij")))

    def test_subscription_workflow(self):
        req = SubscriptionRequest(
            phone_number="9876543210",
            channel="whatsapp",
            district_id="nashik",
            crop_id="onion",
            preferred_language="mr",
            consent_given=True,
        )
        res = subscribe_notifications(req)
        self.assertEqual(res.channel, "whatsapp")
        self.assertEqual(res.district_name, "Nashik")
        self.assertEqual(res.crop_name, "Onion")
        self.assertEqual(res.status, "active")

        preview = preview_advisory(res.id)
        self.assertIn("PaaniPlan", preview.advisory_text)
        self.assertIn("Nashik", preview.advisory_text)


class TestIotEngine(unittest.TestCase):
    def test_iot_registration_and_telemetry(self):
        reg = DeviceRegistrationRequest(
            device_id="TEST-NODE-01",
            field_id="field-101",
            sensor_model="Capacitive Moisture Probe v2",
        )
        reg_res = register_device(reg)
        self.assertEqual(reg_res.device_id, "TEST-NODE-01")
        self.assertTrue(reg_res.api_token.startswith("iot_"))

        telemetry = TelemetryIngestPayload(
            device_id="TEST-NODE-01",
            soil_moisture_pct=16.5,
            soil_temperature_c=24.0,
            battery_voltage_v=3.9,
        )
        t_res = ingest_telemetry(telemetry, x_sensor_token=reg_res.api_token)
        self.assertEqual(t_res.water_depletion_risk, "critical")

        field_status = get_field_sensor_status("field-101")
        self.assertTrue(field_status.has_sensor)
        self.assertEqual(field_status.connection_status, "online")
        self.assertIn("Critical", field_status.sensor_recommendation)


class TestLocalizedMlAdvisor(unittest.TestCase):
    def test_ml_advisory_evaluation(self):
        req = LocalizedMlRequest(
            district_id="jaipur",
            crop_id="mustard",
            growth_stage="mid_season",
        )
        res = compute_localized_ml_advisory(req)
        self.assertEqual(res.district_name, "Jaipur")
        self.assertGreater(res.fao56_baseline_eto_mm_day, 0.0)
        self.assertGreater(res.ml_adjusted_eto_mm_day, 0.0)
        self.assertGreaterEqual(res.correction_factor, 0.85)
        self.assertLessEqual(res.correction_factor, 1.20)
        self.assertIn("advective", res.scientific_explanation.lower())


class TestBatchDispatchPipeline(unittest.TestCase):
    def test_morning_batch_dispatch(self):
        req = BatchDispatchRunRequest(
            mode="vectorized",
            workload_multiplier=5,
            workers=2,
        )
        res = run_morning_batch_dispatch(req)
        self.assertEqual(res.total_calculations, 18 * 5)
        self.assertGreater(res.throughput_calcs_per_sec, 0.0)
        self.assertEqual(len(res.district_summaries), 18)
        priorities = {s.dispatch_priority for s in res.district_summaries}
        self.assertTrue(any(p in {"urgent", "standard", "standby"} for p in priorities))


if __name__ == "__main__":
    unittest.main()
