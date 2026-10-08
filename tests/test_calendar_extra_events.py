"""Opt-in pregnancy / contraception events for the calendar entity and the ICS feed."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from datetime import date, timedelta
from pathlib import Path
from types import SimpleNamespace

COMPONENT_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"


def _load(name: str, file_name: str):
    spec = importlib.util.spec_from_file_location(f"mcextra.{name}", COMPONENT_ROOT / file_name)
    module = importlib.util.module_from_spec(spec)
    sys.modules[f"mcextra.{name}"] = module
    spec.loader.exec_module(module)
    return module


_pkg = types.ModuleType("mcextra")
_pkg.__path__ = [str(COMPONENT_ROOT)]  # type: ignore[attr-defined]
sys.modules["mcextra"] = _pkg
const = _load("const", "const.py")
model = _load("model", "model.py")
ical = _load("ical", "ical.py")

TODAY = date(2026, 10, 4)
PREG_ON = {const.CONF_CALENDAR_PREGNANCY_EVENTS: True}
CONTRA_ON = {const.CONF_CALENDAR_CONTRACEPTION_EVENTS: True}


def _runtime(method=None, since="2026-09-20", pregnant=False):
    history = [{"date": since, const.SYMPTOM_CONTRACEPTION_METHOD: method}] if method else []
    return SimpleNamespace(
        pregnancy_data={"is_pregnant": pregnant}, symptom_history=history, noncycle_data={}
    )


def _collect(options, runtime, due="2027-01-10"):
    return ical.collect_extra_events(options, runtime, due, "en", TODAY)


class CollectExtraEventsTests(unittest.TestCase):
    def test_everything_off_by_default(self) -> None:
        self.assertEqual(_collect({}, _runtime("patch", pregnant=True)), [])

    def test_due_date_needs_option_pregnancy_and_a_valid_date(self) -> None:
        self.assertEqual(
            _collect(PREG_ON, _runtime(pregnant=True)),
            [("pregnancy_due", date(2027, 1, 10), date(2027, 1, 10), "Due date (calculated)")],
        )
        self.assertEqual(_collect(PREG_ON, _runtime(pregnant=False)), [])
        self.assertEqual(_collect(PREG_ON, _runtime(pregnant=True), due=None), [])
        self.assertEqual(_collect(PREG_ON, _runtime(pregnant=True), due="soon"), [])
        # the contraception option does not leak the due date
        self.assertEqual(_collect(CONTRA_ON, _runtime(pregnant=True)), [])

    def test_renewal_date_for_an_iud(self) -> None:
        status = model.compute_contraception_status(_runtime("hormonal_iud").symptom_history, today=TODAY)
        events = _collect(CONTRA_ON, _runtime("hormonal_iud"))
        self.assertEqual(
            events,
            [("contraception_renewal", date.fromisoformat(status["renewal_due_date"]), date.fromisoformat(status["renewal_due_date"]), "Contraception: renewal due")],
        )
        self.assertEqual(_collect(PREG_ON, _runtime("hormonal_iud")), [])

    def test_patch_steps_are_projected_over_three_packs(self) -> None:
        events = _collect(CONTRA_ON, _runtime("patch", since="2026-09-20"))
        self.assertEqual(len(events), 11)  # the first change (4 Oct = day 14) is today, 3 packs of 4 steps - 1 past step
        self.assertEqual([e[0] for e in events[:3]], ["patch_change", "patch_remove", "patch_new"])
        self.assertEqual([e[1] for e in events[:3]], [date(2026, 10, 4), date(2026, 10, 11), date(2026, 10, 18)])
        self.assertTrue(all(e[1] >= TODAY for e in events))

    def test_ring_steps_and_other_methods(self) -> None:
        events = _collect(CONTRA_ON, _runtime("ring", since="2026-09-20"))
        self.assertEqual([e[0] for e in events[:2]], ["ring_remove", "ring_insert"])
        self.assertEqual([e[1] for e in events[:2]], [date(2026, 10, 11), date(2026, 10, 18)])
        self.assertEqual(_collect(CONTRA_ON, _runtime("condom")), [])

    def test_pill_pack_end_needs_a_configured_break(self) -> None:
        history = [
            {"date": (TODAY - timedelta(days=i)).isoformat(), const.SYMPTOM_CONTRACEPTION_METHOD: "pill"} for i in range(10)
        ]
        runtime = SimpleNamespace(pregnancy_data={}, symptom_history=history, noncycle_data={})
        self.assertEqual(_collect(CONTRA_ON, runtime), [])
        events = _collect({**CONTRA_ON, const.CONF_PILL_PAUSE_DAYS: 7}, runtime)
        self.assertEqual([(e[0], e[1]) for e in events if e[0] == "pill_pack_end"], [("pill_pack_end", TODAY + timedelta(days=11))])

    def test_summaries_exist_for_every_kind_and_language(self) -> None:
        for lang in ("en", "de", "fr", "es", "sv"):
            strings = ical._ics_strings(lang)
            for key in ("pregnancy_due", "contraception_renewal", "pill_pack_end", "patch_change", "patch_remove",
                        "patch_new", "ring_remove", "ring_insert"):
                self.assertTrue(strings[key], (lang, key))
            self.assertTrue(strings["period_logged"] and strings["source_logged"], lang)


LOGGED_ON = {const.CONF_CALENDAR_LOGGED_PERIODS: True}


def _with_history(*offsets_ranges):
    days = []
    for first, last in offsets_ranges:
        days += [(TODAY + timedelta(days=o)).isoformat() for o in range(first, last + 1)]
    return SimpleNamespace(pregnancy_data={}, symptom_history=[], noncycle_data={}, history=days)


class LoggedPeriodEventsTests(unittest.TestCase):
    def test_off_by_default(self) -> None:
        self.assertEqual(_collect({}, _with_history((-5, -1))), [])

    def test_each_logged_period_is_one_multi_day_event(self) -> None:
        events = _collect(LOGGED_ON, _with_history((-60, -56), (-31, -27), (-3, -1)))
        self.assertEqual(
            [(e[0], e[1], e[2]) for e in events],
            [("period_logged", TODAY + timedelta(days=a), TODAY + timedelta(days=b)) for a, b in ((-60, -56), (-31, -27), (-3, -1))],
        )
        self.assertEqual({e[3] for e in events}, {"Period"})

    def test_periods_older_than_a_year_are_left_out_and_empty_history_is_fine(self) -> None:
        events = _collect(LOGGED_ON, _with_history((-400, -396), (-366, -364)))
        self.assertEqual([e[1] for e in events], [TODAY - timedelta(days=366)])  # block ends inside the year
        self.assertEqual(_collect(LOGGED_ON, _with_history()), [])

    def test_ics_has_the_whole_range_and_a_source_note(self) -> None:
        events = _collect(LOGGED_ON, _with_history((-3, -1)))
        ics = ical.generate_ics("e1", None, None, 28, 6, "en", None, None, TODAY, events).decode()
        self.assertIn("DTSTART;VALUE=DATE:20261001", ics)
        self.assertIn("DTEND;VALUE=DATE:20261004", ics)
        self.assertIn("Source: logged", ics)


class IcsExtraEventsTests(unittest.TestCase):
    def _ics(self, extra) -> str:
        return ical.generate_ics("e1", None, None, 28, 6, "en", None, None, TODAY, extra).decode()

    def test_events_are_written_with_stable_uids(self) -> None:
        extra = [("pregnancy_due", date(2027, 1, 10), date(2027, 1, 10), "Due date (calculated)")]
        first, second = self._ics(extra), self._ics(extra)
        self.assertIn("SUMMARY:Due date (calculated)", first)
        self.assertIn("DTSTART;VALUE=DATE:20270110", first)
        uid = [line for line in first.split("\r\n") if line.startswith("UID:")]
        self.assertEqual(uid, [line for line in second.split("\r\n") if line.startswith("UID:")])
        self.assertEqual(len(uid), 1)

    def test_events_behind_the_horizon_are_dropped_and_none_means_nothing(self) -> None:
        far = [("pregnancy_due", TODAY + timedelta(days=400), TODAY + timedelta(days=400), "late")]
        self.assertNotIn("SUMMARY:late", self._ics(far))
        self.assertNotIn("BEGIN:VEVENT", self._ics(None))


class FrontendRuleTests(unittest.TestCase):
    def test_calendar_card_uses_the_backend_gap_for_bleeding_outside_the_period(self) -> None:
        import re

        source = (COMPONENT_ROOT / "www" / "menstruation-calendar-card.js").read_text(encoding="utf-8")
        match = re.search(r"const MIN_GAP_DAYS = (\d+);", source)
        self.assertIsNotNone(match)
        self.assertEqual(int(match.group(1)), const.NEW_PERIOD_MIN_GAP_DAYS)


if __name__ == "__main__":
    unittest.main()
