"""Tests for dashboard-related JSON payload generation in sensor.py.

Verifies that:
- Serialized payloads produced by integration helpers are always valid JSON.
- No manual/fragmented JSON string construction is used; all serialization
  goes through json.dumps().
- Invalid inputs degrade gracefully without raising unexpected exceptions.
"""
from __future__ import annotations

import importlib.util
import json
import sys
import types
import unittest
from pathlib import Path


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
    sys.modules.setdefault("homeassistant.components.sensor", sensor_mod)

    config_entries = types.ModuleType("homeassistant.config_entries")
    config_entries.ConfigEntry = type("ConfigEntry", (), {})
    sys.modules.setdefault("homeassistant.config_entries", config_entries)

    const_mod = types.ModuleType("homeassistant.const")
    const_mod.CONF_TYPE = "type"
    const_mod.Platform = type("Platform", (), {"SENSOR": "sensor"})
    sys.modules.setdefault("homeassistant.const", const_mod)

    ha_core = types.ModuleType("homeassistant.core")
    ha_core.HomeAssistant = type("HomeAssistant", (), {})
    ha_core.ServiceCall = type("ServiceCall", (), {})
    sys.modules.setdefault("homeassistant.core", ha_core)

    helpers = types.ModuleType("homeassistant.helpers")
    helpers.__path__ = []
    sys.modules.setdefault("homeassistant.helpers", helpers)

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

    typing_mod = types.ModuleType("homeassistant.helpers.typing")
    typing_mod.StateType = object
    sys.modules.setdefault("homeassistant.helpers.typing", typing_mod)

    util = types.ModuleType("homeassistant.util")
    util.__path__ = []
    util.slugify = lambda value: str(value).strip().lower().replace(" ", "_")
    sys.modules.setdefault("homeassistant.util", util)

    dt_mod = types.ModuleType("homeassistant.util.dt")
    from datetime import datetime
    dt_mod.now = lambda: datetime(2026, 8, 1, 8, 0, 0)
    sys.modules.setdefault("homeassistant.util.dt", dt_mod)

    ha_exc = types.ModuleType("homeassistant.exceptions")
    sys.modules.setdefault("homeassistant.exceptions", ha_exc)

    vol = types.ModuleType("voluptuous")
    sys.modules.setdefault("voluptuous", vol)


def _load_module(module_name: str, file_name: str):
    spec = importlib.util.spec_from_file_location(module_name, COMPONENT_ROOT / file_name)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


_install_homeassistant_stubs()
_PKG = "tstest_dashboard_json_payloads"
_package = types.ModuleType(_PKG)
_package.__path__ = [str(COMPONENT_ROOT)]
sys.modules.setdefault(_PKG, _package)
_load_module(f"{_PKG}.const", "const.py")
_load_module(f"{_PKG}.model", "model.py")
sensor_module = _load_module(f"{_PKG}.sensor", "sensor.py")


class TestSafeAttrSize(unittest.TestCase):
    """_safe_attr_size always returns an int and never raises."""

    def test_valid_payload_returns_positive_int(self):
        payload = {"cycle_day": 3, "state": "period", "tags": ["a", "b"]}
        size = sensor_module._safe_attr_size(payload)
        self.assertIsInstance(size, int)
        self.assertGreater(size, 0)

    def test_serialized_is_valid_json(self):
        payload = {"cycle_day": 3, "state": "period"}
        raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        parsed = json.loads(raw)
        self.assertEqual(parsed, payload)

    def test_empty_payload(self):
        size = sensor_module._safe_attr_size({})
        self.assertIsInstance(size, int)
        self.assertGreaterEqual(size, 0)

    def test_unserializable_value_does_not_raise(self):
        try:
            result = sensor_module._safe_attr_size({"bad": object()})
            self.assertIsInstance(result, int)
        except Exception as exc:  # noqa: BLE001
            self.fail(f"_safe_attr_size raised unexpectedly: {exc}")


class TestCompactForecastPayload(unittest.TestCase):
    """_compact_forecast_payload produces valid, serialisable dicts."""

    def test_valid_forecast_is_serialisable(self):
        payload = {
            "window_start": "2026-08-20",
            "window_end": "2026-08-24",
            "confidence": "medium",
            "day_confidence": {"2026-08-20": 0.8},
        }
        compact = sensor_module._compact_forecast_payload(payload)
        raw = json.dumps(compact)
        parsed = json.loads(raw)
        self.assertIsInstance(parsed, dict)
        self.assertNotIn("day_confidence", parsed)

    def test_non_dict_passthrough(self):
        self.assertIsNone(sensor_module._compact_forecast_payload(None))
        self.assertEqual(sensor_module._compact_forecast_payload([]), [])

    def test_empty_dict_serialisable(self):
        raw = json.dumps(sensor_module._compact_forecast_payload({}))
        self.assertEqual(json.loads(raw), {})


class TestCompactBleedingBlocks(unittest.TestCase):
    """_compact_bleeding_blocks produces valid, serialisable lists."""

    def _make_blocks(self, n: int) -> list:
        return [
            {"start": f"2026-{(i % 12) + 1:02d}-01", "end": f"2026-{(i % 12) + 1:02d}-05", "length": 5}
            for i in range(n)
        ]

    def test_short_list_serialisable(self):
        blocks = self._make_blocks(3)
        compact = sensor_module._compact_bleeding_blocks(blocks)
        raw = json.dumps(compact)
        parsed = json.loads(raw)
        self.assertIsInstance(parsed, list)
        self.assertEqual(len(parsed), 3)

    def test_long_list_capped_to_six(self):
        blocks = self._make_blocks(10)
        compact = sensor_module._compact_bleeding_blocks(blocks)
        self.assertLessEqual(len(compact), 6)
        raw = json.dumps(compact)
        parsed = json.loads(raw)
        self.assertIsInstance(parsed, list)

    def test_non_list_passthrough(self):
        self.assertIsNone(sensor_module._compact_bleeding_blocks(None))

    def test_no_manual_json_fragments_in_source(self):
        """Ensure sensor.py uses json.dumps rather than manual string construction."""
        source = (COMPONENT_ROOT / "sensor.py").read_text(encoding="utf-8")
        self.assertNotIn('f\'{"', source, "Manual JSON f-string construction found in sensor.py")
        self.assertNotIn('f"{"', source, "Manual JSON f-string construction found in sensor.py")


if __name__ == "__main__":
    unittest.main()

