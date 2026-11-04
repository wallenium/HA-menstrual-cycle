"""Every sectioned option of the options form must be shown, defaulted, read from the form and stored.

A new option needs five places in config_flow.py (resolve, schema, parse, final options dict, section list);
forgetting one makes the option show up but silently not save. Checked on the source, no Home Assistant needed.
"""

from __future__ import annotations

import ast
import re
import unittest
from pathlib import Path

SOURCE = (Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle" / "config_flow.py").read_text(
    encoding="utf-8"
)
# Options with their own handling: the two notify targets default from a local variable, the life-stage
# toggles are handled by the follow-up steps instead of the generic parse/save path.
SPECIAL = {
    "CONF_PILL_PACK_START",  # a date: built with _optional_date_key (no default for an empty selector), checked below
    "CONF_NOTIFY_SERVICE",
    "CONF_NOTIFY_PARTNER_SERVICE",
    "CONF_PREGNANCY_ENABLED",
    "CONF_PRE_MENARCHE_ENABLED",
    "CONF_MENOPAUSE_ENABLED",
    "CONF_POSTPARTUM_ENABLED",
}


def _sections() -> dict[str, list[str]]:
    for node in ast.parse(SOURCE).body:
        target = getattr(node, "target", None) or (node.targets[0] if isinstance(node, ast.Assign) else None)
        if isinstance(target, ast.Name) and target.id == "_OPTION_SECTIONS":
            return {key.value: [elt.id for elt in value.elts] for key, value in zip(node.value.keys, node.value.values)}
    raise AssertionError("_OPTION_SECTIONS not found")


def _part(start: str, end: str | None = None) -> str:
    begin = SOURCE.index(start)
    return SOURCE[begin : SOURCE.index(end, begin) if end else None]


INIT_STEP = _part("async def async_step_init", "async def async_step_pregnancy")
RESOLVE = _part("async def _async_resolve_current", "async def async_step_init")
FINISH = _part("async def _async_finish")


class OptionsFlowConsistencyTests(unittest.TestCase):
    def test_sections_are_found(self) -> None:
        sections = _sections()
        self.assertEqual(set(sections), {"notifications", "pill", "tracking", "life_stages"})
        self.assertGreater(sum(len(v) for v in sections.values()), 20)

    def test_every_sectioned_option_is_wired_end_to_end(self) -> None:
        problems: list[str] = []
        for section, names in _sections().items():
            for name in names:
                if name in SPECIAL:
                    continue
                field = re.search(rf"(?:vol\.(?:Optional|Required)\(\s*{name}\s*,\s*default=|_optional_entity\(\s*{name}\s*,\s*)c\[\"(\w+)\"\]", INIT_STEP)
                if field is None:
                    problems.append(f"{section}/{name}: not in the schema with default=c[...]")
                elif f'"{field.group(1)}"' not in RESOLVE:
                    problems.append(f"{section}/{name}: default key {field.group(1)!r} is not set in _async_resolve_current")
                if f"self._data[{name}]" not in SOURCE:
                    problems.append(f"{section}/{name}: form value is never parsed into self._data")
                if not re.search(rf"{name}:\s*d\[{name}\]", FINISH):
                    problems.append(f"{section}/{name}: not written to the entry options in _async_finish")
        self.assertEqual(problems, [])

    def test_pill_pack_start_is_wired_end_to_end(self) -> None:
        self.assertIn('_optional_date_key(CONF_PILL_PACK_START, c["pill_pack_start"] or None)', INIT_STEP)
        self.assertIn('"pill_pack_start"', RESOLVE)
        self.assertIn("self._data[CONF_PILL_PACK_START]", INIT_STEP)
        self.assertRegex(FINISH, r"CONF_PILL_PACK_START:\s*d\[CONF_PILL_PACK_START\]")

    def test_no_option_is_in_two_sections(self) -> None:
        names = [name for values in _sections().values() for name in values]
        self.assertEqual(len(names), len(set(names)))

    def test_every_form_option_is_in_a_section_or_deliberately_top_level(self) -> None:
        in_sections = {name for values in _sections().values() for name in values}
        form_options = set(
            re.findall(r"(?:vol\.(?:Optional|Required)|_optional_date_key)\(\s*(CONF_\w+)", INIT_STEP)
        )
        top_level = form_options - in_sections
        expected_top_level = {
            "CONF_FRIENDLY_NAME", "CONF_ICON", "CONF_BIRTH_DATE", "CONF_PERIOD_DURATION_DAYS",
            "CONF_CYCLE_LENGTH_OVERRIDE", "CONF_NUM_PREDICTIONS", "CONF_ONBOARDING_STAGE", "CONF_DASHBOARD_ENABLED",
            "CONF_LINKED_PERSON_ENTITY_ID", "CONF_BASAL_TEMP_SENSOR_ENTITY_ID", "CONF_VISIBILITY_LEVEL",
            "CONF_CALENDAR_ENABLED", "CONF_ICS_FEED_ENABLED", "CONF_ICS_PARTNER_CONTENT", "CONF_CALENDAR_PREGNANCY_EVENTS", "CONF_CALENDAR_CONTRACEPTION_EVENTS", "CONF_CALENDAR_LOGGED_PERIODS", "CONF_CALENDAR_LUTEAL_FORECAST", "CONF_CALENDAR_OVULATION_EVENTS", "CONF_NFP_ANALYSIS_MODE",
        }
        self.assertEqual(top_level - expected_top_level, set(), "new option is outside every section - put it in one or list it here")


if __name__ == "__main__":
    unittest.main()


def _literal_tuple(node: ast.AST, named: dict[str, list[str]]) -> list[str]:
    if isinstance(node, ast.Name):
        return named[node.id]
    return [elt.id for elt in node.elts]


def _visible_when() -> dict[str, list[str]]:
    """_VISIBLE_WHEN from the source: field -> switches that must be on (a plain literal, so no Home Assistant is needed)."""
    tree = ast.parse(SOURCE)
    named: dict[str, list[str]] = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name) and isinstance(node.value, ast.Tuple):
            named[node.targets[0].id] = [elt.id for elt in node.value.elts]
    for node in tree.body:
        target = getattr(node, "target", None) or (node.targets[0] if isinstance(node, ast.Assign) else None)
        if isinstance(target, ast.Name) and target.id == "_VISIBLE_WHEN":
            return {key.id: _literal_tuple(value, named) for key, value in zip(node.value.keys, node.value.values)}
    raise AssertionError("_VISIBLE_WHEN not found")


def _const_values() -> dict[str, str]:
    const = (Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle" / "const.py").read_text(encoding="utf-8")
    return {
        node.targets[0].id: node.value.value
        for node in ast.parse(const).body
        if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name) and isinstance(node.value, ast.Constant)
    }


class HiddenFieldsTests(unittest.TestCase):
    """The fields Home Assistant 2026.11 hides (_VISIBLE_WHEN). Checked on the source, because CI only runs the real-core
    test for this (tools/real_ha/test_options_flow.py) on versions that already know how to hide fields."""

    def test_the_table_is_found_and_not_trivial(self) -> None:
        table = _visible_when()
        self.assertGreater(len(table), 20)
        self.assertTrue(all(switches for switches in table.values()))

    def test_a_field_and_its_switches_are_in_the_same_section(self) -> None:
        # Home Assistant evaluates a condition against the fields of the same form level only; a switch in another
        # section never matches and would hide the field for good.
        level = {name: section for section, names in _sections().items() for name in names}
        problems = [
            f"{field} ({level.get(field, 'top')}) depends on {switch} ({level.get(switch, 'top')})"
            for field, switches in _visible_when().items()
            for switch in switches
            if level.get(field) != level.get(switch)
        ]
        self.assertEqual(problems, [])

    def test_switches_are_on_off_fields_that_are_not_hidden_by_themselves(self) -> None:
        table = _visible_when()
        for field, switches in table.items():
            self.assertNotIn(field, switches, field)
            for switch in switches:
                self.assertIsNotNone(re.search(rf"vol\.Optional\(\s*{switch}\s*,[^)]*?\)?:\s*bool", INIT_STEP, re.S), f"{switch} is not a bool field")
                self.assertNotIn(field, table.get(switch, []), f"{field} and {switch} depend on each other")

    def test_the_stored_value_of_every_hidden_field_and_switch_can_be_restored(self) -> None:
        # _keep_hidden_values reads self._current[<option name>]
        values = _const_values()
        missing = [
            name
            for field, switches in _visible_when().items()
            for name in (field, *switches)
            if f'"{values[name]}"' not in RESOLVE
        ]
        self.assertEqual(sorted(set(missing)), [])
