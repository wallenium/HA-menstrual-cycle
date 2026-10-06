"""Tests for the basal-temperature import from a linked sensor (which day a reading is stored under, filters, listener)."""

from __future__ import annotations

import asyncio
import importlib.util
import sys
import types
import unittest
from datetime import date, datetime
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPONENT_ROOT = REPO_ROOT / "custom_components" / "menstruation_cycle"
TODAY = date(2026, 10, 6)
NOW = [datetime(2026, 10, 6, 9, 0, 0)]  # mutable so a test can move the clock
_PKG = "tstest_basal_import"


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
    dt_mod.as_local = lambda value: value
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



const = sys.modules[f"{_PKG}.const"]
ENTITY = "sensor.thermometer"


def _state(value, last_updated, unit="°C"):
    return SimpleNamespace(state=value, last_updated=last_updated, attributes={"unit_of_measurement": unit})


def _hass(state=None):
    return SimpleNamespace(states=SimpleNamespace(get=lambda entity_id: state if entity_id == ENTITY else None))


def _entry(entity=ENTITY):
    return SimpleNamespace(entry_id="e1", options={const.CONF_BASAL_TEMP_SENSOR_ENTITY_ID: entity})


def _runtime(history=None):
    return SimpleNamespace(symptom_history=list(history or []), unregister_basal_temp_listener=None)


class BasalTempImportTests(unittest.TestCase):
    def _import(self, state, runtime=None, today=date(2026, 10, 6), entity=ENTITY):
        runtime = runtime or _runtime()
        saved = AsyncMock()
        with patch.object(integration, "_async_save_and_notify", saved):
            asyncio.run(integration._async_import_basal_temp_from_linked_sensor(_hass(state), _entry(entity), runtime, today))
        return runtime, saved

    def test_todays_reading_is_stored_under_today(self) -> None:
        runtime, saved = self._import(_state("36.55", datetime(2026, 10, 6, 6, 30)))
        self.assertEqual(runtime.symptom_history, [{"date": "2026-10-06", "basal_temp": 36.55}])
        saved.assert_awaited_once()

    def test_a_reading_from_yesterday_goes_to_yesterday_not_today(self) -> None:
        runtime, _ = self._import(_state("36.4", datetime(2026, 10, 5, 7, 0)))
        self.assertEqual(runtime.symptom_history, [{"date": "2026-10-05", "basal_temp": 36.4}])

    def test_the_stale_value_at_midnight_does_not_become_a_new_data_point(self) -> None:
        # 00:00:05 on the 7th: the sensor still holds the reading of the 6th, which was already imported
        runtime = _runtime([{"date": "2026-10-06", "basal_temp": 36.5}])
        runtime, saved = self._import(_state("36.5", datetime(2026, 10, 6, 6, 30)), runtime, today=date(2026, 10, 7))
        self.assertEqual(runtime.symptom_history, [{"date": "2026-10-06", "basal_temp": 36.5}])
        saved.assert_not_awaited()

    def test_readings_older_than_yesterday_or_from_the_future_are_ignored(self) -> None:
        for updated in (datetime(2026, 10, 4, 6, 0), datetime(2026, 10, 7, 6, 0)):
            runtime, saved = self._import(_state("36.5", updated))
            self.assertEqual(runtime.symptom_history, [], updated)
            saved.assert_not_awaited()

    def test_a_manual_value_always_wins_and_a_symptom_entry_without_temperature_gets_it(self) -> None:
        runtime, saved = self._import(_state("36.9", datetime(2026, 10, 6, 6, 0)), _runtime([{"date": "2026-10-06", "basal_temp": 36.2}]))
        self.assertEqual(runtime.symptom_history[0]["basal_temp"], 36.2)
        saved.assert_not_awaited()
        runtime, _ = self._import(_state("36.9", datetime(2026, 10, 6, 6, 0)), _runtime([{"date": "2026-10-06", "pain": 2}]))
        self.assertEqual(runtime.symptom_history, [{"date": "2026-10-06", "pain": 2, "basal_temp": 36.9}])

    def test_fahrenheit_is_converted(self) -> None:
        runtime, _ = self._import(_state("97.7", datetime(2026, 10, 6, 6, 0), unit="°F"))
        self.assertEqual(runtime.symptom_history[0]["basal_temp"], 36.5)

    def test_unusable_readings_are_ignored(self) -> None:
        when = datetime(2026, 10, 6, 6, 0)
        for state in (_state("0", when), _state("50", when), _state("abc", when), _state("unavailable", when),
                      _state("unknown", when), _state("", when), None):
            runtime, saved = self._import(state)
            self.assertEqual(runtime.symptom_history, [], getattr(state, "state", None))
            saved.assert_not_awaited()

    def test_nothing_happens_without_a_linked_sensor(self) -> None:
        runtime, saved = self._import(_state("36.5", datetime(2026, 10, 6, 6, 0)), entity="")
        self.assertEqual(runtime.symptom_history, [])
        saved.assert_not_awaited()


class BasalTempListenerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.calls: list[tuple] = []
        self.runtime = _runtime()

    def _register(self, entity=ENTITY) -> None:
        def track(hass, entity_ids, action):
            self.calls.append(("track", entity_ids, action))
            return lambda: self.calls.append(("unsub", entity_ids))

        with patch.object(integration, "async_track_state_change_event", track):
            integration._register_basal_temp_listener(_hass(), _entry(entity), self.runtime)

    def test_listens_to_the_linked_sensor(self) -> None:
        self._register()
        self.assertEqual([c[:2] for c in self.calls], [("track", [ENTITY])])
        self.assertIsNotNone(self.runtime.unregister_basal_temp_listener)

    def test_registering_again_unsubscribes_the_old_listener_first(self) -> None:
        self._register()
        self._register("sensor.other")
        self.assertEqual([c[:2] for c in self.calls], [("track", [ENTITY]), ("unsub", [ENTITY]), ("track", ["sensor.other"])])

    def test_clearing_the_option_removes_the_listener(self) -> None:
        self._register()
        self._register("")
        self.assertEqual([c[:2] for c in self.calls], [("track", [ENTITY]), ("unsub", [ENTITY])])
        self.assertIsNone(self.runtime.unregister_basal_temp_listener)

    def test_a_sensor_update_triggers_the_import_for_today(self) -> None:
        self._register()
        action = self.calls[0][2]
        with patch.object(integration, "_async_import_basal_temp_from_linked_sensor", AsyncMock()) as imported:
            asyncio.run(action(SimpleNamespace()))
        imported.assert_awaited_once()
        self.assertEqual(imported.await_args.args[3], NOW[0].date())

    def test_a_failing_import_is_logged_not_raised(self) -> None:
        self._register()
        action = self.calls[0][2]
        with patch.object(integration, "_async_import_basal_temp_from_linked_sensor", AsyncMock(side_effect=RuntimeError("x"))):
            with self.assertLogs(level="ERROR"):
                asyncio.run(action(SimpleNamespace()))


class WiringTests(unittest.TestCase):
    def test_listener_is_set_up_refreshed_on_options_change_and_removed_on_unload(self) -> None:
        source = (COMPONENT_ROOT / "__init__.py").read_text(encoding="utf-8")
        setup = source[source.index("_register_notification_timer(hass, entry, runtime)\n    _register_basal"):]
        self.assertIn("_register_basal_temp_listener(hass, entry, runtime)", setup[:200])
        options = source[source.index("async def _async_options_update_listener"):][:900]
        self.assertIn("_register_basal_temp_listener(hass, entry, _updated_runtime)", options)
        unload = source[source.index("async def async_unload_entry"):][:1400]
        self.assertIn("runtime.unregister_basal_temp_listener()", unload)


if __name__ == "__main__":
    unittest.main()
