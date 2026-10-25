"""Pill blister view (model.pill_pack_view) on top of compute_contraception_status."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

COMPONENT_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
_PKG = "tstest_pill_pack"


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

TODAY = date(2026, 10, 1)


def _view(run: int, ended_days_ago: int, pause: int = 7):
    """The blister view for a run of `run` daily pill entries that ended `ended_days_ago` days before today."""
    last = TODAY - timedelta(days=ended_days_ago)
    history = [{"date": (last - timedelta(days=i)).isoformat(), "contraception_method": "pill"} for i in range(run)]
    status = model.compute_contraception_status(history, today=TODAY)
    return model.pill_pack_view(status, TODAY, pause)


class PillPackViewTests(unittest.TestCase):
    def test_only_for_the_pill(self) -> None:
        self.assertIsNone(model.pill_pack_view(model.compute_contraception_status([], today=TODAY), TODAY, 7))
        patch_history = [{"date": TODAY.isoformat(), "contraception_method": "patch"}]
        self.assertIsNone(model.pill_pack_view(model.compute_contraception_status(patch_history, today=TODAY), TODAY, 7))

    def test_pack_in_progress(self) -> None:
        view = _view(10, 0)
        self.assertEqual((view["active"], view["pause"], view["position"]), (21, 7, 10))
        self.assertEqual(view["taken"], list(range(1, 11)))
        self.assertTrue(view["today_taken"] and not view["in_pause"] and not view["new_pack"])

    def test_todays_pill_still_due(self) -> None:
        view = _view(10, 1)
        self.assertEqual((view["position"], view["taken"][-1], view["today_taken"]), (11, 10, False))

    def test_missed_days_leave_empty_cells(self) -> None:
        view = _view(5, 3)
        self.assertEqual((view["position"], view["taken"]), (8, [1, 2, 3, 4, 5]))

    def test_pack_break_then_a_new_pack(self) -> None:
        self.assertFalse(_view(21, 0)["in_pause"])  # the last pill is still a pill day
        self.assertEqual((_view(21, 1)["position"], _view(21, 1)["in_pause"]), (22, True))
        self.assertEqual((_view(21, 7)["position"], _view(21, 7)["in_pause"]), (28, True))
        fresh = _view(21, 8)
        self.assertTrue(fresh["new_pack"] and fresh["taken"] == [] and fresh["position"] == 1)

    def test_continuous_use_wraps_after_28(self) -> None:
        self.assertEqual(_view(30, 0, pause=0)["taken"], [1, 2])
        self.assertTrue(_view(28, 1, pause=0)["new_pack"])
        self.assertEqual(_view(28, 0, pause=0)["position"], 28)

    def test_no_intake_yet(self) -> None:
        status = model.compute_contraception_status([{"date": "2026-09-30", "contraception_method": "pill"}], today=TODAY)
        status["pill_last_taken"], status["pill_last_run_days"] = None, 0
        view = model.pill_pack_view(status, TODAY, 7)
        self.assertTrue(view["new_pack"] and view["position"] == 1)

    def test_pause_is_clamped(self) -> None:
        self.assertEqual(_view(3, 0, pause=99)["active"], 1)
        self.assertEqual(_view(3, 0, pause=-4)["active"], 28)


class PillPackStartDateTests(unittest.TestCase):
    """With a pack start date the position comes from the calendar, the taken cells from the logged run."""

    def _view(self, start: date, run: int, ended_days_ago: int, pause: int = 7):
        last = TODAY - timedelta(days=ended_days_ago)
        history = [{"date": (last - timedelta(days=i)).isoformat(), "contraception_method": "pill"} for i in range(run)]
        status = model.compute_contraception_status(history, today=TODAY)
        return model.pill_pack_view(status, TODAY, pause, start.isoformat())

    def test_start_in_the_middle_of_a_pack_fixes_the_shift(self) -> None:
        # pack started 10 days ago, but logging only began 3 days ago: the blister shows the real position
        view = self._view(TODAY - timedelta(days=10), 4, 0)
        self.assertEqual(view["position"], 11)
        self.assertEqual(view["taken"], [8, 9, 10, 11])  # missed days stay empty, no filled run from cell 1
        self.assertTrue(view["today_taken"] and not view["new_pack"])
        self.assertEqual(_view(4, 0)["taken"], [1, 2, 3, 4], "without a start date the old guess is unchanged")

    def test_todays_pill_due_and_the_pause(self) -> None:
        view = self._view(TODAY - timedelta(days=10), 10, 1)
        self.assertEqual((view["position"], view["taken"][-1], view["today_taken"]), (11, 10, False))
        pause = self._view(TODAY - timedelta(days=22), 21, 1)
        self.assertEqual((pause["position"], pause["in_pause"]), (23, True))

    def test_later_packs_follow_without_a_gap(self) -> None:
        view = self._view(TODAY - timedelta(days=28 * 3 + 4), 5, 0)  # fourth pack after the entered one, cell 5
        self.assertEqual((view["position"], view["taken"]), (5, [1, 2, 3, 4, 5]))
        last_cell = self._view(TODAY - timedelta(days=27), 1, 0)
        self.assertEqual((last_cell["position"], last_cell["in_pause"]), (28, True))
        self.assertEqual(self._view(TODAY - timedelta(days=28), 1, 0)["position"], 1)

    def test_last_intake_in_the_previous_pack_leaves_the_new_one_empty(self) -> None:
        view = self._view(TODAY - timedelta(days=2), 20, 5)  # the run ended before this pack began
        self.assertEqual((view["position"], view["taken"], view["today_taken"]), (3, [], False))

    def test_unusable_start_dates_fall_back_to_the_guess(self) -> None:
        status = model.compute_contraception_status(
            [{"date": TODAY.isoformat(), "contraception_method": "pill"}], today=TODAY
        )
        guess = model.pill_pack_view(status, TODAY, 7)
        for bad in ("", None, "not a date", (TODAY + timedelta(days=3)).isoformat()):
            self.assertEqual(model.pill_pack_view(status, TODAY, 7, bad), guess, bad)


class PillPackSensorAttributeTests(unittest.TestCase):
    def test_attribute_is_exposed_at_full_visibility_only(self) -> None:
        source = (COMPONENT_ROOT / "sensor.py").read_text(encoding="utf-8")
        self.assertIn('"pill_pack": pill_pack_view(', source)
        self.assertIn("CONF_PILL_PAUSE_DAYS", source)
        self.assertIn("CONF_PILL_PACK_START", source)
        allowlists = source[source.index("_VISIBILITY_ALWAYS_KEPT_KEYS = "):source.index("def _filter_attributes_for_visibility")]
        self.assertNotIn("pill_pack", allowlists)  # hidden below "Full" like the rest of the contraception data


if __name__ == "__main__":
    unittest.main()
