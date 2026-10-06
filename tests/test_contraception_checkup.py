"""Tests for the pill streak/break logic, the checkup helpers and the checkup-overdue repair issue."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from datetime import date, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPONENT_ROOT = REPO_ROOT / "custom_components" / "menstruation_cycle"
TODAY = date(2026, 10, 6)
ISSUE_CALLS: list[tuple] = []


def _ensure_module(name: str, **attrs: object) -> types.ModuleType:
    """Get or create a stub module and fill in missing attributes (never clobbers another test's stub)."""
    module = sys.modules.setdefault(name, types.ModuleType(name))
    if not hasattr(module, "__path__"):
        module.__path__ = []  # type: ignore[attr-defined]
    for key, value in attrs.items():
        if not hasattr(module, key):
            setattr(module, key, value)
    return module


def _install_stubs() -> None:
    _ensure_module("homeassistant")
    _ensure_module("homeassistant.components")
    _ensure_module("homeassistant.helpers")
    _ensure_module("voluptuous", Schema=lambda *args, **kwargs: None)
    _ensure_module("homeassistant.components.repairs", RepairsFlow=type("RepairsFlow", (), {}))
    _ensure_module("homeassistant.core", HomeAssistant=type("HomeAssistant", (), {}))
    _ensure_module("homeassistant.helpers.entity_registry")
    # The issue registry is replaced on purpose: the tests assert on the recorded calls.
    issue_registry = types.ModuleType("homeassistant.helpers.issue_registry")
    issue_registry.IssueSeverity = type("IssueSeverity", (), {"WARNING": "warning", "ERROR": "error", "CRITICAL": "critical"})
    issue_registry.async_create_issue = lambda hass, domain, issue_id, **kwargs: ISSUE_CALLS.append(
        ("create", issue_id, kwargs)
    )
    issue_registry.async_delete_issue = lambda hass, domain, issue_id: ISSUE_CALLS.append(("delete", issue_id))
    sys.modules["homeassistant.helpers.issue_registry"] = issue_registry


def _load(package: str, module_name: str, file_name: str) -> types.ModuleType:
    spec = importlib.util.spec_from_file_location(f"{package}.{module_name}", COMPONENT_ROOT / file_name)
    module = importlib.util.module_from_spec(spec)
    sys.modules[f"{package}.{module_name}"] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


_install_stubs()
_PKG = "tstest_contraception_checkup"
_package = types.ModuleType(_PKG)
_package.__path__ = [str(COMPONENT_ROOT)]
sys.modules[_PKG] = _package
const = _load(_PKG, "const", "const.py")
model = _load(_PKG, "model", "model.py")
repairs = _load(_PKG, "repairs", "repairs.py")


def _day(offset: int) -> str:
    return (TODAY + timedelta(days=offset)).isoformat()


def _pills(*offsets: int, method: str = "pill") -> list[dict[str, str]]:
    return [{"date": _day(o), "contraception_method": method} for o in offsets]


class PillStreakTests(unittest.TestCase):
    def _status(self, entries: list[dict[str, str]]) -> dict:
        return model.compute_contraception_status(entries, today=TODAY)

    def test_streak_counts_through_today(self) -> None:
        status = self._status(_pills(-2, -1, 0))
        self.assertEqual(status["pill_streak_days"], 3)
        self.assertEqual(status["pill_last_run_days"], 3)
        self.assertEqual(status["pill_last_taken"], _day(0))

    def test_streak_survives_until_todays_intake_is_logged(self) -> None:
        self.assertEqual(self._status(_pills(-3, -2, -1))["pill_streak_days"], 3)

    def test_missed_day_ends_the_run(self) -> None:
        status = self._status(_pills(-3, -1))
        self.assertEqual(status["pill_streak_days"], 1)
        self.assertEqual(status["pill_last_run_days"], 1)

    def test_streak_is_zero_when_last_pill_is_two_days_old(self) -> None:
        status = self._status(_pills(-2))
        self.assertEqual(status["pill_streak_days"], 0)
        self.assertEqual(status["pill_last_run_days"], 1)
        self.assertEqual(status["pill_last_taken"], _day(-2))

    def test_future_dated_entry_is_ignored(self) -> None:
        status = self._status(_pills(1))
        self.assertEqual(status["pill_streak_days"], 0)
        self.assertIsNone(status["pill_last_taken"])

    def test_other_method_does_not_extend_the_streak(self) -> None:
        status = self._status(_pills(-1) + _pills(0, method="none"))
        self.assertEqual(status["current_method"], "none")
        self.assertEqual(status["pill_last_taken"], _day(-1))
        self.assertEqual(status["pill_streak_days"], 1)

    def test_empty_history(self) -> None:
        status = self._status([])
        self.assertEqual((status["pill_streak_days"], status["pill_last_run_days"]), (0, 0))
        self.assertIsNone(status["pill_last_taken"])


class PillBreakTests(unittest.TestCase):
    def _active(self, last_offset: int, run: int, pause_days: int) -> bool:
        entries = _pills(*range(last_offset - run + 1, last_offset + 1))
        status = model.compute_contraception_status(entries, today=TODAY)
        return model.pill_break_active(status, TODAY, pause_days)

    def test_break_runs_after_a_full_pack(self) -> None:
        self.assertTrue(self._active(-3, 21, 7))

    def test_break_boundaries(self) -> None:
        self.assertTrue(self._active(-7, 21, 7))
        self.assertFalse(self._active(-8, 21, 7))
        self.assertFalse(self._active(-3, 21, 2))

    def test_no_break_while_taking_pills_today(self) -> None:
        self.assertFalse(self._active(0, 21, 7))

    def test_no_break_without_a_full_run_or_with_pause_off(self) -> None:
        self.assertFalse(self._active(-3, 10, 7))
        self.assertFalse(self._active(-3, 21, 0))

    def test_24_4_pack_counts_as_a_full_run(self) -> None:
        self.assertTrue(self._active(-2, 24, 4))


class PillPackEndTests(unittest.TestCase):
    def _end(self, streak: int, pause_days: int, last_offset: int = 0):
        status = model.compute_contraception_status(_pills(*range(last_offset - streak + 1, last_offset + 1)), today=TODAY)
        return model.pill_pack_end(status, pause_days)

    def test_21_plus_7_pack(self) -> None:
        self.assertEqual(self._end(18, 7), TODAY + timedelta(days=3))

    def test_24_plus_4_pack(self) -> None:
        self.assertEqual(self._end(20, 4), TODAY + timedelta(days=4))

    def test_counts_from_last_logged_pill_when_today_is_missing(self) -> None:
        self.assertEqual(self._end(18, 7, last_offset=-1), TODAY + timedelta(days=2))

    def test_last_pill_of_the_pack_ends_on_that_day(self) -> None:
        self.assertEqual(self._end(21, 7), TODAY)

    def test_unknown_without_pack_break_or_beyond_one_pack_or_without_pills(self) -> None:
        self.assertIsNone(self._end(18, 0))
        self.assertIsNone(self._end(22, 7))
        self.assertIsNone(model.pill_pack_end(model.compute_contraception_status([], today=TODAY), 7))


class CheckupHelperTests(unittest.TestCase):
    def test_last_checkup_is_the_latest_gyn_or_pap_entry(self) -> None:
        history = [
            {"date": "2025-03-01", "appointments": ["gynecologist"]},
            {"date": "2025-09-10", "appointments": "pap_smear"},
            {"date": "2026-01-05", "appointments": ["vaccination", "sti_test"]},
        ]
        self.assertEqual(model.last_checkup_date(history), date(2025, 9, 10))

    def test_no_checkup_logged(self) -> None:
        self.assertIsNone(model.last_checkup_date([]))
        self.assertIsNone(model.last_checkup_date([{"date": "2026-01-05", "appointments": ["vaccination"]}]))

    def test_bad_dates_and_non_dicts_are_skipped(self) -> None:
        history = [{"date": "not-a-date", "appointments": ["gynecologist"]}, "junk", {"appointments": ["gynecologist"]}]
        self.assertIsNone(model.last_checkup_date(history))

    def test_next_due_adds_the_interval(self) -> None:
        history = [{"date": "2025-10-06", "appointments": ["gynecologist"]}]
        self.assertEqual(model.next_checkup_due(history, 12), date(2025, 10, 6) + timedelta(days=365))
        self.assertEqual(model.next_checkup_due(history, 6), date(2025, 10, 6) + timedelta(days=182))

    def test_next_due_is_none_when_off_or_nothing_logged(self) -> None:
        history = [{"date": "2025-10-06", "appointments": ["gynecologist"]}]
        self.assertIsNone(model.next_checkup_due(history, 0))
        self.assertIsNone(model.next_checkup_due([], 12))


class CheckupRepairTests(unittest.TestCase):
    def setUp(self) -> None:
        ISSUE_CALLS.clear()

    def _check(self, history: list[dict], interval: int = 12) -> tuple:
        repairs.async_check_checkup_overdue(object(), "abc", "Anna", history, TODAY, interval)
        self.assertEqual(len(ISSUE_CALLS), 1)
        return ISSUE_CALLS[0]

    def test_clears_when_nothing_logged(self) -> None:
        self.assertEqual(self._check([]), ("delete", "checkup_overdue_abc"))

    def test_clears_while_not_yet_due(self) -> None:
        history = [{"date": "2026-01-01", "appointments": ["gynecologist"]}]
        self.assertEqual(self._check(history), ("delete", "checkup_overdue_abc"))

    def test_raises_when_overdue(self) -> None:
        history = [{"date": "2025-09-01", "appointments": ["gynecologist"]}]
        kind, issue_id, kwargs = self._check(history)
        self.assertEqual((kind, issue_id), ("create", "checkup_overdue_abc"))
        self.assertEqual(kwargs["translation_key"], "checkup_overdue")
        self.assertFalse(kwargs["is_fixable"])
        self.assertEqual(
            kwargs["translation_placeholders"],
            {"entry_title": "Anna", "last_date": "2025-09-01", "months": "13", "interval": "12"},
        )

    def test_raises_on_the_due_date_itself(self) -> None:
        history = [{"date": _day(-365), "appointments": ["pap_smear"]}]
        self.assertEqual(self._check(history)[0], "create")

    def test_interval_zero_turns_it_off(self) -> None:
        history = [{"date": "2020-01-01", "appointments": ["gynecologist"]}]
        self.assertEqual(self._check(history, interval=0), ("delete", "checkup_overdue_abc"))


if __name__ == "__main__":
    unittest.main()
