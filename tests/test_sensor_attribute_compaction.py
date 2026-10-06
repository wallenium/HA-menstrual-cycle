"""Tests for compact sensor attributes to keep Recorder payload small."""
from __future__ import annotations

import importlib.util
import json
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch


REPO_ROOT = Path(__file__).resolve().parents[1]
COMPONENT_ROOT = REPO_ROOT / "custom_components" / "menstruation_cycle"


class _Anything(type):
    """Metaclass so enum-like stubs (SensorDeviceClass.DATE etc.) resolve any attribute."""

    def __getattr__(cls, name):
        return name


def _stub_module(name: str, **attrs) -> types.ModuleType:
    """Module stub whose unknown attributes are empty placeholder classes."""
    module = types.ModuleType(name)
    module.__path__ = []
    module.__getattr__ = lambda attr: _Anything(attr, (), {})
    for key, value in attrs.items():
        setattr(module, key, value)
    return module


_HA_MODULES = (
    "homeassistant", "homeassistant.components", "homeassistant.components.sensor",
    "homeassistant.config_entries", "homeassistant.const", "homeassistant.core",
    "homeassistant.helpers", "homeassistant.helpers.device_registry",
    "homeassistant.helpers.dispatcher", "homeassistant.helpers.entity",
    "homeassistant.helpers.entity_platform", "homeassistant.helpers.event",
    "homeassistant.helpers.typing", "homeassistant.util", "homeassistant.util.dt",
)


def _ha_stubs() -> dict[str, types.ModuleType]:
    from datetime import datetime

    stubs = {name: _stub_module(name) for name in _HA_MODULES}
    stubs["homeassistant.helpers.dispatcher"].async_dispatcher_connect = lambda *a, **k: None
    stubs["homeassistant.helpers.dispatcher"].async_dispatcher_send = lambda *a, **k: None
    stubs["homeassistant.helpers.event"].async_track_time_change = lambda *a, **k: None
    stubs["homeassistant.util"].slugify = lambda value: str(value).strip().lower().replace(" ", "_")
    stubs["homeassistant.util"].dt = stubs["homeassistant.util.dt"]
    stubs["homeassistant.util.dt"].now = lambda: datetime(2026, 8, 1, 8, 0, 0)
    return stubs


def _load_module(module_name: str, file_name: str):
    spec = importlib.util.spec_from_file_location(module_name, COMPONENT_ROOT / file_name)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


_pkg = "tstest_compact_attrs"
package = types.ModuleType(_pkg)
package.__path__ = [str(COMPONENT_ROOT)]
sys.modules[_pkg] = package
# stubs are active only while loading, so other test modules keep their own
with patch.dict(sys.modules, _ha_stubs()):
    const = _load_module(f"{_pkg}.const", "const.py")
    _load_module(f"{_pkg}.model", "model.py")
    _load_module(f"{_pkg}.badges", "badges.py")
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
