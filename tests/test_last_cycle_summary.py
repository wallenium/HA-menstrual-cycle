"""Summary of the last completed cycle (statistics.compute_last_cycle_summary, service get_last_cycle_summary)."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

COMPONENT_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
_PKG = "tstest_last_cycle"


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
    _load("model", "model.py")
    statistics = _load("statistics", "statistics.py")



def _bleeding(*starts: str, days: int = 4) -> list[str]:
    out = []
    for start in starts:
        first = date.fromisoformat(start)
        out += [(first + timedelta(days=i)).isoformat() for i in range(days)]
    return out


STARTS = ["2026-06-01", "2026-06-29", "2026-07-28", "2026-08-25", "2026-09-23"]
HISTORY = _bleeding(*STARTS)
SYMPTOMS = [
    {"date": "2026-07-30", "pain": ["cramps"]},  # an earlier cycle: must not count
    {"date": "2026-08-25", "bleeding_strength": "heavy"},
    {"date": "2026-08-26", "pain": ["cramps"], "bleeding_strength": "heavy"},
    {"date": "2026-08-27", "pain": ["cramps", "headache"]},
    {"date": "2026-09-22", "mood": "good"},
    {"date": "2026-09-23", "pain": ["cramps"]},  # the cycle that just started: must not count
]


class LastCycleSummaryTests(unittest.TestCase):
    def test_summary_of_the_last_completed_cycle(self) -> None:
        summary = statistics.compute_last_cycle_summary(HISTORY, SYMPTOMS)
        self.assertEqual(summary["cycle_start"], "2026-08-25")
        self.assertEqual(summary["cycle_end"], "2026-09-22")
        self.assertEqual(summary["cycle_length"], 29)
        self.assertEqual(summary["average_cycle_length"], 28)  # 28, 29, 28 before it
        self.assertEqual(summary["days_relative_to_average"], 1)
        self.assertEqual(summary["period_days"], 4)
        self.assertEqual(summary["pain_days"], 2)
        self.assertEqual(summary["logged_days"], 4)
        self.assertEqual(summary["top_symptoms"][0], {"key": "pain:cramps", "count": 2})
        self.assertIn({"key": "pain:headache", "count": 1}, summary["top_symptoms"])
        self.assertEqual(summary["bleeding_strength_distribution"], {"heavy": 100})

    def test_needs_two_cycle_starts(self) -> None:
        self.assertIsNone(statistics.compute_last_cycle_summary([], SYMPTOMS))
        self.assertIsNone(statistics.compute_last_cycle_summary(_bleeding("2026-09-23"), SYMPTOMS))

    def test_first_completed_cycle_has_no_average_to_compare_with(self) -> None:
        summary = statistics.compute_last_cycle_summary(_bleeding("2026-08-25", "2026-09-23"), [])
        self.assertEqual(summary["cycle_length"], 29)
        self.assertIsNone(summary["average_cycle_length"])
        self.assertIsNone(summary["days_relative_to_average"])
        self.assertEqual((summary["pain_days"], summary["logged_days"], summary["top_symptoms"]), (0, 0, []))

    def test_implausible_earlier_cycles_are_left_out_of_the_average(self) -> None:
        history = _bleeding("2026-01-01", "2026-05-01", "2026-05-29", "2026-06-26")  # first gap is 120 days
        self.assertEqual(statistics.compute_last_cycle_summary(history, [])["average_cycle_length"], 28)

    def test_average_uses_at_most_the_six_cycles_before(self) -> None:
        # gaps oldest to newest: 60 (too old), 30 x4, 28 x2, then the cycle under test of 35 days
        day, starts = date(2025, 1, 1), ["2025-01-01"]
        for gap in (60, 30, 30, 30, 30, 28, 28, 35):
            day += timedelta(days=gap)
            starts.append(day.isoformat())
        summary = statistics.compute_last_cycle_summary(_bleeding(*starts), [])
        self.assertEqual(summary["cycle_length"], 35)
        self.assertEqual(summary["average_cycle_length"], 29)  # (4 * 30 + 2 * 28) / 6, rounded

    def test_top_symptoms_are_capped_at_five(self) -> None:
        entry = {"date": "2026-09-01", "pain": ["a", "b", "c"], "digestion": ["d", "e", "f"]}
        self.assertEqual(len(statistics.compute_last_cycle_summary(HISTORY, [entry])["top_symptoms"]), 5)

    def test_service_is_wired_to_the_function(self) -> None:
        source = (COMPONENT_ROOT / "__init__.py").read_text(encoding="utf-8")
        self.assertIn("summary = compute_last_cycle_summary(runtime.history, runtime.symptom_history)", source)
        self.assertEqual(source.count("SERVICE_GET_LAST_CYCLE_SUMMARY"), 3)  # import, register, unload


if __name__ == "__main__":
    unittest.main()
