"""model.temperature_rise_by_cycle: the confirmed temperature rise of each of the last cycles (shown in the cycle comparison)."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

COMPONENT_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
_PKG = "tstest_temp_rise"

with patch.dict(sys.modules):
    _package = types.ModuleType(_PKG)
    _package.__path__ = [str(COMPONENT_ROOT)]
    sys.modules[_PKG] = _package
    for _name in ("const", "model"):
        _spec = importlib.util.spec_from_file_location(f"{_PKG}.{_name}", COMPONENT_ROOT / f"{_name}.py")
        _module = importlib.util.module_from_spec(_spec)
        sys.modules[f"{_PKG}.{_name}"] = _module
        _spec.loader.exec_module(_module)
    model = sys.modules[f"{_PKG}.model"]


def _iso(start: str, offset: int) -> str:
    return (date.fromisoformat(start) + timedelta(days=offset)).isoformat()


def _readings(start: str, length: int, rise_day: int | None) -> list[dict]:
    """One reading a day: 36.2 before, 36.6 from `rise_day` (cycle day, 1-based) on; None = flat cycle."""
    return [{"date": _iso(start, d), "basal_temp": 36.6 if rise_day and d + 1 >= rise_day else 36.2 + (d % 2) * 0.05} for d in range(length)]


class TemperatureRiseByCycleTests(unittest.TestCase):
    STARTS = ["2026-05-01", "2026-05-29", "2026-06-26", "2026-07-24"]

    def _history(self):
        return (_readings(self.STARTS[0], 28, 16) + _readings(self.STARTS[1], 28, None)
                + _readings(self.STARTS[2], 28, 15) + _readings(self.STARTS[3], 20, 17))

    def test_each_cycle_gets_its_own_rise_and_flat_cycles_are_left_out(self) -> None:
        rises = model.temperature_rise_by_cycle(self._history(), self.STARTS)
        self.assertEqual(rises, {self.STARTS[0]: _iso(self.STARTS[0], 15), self.STARTS[2]: _iso(self.STARTS[2], 14), self.STARTS[3]: _iso(self.STARTS[3], 16)})

    def test_a_cycle_only_sees_its_own_readings(self) -> None:
        # the flat cycle is followed by a cycle with a rise: that rise must not be credited to the flat one
        rises = model.temperature_rise_by_cycle(self._history(), self.STARTS)
        self.assertNotIn(self.STARTS[1], rises)

    def test_only_the_last_cycles_and_none_without_data(self) -> None:
        starts = [_iso("2026-01-01", 28 * i) for i in range(8)]
        history = [e for start in starts for e in _readings(start, 28, 15)]
        rises = model.temperature_rise_by_cycle(history, starts, limit=6)
        self.assertEqual(sorted(rises), starts[-6:])
        self.assertEqual(model.temperature_rise_by_cycle([], starts), {})
        self.assertEqual(model.temperature_rise_by_cycle(history, []), {})
        self.assertEqual(model.temperature_rise_by_cycle([{"date": "x", "basal_temp": 36}, "junk", {"basal_temp": 36}], starts), {})

    def test_the_default_limit_matches_the_bleeding_blocks_the_sensor_keeps(self) -> None:
        self.assertEqual(model.TEMPERATURE_RISE_CYCLES, 6)


if __name__ == "__main__":
    unittest.main()
