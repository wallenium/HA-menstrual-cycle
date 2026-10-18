"""The speed-ups in badges.py / sensor.py must not change results: compare against the plain implementations."""

from __future__ import annotations

import importlib
import random
import sys
import unittest
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_notifications as tn  # noqa: E402  (package with Home Assistant stubs)

badges = importlib.import_module(f"{tn._PKG}.badges")
TODAY = date(2026, 10, 6)


def _brute_force_max_temp_days(symptom_history, grouped_starts, today):
    temp_days = {
        d for e in symptom_history if isinstance(e, dict) and e.get("basal_temp") not in (None, "")
        for d in [badges._parse_iso(e.get("date"))] if d is not None
    }
    if not temp_days:
        return 0
    starts = sorted(d for d in (badges._parse_iso(s) for s in grouped_starts) if d is not None)
    if not starts:
        return len(temp_days)
    bounds = starts + [today + timedelta(days=1)]
    return max(sum(1 for d in temp_days if bounds[i] <= d < bounds[i + 1]) for i in range(len(bounds) - 1))


class MaxBasalTempDays(unittest.TestCase):
    def test_matches_brute_force_on_random_data(self):
        rnd = random.Random(7)
        for _ in range(60):
            n_starts = rnd.randint(0, 9)
            starts = sorted({(TODAY - timedelta(days=rnd.randint(0, 300))).isoformat() for _ in range(n_starts)})
            logs = [
                {"date": (TODAY - timedelta(days=rnd.randint(-3, 320))).isoformat(),
                 "basal_temp": rnd.choice([None, "", 36.4, 36.9])}
                for _ in range(rnd.randint(0, 120))
            ]
            logs.append("garbage")
            logs.append({"date": "not-a-date", "basal_temp": 36.5})
            self.assertEqual(
                badges._max_basal_temp_days_in_any_cycle(logs, starts, TODAY),
                _brute_force_max_temp_days(logs, starts, TODAY),
            )

    def test_window_edges(self):
        a, b = TODAY - timedelta(days=20), TODAY - timedelta(days=10)
        logs = [{"date": d.isoformat(), "basal_temp": 36.5} for d in (a, b - timedelta(days=1), b, TODAY, TODAY + timedelta(days=1))]
        # windows: [a, b) holds a and b-1; [b, today+1) holds b and today; today+1 is outside every window
        self.assertEqual(badges._max_basal_temp_days_in_any_cycle(logs, [a.isoformat(), b.isoformat()], TODAY), 2)


class SymptomVarietyEarlyExit(unittest.TestCase):
    def _variety(self, logs):
        result = badges.evaluate_badges([], logs, [], today=TODAY)
        return next(b for b in result if b["key"] == "symptom_variety")

    def test_earned_with_many_categories_and_in_progress_count_kept(self):
        keys = list(badges._VARIETY_CATEGORY_KEYS)
        self.assertGreaterEqual(len(keys), 6)
        many = [{"date": TODAY.isoformat(), **{k: "x" for k in keys}}] + [{"date": TODAY.isoformat(), keys[0]: "y"}] * 5
        self.assertEqual(self._variety(many)["state"], "earned")
        few = [{"date": TODAY.isoformat(), keys[0]: "x"}, {"date": TODAY.isoformat(), keys[1]: "x"}]
        badge = self._variety(few)
        self.assertNotEqual(badge["state"], "earned")
        self.assertEqual(badge.get("progress_value", badge.get("value")), 2)
        four = [{"date": TODAY.isoformat(), keys[i]: "x"} for i in range(4)]  # one category per entry, still short of 5
        badge = self._variety(four)
        self.assertNotEqual(badge["state"], "earned")
        self.assertEqual(badge.get("progress_value", badge.get("value")), 4)


class DateParseCache(unittest.TestCase):
    def test_sensor_parser_keeps_its_behaviour(self):
        import test_sensor_thread_safety as ts

        sensor = ts.sensor_module
        parse = sensor._parse_iso_date
        self.assertEqual(parse("2026-10-06"), date(2026, 10, 6))
        self.assertEqual(parse(" 2026-10-06 "), date(2026, 10, 6))
        self.assertEqual(parse("2026-10-06T12:00:00Z"), date(2026, 10, 6))
        self.assertEqual(parse(date(2026, 10, 6)), date(2026, 10, 6))
        self.assertEqual(parse(1791244800), date(2026, 10, 6))
        for bad in (None, "", "  ", "nope", "2026-13-40", 1.5, []):
            self.assertIsNone(parse(bad))
        self.assertIs(parse("2026-10-06"), parse("2026-10-06"))  # memoized


if __name__ == "__main__":
    unittest.main()
