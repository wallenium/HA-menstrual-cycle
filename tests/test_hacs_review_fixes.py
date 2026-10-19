"""Guards for the two blocking points of the HACS default review (hacs/default#9845):

1. the ICS feed URL (secret token) must not be published as a state attribute, and the
   feed is opt-in per profile and never served for private profiles;
2. no blocking file I/O on the event loop (diagnostics, HTTP file handlers, image entity).

Source-level checks: the integration modules cannot be imported without Home Assistant.
"""

from __future__ import annotations

import ast
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"


def _read(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def _function_source(source: str, name: str) -> str:
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return ast.get_source_segment(source, node) or ""
    raise AssertionError(f"{name} not found")


class IcsFeedExposure(unittest.TestCase):
    def test_sensor_does_not_publish_token_or_url(self) -> None:
        sensor = _read("sensor.py")
        self.assertNotIn("ics_token", sensor)
        self.assertNotIn("ics_url", sensor)
        self.assertNotIn("/ics/", sensor)

    def test_dashboard_panel_does_not_read_attribute(self) -> None:
        panel = (ROOT / "www" / "menstruation-cycle-dashboard-panel.js").read_text(encoding="utf-8")
        self.assertNotIn("attrs.ics_url", panel)
        self.assertIn("menstruation_cycle/ics_url", panel)

    def test_feed_route_checks_opt_in_before_building_anything(self) -> None:
        feed = _function_source(_read("__init__.py"), "_serve_ics_feed")
        self.assertIn("ics_feed_available(", feed)
        self.assertLess(feed.index("ics_feed_available("), feed.index("build_cycle_model"))

    def test_url_command_is_admin_only(self) -> None:
        reg = _function_source(_read("__init__.py"), "_async_register_websocket_commands")
        self.assertIn("websocket_api.require_admin", reg)
        self.assertIn("WS_TYPE_ICS_URL", reg)

    def test_rotate_command_is_admin_only_and_gated_by_the_feed(self) -> None:
        source = _read("__init__.py")
        reg = _function_source(source, "_async_register_websocket_commands")
        self.assertEqual(reg.count("websocket_api.require_admin"), 2)
        self.assertIn("WS_TYPE_ICS_ROTATE", reg)
        self.assertIn("ics_feed_available(", _function_source(source, "_async_rotate_ics_url_payload"))

    def test_url_payload_is_gated_by_the_same_helper(self) -> None:
        self.assertIn("ics_feed_available(", _function_source(_read("__init__.py"), "_ics_url_payload"))

    def test_option_defaults_to_off(self) -> None:
        const = _read("const.py")
        self.assertRegex(const, r"DEFAULT_ICS_FEED_ENABLED:\s*bool\s*=\s*False")
        self.assertIn('CONF_ICS_FEED_ENABLED = "ics_feed_enabled"', const)

    def test_option_is_not_copied_between_profiles(self) -> None:
        # "copy settings from" must not switch a public feed on for a new profile.
        flow = _read("config_flow.py")
        copy_keys = flow[flow.index("CONF_CHECKUP_INTERVAL_MONTHS,\n            CONF_CALENDAR_ENABLED") :][:600]
        self.assertNotIn("ICS_FEED", copy_keys)


class NoBlockingIoOnEventLoop(unittest.TestCase):
    def test_http_file_handlers_read_in_executor_without_is_file(self) -> None:
        source = _read("__init__.py")
        for name in ("_serve_card_file", "_serve_asset_file", "_serve_translation_file"):
            handler = _function_source(source, name)
            self.assertNotIn(".is_file()", handler, name)
            self.assertNotIn(".exists()", handler, name)
            self.assertRegex(handler, r"async_add_executor_job\(_read_(bytes_or_none|card_file)", name)

    def test_diagnostics_uses_resource_version_not_manifest_read(self) -> None:
        diag = _read("diagnostics.py")
        self.assertNotIn("_load_manifest_version()", diag)
        self.assertIn("RESOURCE_VERSION", diag)

    def test_image_entity_resolves_asset_in_executor(self) -> None:
        image = _read("image.py")
        update = _function_source(image, "async_update")
        self.assertNotIn("is_file", update)
        self.assertIn("async_add_executor_job(self._resolve_asset_path", update)

    def test_no_sync_path_checks_left_in_async_code(self) -> None:
        for name in ("__init__.py", "image.py", "diagnostics.py", "sensor.py", "calendar.py", "todo.py"):
            tree = ast.parse(_read(name))
            for node in ast.walk(tree):
                if isinstance(node, ast.AsyncFunctionDef):
                    body = ast.get_source_segment(_read(name), node) or ""
                    # allow inside nested sync helpers handed to the executor
                    stripped = re.sub(r"\n\s+def _\w+\([^)]*\)[^\n]*:\n(?:(?:\s{8,}.*)?\n)+", "\n", body)
                    for bad in (".is_file()", ".exists()", ".read_text(", ".read_bytes(", ".write_text(", ".mkdir(", ".resolve()", "open("):
                        self.assertNotIn(bad, stripped, f"{name}:{node.name}")


    def test_repairs_is_preloaded_not_imported_lazily_on_the_loop(self) -> None:
        self.assertRegex(_read("__init__.py"), r"(?m)^from \. import repairs as _repairs_preload")


if __name__ == "__main__":
    unittest.main()
