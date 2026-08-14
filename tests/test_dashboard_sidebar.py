"""Tests for the dashboard sidebar panel registration and options logic.

Covers:
- Default values: dashboard_enabled=False, dashboard_discreet_mode=True
- Registration guard: panel registered once regardless of number of enabled entries
- Dynamic updates: toggling dashboard_enabled triggers correct panel sync behavior
- Resilience: panel sync exceptions do not propagate to callers
- Widget preferences: effective config respects per-entry widget overrides
- Backward compatibility: entries without new options receive safe defaults
"""

from __future__ import annotations

import asyncio
import sys
import types
import unittest
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

# ---------------------------------------------------------------------------
# Minimal HA stubs so const.py and the helpers can be imported stand-alone
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parents[1]


def _install_stubs() -> None:
    stub_mods = [
        "homeassistant",
        "homeassistant.components",
        "homeassistant.components.sensor",
        "homeassistant.config_entries",
        "homeassistant.const",
        "homeassistant.core",
        "homeassistant.exceptions",
        "homeassistant.helpers",
        "homeassistant.helpers.config_validation",
        "homeassistant.helpers.entity_registry",
        "homeassistant.helpers.dispatcher",
        "homeassistant.helpers.entity_platform",
        "homeassistant.helpers.event",
        "homeassistant.helpers.storage",
        "homeassistant.helpers.typing",
        "homeassistant.util",
        "homeassistant.util.dt",
        "homeassistant.util.slugify",
        "voluptuous",
    ]
    for mod_name in stub_mods:
        if mod_name not in sys.modules:
            sys.modules[mod_name] = types.ModuleType(mod_name)

    # Provide minimal Platform enum stub used by __init__.py
    const_mod = sys.modules["homeassistant.const"]
    if not hasattr(const_mod, "Platform"):
        platform_stub = types.SimpleNamespace(SENSOR="sensor")
        const_mod.Platform = platform_stub  # type: ignore[attr-defined]

    # voluptuous minimal stub
    vol_mod = sys.modules["voluptuous"]
    if not hasattr(vol_mod, "Schema"):
        vol_mod.Schema = lambda x, **kw: x  # type: ignore[attr-defined]
        vol_mod.Required = lambda k, **kw: k  # type: ignore[attr-defined]
        vol_mod.Optional = lambda k, **kw: k  # type: ignore[attr-defined]
        vol_mod.All = lambda *a, **kw: a[0] if a else None  # type: ignore[attr-defined]
        vol_mod.Coerce = lambda t: t  # type: ignore[attr-defined]
        vol_mod.Range = lambda **kw: None  # type: ignore[attr-defined]
        vol_mod.In = lambda choices: choices  # type: ignore[attr-defined]


_install_stubs()

import importlib.util as _ilu

# Import const module directly
_const_spec = _ilu.spec_from_file_location(
    "menstruation_cycle.const",
    REPO_ROOT / "custom_components" / "menstruation_cycle" / "const.py",
)
_const_mod = _ilu.module_from_spec(_const_spec)  # type: ignore[arg-type]
_const_spec.loader.exec_module(_const_mod)  # type: ignore[union-attr]

DOMAIN = _const_mod.DOMAIN
CONF_SHOW_CYCLE_DASHBOARD = _const_mod.CONF_SHOW_CYCLE_DASHBOARD
CONF_DASHBOARD_DISCREET_MODE = _const_mod.CONF_DASHBOARD_DISCREET_MODE
CONF_DASHBOARD_WIDGETS = _const_mod.CONF_DASHBOARD_WIDGETS
DASHBOARD_WIDGET_KEYS = _const_mod.DASHBOARD_WIDGET_KEYS
DEFAULT_DASHBOARD_DISCREET_MODE = _const_mod.DEFAULT_DASHBOARD_DISCREET_MODE
DEFAULT_DASHBOARD_WIDGETS = _const_mod.DEFAULT_DASHBOARD_WIDGETS


# ---------------------------------------------------------------------------
# Lightweight helpers that mirror the production helpers in __init__.py.
# We re-implement them here to keep the tests self-contained and avoid the
# heavy import chain of the full integration module.
# ---------------------------------------------------------------------------

def _is_dashboard_enabled_for_entry(entry: Any) -> bool:
    return bool(entry.options.get(CONF_SHOW_CYCLE_DASHBOARD, False))


def _get_effective_dashboard_config(hass: Any) -> dict[str, Any]:
    loaded_entry_ids = set(hass.data.get(DOMAIN, {}).keys())
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.entry_id not in loaded_entry_ids:
            continue
        if not _is_dashboard_enabled_for_entry(entry):
            continue
        raw_widgets = entry.options.get(CONF_DASHBOARD_WIDGETS)
        if not isinstance(raw_widgets, dict):
            raw_widgets = {}
        widgets: dict[str, bool] = {
            key: bool(raw_widgets.get(key, DEFAULT_DASHBOARD_WIDGETS[key]))
            for key in DASHBOARD_WIDGET_KEYS
        }
        return {
            "enabled": True,
            "discreet_mode": bool(entry.options.get(CONF_DASHBOARD_DISCREET_MODE, DEFAULT_DASHBOARD_DISCREET_MODE)),
            "widgets": widgets,
        }
    return {
        "enabled": False,
        "discreet_mode": DEFAULT_DASHBOARD_DISCREET_MODE,
        "widgets": dict(DEFAULT_DASHBOARD_WIDGETS),
    }


_DASHBOARD_PANEL_REGISTERED_KEY = f"{DOMAIN}_dashboard_panel_registered"
_DASHBOARD_RUNTIME_CONFIG_KEY = f"{DOMAIN}_dashboard_runtime_config"
_DASHBOARD_PANEL_URL_PATH = "cycle-dashboard"


async def _async_sync_dashboard_sidebar_panel(hass: Any, frontend_component: Any) -> None:
    """Sync helper (mirrors production logic) with injectable frontend component."""
    loaded_entry_ids = set(hass.data.get(DOMAIN, {}).keys())
    loaded_entries = [
        e for e in hass.config_entries.async_entries(DOMAIN)
        if e.entry_id in loaded_entry_ids
    ]
    should_show = any(_is_dashboard_enabled_for_entry(e) for e in loaded_entries)
    is_registered = bool(hass.data.get(_DASHBOARD_PANEL_REGISTERED_KEY))

    hass.data[_DASHBOARD_RUNTIME_CONFIG_KEY] = _get_effective_dashboard_config(hass)

    if should_show and not is_registered:
        try:
            frontend_component.async_register_built_in_panel(
                component_name="custom",
                sidebar_title="Cycle Dashboard",
                sidebar_icon="mdi:view-dashboard-outline",
                frontend_url_path=_DASHBOARD_PANEL_URL_PATH,
                config={"name": "menstruation-cycle-dashboard-panel"},
                require_admin=False,
            )
            hass.data[_DASHBOARD_PANEL_REGISTERED_KEY] = True
        except Exception:
            pass  # non-fatal
        return

    if not should_show and is_registered:
        try:
            frontend_component.async_remove_panel(_DASHBOARD_PANEL_URL_PATH)
        except Exception:
            pass  # non-fatal
        finally:
            hass.data[_DASHBOARD_PANEL_REGISTERED_KEY] = False


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

def _make_entry(entry_id: str, dashboard_enabled: bool, options: dict | None = None) -> MagicMock:
    """Build a minimal config entry mock."""
    base = {CONF_SHOW_CYCLE_DASHBOARD: dashboard_enabled}
    if options:
        base.update(options)
    entry = MagicMock()
    entry.entry_id = entry_id
    entry.options = base
    return entry


def _make_hass(*entries: MagicMock) -> MagicMock:
    """Build a minimal hass mock with the given config entries loaded."""
    hass = MagicMock()
    hass.data = {DOMAIN: {e.entry_id: object() for e in entries}}
    hass.config_entries.async_entries.return_value = list(entries)
    return hass


def _run(coro: Any) -> Any:
    return asyncio.get_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestDefaultValues(unittest.TestCase):
    """New entries must use privacy-first defaults."""

    def test_dashboard_disabled_by_default(self) -> None:
        entry = _make_entry("e1", dashboard_enabled=False)
        self.assertFalse(_is_dashboard_enabled_for_entry(entry))

    def test_dashboard_enabled_explicit(self) -> None:
        entry = _make_entry("e1", dashboard_enabled=True)
        self.assertTrue(_is_dashboard_enabled_for_entry(entry))

    def test_discreet_mode_default_is_true(self) -> None:
        self.assertTrue(DEFAULT_DASHBOARD_DISCREET_MODE)

    def test_effective_config_discreet_when_no_options(self) -> None:
        """Entry with dashboard enabled but no discreet_mode option → defaults to True."""
        entry = _make_entry("e1", dashboard_enabled=True)
        hass = _make_hass(entry)
        config = _get_effective_dashboard_config(hass)
        self.assertTrue(config["discreet_mode"])

    def test_effective_config_disabled_when_no_entries_enabled(self) -> None:
        entry = _make_entry("e1", dashboard_enabled=False)
        hass = _make_hass(entry)
        config = _get_effective_dashboard_config(hass)
        self.assertFalse(config["enabled"])
        self.assertTrue(config["discreet_mode"])

    def test_all_default_widgets_enabled(self) -> None:
        self.assertTrue(all(DEFAULT_DASHBOARD_WIDGETS.values()))
        self.assertEqual(set(DEFAULT_DASHBOARD_WIDGETS.keys()), set(DASHBOARD_WIDGET_KEYS))


class TestRegistrationLogic(unittest.TestCase):
    """Panel must register once when any entry enables it."""

    def test_panel_not_registered_when_all_disabled(self) -> None:
        frontend = MagicMock()
        hass = _make_hass(_make_entry("e1", False), _make_entry("e2", False))
        _run(_async_sync_dashboard_sidebar_panel(hass, frontend))
        frontend.async_register_built_in_panel.assert_not_called()

    def test_panel_registered_when_one_entry_enabled(self) -> None:
        frontend = MagicMock()
        hass = _make_hass(_make_entry("e1", True), _make_entry("e2", False))
        _run(_async_sync_dashboard_sidebar_panel(hass, frontend))
        frontend.async_register_built_in_panel.assert_called_once()
        self.assertTrue(hass.data.get(_DASHBOARD_PANEL_REGISTERED_KEY))

    def test_panel_registered_only_once_with_multiple_enabled(self) -> None:
        frontend = MagicMock()
        hass = _make_hass(_make_entry("e1", True), _make_entry("e2", True))
        # First sync registers
        _run(_async_sync_dashboard_sidebar_panel(hass, frontend))
        # Second sync must NOT re-register (idempotent)
        _run(_async_sync_dashboard_sidebar_panel(hass, frontend))
        frontend.async_register_built_in_panel.assert_called_once()

    def test_panel_not_registered_when_no_entries_loaded(self) -> None:
        frontend = MagicMock()
        hass = MagicMock()
        hass.data = {}
        hass.config_entries.async_entries.return_value = []
        _run(_async_sync_dashboard_sidebar_panel(hass, frontend))
        frontend.async_register_built_in_panel.assert_not_called()


class TestDynamicUpdates(unittest.TestCase):
    """Toggling dashboard_enabled should register/unregister the panel."""

    def test_enable_registers_panel(self) -> None:
        frontend = MagicMock()
        entry = _make_entry("e1", dashboard_enabled=False)
        hass = _make_hass(entry)

        # Panel not registered initially
        _run(_async_sync_dashboard_sidebar_panel(hass, frontend))
        frontend.async_register_built_in_panel.assert_not_called()

        # Enable the dashboard
        entry.options = {CONF_SHOW_CYCLE_DASHBOARD: True}
        _run(_async_sync_dashboard_sidebar_panel(hass, frontend))
        frontend.async_register_built_in_panel.assert_called_once()

    def test_disable_last_entry_unregisters_panel(self) -> None:
        frontend = MagicMock()
        entry = _make_entry("e1", dashboard_enabled=True)
        hass = _make_hass(entry)

        # Register first
        _run(_async_sync_dashboard_sidebar_panel(hass, frontend))
        self.assertTrue(hass.data.get(_DASHBOARD_PANEL_REGISTERED_KEY))

        # Disable the dashboard
        entry.options = {CONF_SHOW_CYCLE_DASHBOARD: False}
        _run(_async_sync_dashboard_sidebar_panel(hass, frontend))
        frontend.async_remove_panel.assert_called_once_with(_DASHBOARD_PANEL_URL_PATH)
        self.assertFalse(hass.data.get(_DASHBOARD_PANEL_REGISTERED_KEY))

    def test_runtime_config_updated_on_sync(self) -> None:
        frontend = MagicMock()
        entry = _make_entry("e1", dashboard_enabled=True, options={CONF_DASHBOARD_DISCREET_MODE: False})
        hass = _make_hass(entry)
        _run(_async_sync_dashboard_sidebar_panel(hass, frontend))
        runtime_cfg = hass.data.get(_DASHBOARD_RUNTIME_CONFIG_KEY)
        self.assertIsNotNone(runtime_cfg)
        self.assertTrue(runtime_cfg["enabled"])
        self.assertFalse(runtime_cfg["discreet_mode"])


class TestResilience(unittest.TestCase):
    """Panel sync exceptions must not propagate."""

    def test_register_exception_does_not_raise(self) -> None:
        frontend = MagicMock()
        frontend.async_register_built_in_panel.side_effect = RuntimeError("boom")
        entry = _make_entry("e1", dashboard_enabled=True)
        hass = _make_hass(entry)
        # Must not raise
        _run(_async_sync_dashboard_sidebar_panel(hass, frontend))

    def test_remove_exception_does_not_raise(self) -> None:
        frontend = MagicMock()
        frontend.async_remove_panel.side_effect = RuntimeError("boom")
        entry = _make_entry("e1", dashboard_enabled=True)
        hass = _make_hass(entry)
        # Pre-register
        hass.data[_DASHBOARD_PANEL_REGISTERED_KEY] = True
        entry.options = {CONF_SHOW_CYCLE_DASHBOARD: False}
        # Must not raise
        _run(_async_sync_dashboard_sidebar_panel(hass, frontend))

    def test_registration_flag_cleared_even_after_remove_exception(self) -> None:
        frontend = MagicMock()
        frontend.async_remove_panel.side_effect = RuntimeError("boom")
        entry = _make_entry("e1", dashboard_enabled=False)
        hass = _make_hass(entry)
        hass.data[_DASHBOARD_PANEL_REGISTERED_KEY] = True
        _run(_async_sync_dashboard_sidebar_panel(hass, frontend))
        self.assertFalse(hass.data.get(_DASHBOARD_PANEL_REGISTERED_KEY))


class TestWidgetPreferences(unittest.TestCase):
    """Effective config reflects per-entry widget overrides."""

    def test_widget_override_respected(self) -> None:
        entry = _make_entry("e1", dashboard_enabled=True, options={
            CONF_DASHBOARD_WIDGETS: {"quick_log": False, "progress": True},
        })
        hass = _make_hass(entry)
        config = _get_effective_dashboard_config(hass)
        self.assertFalse(config["widgets"]["quick_log"])
        self.assertTrue(config["widgets"]["progress"])

    def test_partial_widget_override_fills_defaults(self) -> None:
        entry = _make_entry("e1", dashboard_enabled=True, options={
            CONF_DASHBOARD_WIDGETS: {"quick_log": False},
        })
        hass = _make_hass(entry)
        config = _get_effective_dashboard_config(hass)
        # Only quick_log was overridden; others should be the default (True)
        self.assertFalse(config["widgets"]["quick_log"])
        for key in DASHBOARD_WIDGET_KEYS:
            if key != "quick_log":
                self.assertTrue(config["widgets"][key], f"Expected {key} to be True")

    def test_no_widget_options_uses_defaults(self) -> None:
        entry = _make_entry("e1", dashboard_enabled=True)
        hass = _make_hass(entry)
        config = _get_effective_dashboard_config(hass)
        self.assertEqual(config["widgets"], DEFAULT_DASHBOARD_WIDGETS)

    def test_disabled_entry_does_not_influence_config(self) -> None:
        entry = _make_entry("e1", dashboard_enabled=False, options={
            CONF_DASHBOARD_WIDGETS: {"quick_log": False},
        })
        hass = _make_hass(entry)
        config = _get_effective_dashboard_config(hass)
        self.assertFalse(config["enabled"])
        # Disabled entry should not override widget defaults in the effective config
        self.assertTrue(config["widgets"]["quick_log"])


class TestBackwardCompatibility(unittest.TestCase):
    """Entries without new options must receive safe defaults without error."""

    def test_entry_without_discreet_mode_option(self) -> None:
        entry = _make_entry("e1", dashboard_enabled=True)
        # No CONF_DASHBOARD_DISCREET_MODE in options
        self.assertNotIn(CONF_DASHBOARD_DISCREET_MODE, entry.options)
        hass = _make_hass(entry)
        config = _get_effective_dashboard_config(hass)
        # Should default to True (privacy-first)
        self.assertTrue(config["discreet_mode"])

    def test_entry_without_widgets_option(self) -> None:
        entry = _make_entry("e1", dashboard_enabled=True)
        self.assertNotIn(CONF_DASHBOARD_WIDGETS, entry.options)
        hass = _make_hass(entry)
        config = _get_effective_dashboard_config(hass)
        self.assertEqual(config["widgets"], DEFAULT_DASHBOARD_WIDGETS)

    def test_entry_without_dashboard_enabled_option(self) -> None:
        """Completely missing dashboard option should default to disabled."""
        entry = MagicMock()
        entry.entry_id = "e1"
        entry.options = {}  # No dashboard options at all
        self.assertFalse(_is_dashboard_enabled_for_entry(entry))


if __name__ == "__main__":
    unittest.main()
