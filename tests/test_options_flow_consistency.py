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
                field = re.search(rf"vol\.(?:Optional|Required)\(\s*{name}\s*,\s*default=c\[\"(\w+)\"\]", INIT_STEP)
                if field is None:
                    problems.append(f"{section}/{name}: not in the schema with default=c[...]")
                elif f'"{field.group(1)}"' not in RESOLVE:
                    problems.append(f"{section}/{name}: default key {field.group(1)!r} is not set in _async_resolve_current")
                if f"self._data[{name}]" not in SOURCE:
                    problems.append(f"{section}/{name}: form value is never parsed into self._data")
                if not re.search(rf"{name}:\s*d\[{name}\]", FINISH):
                    problems.append(f"{section}/{name}: not written to the entry options in _async_finish")
        self.assertEqual(problems, [])

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
            "CONF_CALENDAR_ENABLED", "CONF_NFP_ANALYSIS_MODE",
        }
        self.assertEqual(top_level - expected_top_level, set(), "new option is outside every section - put it in one or list it here")


if __name__ == "__main__":
    unittest.main()
