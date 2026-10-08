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
    def test_recent_cycle_lengths_end_with_the_last_cycle(self) -> None:
        summary = statistics.compute_last_cycle_summary(HISTORY, SYMPTOMS)
        self.assertEqual(summary["recent_cycle_lengths"], [28, 29, 28, 29])
        self.assertEqual(summary["recent_cycle_lengths"][-1], summary["cycle_length"])

    def test_recent_cycle_lengths_keep_only_the_newest_six(self) -> None:
        first = date(2026, 1, 1)
        gaps = [30, 31, 32, 33, 34, 35, 36, 37]
        starts = [first]
        for gap in gaps:
            starts.append(starts[-1] + timedelta(days=gap))
        summary = statistics.compute_last_cycle_summary(_bleeding(*(d.isoformat() for d in starts)), [])
        self.assertEqual(summary["recent_cycle_lengths"], [32, 33, 34, 35, 36, 37])

    def test_recent_cycle_lengths_with_a_single_completed_cycle(self) -> None:
        summary = statistics.compute_last_cycle_summary(_bleeding("2026-06-01", "2026-06-30"), [])
        self.assertEqual(summary["recent_cycle_lengths"], [29])

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


def _every(days: int, count: int, first: str = "2026-01-01") -> list[str]:
    start = date.fromisoformat(first)
    return [(start + timedelta(days=days * i)).isoformat() for i in range(count)]


class PredictionAccuracyTests(unittest.TestCase):
    def test_a_regular_cycle_is_predicted_to_the_day(self) -> None:
        accuracy = statistics.compute_prediction_accuracy(_bleeding(*_every(28, 7)))
        self.assertEqual((accuracy["cycles"], accuracy["mean_abs_error_days"], accuracy["within_2_days"]), (5, 0.0, 5))
        self.assertTrue(all(item["diff"] == 0 for item in accuracy["errors"]))

    def test_a_late_period_is_measured_against_what_was_known_before_it(self) -> None:
        # six regular 28-day cycles, then one that comes after 60 days: the prediction must not know about the 60
        starts = _every(28, 6)
        late = (date.fromisoformat(starts[-1]) + timedelta(days=60)).isoformat()
        accuracy = statistics.compute_prediction_accuracy(_bleeding(*starts, late))
        last = accuracy["errors"][-1]
        self.assertEqual(last["actual"], late)
        self.assertEqual(last["predicted"], (date.fromisoformat(starts[-1]) + timedelta(days=28)).isoformat())
        self.assertEqual(last["diff"], 32)  # positive: later than predicted
        self.assertEqual(accuracy["within_2_days"], accuracy["cycles"] - 1)
        self.assertGreater(accuracy["mean_abs_error_days"], 5)

    def test_an_early_period_has_a_negative_diff(self) -> None:
        starts = _every(28, 5)
        early = (date.fromisoformat(starts[-1]) + timedelta(days=21)).isoformat()
        self.assertEqual(statistics.compute_prediction_accuracy(_bleeding(*starts, early))["errors"][-1]["diff"], -7)

    def test_mean_and_hit_count_use_absolute_differences(self) -> None:
        starts = [date(2026, 1, 1)]
        for length in (28, 28, 28, 25, 31, 28, 28):
            starts.append(starts[-1] + timedelta(days=length))
        accuracy = statistics.compute_prediction_accuracy(_bleeding(*(d.isoformat() for d in starts)))
        self.assertEqual([item["diff"] for item in accuracy["errors"]], [0, 0, -3, 4, 0, 0])
        self.assertEqual(accuracy["mean_abs_error_days"], 1.2)  # 7 / 6; the signed mean would be 0.2
        self.assertEqual(accuracy["within_2_days"], 4)  # a miss of exactly 3 days does not count

    def test_needs_two_cycles_before_the_first_check_and_keeps_only_the_latest(self) -> None:
        self.assertIsNone(statistics.compute_prediction_accuracy(_bleeding(*_every(28, 2))))
        self.assertIsNone(statistics.compute_prediction_accuracy([]))
        self.assertEqual(statistics.compute_prediction_accuracy(_bleeding(*_every(28, 3)))["cycles"], 1)
        many = statistics.compute_prediction_accuracy(_bleeding(*_every(28, 15)))
        self.assertEqual(many["cycles"], const.PREDICTION_ACCURACY_CYCLES)
        self.assertEqual(many["errors"][-1]["actual"], _every(28, 15)[-1])

    def test_only_the_service_summary_and_the_report_statistics_carry_it(self) -> None:
        history = _bleeding(*_every(28, 7))
        self.assertIsNone(statistics.compute_last_cycle_summary(history, [])["prediction_accuracy"])
        self.assertEqual(statistics.compute_last_cycle_summary(history, [], 5)["prediction_accuracy"]["cycles"], 5)
        stats = statistics.compute_statistics(history, [], days_back=365, today=date(2026, 8, 1))
        self.assertEqual(stats["prediction_accuracy"]["mean_abs_error_days"], 0.0)

    def test_report_section_in_every_language_only_with_data(self) -> None:
        import html as html_lib

        stats = statistics.compute_statistics(_bleeding(*_every(28, 7)), [], days_back=365, today=date(2026, 8, 1))
        empty = statistics.compute_statistics(_bleeding(*_every(28, 2)), [], days_back=365, today=date(2026, 8, 1))
        for lang in const.DOCTOR_REPORT_LANGUAGES:
            title = html_lib.escape(statistics._REPORT_TEXT[lang]["prediction_accuracy"])
            kwargs = dict(history=[], symptom_history=[], profile="a", patient_name=None, patient_birthdate=None,
                          language=lang, report_date="2026-08-01")
            report = statistics.generate_doctor_report_html(stats=stats, **kwargs)
            self.assertIn(title, report, lang)
            self.assertNotIn("{mean}", report)
            self.assertNotIn(title, statistics.generate_doctor_report_html(stats=empty, **kwargs), lang)


if __name__ == "__main__":
    unittest.main()
