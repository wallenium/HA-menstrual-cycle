"""Tests for thread-safe state scheduling in sensor runtime update callbacks."""
from __future__ import annotations

import importlib.util
import sys
import threading
import types
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch


REPO_ROOT = Path(__file__).resolve().parents[1]
COMPONENT_ROOT = REPO_ROOT / "custom_components" / "menstruation_cycle"


def _install_homeassistant_stubs() -> None:
    homeassistant = types.ModuleType("homeassistant")
    homeassistant.__path__ = []
    sys.modules.setdefault("homeassistant", homeassistant)

    components = types.ModuleType("homeassistant.components")
    components.__path__ = []
    sys.modules.setdefault("homeassistant.components", components)

    sensor_mod = types.ModuleType("homeassistant.components.sensor")
    sensor_mod.SensorEntity = type("SensorEntity", (), {})
    sensor_mod.SensorDeviceClass = type("SensorDeviceClass", (), {"TEMPERATURE": "temperature", "DATE": "date", "DURATION": "duration"})
    sensor_mod.SensorStateClass = type("SensorStateClass", (), {"MEASUREMENT": "measurement"})
    sys.modules.setdefault("homeassistant.components.sensor", sensor_mod)

    config_entries = types.ModuleType("homeassistant.config_entries")
    config_entries.ConfigEntry = type("ConfigEntry", (), {})
    sys.modules.setdefault("homeassistant.config_entries", config_entries)

    const_mod = types.ModuleType("homeassistant.const")
    const_mod.CONF_TYPE = "type"
    const_mod.Platform = type("Platform", (), {"SENSOR": "sensor"})
    sys.modules.setdefault("homeassistant.const", const_mod)

    core = types.ModuleType("homeassistant.core")
    core.HomeAssistant = type("HomeAssistant", (), {})
    core.ServiceCall = type("ServiceCall", (), {})
    sys.modules.setdefault("homeassistant.core", core)

    exceptions = types.ModuleType("homeassistant.exceptions")
    exceptions.HomeAssistantError = type("HomeAssistantError", (Exception,), {})
    sys.modules.setdefault("homeassistant.exceptions", exceptions)

    helpers = types.ModuleType("homeassistant.helpers")
    helpers.__path__ = []
    sys.modules.setdefault("homeassistant.helpers", helpers)

    config_validation = types.ModuleType("homeassistant.helpers.config_validation")
    config_validation.config_entry_only_config_schema = lambda domain: domain
    config_validation.string = lambda value: value
    config_validation.entity_id = lambda value: value
    config_validation.boolean = lambda value: value
    sys.modules.setdefault("homeassistant.helpers.config_validation", config_validation)

    entity_registry = types.ModuleType("homeassistant.helpers.entity_registry")
    entity_registry.async_get = lambda hass: object()
    entity_registry.async_entries_for_config_entry = lambda registry, entry_id: []
    sys.modules.setdefault("homeassistant.helpers.entity_registry", entity_registry)

    dispatcher = types.ModuleType("homeassistant.helpers.dispatcher")
    dispatcher.async_dispatcher_connect = lambda *args, **kwargs: None
    dispatcher.async_dispatcher_send = lambda *args, **kwargs: None
    sys.modules.setdefault("homeassistant.helpers.dispatcher", dispatcher)

    entity_platform = types.ModuleType("homeassistant.helpers.entity_platform")
    entity_platform.AddEntitiesCallback = type("AddEntitiesCallback", (), {})
    sys.modules.setdefault("homeassistant.helpers.entity_platform", entity_platform)

    event = types.ModuleType("homeassistant.helpers.event")
    event.async_track_time_change = lambda *args, **kwargs: None
    sys.modules.setdefault("homeassistant.helpers.event", event)

    storage = types.ModuleType("homeassistant.helpers.storage")
    storage.Store = type("Store", (), {"__init__": lambda self, *args, **kwargs: None})
    sys.modules.setdefault("homeassistant.helpers.storage", storage)

    typing_mod = types.ModuleType("homeassistant.helpers.typing")
    typing_mod.StateType = object
    sys.modules.setdefault("homeassistant.helpers.typing", typing_mod)

    util = types.ModuleType("homeassistant.util")
    util.__path__ = []
    util.slugify = lambda value: str(value).strip().lower().replace(" ", "_")
    sys.modules.setdefault("homeassistant.util", util)

    dt_mod = types.ModuleType("homeassistant.util.dt")
    from datetime import datetime
    dt_mod.now = lambda: datetime(2026, 7, 20, 8, 0, 0)
    sys.modules.setdefault("homeassistant.util.dt", dt_mod)


def _load_module(module_name: str, file_name: str):
    spec = importlib.util.spec_from_file_location(module_name, COMPONENT_ROOT / file_name)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class _Placeholder(type):
    """Metaclass so enum-like stubs (SensorDeviceClass.DATE etc.) resolve any attribute."""

    def __getattr__(cls, name):
        return name


def _make_stubs_permissive() -> None:
    """Let sensor.py import newer HA names: unknown attributes become placeholder classes."""
    for name in ("homeassistant.helpers.device_registry", "homeassistant.helpers.entity"):
        sys.modules.setdefault(name, types.ModuleType(name))
    for name, module in list(sys.modules.items()):
        if name.startswith("homeassistant"):
            module.__getattr__ = lambda attr: _Placeholder(attr, (), {})


_install_homeassistant_stubs()
_make_stubs_permissive()
_pkg = "tstest"
package = types.ModuleType(_pkg)
package.__path__ = [str(COMPONENT_ROOT)]
sys.modules.setdefault(_pkg, package)
const = _load_module(f"{_pkg}.const", "const.py")
_load_module(f"{_pkg}.model", "model.py")
_load_module(f"{_pkg}.badges", "badges.py")
sensor_module = _load_module(f"{_pkg}.sensor", "sensor.py")


def _make_fake_hass(is_running: bool = True) -> types.SimpleNamespace:
    """Return a minimal fake hass object with a trackable loop mock."""
    loop = MagicMock()
    hass = types.SimpleNamespace(
        loop=loop,
        is_running=is_running,
        data={const.DOMAIN: {"entry-1": MagicMock()}},
    )
    return hass


def _make_gauge_sensor() -> sensor_module.MenstruationGaugeSensor:
    entry = types.SimpleNamespace(entry_id="entry-1")
    hass = _make_fake_hass()
    runtime_mock = MagicMock()
    runtime_mock.friendly_name = "Test"
    runtime_mock.icon = None
    hass.data[const.DOMAIN]["entry-1"] = runtime_mock
    entity = sensor_module.MenstruationGaugeSensor.__new__(sensor_module.MenstruationGaugeSensor)
    entity.hass = hass
    entity._entry = entry
    entity._attr_unique_id = "entry-1_menstruation"
    entity._attr_name = "Test"
    entity._state = "neutral"
    entity._attrs = {}
    entity._icon = None
    entity.async_schedule_update_ha_state = MagicMock()
    return entity


def _make_product_sensor() -> sensor_module.ProductUsageStatsConsolidatedSensor:
    entry = types.SimpleNamespace(entry_id="entry-1")
    hass = _make_fake_hass()
    entity = sensor_module.ProductUsageStatsConsolidatedSensor.__new__(
        sensor_module.ProductUsageStatsConsolidatedSensor
    )
    entity.hass = hass
    entity._entry = entry
    entity.async_schedule_update_ha_state = MagicMock()
    return entity


class TestSafeScheduleUpdate(unittest.TestCase):
    """Tests for _safe_schedule_update in both sensor classes."""

    def test_gauge_safe_schedule_uses_loop_call_soon_threadsafe(self) -> None:
        """_safe_schedule_update routes through loop.call_soon_threadsafe, not direct call."""
        entity = _make_gauge_sensor()
        entity._safe_schedule_update()
        entity.hass.loop.call_soon_threadsafe.assert_called_once()
        # Direct async_schedule_update_ha_state must NOT be called synchronously.
        entity.async_schedule_update_ha_state.assert_not_called()

    def test_product_safe_schedule_uses_loop_call_soon_threadsafe(self) -> None:
        """_safe_schedule_update routes through loop.call_soon_threadsafe, not direct call."""
        entity = _make_product_sensor()
        entity._safe_schedule_update()
        entity.hass.loop.call_soon_threadsafe.assert_called_once()
        entity.async_schedule_update_ha_state.assert_not_called()

    def test_gauge_safe_schedule_noop_when_hass_is_none(self) -> None:
        """No exception and no loop call when hass is None."""
        entity = _make_gauge_sensor()
        entity.hass = None
        # Must not raise.
        entity._safe_schedule_update()

    def test_product_safe_schedule_noop_when_hass_is_none(self) -> None:
        """No exception and no loop call when hass is None."""
        entity = _make_product_sensor()
        entity.hass = None
        entity._safe_schedule_update()

    def test_gauge_do_update_schedules_ha_state_when_running(self) -> None:
        """The inner _do_update callback calls async_schedule_update_ha_state when HA is running."""
        entity = _make_gauge_sensor()
        entity._safe_schedule_update()
        # Capture the callback that was passed to call_soon_threadsafe.
        callback = entity.hass.loop.call_soon_threadsafe.call_args[0][0]
        # Invoke it directly (simulates event-loop execution).
        callback()
        entity.async_schedule_update_ha_state.assert_called_once_with(True)

    def test_product_do_update_schedules_ha_state_when_running(self) -> None:
        """The inner _do_update callback calls async_schedule_update_ha_state when HA is running."""
        entity = _make_product_sensor()
        entity._safe_schedule_update()
        callback = entity.hass.loop.call_soon_threadsafe.call_args[0][0]
        callback()
        entity.async_schedule_update_ha_state.assert_called_once_with(True)

    def test_gauge_do_update_skips_when_hass_not_running(self) -> None:
        """Inner callback skips scheduling when HA is no longer running."""
        entity = _make_gauge_sensor()
        entity.hass.is_running = False
        entity._safe_schedule_update()
        callback = entity.hass.loop.call_soon_threadsafe.call_args[0][0]
        callback()
        entity.async_schedule_update_ha_state.assert_not_called()

    def test_product_do_update_skips_when_hass_not_running(self) -> None:
        """Inner callback skips scheduling when HA is no longer running."""
        entity = _make_product_sensor()
        entity.hass.is_running = False
        entity._safe_schedule_update()
        callback = entity.hass.loop.call_soon_threadsafe.call_args[0][0]
        callback()
        entity.async_schedule_update_ha_state.assert_not_called()


class TestHandleRuntimeUpdateUsesSafeSchedule(unittest.TestCase):
    """_handle_runtime_update and _handle_daily_refresh must use _safe_schedule_update."""

    def test_gauge_runtime_update_calls_safe_schedule(self) -> None:
        entity = _make_gauge_sensor()
        called = []
        entity._safe_schedule_update = lambda: called.append(True)
        entity._handle_runtime_update()
        self.assertEqual(called, [True])

    def test_gauge_daily_refresh_calls_safe_schedule(self) -> None:
        entity = _make_gauge_sensor()
        called = []
        entity._safe_schedule_update = lambda: called.append(True)
        entity._handle_daily_refresh(None)
        self.assertEqual(called, [True])

    def test_product_runtime_update_calls_safe_schedule(self) -> None:
        entity = _make_product_sensor()
        called = []
        entity._safe_schedule_update = lambda: called.append(True)
        entity._handle_runtime_update()
        self.assertEqual(called, [True])

    def test_product_daily_refresh_calls_safe_schedule(self) -> None:
        entity = _make_product_sensor()
        called = []
        entity._safe_schedule_update = lambda: called.append(True)
        entity._handle_daily_refresh(None)
        self.assertEqual(called, [True])

    def test_gauge_runtime_update_does_not_directly_call_async_schedule(self) -> None:
        """_handle_runtime_update must not call async_schedule_update_ha_state directly."""
        entity = _make_gauge_sensor()
        entity._handle_runtime_update()
        entity.async_schedule_update_ha_state.assert_not_called()

    def test_product_runtime_update_does_not_directly_call_async_schedule(self) -> None:
        """_handle_runtime_update must not call async_schedule_update_ha_state directly."""
        entity = _make_product_sensor()
        entity._handle_runtime_update()
        entity.async_schedule_update_ha_state.assert_not_called()


class TestBackgroundThreadSafety(unittest.TestCase):
    """Simulate callback from a background thread to verify no RuntimeError is raised."""

    def test_gauge_safe_schedule_from_background_thread(self) -> None:
        """No exception when _safe_schedule_update is invoked from a non-loop thread."""
        entity = _make_gauge_sensor()
        errors: list[Exception] = []

        def _run_from_thread() -> None:
            try:
                entity._safe_schedule_update()
            except Exception as exc:  # noqa: BLE001
                errors.append(exc)

        t = threading.Thread(target=_run_from_thread)
        t.start()
        t.join(timeout=2)
        self.assertFalse(errors, f"Unexpected exception from background thread: {errors}")
        entity.hass.loop.call_soon_threadsafe.assert_called_once()

    def test_product_safe_schedule_from_background_thread(self) -> None:
        """No exception when _safe_schedule_update is invoked from a non-loop thread."""
        entity = _make_product_sensor()
        errors: list[Exception] = []

        def _run_from_thread() -> None:
            try:
                entity._safe_schedule_update()
            except Exception as exc:  # noqa: BLE001
                errors.append(exc)

        t = threading.Thread(target=_run_from_thread)
        t.start()
        t.join(timeout=2)
        self.assertFalse(errors, f"Unexpected exception from background thread: {errors}")
        entity.hass.loop.call_soon_threadsafe.assert_called_once()


class TestCycleLengthSensor(unittest.TestCase):
    """The cycle-length measurement sensor: value, attributes, visibility and identity."""

    HISTORY = [
        f"{start[:8]}{int(start[8:]) + offset:02d}"
        for start in ("2026-05-01", "2026-05-29", "2026-06-26", "2026-07-25")
        for offset in range(3)
    ]

    def _sensor(self, history, visibility="full"):
        runtime = types.SimpleNamespace(
            friendly_name="Test", history=history, symptom_history=[], visibility_level=visibility
        )
        hass = _make_fake_hass()
        hass.data[const.DOMAIN]["entry-1"] = runtime
        entry = types.SimpleNamespace(entry_id="entry-1")
        return sensor_module.MenstruationCycleLengthSensor(hass, entry)

    def _update(self, sensor):
        import asyncio

        asyncio.run(sensor.async_update())
        return sensor

    def test_identity_and_measurement_setup(self) -> None:
        sensor = self._sensor(self.HISTORY)
        self.assertEqual(sensor._attr_unique_id, "entry-1_cycle_length")
        self.assertEqual(sensor._attr_suggested_object_id, "menstruation_test_cycle_length")
        self.assertEqual(sensor._attr_state_class, "measurement")
        self.assertEqual(sensor._attr_device_class, "duration")

    def test_value_is_the_last_completed_cycle_with_the_average_as_attribute(self) -> None:
        sensor = self._update(self._sensor(self.HISTORY))
        self.assertEqual(sensor._attr_native_value, 29)  # 2026-06-26 to 2026-07-25
        self.assertEqual(
            sensor._attr_extra_state_attributes,
            {"cycle_start": "2026-06-26", "cycle_end": "2026-07-24", "average_cycle_length": 28},
        )
        self.assertTrue(sensor.available)

    def test_unknown_until_two_cycle_starts_are_logged(self) -> None:
        sensor = self._update(self._sensor(["2026-07-25", "2026-07-26"]))
        self.assertIsNone(sensor._attr_native_value)
        self.assertEqual(sensor._attr_extra_state_attributes, {})

    def test_hidden_below_full_visibility(self) -> None:
        for level in ("status_only", "private"):
            sensor = self._update(self._sensor(self.HISTORY, level))
            self.assertIsNone(sensor._attr_native_value, level)
            self.assertFalse(sensor.available, level)

    def test_it_is_set_up_with_the_other_sensors(self) -> None:
        source = (COMPONENT_ROOT / "sensor.py").read_text(encoding="utf-8")
        self.assertIn("MenstruationCycleLengthSensor(hass, entry),", source)


if __name__ == "__main__":
    unittest.main()
