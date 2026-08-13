"""Tests for the progress badge evaluation logic in badges.py."""

from __future__ import annotations

import sys
import types
import unittest
from datetime import date, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Minimal HomeAssistant stubs so badges.py can be imported stand-alone
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parents[1]


def _install_stubs() -> None:
    for mod_name in [
        "homeassistant",
        "homeassistant.components",
        "homeassistant.components.sensor",
        "homeassistant.config_entries",
        "homeassistant.const",
        "homeassistant.core",
        "homeassistant.exceptions",
        "homeassistant.helpers",
        "homeassistant.helpers.config_validation",
        "homeassistant.helpers.entity_registry",
        "homeassistant.helpers.dispatcher",
        "homeassistant.helpers.entity_platform",
        "homeassistant.helpers.event",
        "homeassistant.helpers.typing",
        "homeassistant.util",
        "homeassistant.util.dt",
    ]:
        if mod_name not in sys.modules:
            sys.modules[mod_name] = types.ModuleType(mod_name)


_install_stubs()

import importlib.util

_spec = importlib.util.spec_from_file_location(
    "badges",
    REPO_ROOT / "custom_components" / "menstruation_cycle" / "badges.py",
)
_badges_mod = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
_spec.loader.exec_module(_badges_mod)  # type: ignore[union-attr]

evaluate_badges = _badges_mod.evaluate_badges
new_badges_this_week = _badges_mod.new_badges_this_week

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _dates(n_days_ago_start: int, count: int = 1) -> list[str]:
    """Return a list of count ISO date strings going back from n_days_ago_start."""
    today = date.today()
    return [(today - timedelta(days=n_days_ago_start + i)).isoformat() for i in range(count)]


def _cycle_starts(num: int, days_between: int = 28) -> list[str]:
    """Return num cycle start dates spaced days_between apart."""
    today = date.today()
    starts = []
    for i in range(num):
        d = today - timedelta(days=(num - 1 - i) * days_between)
        starts.append(d.isoformat())
    return starts


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestFirstEntryBadge(unittest.TestCase):
    def test_locked_when_no_history(self):
        badges = evaluate_badges([], [], [])
        first = next(b for b in badges if b["key"] == "first_entry")
        self.assertEqual(first["state"], "locked")
        self.assertIsNone(first["earned_at"])

    def test_earned_with_one_log(self):
        badges = evaluate_badges(_dates(0), [], [])
        first = next(b for b in badges if b["key"] == "first_entry")
        self.assertEqual(first["state"], "earned")
        self.assertIsNotNone(first["earned_at"])

    def test_earned_at_is_today_on_first_earn(self):
        today = date.today()
        badges = evaluate_badges([today.isoformat()], [], [])
        first = next(b for b in badges if b["key"] == "first_entry")
        self.assertEqual(first["earned_at"], today.isoformat())


class TestCycles3Badge(unittest.TestCase):
    def test_locked_with_zero_starts(self):
        badges = evaluate_badges([], [], [])
        b = next(x for x in badges if x["key"] == "cycles_3_logged")
        self.assertEqual(b["state"], "locked")

    def test_in_progress_with_one_start(self):
        badges = evaluate_badges([], [], _cycle_starts(1))
        b = next(x for x in badges if x["key"] == "cycles_3_logged")
        self.assertEqual(b["state"], "in_progress")
        self.assertEqual(b["progress_value"], 1)
        self.assertEqual(b["progress_target"], 3)

    def test_in_progress_with_two_starts(self):
        badges = evaluate_badges([], [], _cycle_starts(2))
        b = next(x for x in badges if x["key"] == "cycles_3_logged")
        self.assertEqual(b["state"], "in_progress")
        self.assertEqual(b["progress_value"], 2)

    def test_earned_with_three_starts(self):
        badges = evaluate_badges([], [], _cycle_starts(3))
        b = next(x for x in badges if x["key"] == "cycles_3_logged")
        self.assertEqual(b["state"], "earned")


class TestCycles6Badge(unittest.TestCase):
    def test_in_progress_with_three_starts(self):
        badges = evaluate_badges([], [], _cycle_starts(3))
        b = next(x for x in badges if x["key"] == "cycles_6_logged")
        self.assertEqual(b["state"], "in_progress")
        self.assertEqual(b["progress_value"], 3)
        self.assertEqual(b["progress_target"], 6)

    def test_earned_with_six_starts(self):
        badges = evaluate_badges([], [], _cycle_starts(6))
        b = next(x for x in badges if x["key"] == "cycles_6_logged")
        self.assertEqual(b["state"], "earned")

    def test_earned_with_more_than_six_starts(self):
        badges = evaluate_badges([], [], _cycle_starts(10))
        b = next(x for x in badges if x["key"] == "cycles_6_logged")
        self.assertEqual(b["state"], "earned")


class TestConsistentLoggingBadge(unittest.TestCase):
    def test_locked_with_few_log_days(self):
        badges = evaluate_badges(_dates(0, 5), [], [])
        b = next(x for x in badges if x["key"] == "consistent_logging_30d")
        self.assertEqual(b["state"], "in_progress")
        self.assertEqual(b["progress_value"], 5)

    def test_earned_with_ten_log_days(self):
        history = _dates(0, 10)  # 10 distinct days ending today
        badges = evaluate_badges(history, [], [])
        b = next(x for x in badges if x["key"] == "consistent_logging_30d")
        self.assertEqual(b["state"], "earned")

    def test_symptom_days_count_toward_consistent(self):
        # 5 history days + 5 symptom-only days = 10 total
        history = _dates(0, 5)
        symptom_history = [{"date": d} for d in _dates(10, 5)]
        badges = evaluate_badges(history, symptom_history, [])
        b = next(x for x in badges if x["key"] == "consistent_logging_30d")
        self.assertEqual(b["state"], "earned")

    def test_days_outside_30_day_window_not_counted(self):
        # 8 days within window + 5 days 40+ days ago = still 8 in-window
        history = _dates(0, 8) + _dates(40, 5)
        badges = evaluate_badges(history, [], [])
        b = next(x for x in badges if x["key"] == "consistent_logging_30d")
        self.assertEqual(b["progress_value"], 8)
        self.assertEqual(b["state"], "in_progress")

    def test_custom_min_days_threshold(self):
        history = _dates(0, 5)
        badges = evaluate_badges(history, [], [], consistent_logging_min_days=5)
        b = next(x for x in badges if x["key"] == "consistent_logging_30d")
        self.assertEqual(b["state"], "earned")


class TestPatternEmergingBadge(unittest.TestCase):
    def test_locked_with_less_than_3_starts(self):
        badges = evaluate_badges([], [], _cycle_starts(2))
        b = next(x for x in badges if x["key"] == "pattern_emerging")
        self.assertEqual(b["state"], "locked")

    def test_earned_with_3_starts_and_avg_cycle_length(self):
        badges = evaluate_badges(
            [], [], _cycle_starts(3), avg_cycle_length=28
        )
        b = next(x for x in badges if x["key"] == "pattern_emerging")
        self.assertEqual(b["state"], "earned")

    def test_earned_with_nfp_score(self):
        badges = evaluate_badges(
            [], [], _cycle_starts(3),
            nfp_analysis={"nfp_symptom_score": 0.5},
        )
        b = next(x for x in badges if x["key"] == "pattern_emerging")
        self.assertEqual(b["state"], "earned")

    def test_locked_with_low_nfp_score_and_no_avg(self):
        badges = evaluate_badges(
            [], [], _cycle_starts(3),
            nfp_analysis={"nfp_symptom_score": 0.1},
            avg_cycle_length=None,
        )
        b = next(x for x in badges if x["key"] == "pattern_emerging")
        # 3 starts + no avg + low score → still locked (score below threshold)
        self.assertEqual(b["state"], "locked")


class TestIdempotentEarnedAt(unittest.TestCase):
    def test_earned_at_preserved_on_re_evaluation(self):
        """Once earned, earned_at should not change on subsequent evaluations."""
        old_date = "2024-01-15"
        existing = [{"key": "first_entry", "state": "earned", "earned_at": old_date}]
        badges = evaluate_badges(
            [date.today().isoformat()], [], [],
            existing_badges=existing,
        )
        first = next(b for b in badges if b["key"] == "first_entry")
        self.assertEqual(first["earned_at"], old_date)

    def test_no_duplicate_earning_same_badge(self):
        """evaluate_badges must return exactly one entry per badge key."""
        badges = evaluate_badges(_dates(0, 15), [], _cycle_starts(6), avg_cycle_length=28)
        keys = [b["key"] for b in badges]
        self.assertEqual(len(keys), len(set(keys)))

    def test_existing_badges_not_required(self):
        """existing_badges parameter is optional and defaults gracefully."""
        badges = evaluate_badges([date.today().isoformat()], [], [])
        self.assertIsInstance(badges, list)


class TestNewBadgesThisWeek(unittest.TestCase):
    def test_empty_when_no_badges(self):
        result = new_badges_this_week([])
        self.assertEqual(result, [])

    def test_returns_key_for_badge_earned_today(self):
        today = date.today()
        badges = [{"key": "first_entry", "state": "earned", "earned_at": today.isoformat()}]
        result = new_badges_this_week(badges, today=today)
        self.assertEqual(result, ["first_entry"])

    def test_returns_key_for_badge_earned_6_days_ago(self):
        today = date.today()
        six_ago = (today - timedelta(days=6)).isoformat()
        badges = [{"key": "cycles_3_logged", "state": "earned", "earned_at": six_ago}]
        result = new_badges_this_week(badges, today=today)
        self.assertEqual(result, ["cycles_3_logged"])

    def test_excludes_badge_earned_7_or_more_days_ago(self):
        today = date.today()
        old = (today - timedelta(days=7)).isoformat()
        badges = [{"key": "first_entry", "state": "earned", "earned_at": old}]
        result = new_badges_this_week(badges, today=today)
        self.assertEqual(result, [])

    def test_throttles_to_at_most_one_badge(self):
        """At most one badge key is returned even if multiple qualify."""
        today = date.today()
        badges = [
            {"key": "first_entry", "state": "earned", "earned_at": (today - timedelta(days=2)).isoformat()},
            {"key": "cycles_3_logged", "state": "earned", "earned_at": today.isoformat()},
        ]
        result = new_badges_this_week(badges, today=today)
        self.assertEqual(len(result), 1)
        # Most recent badge should be surfaced
        self.assertEqual(result[0], "cycles_3_logged")

    def test_in_progress_badges_not_counted(self):
        today = date.today()
        badges = [
            {"key": "cycles_6_logged", "state": "in_progress", "earned_at": None, "progress_value": 3, "progress_target": 6},
        ]
        result = new_badges_this_week(badges, today=today)
        self.assertEqual(result, [])

    def test_locked_badges_not_counted(self):
        today = date.today()
        badges = [{"key": "pattern_emerging", "state": "locked", "earned_at": None}]
        result = new_badges_this_week(badges, today=today)
        self.assertEqual(result, [])


class TestEvaluateBadgesReturnShape(unittest.TestCase):
    def test_returns_all_five_v1_keys(self):
        expected_keys = {
            "first_entry", "cycles_3_logged", "cycles_6_logged",
            "consistent_logging_30d", "pattern_emerging",
        }
        badges = evaluate_badges([], [], [])
        self.assertEqual({b["key"] for b in badges}, expected_keys)

    def test_each_badge_has_required_fields(self):
        badges = evaluate_badges([], [], [])
        for b in badges:
            self.assertIn("key", b)
            self.assertIn("state", b)
            self.assertIn("earned_at", b)
            self.assertIn(b["state"], ("earned", "in_progress", "locked"))


if __name__ == "__main__":
    unittest.main()
