"""Every option in the options form needs a label (and description) in strings.json and all translations,
placed where Home Assistant looks for it: under its section, or at the top level when it has none.

Reads config_flow.py and const.py as source (no Home Assistant import needed).
"""

from __future__ import annotations

import ast
import json
import re
import unittest
from pathlib import Path

COMPONENT_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
STRING_FILES = ["strings.json", *(f"translations/{lang}.json" for lang in ("de", "en", "es", "fr", "sv"))]
# self-explanatory fields (birth_date explains itself in its label)
NO_DESCRIPTION_NEEDED = {"friendly_name", "icon", "birth_date"}


def _const_values() -> dict[str, str]:
    tree = ast.parse((COMPONENT_ROOT / "const.py").read_text(encoding="utf-8"))
    return {
        node.targets[0].id: node.value.value
        for node in tree.body
        if isinstance(node, ast.Assign)
        and isinstance(node.targets[0], ast.Name)
        and isinstance(node.value, ast.Constant)
        and isinstance(node.value.value, str)
    }


def _form_fields_and_sections() -> tuple[list[str], dict[str, str]]:
    """Option keys of the init form, and option key -> section name for the grouped ones."""
    consts = _const_values()
    source = (COMPONENT_ROOT / "config_flow.py").read_text(encoding="utf-8")
    body = source[source.index("async def async_step_init") : source.index("async def async_step_pregnancy")]
    fields = [consts[name] for name in re.findall(r"(?:vol\.(?:Optional|Required)|_optional_date_key)\(\s*(CONF_\w+)", body)]
    sections: dict[str, str] = {}
    for node in ast.parse(source).body:
        target = getattr(node, "target", None) or (node.targets[0] if isinstance(node, ast.Assign) else None)
        if isinstance(target, ast.Name) and target.id == "_OPTION_SECTIONS":
            for section, names in zip(node.value.keys, node.value.values):
                for name in names.elts:
                    sections[consts[name.id]] = section.value
    return fields, sections


class OptionStringTests(unittest.TestCase):
    def test_form_is_parsed(self) -> None:
        fields, sections = _form_fields_and_sections()
        self.assertGreater(len(fields), 30)
        self.assertEqual(len(fields), len(set(fields)))
        self.assertFalse(set(sections) - set(fields), "section lists an option that is not in the form")

    def test_every_option_has_label_and_description_in_every_language(self) -> None:
        fields, sections = _form_fields_and_sections()
        problems: list[str] = []
        for file_name in STRING_FILES:
            init = json.loads((COMPONENT_ROOT / file_name).read_text(encoding="utf-8"))["options"]["step"]["init"]
            for option in fields:
                place = init["sections"][sections[option]] if option in sections else init
                if not str(place.get("data", {}).get(option, "")).strip():
                    problems.append(f"{file_name}: no label for {option}")
                if option not in NO_DESCRIPTION_NEEDED and not str(place.get("data_description", {}).get(option, "")).strip():
                    problems.append(f"{file_name}: no description for {option}")
        self.assertEqual(problems, [])

    def test_no_label_for_an_option_that_no_longer_exists(self) -> None:
        fields, sections = _form_fields_and_sections()
        known = set(fields)
        problems: list[str] = []
        for file_name in STRING_FILES:
            init = json.loads((COMPONENT_ROOT / file_name).read_text(encoding="utf-8"))["options"]["step"]["init"]
            places = [("top level", init)] + [(f"section {name}", sec) for name, sec in init.get("sections", {}).items()]
            for where, place in places:
                for kind in ("data", "data_description"):
                    for option in place.get(kind, {}):
                        if option not in known:
                            problems.append(f"{file_name}: {where} {kind} has unknown option {option}")
                        elif where != "top level" and sections.get(option) != where.removeprefix("section "):
                            problems.append(f"{file_name}: {option} is in {where} but belongs to {sections.get(option, 'top level')}")
        self.assertEqual(problems, [])


if __name__ == "__main__":
    unittest.main()
