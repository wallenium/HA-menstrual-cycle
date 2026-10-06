"""icons.json must cover every service and cycle state, and the main sensor must point at its icon entry."""

from __future__ import annotations

import ast
import json
import re
import unittest
from pathlib import Path

COMPONENT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
ICONS = json.loads((COMPONENT / "icons.json").read_text(encoding="utf-8"))


def _all_icons() -> list[str]:
    sensor = ICONS["entity"]["sensor"]["cycle_status"]
    return [sensor["default"], *sensor["state"].values(), *(v["service"] for v in ICONS["services"].values())]


class IconsTests(unittest.TestCase):
    def test_every_service_has_an_icon_and_no_stale_ones(self) -> None:
        services = set(re.findall(r"^([a-z_]+):\s*$", (COMPONENT / "services.yaml").read_text(encoding="utf-8"), re.M))
        self.assertGreater(len(services), 30)
        self.assertEqual(set(ICONS["services"]), services)

    def test_every_cycle_state_has_an_icon(self) -> None:
        tree = ast.parse((COMPONENT / "const.py").read_text(encoding="utf-8"))
        states = {
            node.value.value
            for node in tree.body
            if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name)
            and re.fullmatch(r"STATE_[A-Z_]+", node.targets[0].id) and isinstance(node.value, ast.Constant)
        }
        self.assertEqual(set(ICONS["entity"]["sensor"]["cycle_status"]["state"]), states)

    def test_main_sensor_uses_the_icon_entry(self) -> None:
        source = (COMPONENT / "sensor.py").read_text(encoding="utf-8")
        self.assertRegex(source, r'def translation_key\(self\)[^\n]*\n(?:[^\n]*\n)*?\s+return "cycle_status"')

    def test_icon_names_look_valid(self) -> None:
        for icon in _all_icons():
            self.assertRegex(icon, r"^mdi:[a-z0-9]+(-[a-z0-9]+)*$")


if __name__ == "__main__":
    unittest.main()
