"""What holds the predictions back (model._missing_data_hints, exposed as prediction_gating["missing"])."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

COMPONENT_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
_PKG = "tstest_data_quality"


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

NOW = date(2026, 10, 1)


def _iso(offset: int) -> str:
    return (NOW + timedelta(days=offset)).isoformat()


def _starts(count: int, length: int = 28) -> list[str]:
    """`count` cycle starts, the last one 10 days before NOW."""
    return [_iso(-10 - length * k) for k in range(count - 1, -1, -1)]


def _temps(start: str, rise_on_day: int = 14) -> list[dict]:
    first = date.fromisoformat(start)
    return [
        {"date": (first + timedelta(days=i)).isoformat(), "basal_temp": 36.8 if i >= rise_on_day else 36.3}
        for i in range(24)
    ]


def _codes(starts: list[str], symptoms: list[dict]) -> dict[str, object]:
    gating = model._build_prediction_gating(starts, symptoms, NOW)
    return {hint["code"]: hint["needed"] for hint in gating["missing"]}


class MissingDataHintsTests(unittest.TestCase):
    def test_a_new_profile_needs_cycles_and_logs(self) -> None:
        codes = _codes(_starts(2), [])
        self.assertEqual(codes["more_cycles"], model.MIN_VALID_CYCLES_FOR_HIGH_PRECISION - 1)
        self.assertEqual(codes["more_logs"], model.MIN_RECENT_LOG_ENTRIES_FOR_HIGH_PRECISION)
        self.assertIn("log_temperature", codes)

    def test_more_cycles_counts_down_to_the_threshold(self) -> None:
        needed = model.MIN_VALID_CYCLES_FOR_HIGH_PRECISION
        for count in range(3, needed + 1):
            self.assertEqual(_codes(_starts(count), []).get("more_cycles"), (needed - (count - 1)) or None)

    def test_nothing_is_missing_when_the_data_is_good(self) -> None:
        starts = _starts(6)
        symptoms = sum((_temps(start) for start in starts[:-1]), []) + [{"date": _iso(-1), "basal_temp": 36.4}]
        self.assertEqual(_codes(starts, symptoms), {})

    def test_irregular_cycles_are_named_once_enough_cycles_exist(self) -> None:
        starts = [_iso(-10 - offset) for offset in (140, 105, 60, 35, 0)]  # 35, 45, 25, 35 days
        logs = [{"date": _iso(-1), "basal_temp": 36.4}, {"date": _iso(-2), "note": "x"}]
        self.assertEqual(model._cycle_regularity_std(starts) > model.MAX_CYCLE_STD_FOR_HIGH_PRECISION, True)
        codes = _codes(starts, logs)
        self.assertIn("irregular", codes)
        self.assertNotIn("more_cycles", codes)

    def test_old_temperatures_ask_for_new_ones(self) -> None:
        starts = _starts(5)
        symptoms = [{"date": _iso(-40), "basal_temp": 36.4}, {"date": _iso(-39), "note": "x"}]
        self.assertIn("log_temperature", _codes(starts, symptoms))

    def test_luteal_learning_counts_the_cycles_with_a_confirmed_rise(self) -> None:
        starts = _starts(5)
        recent = [{"date": _iso(-1), "basal_temp": 36.4}, {"date": _iso(-2), "note": "x"}]
        one_cycle = _temps(starts[1]) + recent
        self.assertEqual(_codes(starts, one_cycle), {"luteal_needs_cycles": 1})
        two_cycles = _temps(starts[1]) + _temps(starts[2]) + recent
        self.assertEqual(_codes(starts, two_cycles), {})
        no_rise = _temps(starts[1], rise_on_day=99) + _temps(starts[2], rise_on_day=99) + recent
        self.assertEqual(_codes(starts, no_rise), {"luteal_needs_cycles": 2})


if __name__ == "__main__":
    unittest.main()
