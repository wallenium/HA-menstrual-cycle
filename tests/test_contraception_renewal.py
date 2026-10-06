"""Confirming a contraception renewal, the renewal period it restarts, and the patch/ring rhythm with its reminders."""

from __future__ import annotations

import asyncio
import importlib.util
import sys
import types
import unittest
from datetime import date, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPONENT_ROOT = REPO_ROOT / "custom_components" / "menstruation_cycle"
TODAY = date(2026, 10, 6)
NOW = [datetime(2026, 10, 6, 9, 0, 0)]  # mutable so a test can move the clock
_PKG = "tstest_contraception_renewal"


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


def _log(day: str, method: str) -> dict:
    return {"date": day, "contraception_method": method}


def _status(entries, today, renewed=None):
    model = sys.modules[f"{_PKG}.model"]
    return model.compute_contraception_status(entries, today=today, renewed=renewed)


def _rhythm(method, since, today):
    return sys.modules[f"{_PKG}.model"].contraception_rhythm(method, since, date.fromisoformat(today))


class RenewalPeriodTests(unittest.TestCase):
    IMPLANT = [_log("2023-01-10", "implant"), _log("2026-01-10", "implant")]

    def test_without_a_confirmation_the_first_log_starts_the_period(self) -> None:
        status = _status(self.IMPLANT, date(2026, 10, 6))
        self.assertEqual((status["renewal_since"], status["renewal_due_date"]), ("2023-01-10", "2026-01-10"))
        self.assertTrue(status["renewal_reminder_due"])

    def test_a_confirmed_renewal_restarts_the_period(self) -> None:
        status = _status(self.IMPLANT, date(2026, 10, 6), {"method": "implant", "date": "2026-01-10"})
        self.assertEqual((status["renewal_since"], status["renewal_due_date"]), ("2026-01-10", "2029-01-10"))
        self.assertFalse(status["renewal_reminder_due"])

    def test_injection_every_three_months(self) -> None:
        entries = [_log("2026-06-01", "injection"), _log("2026-09-01", "injection")]
        today = date(2026, 10, 6)
        self.assertTrue(_status(entries, today)["renewal_reminder_due"])
        status = _status(entries, today, {"method": "injection", "date": "2026-09-01"})
        self.assertEqual(status["renewal_due_date"], "2026-12-01")
        self.assertFalse(status["renewal_reminder_due"])

    def test_a_confirmation_for_another_method_or_older_than_the_log_or_broken_is_ignored(self) -> None:
        today = date(2026, 10, 6)
        for renewed in (
            {"method": "injection", "date": "2026-09-01"},
            {"method": "implant", "date": "2022-01-01"},
            {"method": "implant", "date": "not a date"},
            {"method": "implant"},
            "garbage",
        ):
            self.assertEqual(_status(self.IMPLANT, today, renewed)["renewal_since"], "2023-01-10", renewed)


class RhythmTests(unittest.TestCase):
    def test_patch_steps(self) -> None:
        steps = {
            "2026-09-01": ("patch_change", "2026-09-08", 7),
            "2026-09-08": ("patch_change", "2026-09-08", 0),
            "2026-09-09": ("patch_change", "2026-09-15", 6),
            "2026-09-16": ("patch_remove", "2026-09-22", 6),
            "2026-09-22": ("patch_remove", "2026-09-22", 0),
            "2026-09-23": ("patch_new", "2026-09-29", 6),
            "2026-09-29": ("patch_new", "2026-09-29", 0),
            "2026-09-30": ("patch_change", "2026-10-06", 6),
            "2026-10-27": ("patch_new", "2026-10-27", 0),
        }
        for today, (event, due, days) in steps.items():
            rhythm = _rhythm("patch", "2026-09-01", today)
            self.assertEqual((rhythm["event"], rhythm["date"], rhythm["days_until"]), (event, due, days), today)

    def test_ring_steps(self) -> None:
        steps = {
            "2026-09-02": ("ring_remove", "2026-09-22", 20),
            "2026-09-22": ("ring_remove", "2026-09-22", 0),
            "2026-09-25": ("ring_insert", "2026-09-29", 4),
            "2026-09-29": ("ring_insert", "2026-09-29", 0),
            "2026-10-01": ("ring_remove", "2026-10-20", 19),
        }
        for today, (event, due, days) in steps.items():
            rhythm = _rhythm("ring", "2026-09-01", today)
            self.assertEqual((rhythm["event"], rhythm["date"], rhythm["days_until"]), (event, due, days), today)

    def test_break_flag_and_pack_start(self) -> None:
        self.assertFalse(_rhythm("patch", "2026-09-01", "2026-09-21")["in_break"])
        self.assertTrue(_rhythm("patch", "2026-09-01", "2026-09-22")["in_break"])
        self.assertTrue(_rhythm("patch", "2026-09-01", "2026-09-28")["in_break"])
        self.assertEqual(_rhythm("patch", "2026-09-01", "2026-10-03")["pack_start"], "2026-09-29")

    def test_other_methods_and_bad_input_have_no_rhythm(self) -> None:
        self.assertIsNone(_rhythm("pill", "2026-09-01", "2026-09-10"))
        self.assertIsNone(_rhythm(None, "2026-09-01", "2026-09-10"))
        self.assertIsNone(_rhythm("patch", None, "2026-09-10"))
        self.assertIsNone(_rhythm("patch", "nonsense", "2026-09-10"))
        self.assertIsNone(_rhythm("patch", "2026-09-20", "2026-09-10"))

    def test_status_carries_the_rhythm_and_a_confirmation_moves_the_anchor(self) -> None:
        entries = [_log("2026-09-01", "ring")]
        self.assertEqual(_status(entries, date(2026, 9, 10))["rhythm"]["pack_start"], "2026-09-01")
        moved = _status(entries, date(2026, 9, 30), {"method": "ring", "date": "2026-09-27"})["rhythm"]
        self.assertEqual((moved["pack_start"], moved["event"], moved["date"]), ("2026-09-27", "ring_remove", "2026-10-18"))
        self.assertIsNone(_status([_log("2026-09-01", "pill")], date(2026, 9, 10))["rhythm"])


class _Error(Exception):
    pass


def _run(coro):
    return asyncio.run(coro)


class ConfirmServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        NOW[0] = datetime(2026, 10, 6, 9, 0, 0)
        self.saved = 0

    def _confirm(self, entries, data=None, noncycle=None):
        runtime = SimpleNamespace(symptom_history=entries, noncycle_data=noncycle if noncycle is not None else {})

        async def save(hass, rt):
            self.saved += 1

        with patch.object(integration, "_runtime_for_call", lambda h, c: runtime), patch.object(
            integration, "_async_save_and_notify", save
        ), patch.object(integration, "HomeAssistantError", _Error):
            _run(integration._async_handle_confirm_contraception_renewal(object(), SimpleNamespace(data=data or {})))
        return runtime

    def test_default_day_is_today_and_the_method_is_remembered(self) -> None:
        runtime = self._confirm([_log("2023-01-10", "implant")])
        self.assertEqual(runtime.noncycle_data["contraception_renewed"], {"method": "implant", "date": "2026-10-06"})
        self.assertEqual(self.saved, 1)

    def test_a_given_past_day_is_used(self) -> None:
        runtime = self._confirm([_log("2023-01-10", "injection")], {"date": "2026-09-01"})
        self.assertEqual(runtime.noncycle_data["contraception_renewed"]["date"], "2026-09-01")

    def test_a_future_day_is_refused(self) -> None:
        with self.assertRaises(_Error):
            self._confirm([_log("2023-01-10", "implant")], {"date": "2026-10-07"})
        self.assertEqual(self.saved, 0)

    def test_a_method_without_renewal_period_is_refused(self) -> None:
        for entries in ([_log("2026-10-01", "pill")], [_log("2026-10-01", "condom")], []):
            with self.assertRaises(_Error):
                self._confirm(entries)
        self.assertEqual(self.saved, 0)

    def test_patch_and_ring_can_be_confirmed(self) -> None:
        for method in ("patch", "ring"):
            runtime = self._confirm([_log("2026-09-01", method)])
            self.assertEqual(runtime.noncycle_data["contraception_renewed"]["method"], method)

    def test_the_confirmation_restarts_the_period_through_the_real_status(self) -> None:
        runtime = self._confirm([_log("2023-01-10", "implant")], {"date": "2026-09-01"})
        status = _status(runtime.symptom_history, TODAY, runtime.noncycle_data["contraception_renewed"])
        self.assertFalse(status["renewal_reminder_due"])


class RhythmReminderTests(unittest.TestCase):
    OPTIONS = {"notifications_enabled": True}

    def setUp(self) -> None:
        self.sent: list[tuple] = []

    def _send(self, entries, today, lang="en", noncycle=None, options=None):
        NOW[0] = datetime.combine(date.fromisoformat(today), datetime.min.time()).replace(hour=9)
        hass = SimpleNamespace(config=SimpleNamespace(language=lang))
        entry = SimpleNamespace(entry_id="e1", options=self.OPTIONS if options is None else options)
        runtime = SimpleNamespace(symptom_history=entries, noncycle_data=noncycle if noncycle is not None else {}, friendly_name="Anna")

        async def send(hass_, entry_, title, message, actions=None):
            self.sent.append((title, message, actions))

        with patch.object(integration, "_async_send_notification", send):
            _run(integration._async_send_rhythm_reminder(hass, entry, runtime))
        return runtime

    def test_message_on_a_step_day_names_the_step(self) -> None:
        self._send([_log("2026-09-01", "patch")], "2026-09-08")
        title, message, actions = self.sent[0]
        self.assertEqual(title, "Patch/ring reminder")
        self.assertIn("Anna: today is a patch change day", message)
        self.assertIsNone(actions)

    def test_no_message_between_steps_or_for_other_methods_or_when_notifications_are_off(self) -> None:
        self._send([_log("2026-09-01", "patch")], "2026-09-09")
        self._send([_log("2026-09-01", "pill")], "2026-09-08")
        self._send([_log("2026-09-01", "patch")], "2026-09-08", options={})
        self.assertEqual(self.sent, [])

    def test_a_new_pack_step_offers_the_started_today_button(self) -> None:
        self._send([_log("2026-09-01", "ring")], "2026-09-29")
        title, message, actions = self.sent[0]
        self.assertIn("a new ring is due", message)
        self.assertEqual(actions, [{"action": "MCYCLE_RENEWED_e1", "title": "Started today"}])

    def test_the_same_step_is_sent_once_even_if_the_follow_up_time_calls_again(self) -> None:
        runtime = self._send([_log("2026-09-01", "ring")], "2026-09-22")
        self.assertEqual(runtime.noncycle_data["notified_rhythm"], "ring_remove:2026-09-22")
        self._send([_log("2026-09-01", "ring")], "2026-09-22", noncycle=runtime.noncycle_data)
        self.assertEqual(len(self.sent), 1)

    def test_the_next_step_is_sent_again(self) -> None:
        runtime = self._send([_log("2026-09-01", "patch")], "2026-09-08")
        self._send([_log("2026-09-01", "patch")], "2026-09-15", noncycle=runtime.noncycle_data)
        self.assertEqual(len(self.sent), 2)

    def test_a_confirmed_new_pack_moves_the_steps(self) -> None:
        renewed = {"contraception_renewed": {"method": "patch", "date": "2026-09-03"}}
        self._send([_log("2026-09-01", "patch")], "2026-09-10", noncycle=dict(renewed))
        self.assertEqual(len(self.sent), 1)

    def test_text_in_every_language_and_every_step_has_a_message(self) -> None:
        for lang, strings in integration._NOTIFY_STRINGS.items():
            for events in const.CONTRACEPTION_RHYTHM_EVENTS.values():
                for _, event in events:
                    self.assertIn("{name}", strings[f"rhythm_{event}"], (lang, event))
            for key in ("rhythm_title", "action_renewed"):
                self.assertTrue(strings[key].strip(), (lang, key))
        self.assertIn("Anna : aujourd'hui, changement de patch", integration._NOTIFY_STRINGS["fr"]["rhythm_patch_change"].format(name="Anna"))


class MobileActionTests(unittest.TestCase):
    def test_the_started_today_button_confirms_the_renewal(self) -> None:
        calls = []

        async def confirm(hass, call):
            calls.append(call.data)

        entry = SimpleNamespace(entry_id="e1", options={})
        event = SimpleNamespace(data={"action": "MCYCLE_RENEWED_e1"})
        with patch.object(integration, "_async_handle_confirm_contraception_renewal", confirm):
            _run(integration._async_handle_mobile_action(object(), entry, SimpleNamespace(), event))
            _run(integration._async_handle_mobile_action(object(), entry, SimpleNamespace(), SimpleNamespace(data={"action": "MCYCLE_RENEWED_other"})))
        self.assertEqual(calls, [{const.SERVICE_FIELD_ENTRY_ID: "e1"}])


class EveryCallerKnowsTheRenewalTests(unittest.TestCase):
    def test_every_status_call_passes_the_confirmed_renewal(self) -> None:
        """A caller that forgets `renewed=` would show an overdue reminder again after a confirmation."""
        import ast

        checked = 0
        for name in ("__init__.py", "sensor.py"):
            tree = ast.parse((COMPONENT_ROOT / name).read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                if isinstance(node, ast.Call) and getattr(node.func, "id", "") == "compute_contraception_status":
                    checked += 1
                    self.assertIn("renewed", {kw.arg for kw in node.keywords}, f"{name}:{node.lineno}")
        self.assertGreaterEqual(checked, 5)


if __name__ == "__main__":
    unittest.main()
