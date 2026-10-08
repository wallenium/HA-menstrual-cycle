"""Tests for the notification logic in __init__.py: overdue/checkup push, pill reminder (+gap hint), snooze and mobile actions."""

from __future__ import annotations

import asyncio
import importlib.util
import re
import sys
import types
import unittest
from contextlib import contextmanager
from datetime import date, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPONENT_ROOT = REPO_ROOT / "custom_components" / "menstruation_cycle"
TODAY = date(2026, 10, 6)
NOW = [datetime(2026, 10, 6, 9, 0, 0)]  # mutable so a test can move the clock
_PKG = "tstest_notifications"


class _Anything(type):
    """Metaclass so enum-like stubs (Platform.SENSOR etc.) resolve any attribute."""

    def __getattr__(cls, name):
        return _placeholder(name)


def _placeholder(name: str):
    class _P(metaclass=_Anything):
        def __init__(self, *args, **kwargs):
            pass

        def __call__(self, *args, **kwargs):
            return _P()

        def __getattr__(self, attr):
            return _P()

        def __or__(self, other):
            return self

    _P.__name__ = name
    return _P


def _stub_module(name: str) -> types.ModuleType:
    module = types.ModuleType(name)
    module.__path__ = []
    module.__getattr__ = _placeholder
    return module


def _ha_stubs() -> dict[str, types.ModuleType]:
    names = (
        "voluptuous", "homeassistant", "homeassistant.components", "homeassistant.config_entries",
        "homeassistant.const", "homeassistant.core", "homeassistant.exceptions", "homeassistant.helpers",
        "homeassistant.helpers.config_validation", "homeassistant.helpers.entity_registry",
        "homeassistant.helpers.label_registry", "homeassistant.helpers.dispatcher", "homeassistant.helpers.event",
        "homeassistant.helpers.storage", "homeassistant.helpers.device_registry", "homeassistant.helpers.entity",
        "homeassistant.helpers.entity_platform", "homeassistant.helpers.typing", "homeassistant.helpers.issue_registry",
        "homeassistant.components.repairs", "homeassistant.components.sensor", "homeassistant.util",
        "homeassistant.util.dt",
    )
    stubs = {name: _stub_module(name) for name in names}
    dt_mod = stubs["homeassistant.util.dt"]
    dt_mod.now = lambda: NOW[0]
    dt_mod.utcnow = lambda: NOW[0]
    def _parse(value):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None  # like the real dt_util.parse_datetime

    dt_mod.parse_datetime = _parse
    stubs["homeassistant.util"].dt = dt_mod
    stubs["homeassistant.util"].slugify = lambda value: str(value)
    stubs["homeassistant.helpers"].config_validation = stubs["homeassistant.helpers.config_validation"]
    return stubs


def _load_package():
    package = types.ModuleType(_PKG)
    package.__path__ = [str(COMPONENT_ROOT)]
    sys.modules[_PKG] = package
    spec = importlib.util.spec_from_file_location(
        _PKG, COMPONENT_ROOT / "__init__.py", submodule_search_locations=[str(COMPONENT_ROOT)]
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[_PKG] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


with patch.dict(sys.modules, _ha_stubs()):
    integration = _load_package()
    _loaded = {k: v for k, v in sys.modules.items() if k == _PKG or k.startswith(_PKG + ".")}
# patch.dict drops everything added inside; function-level `from .model import ...` needs the package again
sys.modules.update(_loaded)
const = sys.modules[f"{_PKG}.const"]


def _iso(offset: int) -> str:
    return (TODAY + timedelta(days=offset)).isoformat()


def _pill_entries(*offsets: int) -> list[dict[str, str]]:
    return [{"date": _iso(o), "contraception_method": "pill"} for o in offsets]


def _runtime(**overrides):
    base = dict(
        friendly_name="Test",
        history=[],
        symptom_history=[],
        period_duration_days=5,
        pregnancy_data={"is_pregnant": False, "start_date": None},
        menarche_data={"tracking_active": False, "is_menarche": False},
        pre_menarche_data={"signs": {}, "tanner_stage": None},
        menopause_data={"is_menopause": False, "start_date": None},
        noncycle_data={},
        cycle_length_override=None,
        visibility_level="full",
        onboarding_stage=None,
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def _entry(**options):
    unloads: list = []
    entry = SimpleNamespace(
        entry_id="e1",
        options={const.CONF_NOTIFICATIONS_ENABLED: True, **options},
        async_on_unload=unloads.append,
    )
    entry.unloads = unloads
    return entry


def _hass():
    return SimpleNamespace(
        config=SimpleNamespace(language="en"),
        states=SimpleNamespace(get=lambda entity_id: None),
    )


def _run(coro):
    return asyncio.run(coro)


@contextmanager
def _issue_recorder():
    """Home Assistant stubs for the lazy `from .repairs import ...`; yields the recorded issue calls."""
    calls: list[tuple] = []
    stubs = _ha_stubs()
    registry = stubs["homeassistant.helpers.issue_registry"]
    registry.async_create_issue = lambda hass, domain, issue_id, **kwargs: calls.append(("create", issue_id, kwargs))
    registry.async_delete_issue = lambda hass, domain, issue_id: calls.append(("delete", issue_id))
    with patch.dict(sys.modules, stubs):
        yield calls


class _Sent:
    """Records what _async_send_notification would have delivered."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str, list | None]] = []

    async def __call__(self, hass, entry, title, message, actions=None) -> None:
        self.calls.append((title, message, actions))


def _run_notifications(entry, runtime) -> _Sent:
    sent = _Sent()
    with patch.object(integration, "_async_send_notification", sent), patch.object(
        integration, "_async_save_and_notify", AsyncMock()
    ):
        _run(integration._async_check_and_send_notifications(_hass(), entry, runtime))
    return sent


def _run_pill_reminder(entry, runtime) -> _Sent:
    sent = _Sent()
    with patch.object(integration, "_async_send_notification", sent), patch.object(integration.dt_util, "now", lambda: NOW[0]):
        _run(integration._async_send_pill_reminder(_hass(), entry, runtime))
    return sent


class OverdueNotificationTests(unittest.TestCase):
    def _runtime(self, days_late: int):
        # six 28-day cycles, last start 28 + days_late days ago
        last_start = -(28 + days_late)
        model_mod = sys.modules[f"{_PKG}.model"]
        # the prediction only counts as precise with enough recent log entries
        logs = [{"date": _iso(-k), "note": "x"} for k in range(model_mod.MIN_RECENT_LOG_ENTRIES_FOR_HIGH_PRECISION)]
        return _runtime(history=[_iso(last_start - 28 * k) for k in range(5, -1, -1)], symptom_history=logs)

    def test_precondition_prediction_is_overdue_and_precise(self) -> None:
        model_mod = sys.modules[f"{_PKG}.model"]
        runtime = self._runtime(10)
        model = model_mod.build_cycle_model(
            history=runtime.history, period_duration_days=5, symptom_history=runtime.symptom_history, pregnancy_data=runtime.pregnancy_data,
            menarche_data=runtime.menarche_data, pre_menarche_data=runtime.pre_menarche_data,
            menopause_data=runtime.menopause_data, noncycle_data={}, today=TODAY,
        )
        self.assertEqual(model.days_until_next_start, -10)
        self.assertTrue((model.prediction_gating or {}).get("precision_allowed"))

    def test_sends_once_with_period_started_button(self) -> None:
        runtime = self._runtime(10)
        entry = _entry(**{const.CONF_NOTIFY_OVERDUE_ENABLED: True})
        sent = _run_notifications(entry, runtime)
        self.assertEqual(len(sent.calls), 1)
        title, message, actions = sent.calls[0]
        self.assertEqual(title, "Period overdue")
        self.assertIn("10 days", message)
        self.assertEqual(actions[0]["action"], f"{const.NOTIFY_ACTION_PERIOD_STARTED_PREFIX}e1")
        self.assertEqual(len(_run_notifications(entry, runtime).calls), 0)

    def test_not_sent_before_threshold_or_when_disabled(self) -> None:
        entry = _entry(**{const.CONF_NOTIFY_OVERDUE_ENABLED: True})
        self.assertEqual(_run_notifications(entry, self._runtime(const.PERIOD_OVERDUE_DAYS - 1)).calls, [])
        self.assertEqual(_run_notifications(_entry(), self._runtime(10)).calls, [])


class RecapNotificationTests(unittest.TestCase):
    ENTRY = {const.CONF_NOTIFY_RECAP_ENABLED: True}

    def _runtime(self, last_cycle: int = 33, earlier=(28, 28, 28), pain_days: int = 0, latest_offset: int = -2):
        starts = [latest_offset]
        for length in (last_cycle, *earlier):
            starts.append(starts[-1] - length)
        history = [_iso(o + k) for o in sorted(starts) for k in range(3)]
        pain = [{"date": _iso(starts[1] + k), "pain": ["cramps"]} for k in range(pain_days)]
        return _runtime(history=history, symptom_history=pain)

    def _send(self, runtime, language="en", **options):
        entry = _entry(**{**self.ENTRY, **options})
        sent = _Sent()
        hass = _hass()
        hass.config.language = language
        with patch.object(integration, "_async_send_notification", sent), patch.object(
            integration, "_async_save_and_notify", AsyncMock()
        ):
            _run(integration._async_check_and_send_notifications(hass, entry, runtime))
        return sent

    def test_message_names_length_period_comparison_and_pain_days(self) -> None:
        sent = self._send(self._runtime(pain_days=2))
        self.assertEqual(len(sent.calls), 1)
        title, message, _ = sent.calls[0]
        self.assertEqual(title, "Cycle recap")
        self.assertEqual(
            message,
            "Test: cycle finished - 33 days long, period lasted 3 days. "
            "That is 5 days longer than the average (28 days). Pain days: 2.",
        )

    def test_shorter_and_in_line_wording(self) -> None:
        self.assertIn("2 days shorter than the average (28 days)", self._send(self._runtime(last_cycle=26)).calls[0][1])
        for length in (27, 28, 29):
            self.assertIn("In line with the average (28 days).", self._send(self._runtime(last_cycle=length)).calls[0][1])

    def test_no_pain_sentence_without_pain_and_no_comparison_without_earlier_cycles(self) -> None:
        message = self._send(self._runtime(earlier=())).calls[0][1]
        self.assertEqual(message, "Test: cycle finished - 33 days long, period lasted 3 days.")

    def test_follows_the_language(self) -> None:
        message = self._send(self._runtime(pain_days=1), "de").calls[0][1]
        self.assertTrue(message.endswith("Das sind 5 Tage mehr als der Durchschnitt (28 Tage). Schmerztage: 1."), message)

    def test_sent_once_per_cycle_and_only_in_the_first_week_and_when_enabled(self) -> None:
        runtime = self._runtime()
        self.assertEqual(len(self._send(runtime).calls), 1)
        self.assertEqual(self._send(runtime).calls, [])
        self.assertEqual(self._send(self._runtime(latest_offset=-9)).calls, [])
        self.assertEqual(self._send(self._runtime(), **{const.CONF_NOTIFY_RECAP_ENABLED: False}).calls, [])

    def test_every_language_has_the_same_recap_texts(self) -> None:
        table = integration._NOTIFY_STRINGS
        keys = {k for k in table["en"] if k.startswith("recap_")}
        self.assertEqual(len(keys), 6)
        for lang, strings in table.items():
            self.assertEqual({k for k in strings if k.startswith("recap_")}, keys, lang)
            for key in keys:
                self.assertEqual(
                    set(re.findall(r"\{(\w+)\}", strings[key])), set(re.findall(r"\{(\w+)\}", table["en"][key])), f"{lang}.{key}"
                )


class FertilityMuteTests(unittest.TestCase):
    """Fertile-window and ovulation messages can be switched off while the current method is hormonal."""

    FERTILE_TODAY = -8  # last cycle start offset that makes the fertile window start today (28-day cycles)
    OVULATION_TODAY = -13
    OPTIONS = {
        const.CONF_NOTIFY_FERTILE_ENABLED: True,
        const.CONF_NOTIFY_FERTILE_LEAD_DAYS: 0,
        const.CONF_NOTIFY_OVULATION_ENABLED: True,
        const.CONF_NOTIFY_OVULATION_LEAD_DAYS: 0,
    }

    def _runtime(self, last_start: int, method: str | None):
        starts = [last_start - 28 * k for k in range(5)]
        history = [_iso(o + k) for o in sorted(starts) for k in range(4)]
        symptoms = [{"date": _iso(-1), "contraception_method": method}] if method else []
        return _runtime(history=history, symptom_history=symptoms)

    def _titles(self, last_start: int, method: str | None, **options) -> list[str]:
        sent = _run_notifications(_entry(**{**self.OPTIONS, **options}), self._runtime(last_start, method))
        return [title for title, _, _ in sent.calls]

    def test_without_the_option_hormonal_users_still_get_the_messages(self) -> None:
        self.assertEqual(self._titles(self.FERTILE_TODAY, "pill"), ["Fertile window reminder"])
        self.assertEqual(self._titles(self.OVULATION_TODAY, "pill"), ["Ovulation reminder"])

    def test_with_the_option_hormonal_methods_are_muted(self) -> None:
        mute = {const.CONF_NOTIFY_FERTILE_MUTE_HORMONAL: True}
        for method in sorted(const.CONTRACEPTION_HORMONAL_METHODS):
            self.assertEqual(self._titles(self.FERTILE_TODAY, method, **mute), [], method)
            self.assertEqual(self._titles(self.OVULATION_TODAY, method, **mute), [], method)

    def test_with_the_option_other_methods_and_no_method_still_get_the_messages(self) -> None:
        mute = {const.CONF_NOTIFY_FERTILE_MUTE_HORMONAL: True}
        for method in (None, "none", "condom", "copper_iud", "diaphragm", "other"):
            self.assertEqual(self._titles(self.FERTILE_TODAY, method, **mute), ["Fertile window reminder"], method)
            self.assertEqual(self._titles(self.OVULATION_TODAY, method, **mute), ["Ovulation reminder"], method)

    def test_the_period_message_is_not_muted(self) -> None:
        # period predicted for today: last start 28 days ago
        options = {const.CONF_NOTIFY_PERIOD_ENABLED: True, const.CONF_NOTIFY_PERIOD_LEAD_DAYS: 0}
        titles = self._titles(-28, "pill", **options, **{const.CONF_NOTIFY_FERTILE_MUTE_HORMONAL: True})
        self.assertEqual(titles, ["Period reminder"])


class PregnancyUpdateTests(unittest.TestCase):
    """Opt-in weekly pregnancy message (own target), trimester text on the first day of trimester 2 and 3."""

    def _titles_and_messages(self, days_since_start: int, *, notified=None, option=True, pregnant=True):
        noncycle = {} if notified is None else {"notified_pregnancy_week": notified}
        runtime = _runtime(
            pregnancy_data={"is_pregnant": pregnant, "start_date": _iso(-days_since_start)}, noncycle_data=noncycle
        )
        # every other message switched off: the pregnancy option alone must keep the check running
        options = {
            const.CONF_NOTIFY_PERIOD_ENABLED: False,
            const.CONF_NOTIFY_FERTILE_ENABLED: False,
            const.CONF_NOTIFY_OVULATION_ENABLED: False,
            const.CONF_NOTIFY_RECAP_ENABLED: False,
            const.CONF_NOTIFY_OVERDUE_ENABLED: False,
            const.CONF_NOTIFY_CHECKUP_ENABLED: False,
            const.CONF_NOTIFY_PREGNANCY_UPDATES: option,
        }
        sent = _run_notifications(_entry(**options), runtime)
        self.runtime = runtime
        return [(title, message) for title, message, _ in sent.calls]

    def test_weekly_message_on_the_start_weekday(self) -> None:
        (title, message), = self._titles_and_messages(70)  # 10 weeks complete -> week 11
        self.assertEqual(title, "Pregnancy")
        self.assertIn("week 11 of the pregnancy", message)
        self.assertIn("Calculated due date", message)
        self.assertEqual(self.runtime.noncycle_data["notified_pregnancy_week"], 11)

    def test_nothing_on_other_weekdays_in_week_one_or_when_already_sent(self) -> None:
        self.assertEqual(self._titles_and_messages(71), [])
        self.assertEqual(self._titles_and_messages(0), [])
        self.assertEqual(self._titles_and_messages(70, notified=11), [])
        self.assertEqual(len(self._titles_and_messages(70, notified=10)), 1)

    def test_trimester_text_replaces_the_weekly_text(self) -> None:
        for days, trimester in ((98, 2), (196, 3)):
            (title, message), = self._titles_and_messages(days)
            self.assertIn(f"trimester {trimester} begins", message, days)
            self.assertNotIn("of the pregnancy", message)
        self.assertIn("of the pregnancy", self._titles_and_messages(105)[0][1])

    def test_off_by_default_and_only_while_pregnant(self) -> None:
        self.assertEqual(self._titles_and_messages(70, option=False), [])
        self.assertEqual(self._titles_and_messages(70, pregnant=False), [])

    def test_texts_exist_in_every_language(self) -> None:
        for lang in ("en", "de", "fr", "es", "sv"):
            strings = integration._notify_strings(lang)
            for key in ("pregnancy_title", "pregnancy_week_message", "pregnancy_trimester_message"):
                self.assertTrue(strings[key], (lang, key))
            strings["pregnancy_week_message"].format(name="A", week=3, date="x", trimester=None)
            strings["pregnancy_trimester_message"].format(name="A", week=15, date="x", trimester=2)


class CycleHintTests(unittest.TestCase):
    """Opt-in neutral hint for an unusual cycle length, sent with the period start that makes it visible."""

    def _send(self, lengths, *, latest_offset=-2, option=True, noncycle=None, language="en"):
        """lengths: completed cycle lengths, oldest first; the newest period started latest_offset days from today."""
        starts = [latest_offset]
        for length in reversed(lengths):
            starts.append(starts[-1] - length)
        runtime = _runtime(history=[_iso(o + k) for o in sorted(starts) for k in range(3)], noncycle_data=dict(noncycle or {}))
        options = {
            const.CONF_NOTIFY_PERIOD_ENABLED: False,
            const.CONF_NOTIFY_FERTILE_ENABLED: False,
            const.CONF_NOTIFY_OVULATION_ENABLED: False,
            const.CONF_NOTIFY_RECAP_ENABLED: False,
            const.CONF_NOTIFY_OVERDUE_ENABLED: False,
            const.CONF_NOTIFY_CHECKUP_ENABLED: False,
            const.CONF_NOTIFY_CYCLE_HINT: option,
        }
        entry, hass, sent = _entry(**options), _hass(), _Sent()
        hass.config.language = language
        with patch.object(integration, "_async_send_notification", sent), patch.object(
            integration, "_async_save_and_notify", AsyncMock()
        ):
            _run(integration._async_check_and_send_notifications(hass, entry, runtime))
        self.runtime = runtime
        return [(title, message) for title, message, _ in sent.calls]

    def test_three_short_cycles_in_a_row_send_one_neutral_hint(self) -> None:
        (title, message), = self._send([28, 20, 19, 18])
        self.assertEqual(title, "Cycle length")
        self.assertEqual(
            message,
            "Test: the last 3 cycles were each shorter than 21 days (20, 19, 18 days). "
            "This is not a diagnosis; you could mention it at your next check-up.",
        )
        self.assertEqual(self.runtime.noncycle_data["notified_cycle_hint"], _iso(-2))

    def test_three_long_cycles_and_the_limits(self) -> None:
        self.assertIn("longer than 38 days (39, 45, 50 days)", self._send([28, 39, 45, 50])[0][1])
        self.assertEqual(self._send([28, 21, 21, 21]), [])  # 21 is not shorter than 21
        self.assertEqual(self._send([28, 38, 38, 38]), [])  # 38 is not longer than 38
        self.assertEqual(self._send([28, 28, 19, 18]), [])  # only two in a row

    def test_a_streak_is_announced_once_not_with_every_further_cycle(self) -> None:
        self.assertEqual(len(self._send([20, 19, 18])), 1)
        self.assertEqual(self._send([20, 19, 18, 17]), [])

    def test_single_deviation_from_the_average(self) -> None:
        (_, longer), = self._send([28, 28, 28, 38])
        self.assertIn("10 days longer than your previous average (28 days)", longer)
        (_, shorter), = self._send([28, 28, 28, 18])
        self.assertIn("10 days shorter than your previous average (28 days)", shorter)
        self.assertEqual(self._send([28, 28, 28, 37]), [])
        self.assertEqual(self._send([28, 28, 38]), [])  # fewer than three earlier cycles: no average yet

    def test_off_by_default_once_per_start_and_only_for_a_fresh_start(self) -> None:
        self.assertEqual(self._send([28, 20, 19, 18], option=False), [])
        self.assertEqual(self._send([28, 20, 19, 18], noncycle={"notified_cycle_hint": _iso(-2)}), [])
        self.assertEqual(self._send([28, 20, 19, 18], latest_offset=-9), [])  # start is more than 7 days ago
        self.assertEqual(len(self._send([28, 20, 19, 18], latest_offset=-7)), 1)

    def test_the_option_alone_decides_even_when_other_messages_run(self) -> None:
        starts = [-2, -22, -41, -59]
        runtime = _runtime(history=[_iso(o + k) for o in starts for k in range(3)])
        entry = _entry(**{const.CONF_NOTIFY_RECAP_ENABLED: True, const.CONF_NOTIFY_CYCLE_HINT: False})
        titles = [title for title, _, _ in _run_notifications(entry, runtime).calls]
        self.assertEqual(titles, ["Cycle recap"])

    def test_lengths_that_are_no_cycles_are_ignored(self) -> None:
        model_mod = sys.modules[f"{_PKG}.model"]
        base = date.fromisoformat(_iso(-100))
        iso = lambda days: (base + timedelta(days=days)).isoformat()  # noqa: E731
        # 40, 40, a 10-day "cycle" (a stray start), 40: still three long cycles in a row; 11 days would count
        self.assertEqual(model_mod.cycle_length_hint([iso(0), iso(40), iso(80), iso(90), iso(130)])["kind"], "long")
        self.assertNotEqual(model_mod.cycle_length_hint([iso(0), iso(40), iso(80), iso(91), iso(131)])["kind"], "long")
        # a 150-day pause is not a cycle either: 28, 28, 150, 28 has no streak and no average to deviate from
        self.assertIsNone(model_mod.cycle_length_hint([iso(0), iso(28), iso(56), iso(206), iso(234)]))
        self.assertIsNone(model_mod.cycle_length_hint([]))
        self.assertIsNone(model_mod.cycle_length_hint(["2026-01-01", "garbage"]))

    def test_follows_the_language_and_marks_a_quiet_start_as_handled(self) -> None:
        self.assertEqual(self._send([20, 19, 18], language="de")[0][0], "Zykluslänge")
        self.assertEqual(self._send([28, 28, 28, 28]), [])
        self.assertEqual(self.runtime.noncycle_data["notified_cycle_hint"], _iso(-2))


class BleedingStartsPeriodTests(unittest.TestCase):
    """Logging bleeding as a symptom starts a period when none is running (the dashboard has no separate start button)."""

    def setUp(self) -> None:
        NOW[0] = datetime(2026, 10, 6, 9, 0, 0)

    def _log(self, history_offsets, *, day_offset=-1, strength="medium", **runtime_overrides):
        runtime = _runtime(history=[_iso(o) for o in history_offsets], **runtime_overrides)
        entry = _entry()
        hass = _hass()
        hass.config_entries = SimpleNamespace(async_get_entry=lambda entry_id: entry)
        call = SimpleNamespace(
            data={const.SERVICE_FIELD_DATE: _iso(day_offset), const.SERVICE_FIELD_SYMPTOM_DATA: {"bleeding_strength": strength}}
        )
        with patch.object(integration, "_runtime_for_call", lambda h, c: runtime), patch.object(
            integration, "_entry_id_for_runtime", lambda h, r: "e1"
        ), patch.object(integration, "_async_send_notification", _Sent()), patch.object(
            integration, "_async_save_and_notify", AsyncMock()
        ), patch.object(integration.dt_util, "now", lambda: NOW[0]):
            _run(integration._async_handle_add_symptom(hass, call))
        return runtime

    def test_bleeding_without_a_running_period_starts_one(self) -> None:
        for strength in ("light", "medium", "heavy"):
            runtime = self._log([-30, -29, -28, -27, -26], strength=strength)
            self.assertIn(_iso(-1), runtime.history, strength)

    def test_first_ever_bleeding_starts_a_period(self) -> None:
        self.assertEqual(self._log([]).history, [_iso(-1)])

    def test_no_bleeding_entry_does_not_start_one(self) -> None:
        self.assertNotIn(_iso(-1), self._log([-30, -29], strength="none").history)

    def test_bleeding_shortly_after_a_period_is_not_a_new_period(self) -> None:
        # period ended 8 days ago: intermenstrual bleeding, not a new start
        runtime = self._log([-13, -12, -11, -10, -9])
        self.assertNotIn(_iso(-1), runtime.history)

    def test_the_gap_boundary_is_14_days(self) -> None:
        self.assertNotIn(_iso(-1), self._log([-15]).history)  # a period day exactly 14 days before: too close
        self.assertIn(_iso(-1), self._log([-16]).history)

    def test_not_while_pregnant(self) -> None:
        runtime = self._log([-30], pregnancy_data={"is_pregnant": True, "start_date": _iso(-60)})
        self.assertNotIn(_iso(-1), runtime.history)

    def test_a_running_period_is_still_continued(self) -> None:
        runtime = self._log([-3, -2], day_offset=0)
        self.assertEqual(sorted(runtime.history), [_iso(-3), _iso(-2), _iso(-1), _iso(0)])


class BleedingWithoutPeriodTests(unittest.TestCase):
    """Repair finding and service for logged bleeding that never became a period."""

    def setUp(self) -> None:
        NOW[0] = datetime(2026, 10, 6, 9, 0, 0)

    @staticmethod
    def _bleeding(*offsets, strength="medium"):
        return [{"date": _iso(o), "bleeding_strength": strength} for o in offsets]

    def _additions(self, history_offsets, bleeding_offsets, **overrides):
        runtime = _runtime(
            history=[_iso(o) for o in history_offsets], symptom_history=self._bleeding(*bleeding_offsets), **overrides
        )
        return runtime, integration._bleeding_history_additions(runtime, NOW[0].date())

    def test_bleeding_without_any_period_is_found_and_runtime_untouched(self) -> None:
        runtime, added = self._additions([], [-3, -2, -1])
        self.assertEqual(added, [_iso(-3), _iso(-2), _iso(-1)])
        self.assertEqual(runtime.history, [])

    def test_intermenstrual_bleeding_is_not_a_period(self) -> None:
        # period ended 8 days before the bleeding
        self.assertEqual(self._additions([-13, -12, -11, -10, -9], [-1])[1], [])

    def test_a_gap_inside_a_running_period_is_filled(self) -> None:
        self.assertEqual(self._additions([-3], [-3, -1])[1], [_iso(-2), _iso(-1)])

    def test_no_bleeding_entries_and_old_entries_are_ignored(self) -> None:
        self.assertEqual(self._additions([], [-1], )[1], [_iso(-1)])
        runtime = _runtime(symptom_history=self._bleeding(-1, strength="none") + self._bleeding(-200))
        self.assertEqual(integration._bleeding_history_additions(runtime, NOW[0].date()), [])

    def test_nothing_while_pregnant(self) -> None:
        pregnant = {"is_pregnant": True, "start_date": _iso(-60)}
        self.assertEqual(self._additions([], [-1], pregnancy_data=pregnant)[1], [])
        self.assertEqual(self._additions([-3], [-3, -1], pregnancy_data=pregnant)[1], [])

    def test_diagnosis_reports_it_and_stays_quiet_otherwise(self) -> None:
        class _Storage:
            async def async_load_raw(self):
                return {}

            async def async_load(self):
                return {
                    "pregnancy_data": {}, "menarche_data": {}, "menopause_data": {},
                    "ics_token": None, "ics_token_created_at": None, "hospital_bag_items": [],
                }

        for bleeding, expected in (([-2, -1], 1), ([], 0)):
            runtime = _runtime(symptom_history=self._bleeding(*bleeding), storage=_Storage())
            with patch.object(integration.dt_util, "now", lambda: NOW[0]):
                issues = _run(integration._async_diagnose_profile_storage(runtime))
            self.assertEqual(len(issues), expected, issues)
            if expected:
                self.assertIn("create_periods_from_bleeding", issues[0])

    def test_service_adds_the_days_and_saves_once(self) -> None:
        runtime = _runtime(symptom_history=self._bleeding(-2, -1))
        save = AsyncMock()
        with patch.object(integration, "_runtime_for_call", lambda h, c: runtime), patch.object(
            integration, "_async_save_and_notify", save
        ), patch.object(integration.dt_util, "now", lambda: NOW[0]):
            result = _run(integration._async_handle_create_periods_from_bleeding(_hass(), SimpleNamespace(data={})))
            again = _run(integration._async_handle_create_periods_from_bleeding(_hass(), SimpleNamespace(data={})))
        self.assertEqual(result, {"added_dates": [_iso(-2), _iso(-1)], "count": 2})
        self.assertEqual(sorted(runtime.history), [_iso(-2), _iso(-1)])
        self.assertEqual(again["count"], 0)
        self.assertEqual(save.await_count, 1)


class HouseholdSupplyTests(unittest.TestCase):
    """Warn when the household stock is below what was typically used per period and a period is near."""

    TODAY = date(2026, 10, 6)

    @staticmethod
    def _log(product, *days):
        """days: (offset from today, quantity) pairs."""
        return [
            {"product": product, "quantity": qty, "timestamp": f"{(HouseholdSupplyTests.TODAY + timedelta(days=off)).isoformat()}T08:00:00+02:00"}
            for off, qty in days
        ]

    def _need(self, log, product="tampon", today=None):
        return integration._typical_use_per_period(log, product, today or self.TODAY)

    def test_average_of_the_finished_periods_rounded_up_and_the_running_one_ignored(self) -> None:
        log = self._log("tampon", (-80, 3), (-79, 4), (-78, 3), (-52, 4), (-51, 4), (-50, 5), (-2, 9), (-1, 9))
        self.assertEqual(self._need(log), 12)  # finished periods 10 and 13 -> 11.5 rounded up; the running 18 is ignored

    def test_needs_two_finished_periods(self) -> None:
        self.assertIsNone(self._need(self._log("tampon", (-50, 5), (-49, 5))))
        self.assertIsNone(self._need([]))

    def test_period_boundaries(self) -> None:
        # usage days 7 apart belong to one period, 8 apart start a new one
        same = self._log("tampon", (-60, 2), (-53, 2), (-30, 2), (-23, 2))
        self.assertEqual(self._need(same), 4)
        split = self._log("tampon", (-60, 2), (-52, 2), (-30, 2), (-22, 2))
        self.assertEqual(self._need(split), 2)
        # a period whose last usage is 7 days ago is still running, 8 days ago it is finished
        log = self._log("tampon", (-40, 4), (-30, 4))
        self.assertEqual(self._need(log + self._log("tampon", (-7, 10))), 4)  # running: left out
        self.assertEqual(self._need(log + self._log("tampon", (-8, 10))), 6)  # finished: (4 + 4 + 10) / 3

    def test_only_the_last_three_finished_periods_count(self) -> None:
        log = self._log("tampon", (-120, 20), (-90, 4), (-60, 8), (-30, 12))
        self.assertEqual(self._need(log), 8)  # 4, 8, 12 -> 8; the 20 is too old

    def test_a_full_log_drops_its_possibly_cut_off_oldest_period(self) -> None:
        filler = self._log("pad", *[(-100 + k, 1) for k in range(47)])
        log = filler + self._log("tampon", (-90, 1), (-60, 6), (-30, 8))
        self.assertEqual(len(log), integration.HOUSEHOLD_CONSUMPTION_LOG_LIMIT)
        self.assertEqual(self._need(log), 7)  # (6 + 8) / 2; the cut-off first period (1) is left out
        self.assertEqual(self._need(log[1:]), 5)  # one entry fewer: nothing is dropped, (1 + 6 + 8) / 3

    def test_other_products_and_broken_entries_are_ignored(self) -> None:
        log = self._log("tampon", (-60, 4), (-30, 4)) + self._log("pad", (-60, 50), (-30, 50))
        log += [{"product": "tampon", "timestamp": "garbage", "quantity": 7}, "x", {"product": "tampon"}]
        self.assertEqual(self._need(log), 4)
        self.assertEqual(self._need(self._log("tampon", (-60, 0), (-30, 0))), 1)  # quantity counts at least 1

    def test_shortfalls_list_stock_and_need(self) -> None:
        data = {
            "inventory": {"tampon": 8, "pad": 6, "liner": 0, "cup": 1, "underwear": 0},
            "consumption_log": self._log("tampon", (-60, 14), (-30, 14)) + self._log("pad", (-60, 6), (-30, 6))
            + self._log("cup", (-60, 9), (-30, 9)) + self._log("underwear", (-60, 9), (-30, 9)),
        }
        self.assertEqual(integration._household_supply_shortfalls(data, self.TODAY), ["Tampons 8/14"])  # pads: 6 is enough
        data["inventory"]["tampon"] = 14
        self.assertEqual(integration._household_supply_shortfalls(data, self.TODAY), [])

    def test_details_per_product_for_the_sensor_attribute(self) -> None:
        data = {
            "inventory": {"tampon": 8, "pad": 1, "liner": 0},
            "consumption_log": self._log("tampon", (-60, 14), (-30, 14)) + self._log("pad", (-60, 6), (-30, 6)),
        }
        self.assertEqual(
            integration._household_supply_short_details(data, self.TODAY),
            {"tampon": {"stock": 8, "need": 14}, "pad": {"stock": 1, "need": 6}},
        )

    def test_sensor_attribute_is_filled_only_while_a_period_is_near(self) -> None:
        NOW[0] = datetime(2026, 10, 6, 9, 0, 0)
        data = {
            "inventory": {"tampon": 3, "pad": 5, "liner": 5, "cup": 1, "underwear": 0},
            "thresholds": {},
            "consumption_log": [
                {"product": "tampon", "quantity": 7, "timestamp": f"{(NOW[0].date() + timedelta(days=off)).isoformat()}T08:00:00"}
                for off in (-60, -30)
            ],
            "underwear_settings": {"total_owned": 12, "washing_threshold": 3},
        }

        def attributes(days):
            hass = self._hass_with_period_in(days)
            hass.data[integration.HOUSEHOLD_INVENTORY_DATA_KEY] = data
            states = []
            hass.states = SimpleNamespace(async_set=lambda entity_id, state, attrs: states.append(attrs))
            with patch.object(integration, "MenstruationRuntime", SimpleNamespace), patch.object(
                integration.dt_util, "now", lambda: NOW[0]
            ):
                _run(integration._async_update_household_inventory_state(hass))
            return states[0]

        self.assertEqual(attributes(3)["supply_short"], {"tampon": {"stock": 3, "need": 7}})
        self.assertEqual(attributes(15)["supply_short"], {})

    def _hass_with_period_in(self, days, *, visibility="full"):
        start = -(28 - days)
        runtime = _runtime(history=[_iso(start - 28 * k + j) for k in range(5, -1, -1) for j in range(5)], visibility_level=visibility, profile="p1")
        hass = _hass()
        hass.data = {integration.DOMAIN: {"e1": runtime}}
        return hass

    def test_a_period_within_a_week_counts_as_upcoming(self) -> None:
        NOW[0] = datetime(2026, 10, 6, 9, 0, 0)
        today = NOW[0].date()
        with patch.object(integration, "MenstruationRuntime", SimpleNamespace):
            for days, expected in ((0, True), (7, True), (8, False), (20, False)):
                self.assertEqual(integration._household_period_upcoming(self._hass_with_period_in(days), today), expected, days)
            self.assertFalse(integration._household_period_upcoming(self._hass_with_period_in(3, visibility="private"), today))
            empty = _hass()
            empty.data = {}
            self.assertFalse(integration._household_period_upcoming(empty, today))

    def test_check_raises_or_clears_the_issue(self) -> None:
        NOW[0] = datetime(2026, 10, 6, 9, 0, 0)
        today = NOW[0].date()
        data = {
            "inventory": {"tampon": 3},
            "consumption_log": [
                {"product": "tampon", "quantity": 7, "timestamp": f"{(today + timedelta(days=off)).isoformat()}T08:00:00"}
                for off in (-60, -30)
            ],
        }
        with patch.object(integration, "MenstruationRuntime", SimpleNamespace), patch.object(
            integration.dt_util, "now", lambda: NOW[0]
        ):
            with _issue_recorder() as calls:
                integration._async_check_household_supply(self._hass_with_period_in(3), data)
            self.assertEqual([(c[0], c[1]) for c in calls], [("create", "household_supply_short")])
            self.assertEqual(calls[0][2]["translation_placeholders"], {"products_list": "Tampons 3/7"})
            with _issue_recorder() as calls:  # period not near: cleared
                integration._async_check_household_supply(self._hass_with_period_in(15), data)
            self.assertEqual(calls, [("delete", "household_supply_short")])
            with _issue_recorder() as calls:  # enough stock: cleared
                integration._async_check_household_supply(self._hass_with_period_in(3), {**data, "inventory": {"tampon": 7}})
            self.assertEqual(calls, [("delete", "household_supply_short")])


class PregnancyTestHintTests(unittest.TestCase):
    """Opt-in neutral hint 14 days after an ovulation confirmed by the NFP analysis (trying to conceive)."""

    # day k of a cycle: (basal temperature, cervical mucus, bleeding) - the Roetzer rise is on day 14
    _CYCLE = [
        (36.2, None, "heavy"), (36.1, None, "heavy"), (36.1, None, "heavy"), (36.0, None, "medium"),
        (36.2, None, "heavy"), (36.2, None, "medium"), (36.2, None, None), (36.2, None, None),
        (36.2, "cremig", None), (36.2, "cremig", None), (36.2, "cremig", None), (36.1, "cremig", None),
        (36.2, "cremig", None), (36.1, "fadenziehend", None), (36.6, "fadenziehend", None), (36.5, None, None),
    ]

    def setUp(self) -> None:
        NOW[0] = datetime(2026, 10, 6, 9, 0, 0)
        model_mod = sys.modules[f"{_PKG}.model"]
        entries = self._entries(-30)
        analysis = model_mod.analyze_nfp_cycle(entries, _iso(-30), 5)
        self.assertTrue(analysis["ovulation_detected"], analysis)
        self.ovulation_k = (date.fromisoformat(analysis["ovulation_day"]) - date.fromisoformat(_iso(-30))).days

    def _entries(self, start_offset):
        entries = []
        for k, (temp, mucus, bleeding) in enumerate(self._CYCLE):
            entry = {"date": _iso(start_offset + k), "basal_temp": temp}
            if mucus:
                entry["cervical_mucus"] = mucus
            if bleeding:
                entry["bleeding_strength"] = bleeding
            entries.append(entry)
        return entries

    def _send(self, days_since_ovulation, *, option=True, noncycle=None, language="en", options=None, method=None, **runtime_overrides):
        start = -(self.ovulation_k + days_since_ovulation)
        extra = [{"date": _iso(-1), "contraception_method": method}] if method else []
        runtime = _runtime(
            history=[_iso(start + k) for k in range(5)], symptom_history=self._entries(start) + extra,
            noncycle_data=dict(noncycle or {}), **runtime_overrides,
        )
        entry = _entry(**{
            const.CONF_NOTIFY_PERIOD_ENABLED: False, const.CONF_NOTIFY_FERTILE_ENABLED: False,
            const.CONF_NOTIFY_OVULATION_ENABLED: False, const.CONF_NOTIFY_RECAP_ENABLED: False,
            const.CONF_NOTIFY_OVERDUE_ENABLED: False, const.CONF_NOTIFY_CHECKUP_ENABLED: False,
            const.CONF_NOTIFY_TEST_HINT: option, **(options or {}),
        })
        hass, sent = _hass(), _Sent()
        hass.config.language = language
        with patch.object(integration, "_async_send_notification", sent), patch.object(
            integration, "_async_save_and_notify", AsyncMock()
        ), patch.object(integration.dt_util, "now", lambda: NOW[0]):
            _run(integration._async_check_and_send_notifications(hass, entry, runtime))
        self.runtime, self.start = runtime, start
        return [(title, message) for title, message, _ in sent.calls]

    def test_sends_one_neutral_message_14_days_after_the_confirmed_ovulation(self) -> None:
        (title, message), = self._send(14)
        self.assertEqual(title, "Pregnancy test")
        self.assertEqual(
            message.split("(")[0], "Test: it is 14 days since the confirmed ovulation ",
        )
        self.assertIn("rule of thumb, not medical advice", message)
        self.assertEqual(self.runtime.noncycle_data["notified_test_hint"], _iso(self.start))

    def test_window_is_14_to_16_days_and_only_once_per_cycle(self) -> None:
        self.assertEqual(self._send(13), [])
        self.assertEqual(len(self._send(15)), 1)
        self.assertEqual(len(self._send(16)), 1)
        self.assertEqual(self._send(17), [])
        self.assertEqual(self._send(14, noncycle={"notified_test_hint": _iso(-(self.ovulation_k + 14))}), [])

    def test_off_by_default_and_never_while_pregnant_or_muted(self) -> None:
        self.assertEqual(self._send(14, option=False), [])
        self.assertEqual(self._send(14, pregnancy_data={"is_pregnant": True, "start_date": _iso(-5)}), [])
        mute = {const.CONF_NOTIFY_FERTILE_MUTE_HORMONAL: True}
        self.assertEqual(self._send(14, options=mute, method="pill"), [])
        self.assertEqual(len(self._send(14, options=mute, method="condom")), 1)
        self.assertEqual(len(self._send(14, method="pill")), 1)  # not muted unless the option is on

    def test_no_message_without_a_confirmed_ovulation(self) -> None:
        runtime = _runtime(history=[_iso(-20 + k) for k in range(5)], symptom_history=[{"date": _iso(-9), "basal_temp": 36.4}])
        entry = _entry(**{const.CONF_NOTIFY_TEST_HINT: True})
        titles = [title for title, _, _ in _run_notifications(entry, runtime).calls]
        self.assertNotIn("Pregnancy test", titles)

    def test_follows_the_language(self) -> None:
        self.assertEqual(self._send(14, language="de")[0][0], "Schwangerschaftstest")

    def test_texts_exist_in_every_language(self) -> None:
        for lang in ("en", "de", "fr", "es", "sv"):
            strings = integration._notify_strings(lang)
            self.assertTrue(strings["testhint_title"], lang)
            strings["testhint_message"].format(name="A", date="2026-10-01", days=14)


class ClosePeriodStartsTests(unittest.TestCase):
    """repair_storage flags period starts that follow the previous one too closely."""

    def setUp(self) -> None:
        NOW[0] = datetime(2026, 10, 6, 9, 0, 0)

    @staticmethod
    def _close(*offsets):
        return integration._close_period_starts([_iso(o) for o in offsets], NOW[0].date())

    def test_normal_cycles_are_quiet(self) -> None:
        self.assertEqual(self._close(-84, -83, -56, -55, -28, -27, -1), [])

    def test_a_start_within_fourteen_days_is_flagged_but_fifteen_is_not(self) -> None:
        flagged = self._close(-60, -59, -46)  # 14 days after the previous start
        self.assertEqual([(g["from"], g["to"], g["gap_days"]) for g in flagged], [(_iso(-60), _iso(-46), 14)])
        self.assertEqual(self._close(-60, -59, -45), [])  # 15 days

    def test_days_of_one_period_are_not_separate_starts(self) -> None:
        # a one-day hole inside a period (gap of 2) stays one start
        self.assertEqual(self._close(-30, -28, -27, -26), [])

    def test_a_longer_period_followed_by_spotting_is_found(self) -> None:
        flagged = self._close(-40, -39, -38, -37, -30)
        self.assertEqual([g["to"] for g in flagged], [_iso(-30)])

    def test_only_the_last_year_is_reported(self) -> None:
        self.assertEqual(len(self._close(-375, -365)), 1)  # the later start is exactly 365 days back
        self.assertEqual(self._close(-376, -366), [])
        self.assertEqual(len(self._close(-370, -360)), 1)

    def test_unsorted_and_duplicate_history_is_handled(self) -> None:
        self.assertEqual(len(self._close(-30, -42, -30, -41)), 1)

    def test_diagnosis_names_the_start_and_the_service(self) -> None:
        class _Storage:
            async def async_load_raw(self):
                return {}

            async def async_load(self):
                return {
                    "pregnancy_data": {}, "menarche_data": {}, "menopause_data": {},
                    "ics_token": None, "ics_token_created_at": None, "hospital_bag_items": [],
                }

        for history, expected in (([-60, -59, -48], 1), ([-60, -59, -30], 0)):
            runtime = _runtime(history=[_iso(o) for o in history], storage=_Storage())
            with patch.object(integration.dt_util, "now", lambda: NOW[0]):
                issues = _run(integration._async_diagnose_profile_storage(runtime))
            self.assertEqual(len(issues), expected, issues)
            if expected:
                self.assertIn(_iso(-48), issues[0])
                self.assertIn("remove_cycle_start", issues[0])


class DoctorReportResponseTests(unittest.TestCase):
    """The doctor report service hands the HTML back so a card can open it."""

    def test_response_carries_filename_path_and_html_and_the_file_matches(self) -> None:
        import tempfile

        NOW[0] = datetime(2026, 10, 6, 9, 0, 0)
        runtime = _runtime(profile="anna", history=[_iso(-30), _iso(-29), _iso(-2), _iso(-1)])
        with tempfile.TemporaryDirectory() as tmp:
            hass = _hass()
            hass.config.path = lambda *parts: str(Path(tmp, *parts))

            async def _executor(func, *args):
                return func(*args)

            hass.async_add_executor_job = _executor
            call = SimpleNamespace(data={const.SERVICE_FIELD_LANGUAGE: "en"})
            with patch.object(integration, "_runtime_for_call", lambda h, c: runtime), patch.object(
                integration, "_async_save_and_notify", AsyncMock()
            ), patch.object(integration.dt_util, "now", lambda: NOW[0]):
                result = _run(integration._async_handle_export_doctor_report(hass, call))
            self.assertEqual(set(result), {"filename", "path", "html"})
            self.assertTrue(result["filename"].startswith("doctor_report_anna_"))
            self.assertIn("<html", result["html"].lower())
            self.assertEqual(Path(result["path"]).read_text(encoding="utf-8"), result["html"])
            self.assertEqual(Path(result["path"]).name, result["filename"])


class UnprotectedHintTests(unittest.TestCase):
    """Opt-in hint after unprotected intercourse is logged."""

    def setUp(self) -> None:
        NOW[0] = datetime(2026, 10, 6, 9, 0, 0)

    def _log(self, symptom_data, day_offset=0, *, existing=None, runtime=None, **options):
        options = {const.CONF_NOTIFY_UNPROTECTED_HINT: True, **options}
        entry = _entry(**options)
        runtime = runtime or _runtime(symptom_history=[dict(existing)] if existing else [])
        hass = _hass()
        hass.config_entries = SimpleNamespace(async_get_entry=lambda entry_id: entry)
        sent = _Sent()
        call = SimpleNamespace(data={const.SERVICE_FIELD_DATE: _iso(day_offset), const.SERVICE_FIELD_SYMPTOM_DATA: symptom_data})
        with patch.object(integration, "_runtime_for_call", lambda h, c: runtime), patch.object(
            integration, "_entry_id_for_runtime", lambda h, r: "e1"
        ), patch.object(integration, "_async_send_notification", sent), patch.object(
            integration, "_async_save_and_notify", AsyncMock()
        ) as save, patch.object(integration.dt_util, "now", lambda: NOW[0]):
            _run(integration._async_handle_add_symptom(hass, call))
        self.save = save
        self.runtime = runtime
        return sent

    def test_hint_for_unprotected_intercourse_today(self) -> None:
        sent = self._log({"intercourse": ["unprotected"]})
        self.assertEqual(len(sent.calls), 1)
        title, message, actions = sent.calls[0]
        self.assertEqual(title, "Unprotected intercourse logged")
        self.assertIn("pharmacy or doctor can advise on emergency contraception", message)
        self.assertIsNone(actions)
        self.assertEqual(self.runtime.noncycle_data["notified_unprotected"], _iso(0))
        self.save.assert_awaited()

    def test_a_plain_string_value_counts_too(self) -> None:
        self.assertEqual(len(self._log({"intercourse": "unprotected"}).calls), 1)

    def test_protected_intercourse_and_other_symptoms_do_not_trigger(self) -> None:
        self.assertEqual(self._log({"intercourse": ["protected"]}).calls, [])
        self.assertEqual(self._log({"mood": "good"}).calls, [])

    def test_off_by_default_and_needs_the_master_switch(self) -> None:
        self.assertEqual(self._log({"intercourse": ["unprotected"]}, **{const.CONF_NOTIFY_UNPROTECTED_HINT: False}).calls, [])
        self.assertEqual(self._log({"intercourse": ["unprotected"]}, **{const.CONF_NOTIFICATIONS_ENABLED: False}).calls, [])

    def test_only_for_the_last_days_not_for_back_filling_or_the_future(self) -> None:
        self.assertEqual(len(self._log({"intercourse": ["unprotected"]}, -const.UNPROTECTED_HINT_MAX_DAYS).calls), 1)
        self.assertEqual(self._log({"intercourse": ["unprotected"]}, -const.UNPROTECTED_HINT_MAX_DAYS - 1).calls, [])
        self.assertEqual(self._log({"intercourse": ["unprotected"]}, 1).calls, [])

    def test_once_per_day_even_if_the_entry_is_saved_again(self) -> None:
        existing = {"date": _iso(0), "intercourse": ["unprotected"]}
        self.assertEqual(self._log({"intercourse": ["unprotected"], "mood": "ok"}, existing=existing).calls, [])
        runtime = _runtime(noncycle_data={"notified_unprotected": _iso(0)})
        self.assertEqual(self._log({"intercourse": ["unprotected"]}, runtime=runtime).calls, [])

    def test_a_day_that_only_had_protected_intercourse_before_can_still_trigger(self) -> None:
        existing = {"date": _iso(0), "intercourse": ["protected"]}
        self.assertEqual(len(self._log({"intercourse": ["unprotected"]}, existing=existing).calls), 1)

    def test_not_during_pregnancy_or_menopause(self) -> None:
        for field, value in (("pregnancy_data", {"is_pregnant": True, "start_date": None}), ("menopause_data", {"is_menopause": True, "start_date": None})):
            runtime = _runtime(**{field: value})
            self.assertEqual(self._log({"intercourse": ["unprotected"]}, runtime=runtime).calls, [], field)

    def test_a_failing_notification_does_not_break_saving_the_symptom(self) -> None:
        runtime = _runtime()
        entry = _entry(**{const.CONF_NOTIFY_UNPROTECTED_HINT: True})
        hass = _hass()
        hass.config_entries = SimpleNamespace(async_get_entry=lambda entry_id: entry)
        call = SimpleNamespace(data={const.SERVICE_FIELD_DATE: _iso(0), const.SERVICE_FIELD_SYMPTOM_DATA: {"intercourse": ["unprotected"]}})
        failing = AsyncMock(side_effect=RuntimeError("target gone"))
        with patch.object(integration, "_runtime_for_call", lambda h, c: runtime), patch.object(
            integration, "_entry_id_for_runtime", lambda h, r: "e1"
        ), patch.object(integration, "_async_send_notification", failing), patch.object(
            integration, "_async_save_and_notify", AsyncMock()
        ) as save, patch.object(integration.dt_util, "now", lambda: NOW[0]), self.assertLogs(level="ERROR"):
            _run(integration._async_handle_add_symptom(hass, call))
        save.assert_awaited()
        self.assertEqual(runtime.symptom_history[0]["intercourse"], ["unprotected"])
        self.assertNotIn("notified_unprotected", runtime.noncycle_data)

    def test_import_without_saving_sends_nothing(self) -> None:
        runtime, entry, sent = _runtime(), _entry(**{const.CONF_NOTIFY_UNPROTECTED_HINT: True}), _Sent()
        hass = _hass()
        hass.config_entries = SimpleNamespace(async_get_entry=lambda entry_id: entry)
        call = SimpleNamespace(data={const.SERVICE_FIELD_DATE: _iso(0), const.SERVICE_FIELD_SYMPTOM_DATA: {"intercourse": ["unprotected"]}})
        with patch.object(integration, "_runtime_for_call", lambda h, c: runtime), patch.object(
            integration, "_entry_id_for_runtime", lambda h, r: "e1"
        ), patch.object(integration, "_async_send_notification", sent):
            _run(integration._async_handle_add_symptom(hass, call, save=False))
        self.assertEqual(sent.calls, [])

    def test_text_in_every_language_names_the_person_and_gives_no_dosing(self) -> None:
        for lang, strings in integration._NOTIFY_STRINGS.items():
            self.assertIn("{name}", strings["unprotected_message"], lang)
            self.assertTrue(strings["unprotected_title"].strip(), lang)
            self.assertFalse(re.search(r"\d\s*(mg|h\b|hours|Stunden|heures|horas|timmar)", strings["unprotected_message"]), lang)


class CheckupNotificationTests(unittest.TestCase):
    def _runtime(self, last_checkup_offset: int | None):
        history = [] if last_checkup_offset is None else [
            {"date": _iso(last_checkup_offset), const.SYMPTOM_APPOINTMENTS: ["gynecologist"]}
        ]
        return _runtime(symptom_history=history)

    def test_sends_within_lead_window_once(self) -> None:
        entry = _entry(**{const.CONF_NOTIFY_CHECKUP_ENABLED: True, const.CONF_CHECKUP_INTERVAL_MONTHS: 12})
        runtime = self._runtime(-(365 - 10))  # due in 10 days
        sent = _run_notifications(entry, runtime)
        self.assertEqual([c[0] for c in sent.calls], ["Checkup reminder"])
        self.assertIn(_iso(10), sent.calls[0][1])
        self.assertEqual(_run_notifications(entry, runtime).calls, [])

    def test_not_sent_too_early_without_checkup_or_when_disabled(self) -> None:
        enabled = _entry(**{const.CONF_NOTIFY_CHECKUP_ENABLED: True, const.CONF_CHECKUP_INTERVAL_MONTHS: 12})
        self.assertEqual(_run_notifications(enabled, self._runtime(-100)).calls, [])
        self.assertEqual(_run_notifications(enabled, self._runtime(None)).calls, [])
        self.assertEqual(_run_notifications(_entry(**{const.CONF_CHECKUP_INTERVAL_MONTHS: 12}), self._runtime(-360)).calls, [])

    def test_already_overdue_is_reported_once(self) -> None:
        entry = _entry(**{const.CONF_NOTIFY_CHECKUP_ENABLED: True, const.CONF_CHECKUP_INTERVAL_MONTHS: 12})
        runtime = self._runtime(-400)
        self.assertEqual(len(_run_notifications(entry, runtime).calls), 1)
        self.assertEqual(_run_notifications(entry, runtime).calls, [])


class PillReminderTests(unittest.TestCase):
    def _entry(self, **options):
        return _entry(**{const.CONF_NOTIFY_PILL_ENABLED: True, **options})

    def test_reminder_with_taken_and_snooze_buttons(self) -> None:
        sent = _run_pill_reminder(self._entry(), _runtime(symptom_history=_pill_entries(-2, -1)))
        self.assertEqual(len(sent.calls), 1)
        title, message, actions = sent.calls[0]
        self.assertEqual((title, message), ("Pill reminder", "Test: time to take the pill."))
        self.assertEqual(
            [a["action"] for a in actions],
            [f"{const.NOTIFY_ACTION_PILL_TAKEN_PREFIX}e1", f"{const.NOTIFY_ACTION_PILL_SNOOZE_PREFIX}e1"],
        )

    def test_silent_when_already_logged_or_not_on_the_pill(self) -> None:
        self.assertEqual(_run_pill_reminder(self._entry(), _runtime(symptom_history=_pill_entries(-1, 0))).calls, [])
        self.assertEqual(_run_pill_reminder(self._entry(), _runtime(symptom_history=[])).calls, [])

    def test_silent_during_configured_pack_break(self) -> None:
        entry = self._entry(**{const.CONF_PILL_PAUSE_DAYS: 7})
        runtime = _runtime(symptom_history=_pill_entries(*range(-24, -2)))  # 22 days ending 3 days ago
        self.assertEqual(_run_pill_reminder(entry, runtime).calls, [])

    def test_gap_hint_needs_option_and_two_missing_days(self) -> None:
        runtime = _runtime(symptom_history=_pill_entries(-4))  # last intake 4 days ago
        on = self._entry(**{const.CONF_NOTIFY_PILL_GAP_ENABLED: True, const.CONF_PILL_PAUSE_DAYS: 7})
        message = _run_pill_reminder(on, runtime).calls[0][1]
        self.assertIn("4 days ago", message)
        self.assertIn("protection may be reduced", message)
        off = self._entry(**{const.CONF_PILL_PAUSE_DAYS: 7})
        self.assertEqual(_run_pill_reminder(off, runtime).calls[0][1], "Test: time to take the pill.")
        one_day = _runtime(symptom_history=_pill_entries(-1))
        self.assertEqual(_run_pill_reminder(on, one_day).calls[0][1], "Test: time to take the pill.")

    def test_gap_hint_without_pack_break_only_beyond_any_normal_break(self) -> None:
        entry = self._entry(**{const.CONF_NOTIFY_PILL_GAP_ENABLED: True})
        short = _runtime(symptom_history=_pill_entries(-4))
        long = _runtime(symptom_history=_pill_entries(-(const.PILL_PAUSE_DAYS_MAX + 2)))
        self.assertEqual(_run_pill_reminder(entry, short).calls[0][1], "Test: time to take the pill.")
        self.assertIn("protection may be reduced", _run_pill_reminder(entry, long).calls[0][1])


class MobileActionTests(unittest.TestCase):
    def _handle(self, entry, runtime, action: str, **patches):
        event = SimpleNamespace(data={"action": action})
        later: list[tuple[float, object]] = []
        with patch.object(integration, "_async_save_and_notify", AsyncMock()), patch.object(
            integration, "async_call_later", lambda hass, delay, cb: later.append((delay, cb)) or (lambda: None)
        ):
            _run(integration._async_handle_mobile_action(_hass(), entry, runtime, event))
        return later

    def test_pill_taken_logs_a_pill_for_today(self) -> None:
        entry, runtime = _entry(), _runtime()
        with patch.object(integration, "_async_handle_add_symptom", AsyncMock()) as add_symptom:
            self._handle(entry, runtime, f"{const.NOTIFY_ACTION_PILL_TAKEN_PREFIX}e1")
        data = add_symptom.call_args.args[1].data
        self.assertEqual(data[const.SERVICE_FIELD_ENTRY_ID], "e1")
        self.assertEqual(data[const.SERVICE_FIELD_DATE], TODAY.isoformat())
        self.assertEqual(data[const.SERVICE_FIELD_SYMPTOM_DATA], {const.SYMPTOM_CONTRACEPTION_METHOD: "pill"})

    def test_period_started_logs_a_cycle_start(self) -> None:
        entry, runtime = _entry(), _runtime()
        with patch.object(integration, "_async_handle_add", AsyncMock()) as add:
            self._handle(entry, runtime, f"{const.NOTIFY_ACTION_PERIOD_STARTED_PREFIX}e1")
        self.assertEqual(add.call_args.args[1].data[const.SERVICE_FIELD_DATE], TODAY.isoformat())

    def test_action_for_another_profile_is_ignored(self) -> None:
        entry, runtime = _entry(), _runtime()
        with patch.object(integration, "_async_handle_add", AsyncMock()) as add, patch.object(
            integration, "_async_handle_add_symptom", AsyncMock()
        ) as add_symptom:
            later = self._handle(entry, runtime, f"{const.NOTIFY_ACTION_PILL_TAKEN_PREFIX}other")
        self.assertEqual((add.await_count, add_symptom.await_count, later), (0, 0, []))

    def test_snooze_stores_due_time_arms_timer_and_resends_once(self) -> None:
        entry, runtime = _entry(), _runtime()
        later = self._handle(entry, runtime, f"{const.NOTIFY_ACTION_PILL_SNOOZE_PREFIX}e1")
        self.assertEqual([d for d, _ in later], [const.NOTIFY_SNOOZE_SECONDS])
        self.assertEqual(
            runtime.noncycle_data["snooze_due"]["pill"],
            (NOW[0] + timedelta(seconds=const.NOTIFY_SNOOZE_SECONDS)).isoformat(),
        )
        self.assertEqual(len(entry.unloads), 1)
        resend = AsyncMock()
        with patch.dict(integration._SNOOZE_SENDERS, {"pill": resend}), patch.object(
            integration, "_async_save_and_notify", AsyncMock()
        ):
            _run(later[0][1](NOW[0]))
        resend.assert_awaited_once()
        self.assertNotIn("pill", runtime.noncycle_data["snooze_due"])

    def test_failing_resend_does_not_raise(self) -> None:
        entry, runtime = _entry(), _runtime()
        later = self._handle(entry, runtime, f"{const.NOTIFY_ACTION_LOG_SNOOZE_PREFIX}e1")
        failing = AsyncMock(side_effect=RuntimeError("notify target gone"))
        with patch.dict(integration._SNOOZE_SENDERS, {"log": failing}), patch.object(
            integration, "_async_save_and_notify", AsyncMock()
        ), self.assertLogs(level="ERROR"):
            _run(later[0][1](NOW[0]))
        self.assertNotIn("log", runtime.noncycle_data["snooze_due"])


class NotifyTargetTests(unittest.TestCase):
    def _send(self, service_exists: bool, call=None, **options):
        entry = _entry(**{const.CONF_NOTIFY_SERVICE: "notify.mobile_app_phone", **options})
        hass = SimpleNamespace(
            services=SimpleNamespace(
                has_service=lambda domain, service: service_exists,
                async_call=call or AsyncMock(),
            )
        )
        entry.title = "Sarah"
        with _issue_recorder() as issues:
            _run(integration._async_send_notification(hass, entry, "T", "M", [{"action": "A", "title": "x"}]))
        return hass.services.async_call, issues

    def test_missing_service_raises_issue_and_sends_nothing(self) -> None:
        call, issues = self._send(False)
        self.assertEqual(call.await_count, 0)
        self.assertEqual([(i[0], i[1]) for i in issues], [("create", "notify_target_unavailable_e1")])
        self.assertEqual(issues[0][2]["translation_placeholders"], {"entry_title": "Sarah", "target": "notify.mobile_app_phone"})

    def test_success_sends_with_actions_and_clears_issue(self) -> None:
        call, issues = self._send(True)
        domain, service, payload = call.await_args.args
        self.assertEqual((domain, service), ("notify", "mobile_app_phone"))
        self.assertEqual(payload["data"], {"actions": [{"action": "A", "title": "x"}]})
        self.assertEqual(issues, [("delete", "notify_target_unavailable_e1")])

    def test_failing_call_raises_issue_without_raising(self) -> None:
        call, issues = self._send(True, call=AsyncMock(side_effect=RuntimeError("boom")))
        self.assertEqual([(i[0], i[1]) for i in issues], [("create", "notify_target_unavailable_e1")])


class SnoozeRearmTests(unittest.TestCase):
    def _rearm(self, snooze_due: dict):
        entry, runtime = _entry(), _runtime(noncycle_data={"snooze_due": snooze_due})
        armed: list[tuple[str, float]] = []
        with patch.object(integration, "_arm_snooze", lambda hass, e, r, kind, delay: armed.append((kind, delay))):
            integration._rearm_snoozes(_hass(), entry, runtime)
        return armed, runtime.noncycle_data["snooze_due"]

    def _due(self, seconds_from_now: float) -> str:
        return (NOW[0] + timedelta(seconds=seconds_from_now)).isoformat()

    def test_pending_snooze_is_rearmed_with_remaining_time(self) -> None:
        armed, left = self._rearm({"pill": self._due(1800)})
        self.assertEqual(armed, [("pill", 1800)])
        self.assertIn("pill", left)

    def test_slightly_overdue_snooze_fires_right_away(self) -> None:
        armed, _ = self._rearm({"log": self._due(-600)})
        self.assertEqual(armed, [("log", 1)])

    def test_snooze_overdue_by_more_than_its_length_is_dropped(self) -> None:
        armed, left = self._rearm({"pill": self._due(-(const.NOTIFY_SNOOZE_SECONDS + 60))})
        self.assertEqual((armed, left), ([], {}))

    def test_unknown_kind_and_garbage_are_dropped(self) -> None:
        armed, left = self._rearm({"other": self._due(600), "pill": "not a date"})
        self.assertEqual((armed, left), ([], {}))

    def test_missing_or_broken_storage_is_ignored(self) -> None:
        entry = _entry()
        for data in ({}, {"snooze_due": None}, {"snooze_due": "x"}):
            integration._rearm_snoozes(_hass(), entry, _runtime(noncycle_data=data))


class PillRefillTodoTests(unittest.TestCase):
    def _run(self, runtime, **options):
        entry = _entry(**options)
        add = AsyncMock()
        with patch.object(integration, "_async_add_todo_item_if_missing", add), patch.object(
            integration.dt_util, "now", lambda: NOW[0]
        ):
            _run(integration._async_check_pill_refill_todo(_hass(), entry, runtime))
        return add

    def test_item_added_shortly_before_the_pack_ends(self) -> None:
        add = self._run(_runtime(symptom_history=_pill_entries(*range(-17, 1))), **{const.CONF_PILL_PAUSE_DAYS: 7})
        add.assert_awaited_once()
        self.assertEqual(add.await_args.args[1], f"Test: order a new pill pack (current one ends {_iso(3)})")

    def test_nothing_when_pack_end_is_far_or_unknown_or_not_on_the_pill(self) -> None:
        pause = {const.CONF_PILL_PAUSE_DAYS: 7}
        self.assertEqual(self._run(_runtime(symptom_history=_pill_entries(*range(-5, 1))), **pause).await_count, 0)
        self.assertEqual(self._run(_runtime(symptom_history=_pill_entries(*range(-17, 1)))).await_count, 0)
        self.assertEqual(self._run(_runtime(symptom_history=_pill_entries(*range(-24, 1))), **pause).await_count, 0)
        self.assertEqual(self._run(_runtime(), **pause).await_count, 0)


if __name__ == "__main__":
    unittest.main()
