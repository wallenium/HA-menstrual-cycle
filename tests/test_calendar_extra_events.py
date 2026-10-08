"""Opt-in pregnancy / contraception events for the calendar entity and the ICS feed."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from datetime import date, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

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
            self.assertTrue(strings["period_luteal"], lang)


LOGGED_ON = {const.CONF_CALENDAR_LOGGED_PERIODS: True}


def _with_history(*offsets_ranges):
    days = []
    for first, last in offsets_ranges:
        days += [(TODAY + timedelta(days=o)).isoformat() for o in range(first, last + 1)]
    return SimpleNamespace(pregnancy_data={}, symptom_history=[], noncycle_data={}, history=days)


LUTEAL_ON = {const.CONF_CALENDAR_LUTEAL_FORECAST: True}


def _luteal(options, offset, runtime=None, lang="en"):
    iso = None if offset is None else (TODAY + timedelta(days=offset)).isoformat()
    return ical.collect_extra_events(options, runtime or _with_history(), "2027-01-10", lang, TODAY, iso)


class LutealPeriodEventTests(unittest.TestCase):
    def test_off_by_default_and_without_a_forecast(self) -> None:
        self.assertEqual(_luteal({}, 5), [])
        self.assertEqual(_luteal(LUTEAL_ON, None), [])

    def test_one_all_day_event_on_the_forecast_date(self) -> None:
        day = TODAY + timedelta(days=5)
        self.assertEqual(_luteal(LUTEAL_ON, 5), [("period_luteal", day, day, "Period (luteal phase forecast)")])
        self.assertEqual(_luteal(LUTEAL_ON, 5, lang="de")[0][3], "Periode (Prognose aus Lutealphase)")

    def test_today_counts_but_a_date_in_the_past_does_not(self) -> None:
        self.assertEqual(len(_luteal(LUTEAL_ON, 0)), 1)
        self.assertEqual(_luteal(LUTEAL_ON, -1), [])

    def test_other_options_do_not_enable_it(self) -> None:
        self.assertEqual(_luteal({**PREG_ON, **CONTRA_ON, **LOGGED_ON}, 5), [])

    def test_calendar_entity_and_ics_feed_pass_the_forecast_date_on(self) -> None:
        # ponytail: source check instead of booting the calendar entity and the HTTP view
        for file_name in ("calendar.py", "__init__.py"):
            source = (COMPONENT_ROOT / file_name).read_text(encoding="utf-8")
            at = source.index("collect_extra_events(")
            self.assertIn('"luteal_forecast"', source[at - 200 : at + 400], file_name)
            self.assertIn('"predicted_start"', source[at : at + 400], file_name)

    def test_ics_contains_the_event(self) -> None:
        ics = ical.generate_ics("e1", None, None, 28, 6, "en", None, None, TODAY, _luteal(LUTEAL_ON, 5)).decode()
        self.assertIn("SUMMARY:Period (luteal phase forecast)", ics)
        self.assertIn("DTSTART;VALUE=DATE:20261009", ics)


OVULATION_ON = {const.CONF_CALENDAR_OVULATION_EVENTS: True}


def _cycle_runtime(starts, symptoms):
    days = [(TODAY + timedelta(days=o + k)).isoformat() for o in starts for k in range(3)]
    return SimpleNamespace(pregnancy_data={}, noncycle_data={}, history=days, symptom_history=symptoms, period_duration_days=3)


def _temperature_cycle(start_offset, rise_index=14, days=20):
    """Daily readings from a cycle start: low until rise_index, then raised, with mucus before the rise."""
    entries = []
    for i in range(days):
        entry = {"date": (TODAY + timedelta(days=start_offset + i)).isoformat(), "basal_temp": 36.5 if i < rise_index else 36.85}
        if rise_index - 3 <= i < rise_index:
            entry["cervical_mucus"] = "fadenziehend"
        entries.append(entry)
    return entries


class OvulationFromLogsEventTests(unittest.TestCase):
    def _events(self, runtime, options=OVULATION_ON):
        return [e for e in ical.collect_extra_events(options, runtime, None, "en", TODAY) if e[0].startswith("ovulation")]

    def test_off_by_default(self) -> None:
        runtime = _cycle_runtime([-50], _temperature_cycle(-50))
        self.assertEqual(self._events(runtime, {}), [])

    def test_temperature_analysis_gives_an_event_per_cycle_with_its_source(self) -> None:
        symptoms = _temperature_cycle(-60) + _temperature_cycle(-30)
        runtime = _cycle_runtime([-60, -30, -2], symptoms)
        events = self._events(runtime)
        self.assertEqual([e[0] for e in events], ["ovulation_temp", "ovulation_temp"])
        self.assertTrue(all(e[1] == e[2] and e[3] == "Ovulation (from your logs)" for e in events))
        first = [e for e in events if e[1] < TODAY - timedelta(days=40)]
        self.assertEqual(len(first), 1)
        # the first cycle's rise is on cycle day 15 (index 14); the event lies before that rise, inside that cycle
        self.assertTrue(TODAY - timedelta(days=60) < first[0][1] <= TODAY - timedelta(days=60) + timedelta(days=15))

    def test_a_positive_test_is_the_fallback_one_day_later(self) -> None:
        symptoms = [{"date": (TODAY - timedelta(days=40)).isoformat(), "test": "positive_ovulation"}]
        runtime = _cycle_runtime([-50, -20], symptoms)
        (event,) = self._events(runtime)
        self.assertEqual(event[:3], ("ovulation_lh", TODAY - timedelta(days=39), TODAY - timedelta(days=39)))

    def test_temperature_wins_over_a_test_in_the_same_cycle(self) -> None:
        symptoms = _temperature_cycle(-60)
        symptoms[8] = {**symptoms[8], "test": "positive_ovulation"}
        events = self._events(_cycle_runtime([-60, -30], symptoms))
        self.assertEqual([e[0] for e in events], ["ovulation_temp"])

    def test_other_cycles_data_and_empty_cycles_are_ignored(self) -> None:
        # the rise belongs to the cycle starting at -60; the cycle at -30 has no data of its own
        runtime = _cycle_runtime([-60, -30], _temperature_cycle(-60))
        self.assertEqual(len(self._events(runtime)), 1)
        self.assertEqual(self._events(_cycle_runtime([], [])), [])
        self.assertEqual(self._events(_cycle_runtime([-60], [])), [])

    def test_cycles_that_ended_before_the_last_year_are_left_out(self) -> None:
        old = _cycle_runtime([-500, -460, -10], _temperature_cycle(-500))
        self.assertEqual(self._events(old), [])
        # a cycle that ends exactly at the one-year mark still counts, one day earlier it does not
        edge = lambda end: _cycle_runtime([-400, end], _temperature_cycle(-400, days=25))  # noqa: E731
        self.assertEqual(len(self._events(edge(-const.CALENDAR_LOGGED_PERIODS_LOOKBACK_DAYS))), 1)
        self.assertEqual(self._events(edge(-const.CALENDAR_LOGGED_PERIODS_LOOKBACK_DAYS - 1)), [])

    def test_the_profiles_period_length_is_handed_to_the_analysis(self) -> None:
        runtime = _cycle_runtime([-60], [])
        runtime.period_duration_days = 7
        with patch.object(ical, "analyze_nfp_cycle", wraps=ical.analyze_nfp_cycle) as analyze:
            self._events(runtime)
        self.assertEqual(analyze.call_args.args[2], 7)
        del runtime.period_duration_days  # runtimes without the field fall back to 5 days
        with patch.object(ical, "analyze_nfp_cycle", wraps=ical.analyze_nfp_cycle) as analyze:
            self._events(runtime)
        self.assertEqual(analyze.call_args.args[2], 5)

    def test_ics_and_calendar_names_the_source(self) -> None:
        for symptoms, source in (
            (_temperature_cycle(-60), "Source: temperature"),
            ([{"date": (TODAY - timedelta(days=40)).isoformat(), "test": "positive_ovulation"}], "Source: ovulation test"),
        ):
            events = self._events(_cycle_runtime([-60, -30], symptoms))
            ics = ical.generate_ics("e1", None, None, 28, 6, "en", None, None, TODAY, events).decode()
            self.assertIn("SUMMARY:Ovulation (from your logs)", ics)
            self.assertIn(f"DESCRIPTION:{source}", ics)

    def test_summaries_and_sources_exist_in_every_language(self) -> None:
        for lang in ("en", "de", "fr", "es", "sv"):
            strings = ical._ics_strings(lang)
            self.assertTrue(strings["ovulation_logged"] and strings["source_temp"] and strings["source_lh"], lang)


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
