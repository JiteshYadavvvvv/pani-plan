from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datasets import CROPS, DISTRICTS, IS_SAMPLE_DATA, SOIL_PROFILES
from gemini_service import get_masked_key, test_gemini_connection, call_gemini_multimodal
from water_calc import compute_advisory


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

    def test_districts_integrity(self):
        self.assertGreater(len(DISTRICTS), 5)
        for district_id, district in DISTRICTS.items():
            self.assertEqual(district.district_id, district_id)
            self.assertGreater(district.lat, 8.0)
            self.assertLess(district.lat, 37.0)
            self.assertGreater(district.lng, 68.0)
            self.assertLess(district.lng, 98.0)
            self.assertIn(district.dominant_soil, SOIL_PROFILES)
            self.assertGreater(len(district.primary_crops), 0)


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


if __name__ == "__main__":
    unittest.main()
