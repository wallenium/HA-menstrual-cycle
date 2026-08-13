"""Tests for project_range_windows in model.py."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPONENT_ROOT = REPO_ROOT / "custom_components" / "menstruation_cycle"


def _install_homeassistant_stubs() -> None:
    for name in [
        "homeassistant", "homeassistant.components", "homeassistant.components.sensor",
        "homeassistant.config_entries", "homeassistant.const", "homeassistant.core",
        "homeassistant.exceptions", "homeassistant.helpers",
        "homeassistant.helpers.config_validation", "homeassistant.helpers.entity",
        "homeassistant.helpers.entity_platform", "homeassistant.helpers.entity_registry",
        "homeassistant.helpers.dispatcher", "homeassistant.helpers.event",
        "homeassistant.helpers.storage", "homeassistant.helpers.typing",
        "homeassistant.util", "homeassistant.util.dt",
    ]:
        if name not in sys.modules:
            mod = types.ModuleType(name)
            mod.__path__ = []  # type: ignore[attr-defined]
            sys.modules[name] = mod


def _load_module(module_name: str, file_name: str):
    spec = importlib.util.spec_from_file_location(module_name, COMPONENT_ROOT / file_name)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


_install_homeassistant_stubs()
_pkg = types.ModuleType("mctest")
_pkg.__path__ = [str(COMPONENT_ROOT)]  # type: ignore[attr-defined]
sys.modules.setdefault("mctest", _pkg)
_load_module("mctest.const", "const.py")
model = _load_module("mctest.model", "model.py")

project_range_windows = model.project_range_windows
compute_period_forecast = model.compute_period_forecast
compute_fertility_forecast = model.compute_fertility_forecast
compute_prediction_day_confidence = model.compute_prediction_day_confidence


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

# A "next" period starting 2026-08-05 (28-day cycle, 5-day period).
# At cycle n=13 (+364 days): period 2027-08-04..2027-08-08, fertility 2027-08-14..2027-08-20 (ov 2027-08-19).
# Both overlap the test range 2027-08-01..2027-08-15.
PERIOD_FORECAST = {
    "predicted_start": "2026-08-05",
    "predicted_end": "2026-08-09",
    "cycle_std_days": 1.0,
    "confidence": "high",
}

FERTILITY_FORECAST = {
    "ovulation_estimate": "2026-08-20",
    "fertile_window_start": "2026-08-15",
    "fertile_window_end": "2026-08-21",
    "best_days_start": "2026-08-18",
    "best_days_end": "2026-08-19",
    "source": "estimated",
    "confidence": "medium",
}


class TestProjectRangeWindowsDistantFuture(unittest.TestCase):
    """Distant future range (2027-08-01..2027-08-15) should produce overlapping windows."""

    def test_period_windows_found_in_distant_range(self):
        result = project_range_windows(
            PERIOD_FORECAST,
            FERTILITY_FORECAST,
            "2027-08-01",
            "2027-08-15",
            avg_cycle_length=28,
        )
        self.assertIsNotNone(result)
        self.assertEqual(result["range_start"], "2027-08-01")
        self.assertEqual(result["range_end"], "2027-08-15")
        self.assertIn("period_windows", result)
        self.assertIn("fertility_windows", result)
        # With a 28-day cycle from 2026-08-10, we expect at least one period window
        # to fall within or overlap 2027-08-01..2027-08-15
        self.assertGreater(len(result["period_windows"]), 0, "Expected at least one projected period window in range")
        # Verify window dict structure
        for w in result["period_windows"]:
            self.assertIn("start", w)
            self.assertIn("end", w)
            # start <= end
            self.assertLessEqual(w["start"], w["end"])

    def test_fertility_windows_found_in_distant_range(self):
        result = project_range_windows(
            PERIOD_FORECAST,
            FERTILITY_FORECAST,
            "2027-08-01",
            "2027-08-15",
            avg_cycle_length=28,
        )
        self.assertIsNotNone(result)
        self.assertGreater(len(result["fertility_windows"]), 0, "Expected at least one projected fertility window in range")
        for w in result["fertility_windows"]:
            self.assertIn("fertile_start", w)
            self.assertIn("fertile_end", w)
            self.assertIn("ovulation", w)

    def test_distant_range_period_windows_overlap_range(self):
        """All returned period windows must overlap the requested range."""
        result = project_range_windows(
            PERIOD_FORECAST,
            FERTILITY_FORECAST,
            "2027-08-01",
            "2027-08-15",
            avg_cycle_length=28,
        )
        from datetime import date
        range_start = date(2027, 8, 1)
        range_end = date(2027, 8, 15)
        for w in result["period_windows"]:
            w_start = date.fromisoformat(w["start"])
            w_end = date.fromisoformat(w["end"])
            overlaps = w_end >= range_start and w_start <= range_end
            self.assertTrue(overlaps, f"Window {w} does not overlap range 2027-08-01..2027-08-15")

    def test_distant_range_fertility_windows_overlap_range(self):
        """All returned fertility windows must overlap the requested range."""
        result = project_range_windows(
            PERIOD_FORECAST,
            FERTILITY_FORECAST,
            "2027-08-01",
            "2027-08-15",
            avg_cycle_length=28,
        )
        from datetime import date
        range_start = date(2027, 8, 1)
        range_end = date(2027, 8, 15)
        for w in result["fertility_windows"]:
            w_start = date.fromisoformat(w["fertile_start"])
            w_end = date.fromisoformat(w["fertile_end"])
            overlaps = w_end >= range_start and w_start <= range_end
            self.assertTrue(overlaps, f"Window {w} does not overlap range 2027-08-01..2027-08-15")


class TestProjectRangeWindowsNoOverlap(unittest.TestCase):
    """When the range is before the first forecast window and cannot project forward, result is empty."""

    def test_no_overlap_returns_empty_windows(self):
        # Range is before the predicted period start and too narrow to project into
        # predicted_start: 2026-08-10, range: 2025-01-01..2025-01-15
        result = project_range_windows(
            PERIOD_FORECAST,
            FERTILITY_FORECAST,
            "2025-01-01",
            "2025-01-15",
            avg_cycle_length=28,
        )
        self.assertIsNotNone(result)
        self.assertEqual(result["period_windows"], [])
        self.assertEqual(result["fertility_windows"], [])

    def test_invalid_range_returns_none(self):
        # range_start > range_end
        result = project_range_windows(
            PERIOD_FORECAST,
            FERTILITY_FORECAST,
            "2027-08-15",
            "2027-08-01",
        )
        self.assertIsNone(result)

    def test_invalid_date_returns_none(self):
        result = project_range_windows(
            PERIOD_FORECAST,
            FERTILITY_FORECAST,
            "not-a-date",
            "2027-08-15",
        )
        self.assertIsNone(result)

    def test_none_forecasts_returns_empty_windows(self):
        result = project_range_windows(None, None, "2027-08-01", "2027-08-15")
        self.assertIsNotNone(result)
        self.assertEqual(result["period_windows"], [])
        self.assertEqual(result["fertility_windows"], [])


class TestProjectRangeWindowsBackwardCompatibility(unittest.TestCase):
    """compute_period_forecast and compute_fertility_forecast remain intact."""

    def test_period_forecast_fields_present(self):
        grouped_starts = [
            "2026-01-01", "2026-01-29", "2026-02-26",
            "2026-03-26", "2026-04-23", "2026-05-21",
        ]
        pf = compute_period_forecast(grouped_starts, "2026-06-18", 5)
        self.assertIsNotNone(pf)
        self.assertIn("predicted_start", pf)
        self.assertIn("predicted_end", pf)
        self.assertIn("cycle_std_days", pf)
        self.assertIn("confidence", pf)

    def test_fertility_forecast_fields_present(self):
        ff = compute_fertility_forecast(
            "2026-06-18",
            28,
            "2026-06-04",
            "2026-06-10",
            "2026-06-09",
            None,
        )
        self.assertIsNotNone(ff)
        self.assertIn("ovulation_estimate", ff)
        self.assertIn("fertile_window_start", ff)
        self.assertIn("fertile_window_end", ff)
        self.assertIn("best_days_start", ff)
        self.assertIn("best_days_end", ff)
        self.assertIn("source", ff)
        self.assertIn("confidence", ff)

    def test_project_range_windows_result_structure(self):
        result = project_range_windows(
            PERIOD_FORECAST,
            FERTILITY_FORECAST,
            "2026-09-01",
            "2026-09-30",
        )
        self.assertIsNotNone(result)
        self.assertIn("range_start", result)
        self.assertIn("range_end", result)
        self.assertIn("period_windows", result)
        self.assertIn("fertility_windows", result)
        self.assertIsInstance(result["period_windows"], list)
        self.assertIsInstance(result["fertility_windows"], list)

    def test_cycle_length_override_affects_projection(self):
        """A shorter cycle length means more projected windows reach a distant range sooner."""
        result_28 = project_range_windows(
            PERIOD_FORECAST,
            FERTILITY_FORECAST,
            "2027-08-01",
            "2027-08-15",
            avg_cycle_length=28,
        )
        result_30 = project_range_windows(
            PERIOD_FORECAST,
            FERTILITY_FORECAST,
            "2027-08-01",
            "2027-08-15",
            avg_cycle_length=30,
        )
        # Both should produce results (not None)
        self.assertIsNotNone(result_28)
        self.assertIsNotNone(result_30)
        # With different cycle lengths the projected window start dates differ
        # (this just verifies the parameter is taken into account)
        starts_28 = [w["start"] for w in result_28["period_windows"]]
        starts_30 = [w["start"] for w in result_30["period_windows"]]
        # At least one window found in each
        self.assertGreater(len(starts_28), 0)
        self.assertGreater(len(starts_30), 0)
        # The window starts should be different since cycle lengths differ
        self.assertNotEqual(starts_28, starts_30)


class TestPredictionDayConfidence(unittest.TestCase):
    """Day-level confidence scoring behavior."""

    def _pick_event(self, payload: dict[str, object], day_iso: str, event_key: str) -> dict[str, object]:
        by_day = payload.get("by_day", {})
        self.assertIsInstance(by_day, dict)
        event = by_day.get(day_iso, {})
        self.assertIsInstance(event, dict)
        entry = event.get(event_key, {})
        self.assertIsInstance(entry, dict)
        return entry

    def test_confidence_increases_with_regular_cycles_and_history(self):
        regular_starts = [
            "2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26",
            "2026-04-23", "2026-05-21", "2026-06-18", "2026-07-16",
        ]
        sparse_irregular_starts = ["2026-01-01", "2026-01-26", "2026-03-05"]

        strong = compute_prediction_day_confidence(
            regular_starts,
            ["2026-08-13", "2026-09-10"],
            5,
            28,
            {"confidence_level": "high", "ovulation_detected": True, "ovulation_day": "2026-08-26"},
        )
        weak = compute_prediction_day_confidence(
            sparse_irregular_starts,
            ["2026-08-13", "2026-09-10"],
            5,
            31,
            {"confidence_level": "low", "ovulation_detected": True, "ovulation_day": "2026-08-10"},
        )

        strong_entry = self._pick_event(strong, "2026-08-13", "period")
        weak_entry = self._pick_event(weak, "2026-08-13", "period")
        self.assertGreater(float(strong_entry.get("score", 0)), float(weak_entry.get("score", 0)))

    def test_confidence_decreases_with_variance_and_conflicts(self):
        regular_starts = [
            "2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26", "2026-04-23", "2026-05-21",
        ]
        irregular_starts = [
            "2026-01-01", "2026-01-21", "2026-02-28", "2026-03-22", "2026-05-07", "2026-05-30",
        ]

        baseline = compute_prediction_day_confidence(
            regular_starts,
            ["2026-06-18"],
            5,
            28,
            {"confidence_level": "medium", "ovulation_detected": True, "ovulation_day": "2026-07-01"},
        )
        conflicted = compute_prediction_day_confidence(
            irregular_starts,
            ["2026-06-18"],
            5,
            28,
            {"confidence_level": "low", "ovulation_detected": True, "ovulation_day": "2026-06-10"},
        )

        baseline_entry = self._pick_event(baseline, "2026-06-18", "period")
        conflicted_entry = self._pick_event(conflicted, "2026-06-18", "period")
        self.assertGreater(float(baseline_entry.get("score", 0)), float(conflicted_entry.get("score", 0)))

    def test_confidence_decays_for_future_cycles(self):
        grouped_starts = [
            "2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26", "2026-04-23", "2026-05-21",
        ]
        payload = compute_prediction_day_confidence(
            grouped_starts,
            ["2026-06-18", "2026-07-16", "2026-08-13"],
            5,
            28,
            {"confidence_level": "high", "ovulation_detected": True, "ovulation_day": "2026-07-01"},
        )

        c1 = self._pick_event(payload, "2026-06-18", "period")
        c3 = self._pick_event(payload, "2026-08-13", "period")
        self.assertGreater(float(c1.get("score", 0)), float(c3.get("score", 0)))

    def test_threshold_mapping_high_medium_low(self):
        to_level = model._prediction_confidence_level
        self.assertEqual(to_level(0.67), "high")
        self.assertEqual(to_level(0.34), "medium")
        self.assertEqual(to_level(0.339), "low")


if __name__ == "__main__":
    unittest.main()
