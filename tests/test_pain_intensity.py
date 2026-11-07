"""Pain strength (pain_intensity, whole number 0-10): what counts as a pain day, the wellness weighting, the statistics and the doctor report."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

COMPONENT_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
_PKG = "tstest_pain_intensity"
TODAY = date(2026, 10, 6)


def _load(module_name: str, file_name: str) -> types.ModuleType:
    spec = importlib.util.spec_from_file_location(f"{_PKG}.{module_name}", COMPONENT_ROOT / file_name)
    module = importlib.util.module_from_spec(spec)
    sys.modules[f"{_PKG}.{module_name}"] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


with patch.dict(sys.modules):
    _package = types.ModuleType(_PKG)
    _package.__path__ = [str(COMPONENT_ROOT)]
    sys.modules[_PKG] = _package
    const = _load("const", "const.py")
    model = _load("model", "model.py")
    statistics = _load("statistics", "statistics.py")

HISTORY = ["2026-05-01", "2026-05-30", "2026-06-28", "2026-07-27", "2026-08-25", "2026-09-23"]
SYMPTOMS = [
    {"date": "2026-09-23", "pain": ["cramps"], "pain_intensity": 6},
    {"date": "2026-09-24", "pain_intensity": 2},
    {"date": "2026-09-25", "pain_intensity": 0},
    {"date": "2026-09-26", "pain": ["headache"]},
]


class PainDayDefinition(unittest.TestCase):
    def test_intensity_of_accepts_only_whole_numbers_in_range(self):
        of = model.pain_intensity_of
        self.assertEqual(of({"pain_intensity": 0}), 0)
        self.assertEqual(of({"pain_intensity": 10}), 10)
        for bad in (11, -1, 3.5, "4", True, None):
            self.assertIsNone(of({"pain_intensity": bad}), bad)
        self.assertIsNone(of({}))

    def test_pain_day_is_types_or_strength_from_one(self):
        has = model.has_pain_entry
        self.assertTrue(has({"pain": ["cramps"]}))
        self.assertTrue(has({"pain_intensity": 1}))
        self.assertFalse(has({"pain_intensity": 0}))
        self.assertFalse(has({"pain": []}))
        self.assertFalse(has({}))

    def test_count_uses_the_shared_definition(self):
        self.assertEqual(model._count_pain_days(SYMPTOMS, date(2026, 9, 23), date(2026, 9, 30)), 3)
        self.assertEqual(model._count_pain_days(SYMPTOMS, date(2026, 9, 25), date(2026, 9, 26)), 0)

    def test_burden_weights_by_strength(self):
        # 0.6 (6/10) + 0.2 + 1.0 (types only, no rating); the 0 without types is no pain day at all
        self.assertAlmostEqual(model._pain_burden(SYMPTOMS, date(2026, 9, 23), date(2026, 9, 30)), 1.8)


class Statistics(unittest.TestCase):
    def _stats(self):
        return statistics.compute_statistics(HISTORY, SYMPTOMS, days_back=180, today=TODAY, period_duration_days=5)

    def test_trend_counts_strength_days_and_reports_average_and_max(self):
        row = [r for r in self._stats()["pain_trend"] if r["cycle_start"] == "2026-09-23"][0]
        self.assertEqual(row["pain_days"], 3)
        self.assertEqual(row["avg_pain_intensity"], 2.7)  # (6 + 2 + 0) / 3
        self.assertEqual(row["max_pain_intensity"], 6)

    def test_trend_without_any_rating_has_no_strength_keys(self):
        stats = statistics.compute_statistics(HISTORY, [{"date": "2026-09-23", "pain": ["cramps"]}], days_back=180, today=TODAY, period_duration_days=5)
        row = [r for r in stats["pain_trend"] if r["cycle_start"] == "2026-09-23"][0]
        self.assertNotIn("avg_pain_intensity", row)

    def test_strength_only_day_does_not_create_a_pain_type(self):
        keys = {t["key"] for t in self._stats()["top_symptoms"]}
        self.assertNotIn("pain:None", keys)
        self.assertIn("pain:cramps", keys)


class DoctorReport(unittest.TestCase):
    def _html(self, symptoms, language="en"):
        stats = statistics.compute_statistics(HISTORY, symptoms, days_back=180, today=TODAY, period_duration_days=5)
        return statistics.generate_doctor_report_html(
            stats=stats, history=HISTORY, symptom_history=symptoms, profile="anna", patient_name="Anna",
            patient_birthdate="1990-05-17", language=language, report_date=TODAY.isoformat(),
            current_contraception_method=None,
        )

    def test_column_only_when_a_strength_was_logged(self):
        self.assertIn("Avg / max strength (0–10)", self._html(SYMPTOMS))
        self.assertIn("2.7 / 6", self._html(SYMPTOMS))
        self.assertNotIn("Avg / max strength", self._html([{"date": "2026-09-23", "pain": ["cramps"]}]))

    def test_every_language_has_the_column_label(self):
        for language in const.DOCTOR_REPORT_LANGUAGES:
            html = self._html(SYMPTOMS, language)
            self.assertIn("(0–10)", html, language)


if __name__ == "__main__":
    unittest.main()
