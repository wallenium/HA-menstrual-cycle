"""The shipped blueprints: well-formed header, own source_url, README import link, known events, declared inputs.

Plain text checks (no YAML parser): the CI test job installs nothing but aiohttp.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path
from urllib.parse import unquote

REPO_ROOT = Path(__file__).resolve().parents[1]
BLUEPRINTS = sorted((REPO_ROOT / "blueprints" / "automation" / "menstruation_cycle").glob("*.yaml"))
README = (REPO_ROOT / "README.md").read_text(encoding="utf-8")
CONST = (REPO_ROOT / "custom_components" / "menstruation_cycle" / "const.py").read_text(encoding="utf-8")
EVENTS = {"menstruation_cycle_" + name for name in re.findall(r'^EVENT_\w+ = f"\{DOMAIN\}_(\w+)"', CONST, re.M)}
IMPORT_LINKS = re.findall(r"blueprint_import/\?blueprint_url=([^)\s]+)", README)


def _declared_inputs(text: str) -> set[str]:
    """Input names: the keys one level below `  input:` (blueprint header, two spaces deep)."""
    block = re.search(r"^  input:\n((?:    .*\n|\n)*)", text, re.M)
    return set(re.findall(r"^    (\w+):\s*$", block.group(1), re.M)) if block else set()


class BlueprintConsistencyTests(unittest.TestCase):
    def test_the_blueprints_are_found(self) -> None:
        self.assertGreaterEqual(len(BLUEPRINTS), 14)
        self.assertGreaterEqual(len(EVENTS), 5)

    def test_header_is_well_formed(self) -> None:
        for path in BLUEPRINTS:
            text = path.read_text(encoding="utf-8")
            self.assertTrue(text.startswith("blueprint:\n"), path.name)
            self.assertRegex(text, r"(?m)^  name: \S", path.name)
            self.assertRegex(text, r"(?m)^  domain: automation$", path.name)
            self.assertNotIn("\t", text, path.name)
            self.assertRegex(text, r"(?m)^(trigger|triggers):", path.name)
            self.assertRegex(text, r"(?m)^(action|actions):", path.name)

    def test_source_url_points_at_the_own_file(self) -> None:
        for path in BLUEPRINTS:
            url = re.search(r"(?m)^  source_url: (\S+)$", path.read_text(encoding="utf-8"))
            self.assertIsNotNone(url, path.name)
            self.assertTrue(url.group(1).endswith(f"/blueprints/automation/menstruation_cycle/{path.name}"), path.name)

    def test_every_blueprint_has_exactly_one_readme_import_link_to_its_source(self) -> None:
        decoded = [unquote(link) for link in IMPORT_LINKS]
        for path in BLUEPRINTS:
            source = re.search(r"(?m)^  source_url: (\S+)$", path.read_text(encoding="utf-8")).group(1)
            self.assertEqual(decoded.count(source), 1, path.name)
        self.assertEqual(len(IMPORT_LINKS), len(BLUEPRINTS), "README links a blueprint that does not exist (or twice)")

    def test_event_triggers_use_events_the_integration_fires(self) -> None:
        seen = 0
        for path in BLUEPRINTS:
            for event_type in re.findall(r"(?m)^\s*event_type: (\S+)\s*$", path.read_text(encoding="utf-8")):
                seen += 1
                self.assertIn(event_type, EVENTS, path.name)
        self.assertGreaterEqual(seen, 2, "the two event blueprints are no longer detected")

    def test_inputs_are_declared_and_used(self) -> None:
        for path in BLUEPRINTS:
            text = path.read_text(encoding="utf-8")
            declared = _declared_inputs(text)
            used = set(re.findall(r"!input (\w+)", text))
            self.assertTrue(declared, path.name)
            self.assertEqual(used - declared, set(), f"{path.name}: !input without a declaration")
            self.assertEqual(declared - used, set(), f"{path.name}: declared input is never used")


if __name__ == "__main__":
    unittest.main()
