"""Threshold and edge-case tests for the repair checks in repairs.py (checkup and notify target are tested elsewhere)."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

COMPONENT_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
TODAY = date(2026, 10, 6)
_PKG = "tstest_repairs_checks"
CALLS: list[tuple] = []


class _Anything(type):
    def __getattr__(cls, name):
        return name


def _stub_module(name: str) -> types.ModuleType:
    module = types.ModuleType(name)
    module.__path__ = []
    module.__getattr__ = lambda attr: _Anything(attr, (), {})
    return module


def _stubs() -> dict[str, types.ModuleType]:
    names = (
        "voluptuous", "homeassistant", "homeassistant.components", "homeassistant.components.repairs",
        "homeassistant.core", "homeassistant.helpers", "homeassistant.helpers.entity_registry",
        "homeassistant.helpers.issue_registry",
    )
    stubs = {name: _stub_module(name) for name in names}
    registry = stubs["homeassistant.helpers.issue_registry"]
    registry.async_create_issue = lambda hass, domain, issue_id, **kwargs: CALLS.append(("create", issue_id, kwargs))
    registry.async_delete_issue = lambda hass, domain, issue_id: CALLS.append(("delete", issue_id))
    stubs["homeassistant.helpers"].entity_registry = stubs["homeassistant.helpers.entity_registry"]
    return stubs


def _load(module_name: str, file_name: str) -> types.ModuleType:
    spec = importlib.util.spec_from_file_location(f"{_PKG}.{module_name}", COMPONENT_ROOT / file_name)
    module = importlib.util.module_from_spec(spec)
    sys.modules[f"{_PKG}.{module_name}"] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


with patch.dict(sys.modules, _stubs()):
    _package = types.ModuleType(_PKG)
    _package.__path__ = [str(COMPONENT_ROOT)]
    sys.modules[_PKG] = _package
    const = _load("const", "const.py")
    model = _load("model", "model.py")
    repairs = _load("repairs", "repairs.py")


class RepairCheckCase(unittest.TestCase):
    def setUp(self) -> None:
        CALLS.clear()

    def assertCreated(self, issue_prefix: str, **placeholders: str) -> None:
        self.assertEqual(len(CALLS), 1, CALLS)
        kind, issue_id, kwargs = CALLS[0]
        self.assertEqual(kind, "create")
        self.assertTrue(issue_id.startswith(issue_prefix), issue_id)
        for key, value in placeholders.items():
            self.assertEqual(kwargs["translation_placeholders"][key], value)

    def assertCleared(self, issue_prefix: str) -> None:
        self.assertEqual(len(CALLS), 1, CALLS)
        self.assertEqual(CALLS[0][0], "delete")
        self.assertTrue(CALLS[0][1].startswith(issue_prefix), CALLS[0][1])


class StaleIcsTokenTests(RepairCheckCase):
    def _check(self, created_at) -> None:
        repairs.async_check_stale_ics_token(None, "e1", "Sarah", created_at)

    def test_stale_at_threshold_and_fresh_before(self) -> None:
        now = datetime.now(timezone.utc)
        self._check((now - timedelta(days=const.ICS_TOKEN_STALE_DAYS, hours=1)).isoformat())
        self.assertCreated("stale_ics_token_", age_days=str(const.ICS_TOKEN_STALE_DAYS))
        CALLS.clear()
        self._check((now - timedelta(days=const.ICS_TOKEN_STALE_DAYS - 1)).isoformat())
        self.assertCleared("stale_ics_token_")

    def test_missing_or_garbage_timestamp_is_not_stale(self) -> None:
        for value in (None, "", "yesterday"):
            CALLS.clear()
            self._check(value)
            self.assertCleared("stale_ics_token_")

    def test_naive_timestamp_is_read_as_utc(self) -> None:
        self._check((datetime.now(timezone.utc) - timedelta(days=500)).replace(tzinfo=None).isoformat())
        self.assertCreated("stale_ics_token_")


class LowPredictionConfidenceTests(RepairCheckCase):
    def _check(self, gating) -> None:
        repairs.async_check_low_prediction_confidence(None, "e1", "Sarah", gating)

    def test_learning_phase_is_flagged_with_counts(self) -> None:
        self._check({"precision_allowed": False, "valid_cycles": 1, "thresholds": {"min_valid_cycles": 3}})
        self.assertCreated("low_prediction_confidence_", valid_cycles="1", min_valid_cycles="3")

    def test_precise_or_life_stage_or_missing_gating_is_not_flagged(self) -> None:
        for gating in (
            {"precision_allowed": True, "thresholds": {"min_valid_cycles": 3}},
            {"precision_allowed": False, "reason": "menopause_mode"},
            None,
        ):
            CALLS.clear()
            self._check(gating)
            self.assertCleared("low_prediction_confidence_")


class HospitalBagTests(RepairCheckCase):
    ITEMS = [{"status": "completed"}, {"status": "open"}, {"status": "open"}]

    def _check(self, *, pregnant=True, due_in=10, items=None) -> None:
        due = None if due_in is None else (date.today() + timedelta(days=due_in)).isoformat()
        repairs.async_check_hospital_bag_incomplete(None, "e1", "Sarah", pregnant, due, self.ITEMS if items is None else items)

    def test_flagged_inside_window_with_open_items(self) -> None:
        self._check(due_in=const.HOSPITAL_BAG_REMINDER_DAYS_BEFORE_DUE)
        self.assertCreated("hospital_bag_incomplete_")

    def test_overdue_due_date_counts_as_zero_days(self) -> None:
        self._check(due_in=-3)
        self.assertCreated("hospital_bag_incomplete_")

    def test_cleared_outside_window_when_done_or_not_pregnant_or_no_date(self) -> None:
        cases = (
            dict(due_in=const.HOSPITAL_BAG_REMINDER_DAYS_BEFORE_DUE + 1),
            dict(items=[{"status": "completed"}]),
            dict(items=[]),
            dict(pregnant=False),
            dict(due_in=None),
        )
        for case in cases:
            CALLS.clear()
            self._check(**case)
            self.assertCleared("hospital_bag_incomplete_")

    def test_the_given_day_is_used_not_the_system_clock(self) -> None:
        window = const.HOSPITAL_BAG_REMINDER_DAYS_BEFORE_DUE
        due = "2030-03-01"
        repairs.async_check_hospital_bag_incomplete(None, "e1", "Sarah", True, due, self.ITEMS, date(2030, 3, 1) - timedelta(days=window))
        self.assertCreated("hospital_bag_incomplete_")
        CALLS.clear()
        repairs.async_check_hospital_bag_incomplete(None, "e1", "Sarah", True, due, self.ITEMS, date(2030, 3, 1) - timedelta(days=window + 1))
        self.assertCleared("hospital_bag_incomplete_")

    def test_garbage_due_date_is_ignored(self) -> None:
        repairs.async_check_hospital_bag_incomplete(None, "e1", "Sarah", True, "soon", self.ITEMS)
        self.assertCleared("hospital_bag_incomplete_")


class PregnancyOverdueTests(RepairCheckCase):
    DUE = "2030-03-01"

    def _check(self, days_after, *, pregnant=True, due=DUE) -> None:
        CALLS.clear()
        repairs.async_check_pregnancy_overdue(
            None, "e1", "Sarah", pregnant, due, date(2030, 3, 1) + timedelta(days=days_after)
        )

    def test_raised_from_threshold_with_placeholders(self) -> None:
        n = const.PREGNANCY_OVERDUE_REPAIR_DAYS
        self._check(n)
        self.assertCreated("pregnancy_overdue_", due_date=self.DUE, days_overdue=str(n), entry_title="Sarah")

    def test_cleared_before_threshold(self) -> None:
        self._check(const.PREGNANCY_OVERDUE_REPAIR_DAYS - 1)
        self.assertCleared("pregnancy_overdue_")
        self._check(-30)
        self.assertCleared("pregnancy_overdue_")

    def test_cleared_when_not_pregnant_or_no_or_garbage_date(self) -> None:
        for kwargs in (dict(pregnant=False), dict(due=None), dict(due="soon")):
            self._check(60, **kwargs)
            self.assertCleared("pregnancy_overdue_")


class LowWellnessScoreTests(RepairCheckCase):
    def test_threshold(self) -> None:
        low = const.WELLNESS_SCORE_LOW_THRESHOLD
        repairs.async_check_low_wellness_score(None, "e1", "Sarah", {"score": low - 1})
        self.assertCreated("low_wellness_score_")
        for value in ({"score": low}, {"score": None}, None, "x"):
            CALLS.clear()
            repairs.async_check_low_wellness_score(None, "e1", "Sarah", value)
            self.assertCleared("low_wellness_score_")


class CyclePatternRiskTests(RepairCheckCase):
    def _check(self, std, pain) -> None:
        repairs.async_check_cycle_pattern_risk(None, "e1", "Sarah", {"cycle_std_days": std, "avg_pain_days_per_cycle": pain})

    def test_irregular_or_painful_is_flagged_only_above_the_thresholds(self) -> None:
        self._check(const.CYCLE_PATTERN_IRREGULARITY_THRESHOLD_DAYS + 0.1, 0)
        self.assertCreated("cycle_pattern_risk_")
        CALLS.clear()
        self._check(2, const.CYCLE_PATTERN_PAIN_DAYS_THRESHOLD + 0.1)
        self.assertCreated("cycle_pattern_risk_")
        for std, pain in ((const.CYCLE_PATTERN_IRREGULARITY_THRESHOLD_DAYS, const.CYCLE_PATTERN_PAIN_DAYS_THRESHOLD), (None, None)):
            CALLS.clear()
            self._check(std, pain)
            self.assertCleared("cycle_pattern_risk_")

    def test_missing_signals_clear_the_issue(self) -> None:
        repairs.async_check_cycle_pattern_risk(None, "e1", "Sarah", None)
        self.assertCleared("cycle_pattern_risk_")


class PeriodOverdueTests(RepairCheckCase):
    def _check(self, days_until, active=False, precise=True) -> None:
        repairs.async_check_period_overdue(None, "e1", "Sarah", days_until, active, precise)

    def test_threshold_and_gates(self) -> None:
        self._check(-const.PERIOD_OVERDUE_DAYS)
        self.assertCreated("period_overdue_", days_overdue=str(const.PERIOD_OVERDUE_DAYS))
        for args in (
            dict(days_until=-(const.PERIOD_OVERDUE_DAYS - 1)),
            dict(days_until=-20, active=True),
            dict(days_until=-20, precise=False),
            dict(days_until=None),
        ):
            CALLS.clear()
            self._check(**args)
            self.assertCleared("period_overdue_")


class PeriodProlongedTests(RepairCheckCase):
    def _check(self, period) -> None:
        repairs.async_check_period_prolonged(None, "e1", "Sarah", period, TODAY)

    def _period(self, length=const.PERIOD_PROLONGED_DAYS, effective=5, last_offset=0):
        return {
            "length": length,
            "effective_duration": effective,
            "last_confirmed_day": (TODAY + timedelta(days=last_offset)).isoformat(),
        }

    def test_long_ongoing_bleed_is_flagged(self) -> None:
        self._check(self._period())
        self.assertCreated("period_prolonged_", days=str(const.PERIOD_PROLONGED_DAYS))
        CALLS.clear()
        self._check(self._period(last_offset=-1))
        self.assertCreated("period_prolonged_")

    def test_short_normal_for_this_profile_or_ended_is_not_flagged(self) -> None:
        cases = (
            self._period(length=const.PERIOD_PROLONGED_DAYS - 1),
            self._period(effective=const.PERIOD_PROLONGED_DAYS),  # this profile's normal period is that long
            self._period(last_offset=-2),
            None,
            {**self._period(), "last_confirmed_day": None},
        )
        for period in cases:
            CALLS.clear()
            self._check(period)
            self.assertCleared("period_prolonged_")


class PregnancyTestHintTests(RepairCheckCase):
    def _day(self, symptoms):
        return model.last_positive_pregnancy_test_day(symptoms)

    def test_latest_test_decides_whether_it_is_positive(self) -> None:
        pos = {"date": "2026-10-01", "test": "positive_pregnancy"}
        neg = {"date": "2026-10-03", "test": ["negative_pregnancy"]}
        self.assertEqual(self._day([pos]), date(2026, 10, 1))
        self.assertIsNone(self._day([pos, neg]))  # a later negative test wins
        self.assertEqual(self._day([neg, {"date": "2026-10-05", "test": "positive_pregnancy"}]), date(2026, 10, 5))
        self.assertEqual(self._day([{"date": "2026-10-03", "test": ["negative_pregnancy", "positive_pregnancy"]}]), date(2026, 10, 3))
        self.assertIsNone(self._day([{"date": "2026-10-03", "test": "positive_ovulation"}, {"date": "bad"}, "x"]))
        self.assertIsNone(self._day([]))

    def _check(self, positive_day, is_pregnant=False) -> None:
        repairs.async_check_pregnancy_test_hint(None, "e1", "Sarah", positive_day, is_pregnant, TODAY)

    def test_hint_for_a_recent_positive_test_with_the_date(self) -> None:
        self._check(TODAY - timedelta(days=3))
        self.assertCreated("pregnancy_test_positive_", date=(TODAY - timedelta(days=3)).isoformat(), entry_title="Sarah")
        CALLS.clear()
        self._check(TODAY)
        self.assertCreated("pregnancy_test_positive_")
        CALLS.clear()
        self._check(TODAY - timedelta(days=const.PREGNANCY_TEST_HINT_DAYS))
        self.assertCreated("pregnancy_test_positive_")

    def test_cleared_when_old_future_missing_or_pregnancy_mode_is_on(self) -> None:
        for args in (
            (TODAY - timedelta(days=const.PREGNANCY_TEST_HINT_DAYS + 1), False),
            (TODAY + timedelta(days=1), False),
            (None, False),
            (TODAY, True),
        ):
            CALLS.clear()
            self._check(*args)
            self.assertCleared("pregnancy_test_positive_")


class HouseholdInventoryTests(RepairCheckCase):
    def test_lists_critical_products_or_clears(self) -> None:
        repairs.async_check_household_inventory_critical(None, ["Tampons", "Pads"])
        self.assertEqual(CALLS[0][0], "create")
        self.assertEqual(CALLS[0][2]["translation_placeholders"], {"products_list": "Tampons, Pads"})
        CALLS.clear()
        repairs.async_check_household_inventory_critical(None, [])
        self.assertEqual(CALLS[0][0], "delete")


class HouseholdSupplyShortTests(RepairCheckCase):
    def test_lists_short_products_or_clears(self) -> None:
        repairs.async_check_household_supply_short(None, ["Tampons 8/14", "Pads 2/6"])
        self.assertEqual(CALLS[0][0], "create")
        self.assertEqual(CALLS[0][1], "household_supply_short")
        self.assertEqual(CALLS[0][2]["translation_placeholders"], {"products_list": "Tampons 8/14, Pads 2/6"})
        self.assertFalse(CALLS[0][2]["is_fixable"])
        CALLS.clear()
        repairs.async_check_household_supply_short(None, [])
        self.assertEqual(CALLS, [("delete", "household_supply_short")])


class ProfileInactiveTests(RepairCheckCase):
    def _check(self, last) -> None:
        repairs.async_check_profile_inactive(None, "e1", "Sarah", last, TODAY)

    def test_flagged_from_the_threshold_on(self) -> None:
        days = const.PROFILE_INACTIVITY_REMINDER_DAYS
        self._check((TODAY - timedelta(days=days)).isoformat())
        self.assertCreated("profile_inactive_", days_inactive=str(days))
        for last in ((TODAY - timedelta(days=days - 1)).isoformat(), None, "", "never"):
            CALLS.clear()
            self._check(last)
            self.assertCleared("profile_inactive_")


if __name__ == "__main__":
    unittest.main()
