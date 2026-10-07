"""Local stand-ins for checks that hassfest/HACS only report in CI (manifest, translations, issue placeholders)."""

from __future__ import annotations

import ast
import json
import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
ROOT = REPO / "custom_components" / "menstruation_cycle"
LANGS = ("de", "en", "es", "fr", "sv")
FILES = ["strings.json", *(f"translations/{lang}.json" for lang in LANGS)]
MANIFEST = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
STRINGS = json.loads((ROOT / "strings.json").read_text(encoding="utf-8"))
# top-level sections of strings.json that Home Assistant knows
KNOWN_SECTIONS = {
    "title", "common", "config", "options", "selector", "services", "issues", "entity", "device", "exceptions",
    "entity_component", "device_automation", "application_credentials", "conversation", "system_health", "triggers",
    "conditions",
}
HACS_KEYS = {
    "name", "content_in_root", "zip_release", "filename", "country", "homeassistant", "hacs",
    "persistent_directory", "render_readme", "hide_default_branch",
}
IO_CLASSES = {"local_push", "local_polling", "cloud_push", "cloud_polling", "calculated", "assumed_state"}


def _strings(node, where=""):
    if isinstance(node, dict):
        for key, value in node.items():
            yield from _strings(value, f"{where}.{key}" if where else key)
    elif isinstance(node, str):
        yield where, node


def _placeholders(text: str) -> set[str]:
    return set(re.findall(r"\{(\w+)\}", text))


class ManifestTests(unittest.TestCase):
    def test_required_fields_and_formats(self) -> None:
        for key in ("domain", "name", "version", "documentation", "issue_tracker", "codeowners", "iot_class"):
            self.assertTrue(MANIFEST.get(key), key)
        self.assertEqual(MANIFEST["domain"], ROOT.name)
        self.assertRegex(MANIFEST["version"], r"^\d+\.\d+\.\d+$")
        self.assertTrue(all(owner.startswith("@") for owner in MANIFEST["codeowners"]))
        self.assertTrue(MANIFEST["documentation"].startswith("https://"))
        self.assertTrue(MANIFEST["issue_tracker"].startswith("https://"))
        self.assertIn(MANIFEST["iot_class"], IO_CLASSES)

    def test_keys_are_sorted_like_hassfest_wants(self) -> None:
        keys = list(MANIFEST)
        self.assertEqual(keys[:2], ["domain", "name"])
        self.assertEqual(keys[2:], sorted(keys[2:]))

    def test_version_matches_the_newest_changelog_entry(self) -> None:
        heading = re.search(r"^## (\S+)", (REPO / "CHANGELOG.md").read_text(encoding="utf-8"), re.M).group(1)
        self.assertEqual(heading, MANIFEST["version"])

    def test_readme_badge_and_entity_table_match_the_code(self) -> None:
        readme = (REPO / "README.md").read_text(encoding="utf-8")
        self.assertIn(f"badge/version-{MANIFEST['version']}-", readme)
        const = (ROOT / "const.py").read_text(encoding="utf-8")
        listed = set(re.findall(r"`(?:sensor|calendar|image|todo)\.menstruation_<name>(\w*)`", readme))
        defined = set(re.findall(r'f"menstruation_\{slug\}(\w*)"', const))
        self.assertEqual(listed, defined)

    def test_hacs_json_only_has_known_keys(self) -> None:
        hacs = json.loads((REPO / "hacs.json").read_text(encoding="utf-8"))
        self.assertEqual(set(hacs) - HACS_KEYS, set())
        self.assertTrue(hacs.get("name"))


class TranslationRuleTests(unittest.TestCase):
    def test_strings_json_only_has_known_sections(self) -> None:
        self.assertEqual(set(STRINGS) - KNOWN_SECTIONS, set())

    def test_every_language_uses_the_same_placeholders_as_the_source(self) -> None:
        source = dict(_strings(STRINGS))
        problems = []
        for name in FILES[1:]:
            translated = dict(_strings(json.loads((ROOT / name).read_text(encoding="utf-8"))))
            for key, text in source.items():
                if key in translated and _placeholders(translated[key]) != _placeholders(text):
                    problems.append(f"{name}: {key} has {sorted(_placeholders(translated[key]))}, source {sorted(_placeholders(text))}")
        self.assertEqual(problems, [])


def _issue_calls() -> list[tuple[str, set[str]]]:
    """(translation_key, supplied placeholder names) of every issue-creating call with literal values."""
    found = []
    for file_name in ("repairs.py", "__init__.py"):
        for node in ast.walk(ast.parse((ROOT / file_name).read_text(encoding="utf-8"))):
            if not isinstance(node, ast.Call):
                continue
            kwargs = {kw.arg: kw.value for kw in node.keywords if kw.arg}
            key, placeholders = kwargs.get("translation_key"), kwargs.get("translation_placeholders")
            if isinstance(key, ast.Constant) and isinstance(placeholders, ast.Dict):
                names = {k.value for k in placeholders.keys if isinstance(k, ast.Constant)}
                found.append((key.value, names))
    return found


class IssuePlaceholderTests(unittest.TestCase):
    def test_every_placeholder_in_an_issue_text_is_supplied_by_the_code(self) -> None:
        calls = _issue_calls()
        self.assertGreater(len(calls), 10)
        problems = []
        for key, supplied in calls:
            self.assertIn(key, STRINGS["issues"], f"issue {key} has no text in strings.json")
            used = {
                name
                for where, text in _strings(STRINGS["issues"][key])
                if not where.startswith("fix_flow")  # the fix form gets its own placeholders
                for name in _placeholders(text)
            }
            if used - supplied:
                problems.append(f"{key}: text uses {sorted(used - supplied)} but the code does not pass them")
        self.assertEqual(problems, [])


class FixFlowTextTests(unittest.TestCase):
    """A fixable issue opens a form whose text comes from fix_flow.step.<step>; without it the dialog is empty."""

    def _fixable_keys(self) -> set[str]:
        keys = set()
        for node in ast.walk(ast.parse((ROOT / "repairs.py").read_text(encoding="utf-8"))):
            if isinstance(node, ast.Call):
                kwargs = {kw.arg: kw.value for kw in node.keywords if kw.arg}
                fixable, key = kwargs.get("is_fixable"), kwargs.get("translation_key")
                if isinstance(fixable, ast.Constant) and fixable.value is True and isinstance(key, ast.Constant):
                    keys.add(key.value)
        return keys

    def test_every_fixable_issue_has_a_confirm_form_text_in_every_language(self) -> None:
        keys = self._fixable_keys()
        self.assertGreaterEqual(len(keys), 3)
        for file_name in FILES:
            issues = json.loads((ROOT / file_name).read_text(encoding="utf-8"))["issues"]
            for key in keys:
                step = issues[key].get("fix_flow", {}).get("step", {}).get("confirm", {})
                self.assertTrue(step.get("title") and step.get("description"), f"{file_name}: {key} fix form has no text")

    def test_the_rename_form_shows_the_list_it_is_given(self) -> None:
        for file_name in FILES:
            issues = json.loads((ROOT / file_name).read_text(encoding="utf-8"))["issues"]
            text = issues["rename_entities"]["fix_flow"]["step"]["confirm"]["description"]
            self.assertIn("{renames}", text, file_name)


if __name__ == "__main__":
    unittest.main()
