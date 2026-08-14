"""Tests for compact sensor attributes to keep Recorder payload small."""
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

    core = types.ModuleType("homeassistant.core")
    core.HomeAssistant = type("HomeAssistant", (), {})
    core.ServiceCall = type("ServiceCall", (), {})
    sys.modules.setdefault("homeassistant.core", core)

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


def _load_module(module_name: str, file_name: str):
    spec = importlib.util.spec_from_file_location(module_name, COMPONENT_ROOT / file_name)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


_install_homeassistant_stubs()
_pkg = "tstest_compact_attrs"
package = types.ModuleType(_pkg)
package.__path__ = [str(COMPONENT_ROOT)]
sys.modules.setdefault(_pkg, package)
const = _load_module(f"{_pkg}.const", "const.py")
_load_module(f"{_pkg}.model", "model.py")
sensor_module = _load_module(f"{_pkg}.sensor", "sensor.py")


class TestSensorAttributeCompaction(unittest.TestCase):
    """Validate compact attribute shaping and size guardrails."""

    def _base_attrs(self) -> dict[str, object]:
        return {
            const.ATTR_HISTORY: ["2026-07-01", "2026-07-02", "2026-07-03"],
            const.ATTR_GROUPED_STARTS: ["2026-06-01", "2026-07-01"],
            const.ATTR_NEXT_PREDICTED_START: "2026-08-01",
            const.ATTR_PREDICTED_CYCLE_STARTS: ["2026-08-01", "2026-08-29", "2026-09-26"],
            "cycle_day": 14,
            "profile": "Sarah",
            const.ATTR_FERTILE_WINDOW_START: "2026-07-12",
            const.ATTR_FERTILE_WINDOW_END: "2026-07-18",
            const.ATTR_OVULATION_DAY: "2026-07-16",
            const.ATTR_DAYS_UNTIL_NEXT_START: 8,
            const.ATTR_PERIOD_FORECAST: {
                "predicted_start": "2026-08-01",
                "predicted_end": "2026-08-05",
            },
            const.ATTR_FERTILITY_FORECAST: {
                "fertile_window_start": "2026-07-12",
                "fertile_window_end": "2026-07-18",
            },
        }

    def test_drops_verbose_fields(self) -> None:
        attrs = self._base_attrs()
        attrs[const.ATTR_PREDICTION_DAY_CONFIDENCE] = {"by_day": {"2026-08-01": {"period": {"level": "high"}}}}
        attrs["menarche_data"] = {"free_text": "x" * 500}
        attrs["noncycle_data"] = {"debug_dump": "x" * 500}
        compact = sensor_module._build_compact_sensor_attributes(attrs)
        self.assertNotIn(const.ATTR_PREDICTION_DAY_CONFIDENCE, compact)
        self.assertNotIn("menarche_data", compact)
        self.assertNotIn("noncycle_data", compact)

    def test_bounds_lists_and_truncates_strings(self) -> None:
        attrs = self._base_attrs()
        attrs["product_usage_timeline"] = [
            {"date": f"2026-07-{(idx % 30) + 1:02d}", "product": "pad", "quantity": 1, "note": "y" * 80}
            for idx in range(45)
        ]
        attrs[const.ATTR_SYMPTOM_HISTORY] = [
            {
                "date": f"2026-07-{(idx % 30) + 1:02d}",
                "symptom_data": {"note": "z" * 20},
                "bleeding_strength": "medium",
                "intercourse": "yes",
                "basal_temp": 36.7,
                "other": "should_drop",
            }
            for idx in range(35)
        ]
        attrs[const.ATTR_PERIOD_FORECAST] = {
            "predicted_start": "2026-08-01",
            "predicted_end": "2026-08-05",
            "day_confidence": {"2026-08-01": {"period": {"level": "high"}}},
        }
        attrs["status_message"] = "a" * 500
        compact = sensor_module._build_compact_sensor_attributes(attrs)

        self.assertIn("product_usage_timeline", compact)
        self.assertIn(const.ATTR_SYMPTOM_HISTORY, compact)
        self.assertLessEqual(len(compact["product_usage_timeline"]), 30)
        self.assertLessEqual(len(compact[const.ATTR_SYMPTOM_HISTORY]), 30)
        self.assertNotIn("day_confidence", compact[const.ATTR_PERIOD_FORECAST])
        self.assertLessEqual(len(compact["status_message"]), 181)
        first_timeline = compact["product_usage_timeline"][0]
        self.assertEqual(set(first_timeline.keys()), {"date", "product", "quantity"})

    def test_keeps_critical_compact_attributes(self) -> None:
        compact = sensor_module._build_compact_sensor_attributes(self._base_attrs())
        self.assertIn("cycle_day", compact)
        self.assertIn(const.ATTR_FERTILE_WINDOW_START, compact)
        self.assertIn(const.ATTR_FERTILE_WINDOW_END, compact)
        self.assertIn(const.ATTR_NEXT_PREDICTED_START, compact)
        self.assertIn("profile", compact)

    def test_payload_is_json_serializable_and_below_size_target(self) -> None:
        attrs = self._base_attrs()
        attrs[const.ATTR_HISTORY] = [f"2025-01-{(idx % 28) + 1:02d}" for idx in range(1200)]
        attrs[const.ATTR_SYMPTOM_HISTORY] = [
            {
                "date": f"2026-07-{(idx % 30) + 1:02d}",
                "symptom_data": {"note": "n" * 1000, "mood": "ok"},
                "bleeding_strength": "light",
            }
            for idx in range(600)
        ]
        attrs["product_usage_timeline"] = [
            {"date": f"2026-07-{(idx % 30) + 1:02d}", "product": "tampon", "quantity": 1}
            for idx in range(600)
        ]

        compact = sensor_module._build_compact_sensor_attributes(attrs)
        payload = json.dumps(compact, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.assertLess(len(payload), 8 * 1024)


if __name__ == "__main__":
    unittest.main()
