"""Behaviour of the config flow (new profile, import, reconfigure) and of the options flow's detail steps."""

from __future__ import annotations

import asyncio
import importlib.util
import re
import sys
import types
import unicodedata
import unittest
from datetime import date, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

COMPONENT_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
_PKG = "tstest_config_flow"


class _Abort(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class _Anything(type):
    def __getattr__(cls, name):
        return name


class _AnyObject:
    def __init__(self, *args, **kwargs) -> None:
        self.args, self.kwargs = args, kwargs


def _permissive(name: str) -> types.ModuleType:
    module = types.ModuleType(name)
    module.__path__ = []
    module.__getattr__ = lambda attr: _Anything(attr, (_AnyObject,), {})
    return module


class _Schema:
    def __init__(self, schema, **_kwargs) -> None:
        self.schema = dict(schema)

    def extend(self, more):
        return _Schema({**self.schema, **more})


def _marker():
    return type("Marker", (str,), {"__new__": lambda cls, key, **kwargs: str.__new__(cls, key)})


def _stubs() -> dict[str, types.ModuleType]:
    class ConfigFlow:
        def __init_subclass__(cls, domain=None, **kwargs) -> None:
            cls.domain = domain

        unique_id = None

        async def async_set_unique_id(self, unique_id):
            self.unique_id = unique_id

        def _abort_if_unique_id_configured(self):
            if self.unique_id in self.hass.configured_unique_ids:
                raise _Abort("already_configured")

        def async_create_entry(self, *, title, data, options=None):
            return {"type": "create_entry", "title": title, "data": data, "options": options or {}}

        def async_show_form(self, *, step_id, data_schema=None, errors=None, description_placeholders=None):
            return {"type": "form", "step_id": step_id, "schema": data_schema, "errors": errors or {}}

        def async_update_reload_and_abort(self, entry, *, data=None, title=None):
            return {"type": "abort", "data": data, "title": title}

        def _get_reconfigure_entry(self):
            return self.entry

    class OptionsFlow:
        async_show_form = ConfigFlow.async_show_form

    config_entries = _permissive("homeassistant.config_entries")
    config_entries.ConfigFlow, config_entries.OptionsFlow = ConfigFlow, OptionsFlow
    config_entries.ConfigEntry = type("ConfigEntry", (), {})
    config_entries.callback = lambda func: func

    vol = types.ModuleType("voluptuous")
    vol.Schema = _Schema
    vol.Optional, vol.Required = _marker(), _marker()
    vol.In = vol.All = vol.Coerce = vol.Range = lambda *args, **kwargs: None

    def slugify(text):
        folded = unicodedata.normalize("NFKD", str(text)).encode("ascii", "ignore").decode()
        return re.sub(r"[^a-z0-9]+", "_", folded.lower()).strip("_")

    entry_flow = types.ModuleType("homeassistant.data_entry_flow")
    entry_flow.FlowResult = dict
    entry_flow.section = lambda *args, **kwargs: ("section", args)
    dispatcher = types.ModuleType("homeassistant.helpers.dispatcher")
    dispatcher.async_dispatcher_send = lambda *args, **kwargs: None
    util = _permissive("homeassistant.util")
    util.slugify = slugify
    selector = _permissive("homeassistant.helpers.selector")
    helpers = _permissive("homeassistant.helpers")
    helpers.selector = selector
    homeassistant = _permissive("homeassistant")
    homeassistant.config_entries = config_entries
    return {
        "voluptuous": vol, "homeassistant": homeassistant, "homeassistant.config_entries": config_entries,
        "homeassistant.data_entry_flow": entry_flow, "homeassistant.helpers": helpers,
        "homeassistant.helpers.selector": selector, "homeassistant.helpers.dispatcher": dispatcher,
        "homeassistant.util": util,
    }


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
    config_flow = _load("config_flow", "config_flow.py")


def _entry(entry_id="e1", title="Anna", data=None, options=None):
    return SimpleNamespace(entry_id=entry_id, title=title, data=data or {}, options=options or {})


def _hass(entries=()):
    by_id = {entry.entry_id: entry for entry in entries}
    return SimpleNamespace(
        data={},
        configured_unique_ids={entry.data.get(const.CONF_PROFILE) for entry in entries},
        config_entries=SimpleNamespace(async_entries=lambda domain: list(entries), async_get_entry=by_id.get),
    )


def _flow(hass):
    flow = config_flow.MenstruationGaugeConfigFlow()
    flow.hass = hass
    return flow


def _run(coro):
    return asyncio.run(coro)


class NewProfileTests(unittest.TestCase):
    def test_first_profile_form_has_no_copy_field(self) -> None:
        result = _run(_flow(_hass()).async_step_user())
        self.assertEqual(result["step_id"], "user")
        self.assertNotIn(const.CONF_COPY_SETTINGS_FROM, result["schema"].schema)

    def test_second_profile_form_offers_to_copy_settings(self) -> None:
        result = _run(_flow(_hass([_entry(data={const.CONF_PROFILE: "anna"})])).async_step_user())
        self.assertIn(const.CONF_COPY_SETTINGS_FROM, result["schema"].schema)

    def test_creates_the_entry_with_a_slug_and_cleaned_values(self) -> None:
        result = _run(_flow(_hass()).async_step_user({
            const.CONF_PROFILE: "Anna Müller!", const.CONF_FRIENDLY_NAME: "  Anna  ", const.CONF_ICON: " mdi:flower ",
            const.CONF_ONBOARDING_STAGE: "no-such-stage", const.CONF_DASHBOARD_ENABLED: True,
        }))
        self.assertEqual(result["type"], "create_entry")
        self.assertEqual(result["title"], "Anna")
        self.assertEqual(result["data"][const.CONF_PROFILE], "anna_muller")
        self.assertEqual(result["data"][const.CONF_ICON], "mdi:flower")
        self.assertEqual(result["data"][const.CONF_ONBOARDING_STAGE], const.DEFAULT_ONBOARDING_STAGE)
        self.assertIs(result["options"][const.CONF_DASHBOARD_ENABLED], True)

    def test_blank_display_name_falls_back_to_the_default(self) -> None:
        result = _run(_flow(_hass()).async_step_user({const.CONF_PROFILE: "anna", const.CONF_FRIENDLY_NAME: "   "}))
        self.assertEqual(result["title"], const.DEFAULT_NAME)

    def test_a_profile_name_without_usable_characters_is_rejected(self) -> None:
        result = _run(_flow(_hass()).async_step_user({const.CONF_PROFILE: "!!!", const.CONF_FRIENDLY_NAME: "X"}))
        self.assertEqual(result["type"], "form")
        self.assertEqual(result["errors"], {const.CONF_PROFILE: "invalid_profile"})

    def test_the_same_profile_cannot_be_added_twice(self) -> None:
        hass = _hass([_entry(data={const.CONF_PROFILE: "anna"})])
        with self.assertRaises(_Abort) as caught:
            _run(_flow(hass).async_step_user({const.CONF_PROFILE: "Anna", const.CONF_FRIENDLY_NAME: "Anna 2"}))
        self.assertEqual(caught.exception.reason, "already_configured")

    def test_copying_settings_takes_household_options_but_nothing_personal(self) -> None:
        source = _entry("src", options={
            const.CONF_NOTIFY_SERVICE: "notify.mobile_app_anna", const.CONF_TEMPERATURE_UNIT: "fahrenheit",
            const.CONF_LINKED_PERSON_ENTITY_ID: "person.anna", const.CONF_CYCLE_LENGTH_OVERRIDE: 31,
            const.CONF_NOTIFY_PARTNER_SERVICE: "notify.partner", const.CONF_DASHBOARD_ENABLED: True,
        }, data={const.CONF_PROFILE: "anna"})
        result = _run(_flow(_hass([source])).async_step_user({
            const.CONF_PROFILE: "mia", const.CONF_FRIENDLY_NAME: "Mia", const.CONF_COPY_SETTINGS_FROM: "src",
            const.CONF_DASHBOARD_ENABLED: False,
        }))
        options = result["options"]
        self.assertEqual(options[const.CONF_NOTIFY_SERVICE], "notify.mobile_app_anna")
        self.assertEqual(options[const.CONF_TEMPERATURE_UNIT], "fahrenheit")
        for personal in (const.CONF_LINKED_PERSON_ENTITY_ID, const.CONF_CYCLE_LENGTH_OVERRIDE, const.CONF_NOTIFY_PARTNER_SERVICE):
            self.assertNotIn(personal, options)

    def test_copying_from_an_unknown_entry_is_ignored(self) -> None:
        result = _run(_flow(_hass()).async_step_user({
            const.CONF_PROFILE: "mia", const.CONF_FRIENDLY_NAME: "Mia", const.CONF_COPY_SETTINGS_FROM: "gone",
        }))
        self.assertEqual(result["type"], "create_entry")


class ImportTests(unittest.TestCase):
    def test_old_entry_without_profile_gets_a_slug_from_its_name(self) -> None:
        result = _run(_flow(_hass()).async_step_import({"name": "Mein Zyklus"}))
        self.assertEqual(result["data"][const.CONF_PROFILE], "mein_zyklus")
        self.assertEqual(result["data"][const.CONF_ONBOARDING_STAGE], const.DEFAULT_ONBOARDING_STAGE)

    def test_a_name_without_usable_characters_becomes_default(self) -> None:
        result = _run(_flow(_hass()).async_step_import({"name": "!!!"}))
        self.assertEqual(result["data"][const.CONF_PROFILE], "default")

    def test_the_original_unique_id_is_kept_and_not_imported_twice(self) -> None:
        flow = _flow(_hass())
        _run(flow.async_step_import({const.CONF_PROFILE: "anna", "unique_id": "old_unique"}))
        self.assertEqual(flow.unique_id, "old_unique")
        hass = _hass([_entry(data={const.CONF_PROFILE: "old_unique"})])
        with self.assertRaises(_Abort):
            _run(_flow(hass).async_step_import({const.CONF_PROFILE: "anna", "unique_id": "old_unique"}))


class ReconfigureTests(unittest.TestCase):
    def _flow_for(self, entry):
        flow = _flow(_hass([entry]))
        flow.entry = entry
        return flow

    def test_form_is_prefilled_from_the_entry(self) -> None:
        entry = _entry(data={const.CONF_PROFILE: "anna", const.CONF_FRIENDLY_NAME: "Anna", const.CONF_ICON: "mdi:x"})
        result = _run(self._flow_for(entry).async_step_reconfigure())
        self.assertEqual(result["step_id"], "reconfigure")
        self.assertEqual(set(result["schema"].schema), {const.CONF_FRIENDLY_NAME, const.CONF_ICON, const.CONF_ONBOARDING_STAGE})

    def test_update_keeps_the_profile_slug_and_cleans_values(self) -> None:
        entry = _entry(data={const.CONF_PROFILE: "anna", const.CONF_FRIENDLY_NAME: "Anna"})
        result = _run(self._flow_for(entry).async_step_reconfigure({
            const.CONF_FRIENDLY_NAME: " Anna K. ", const.CONF_ICON: "", const.CONF_ONBOARDING_STAGE: "bogus",
        }))
        self.assertEqual(result["title"], "Anna K.")
        self.assertEqual(result["data"][const.CONF_PROFILE], "anna")
        self.assertEqual(result["data"][const.CONF_ONBOARDING_STAGE], const.DEFAULT_ONBOARDING_STAGE)


class HelperTests(unittest.TestCase):
    def test_parse_date_opt(self) -> None:
        self.assertIsNone(config_flow._parse_date_opt(""))
        self.assertIsNone(config_flow._parse_date_opt("   "))
        self.assertEqual(config_flow._parse_date_opt(" 2026-03-01 "), "2026-03-01")
        self.assertEqual(config_flow._parse_date_opt("01.03.2026"), config_flow._INVALID_DATE_SENTINEL)

    def test_flatten_sections(self) -> None:
        flat = config_flow._flatten_sections({"icon": "mdi:x", "pill": {"a": 1, "b": 2}, "tracking": {"c": 3}})
        self.assertEqual(flat, {"icon": "mdi:x", "a": 1, "b": 2, "c": 3})


class OptionsDetailStepTests(unittest.TestCase):
    def _flow(self, history=()):
        flow = config_flow.MenstruationGaugeOptionsFlow(_entry())
        flow.hass = _hass()
        flow._runtime = SimpleNamespace(history=list(history))
        flow._current = {
            "pregnancy_data": {}, "pregnancy_high_risk": False, "pregnancy_risk_notes": "",
            "menarche_data": {}, "menopause_data": {}, "postpartum_start_date": None, "postpartum_duration_days": 42,
        }

        async def _confirm(user_input=None):
            return {"type": "confirm"}

        flow.async_step_confirm = _confirm
        return flow

    def test_pregnancy_rejects_a_malformed_date(self) -> None:
        flow = self._flow()
        result = _run(flow.async_step_pregnancy({const.CONF_PREGNANCY_START_DATE: "yesterday"}))
        self.assertEqual(result["errors"], {const.CONF_PREGNANCY_START_DATE: "invalid_date"})
        self.assertEqual(flow._data, {})

    def test_pregnancy_without_a_date_uses_the_last_cycle_start(self) -> None:
        flow = self._flow(history=["2026-05-01", "2026-06-02", "2026-04-03"])
        result = _run(flow.async_step_pregnancy({const.CONF_PREGNANCY_RISK_NOTES: "  note  ", const.CONF_PREGNANCY_HIGH_RISK: 1}))
        self.assertEqual(result["type"], "confirm")
        self.assertEqual(flow._data["_pregnancy_start"], "2026-06-02")
        self.assertEqual(flow._data[const.CONF_PREGNANCY_RISK_NOTES], "note")
        self.assertIs(flow._data[const.CONF_PREGNANCY_HIGH_RISK], True)

    def test_menarche_age_must_be_a_plausible_number(self) -> None:
        for bad in ("8", "17", "abc"):
            flow = self._flow()
            result = _run(flow.async_step_menarche({const.CONF_FAMILY_MENARCHE_AGE: bad}))
            self.assertEqual(result["errors"], {const.CONF_FAMILY_MENARCHE_AGE: "invalid_menarche_age"}, bad)
        flow = self._flow()
        _run(flow.async_step_menarche({const.CONF_FAMILY_MENARCHE_AGE: " 12 "}))
        self.assertEqual(flow._data[const.CONF_FAMILY_MENARCHE_AGE], 12)
        flow = self._flow()
        _run(flow.async_step_menarche({}))
        self.assertIsNone(flow._data[const.CONF_FAMILY_MENARCHE_AGE])

    def test_menopause_date_is_validated(self) -> None:
        flow = self._flow()
        self.assertEqual(_run(flow.async_step_menopause({const.CONF_MENOPAUSE_START_DATE: "x"}))["errors"],
                         {const.CONF_MENOPAUSE_START_DATE: "invalid_date"})
        _run(flow.async_step_menopause({const.CONF_MENOPAUSE_START_DATE: "2024-06-01"}))
        self.assertEqual(flow._data["_menopause_start"], "2024-06-01")

    def test_postpartum_date_cannot_be_in_the_future_and_duration_is_clamped(self) -> None:
        flow = self._flow()
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        self.assertEqual(_run(flow.async_step_postpartum({const.CONF_POSTPARTUM_START_DATE: tomorrow}))["errors"],
                         {const.CONF_POSTPARTUM_START_DATE: "invalid_date"})
        for raw, expected in ((9999, 365), (0, 1), ("abc", 42)):
            flow = self._flow()
            _run(flow.async_step_postpartum({const.CONF_POSTPARTUM_START_DATE: "2026-01-05", const.CONF_POSTPARTUM_DURATION_DAYS: raw}))
            self.assertEqual(flow._data[const.CONF_POSTPARTUM_DURATION_DAYS], expected, raw)

    def test_steps_chain_in_order_and_end_in_the_confirmation(self) -> None:
        flow = self._flow()
        flow._pending_steps = ["menopause", "postpartum"]
        result = _run(flow.async_step_pregnancy({const.CONF_PREGNANCY_START_DATE: "2026-05-01"}))
        self.assertEqual(result["step_id"], "menopause")
        self.assertEqual(flow._pending_steps, ["postpartum"])


if __name__ == "__main__":
    unittest.main()
