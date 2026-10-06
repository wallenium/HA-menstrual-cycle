"""The diagnostics download must not contain anything that identifies the person, their partner or their devices."""

from __future__ import annotations

import ast
import asyncio
import importlib.util
import json
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

COMPONENT_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
_PKG = "tstest_diagnostics"


def _redact(data, to_redact):
    return {key: "**REDACTED**" if key in to_redact else value for key, value in data.items()}


def _stubs() -> dict[str, types.ModuleType]:
    stubs = {}
    for name in ("homeassistant", "homeassistant.components", "homeassistant.components.diagnostics",
                 "homeassistant.config_entries", "homeassistant.core"):
        module = types.ModuleType(name)
        module.__path__ = []
        stubs[name] = module
    stubs["homeassistant.components.diagnostics"].async_redact_data = _redact
    stubs["homeassistant.config_entries"].ConfigEntry = type("ConfigEntry", (), {})
    stubs["homeassistant.core"].HomeAssistant = type("HomeAssistant", (), {})
    return stubs


def _load(module_name: str, file_name: str) -> types.ModuleType:
    spec = importlib.util.spec_from_file_location(f"{_PKG}.{module_name}", COMPONENT_ROOT / file_name)
    module = importlib.util.module_from_spec(spec)
    sys.modules[f"{_PKG}.{module_name}"] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


with patch.dict(sys.modules, _stubs()):
    _package = types.ModuleType(_PKG)
    _package.__path__ = [str(COMPONENT_ROOT)]
    sys.modules[_PKG] = _package
    const = _load("const", "const.py")
    diagnostics = _load("diagnostics", "diagnostics.py")


def _const_values() -> dict[str, str]:
    tree = ast.parse((COMPONENT_ROOT / "const.py").read_text(encoding="utf-8"))
    return {
        node.targets[0].id: node.value.value
        for node in tree.body
        if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name)
        and isinstance(node.value, ast.Constant) and isinstance(node.value.value, str)
    }


class DiagnosticsRedactionTests(unittest.TestCase):
    def test_personal_entry_values_are_not_in_the_download(self) -> None:
        personal = {
            "profile": "anna", "name": "Anna legacy", "friendly_name": "Anna", "icon": "mdi:flower",
            "birth_date": "1990-05-17", "notify_service": "notify.mobile_app_anna",
            "notify_partner_service": "notify.mobile_app_partner", "linked_person_entity_id": "person.anna",
            "basal_temp_sensor_entity_id": "sensor.anna_thermometer",
        }
        entry = types.SimpleNamespace(entry_id="e1", data={k: v for k, v in personal.items() if k in ("profile", "name", "friendly_name", "icon", "birth_date")},
                                      options={k: v for k, v in personal.items() if k not in ("profile", "name", "friendly_name", "icon", "birth_date")} | {"num_predictions": 3})
        hass = types.SimpleNamespace(data={})
        dump = json.dumps(asyncio.run(diagnostics.async_get_config_entry_diagnostics(hass, entry)))
        for key, value in personal.items():
            self.assertNotIn(value, dump, f"{key} leaks into the diagnostics download")
        self.assertIn('"num_predictions": 3', dump)  # plain settings stay visible

    def test_every_service_or_entity_option_is_redacted(self) -> None:
        keys = {value for name, value in _const_values().items()
                if name.startswith("CONF_") and ("service" in value or "entity_id" in value)}
        self.assertGreaterEqual(len(keys), 3)
        self.assertEqual(sorted(keys - diagnostics._REDACT_ENTRY_KEYS), [])


if __name__ == "__main__":
    unittest.main()
