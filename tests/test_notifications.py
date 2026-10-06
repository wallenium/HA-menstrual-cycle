"""Tests for the notification logic in __init__.py: overdue/checkup push, pill reminder (+gap hint), snooze and mobile actions."""

from __future__ import annotations

import asyncio
import importlib.util
import sys
import types
import unittest
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
    dt_mod.parse_datetime = datetime.fromisoformat
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


if __name__ == "__main__":
    unittest.main()
