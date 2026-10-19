"""Recurring symptom patterns (model.recurring_symptom_patterns / upcoming_symptom_patterns)."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

COMPONENT_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
_PKG = "tstest_symptom_patterns"


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
    _load("const", "const.py")
    model = _load("model", "model.py")

FIRST = date(2026, 1, 1)
TODAY = date(2026, 9, 1)


def _starts(count: int, length: int = 28) -> list[str]:
    return [(FIRST + timedelta(days=length * i)).isoformat() for i in range(count)]


def _log(starts: list[str], cycle_days: list[int], field="pain", value="headache", fillers=(2,)) -> list[dict]:
    """The symptom on the given cycle days of every cycle, plus a harmless filler entry so the cycle counts as logged."""
    history = []
    for raw in starts:
        begin = date.fromisoformat(raw)
        for day in cycle_days:
            history.append({"date": (begin + timedelta(days=day - 1)).isoformat(), field: value})
        for day in fillers:
            history.append({"date": (begin + timedelta(days=day - 1)).isoformat(), "mood": "ok"})
    return history


class RecurringPatternTests(unittest.TestCase):
    def test_start_anchored_pattern_is_found(self) -> None:
        starts = _starts(7)
        result = model.recurring_symptom_patterns(_log(starts, [8, 9]), starts, TODAY)
        self.assertEqual(len(result), 1)
        pattern = result[0]
        self.assertEqual((pattern["symptom"], pattern["anchor"]), ("headache", "start"))
        self.assertEqual((pattern["first"], pattern["last"]), (8, 9))
        self.assertEqual((pattern["cycles_seen"], pattern["cycles_total"]), (6, 6))

    def test_end_anchored_pattern_counts_days_before_the_next_period(self) -> None:
        starts = _starts(7)
        result = model.recurring_symptom_patterns(_log(starts, [25, 26], "digestion", "bloating"), starts, TODAY)
        pattern = result[0]
        self.assertEqual((pattern["symptom"], pattern["anchor"]), ("bloating", "end"))
        # day 25 of 28 is 4 days before the next start (28 - 25 + 1), day 26 is 3 days before
        self.assertEqual((pattern["first"], pattern["last"]), (4, 3))

    def test_list_valued_fields_work(self) -> None:
        starts = _starts(7)
        history = _log(starts, [9], "pain", ["cramps", "headache"], fillers=(2, 3))
        self.assertEqual({p["symptom"] for p in model.recurring_symptom_patterns(history, starts, TODAY)}, {"cramps", "headache"})

    def test_too_few_cycles_gives_nothing(self) -> None:
        starts = _starts(4)  # three finished cycles
        self.assertEqual(model.recurring_symptom_patterns(_log(starts, [9]), starts, TODAY), [])

    def test_cycles_without_logging_do_not_count(self) -> None:
        starts = _starts(7)
        history = _log(starts[:4], [9])  # only the first three finished cycles have entries
        self.assertEqual(model.recurring_symptom_patterns(history, starts, TODAY), [])

    def test_a_symptom_in_too_few_cycles_is_no_pattern(self) -> None:
        starts = _starts(7)
        history = _log(starts[:2], [9], fillers=(2, 3)) + _log(starts[2:], [], fillers=(2, 3, 4))
        self.assertEqual(model.recurring_symptom_patterns(history, starts, TODAY), [])

    def test_one_day_of_drift_still_counts_as_the_same_time(self) -> None:
        starts = _starts(7)
        history = []
        for index, raw in enumerate(starts[:6]):
            history += _log([raw], [8 if index % 2 else 9], fillers=(2, 3))
        result = model.recurring_symptom_patterns(history, starts, TODAY)
        self.assertEqual([(p["symptom"], p["cycles_seen"]) for p in result], [("headache", 6)])

    def test_scattered_days_are_no_pattern(self) -> None:
        starts = _starts(7)
        history = []
        for index, raw in enumerate(starts):
            history += _log([raw], [6 + index * 3])
        self.assertEqual(model.recurring_symptom_patterns(history, starts, TODAY), [])

    def test_period_days_are_skipped(self) -> None:
        starts = _starts(7)
        self.assertEqual(model.recurring_symptom_patterns(_log(starts, [1, 2], "pain", "cramps", fillers=(10, 11, 12)), starts, TODAY, 5), [])

    def test_implausible_cycle_lengths_are_ignored(self) -> None:
        starts = _starts(7, length=70)
        self.assertEqual(model.recurring_symptom_patterns(_log(starts, [9]), starts, TODAY), [])

    def test_bad_input_does_not_raise(self) -> None:
        self.assertEqual(model.recurring_symptom_patterns(None, ["junk", "2026-01-01"], TODAY), [])
        self.assertEqual(model.recurring_symptom_patterns([{"x": 1}, "nope"], [], TODAY), [])


class UpcomingPatternTests(unittest.TestCase):
    START = date(2026, 6, 1)
    NEXT = date(2026, 6, 29)

    def _pattern(self, anchor="start", first=8, last=10):
        return {"symptom": "headache", "anchor": anchor, "first": first, "last": last, "cycles_seen": 5, "cycles_total": 6}

    def test_start_anchored_lead_days(self) -> None:
        window_start = self.START + timedelta(days=7)  # cycle day 8
        for lead, expected in ((3, []), (2, [2]), (1, [1]), (0, [0]), (-1, [])):
            today = window_start - timedelta(days=lead)
            got = [p["in_days"] for p in model.upcoming_symptom_patterns([self._pattern()], today, self.START, self.NEXT)]
            self.assertEqual(got, expected, lead)

    def test_end_anchored_window_follows_the_predicted_period(self) -> None:
        pattern = self._pattern("end", first=5, last=2)  # starts 5 days before the next period
        today = self.NEXT - timedelta(days=6)
        self.assertEqual(model.upcoming_symptom_patterns([pattern], today, self.START, self.NEXT)[0]["in_days"], 1)

    def test_end_anchor_without_a_prediction_is_skipped(self) -> None:
        pattern = self._pattern("end", first=5, last=2)
        self.assertEqual(model.upcoming_symptom_patterns([pattern], self.NEXT, self.START, None), [])

    def test_no_current_cycle_gives_nothing(self) -> None:
        self.assertEqual(model.upcoming_symptom_patterns([self._pattern()], self.START, None, self.NEXT), [])


if __name__ == "__main__":
    unittest.main()
