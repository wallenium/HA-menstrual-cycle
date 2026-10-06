"""Shopping-list texts the integration adds: language, and duplicate detection across languages."""

from __future__ import annotations

import asyncio
import re
import importlib.util
import sys
import types
import unittest
from datetime import date, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPONENT_ROOT = REPO_ROOT / "custom_components" / "menstruation_cycle"
TODAY = date(2026, 10, 6)
NOW = [datetime(2026, 10, 6, 9, 0, 0)]  # mutable so a test can move the clock
_PKG = "tstest_todo_texts"


class _Anything(type):
    """Metaclass so enum-like stubs (Platform.SENSOR etc.) resolve any attribute."""

    def __getattr__(cls, name):
        return _placeholder(name)


def _placeholder(name: str):
    class _P(metaclass=_Anything):
        def __init__(self, *args, **kwargs):
            pass

        def __call__(self, *args, **kwargs):
            return _P()

        def __getattr__(self, attr):
            return _P()

        def __or__(self, other):
            return self

    _P.__name__ = name
    return _P


def _stub_module(name: str) -> types.ModuleType:
    module = types.ModuleType(name)
    module.__path__ = []
    module.__getattr__ = _placeholder
    return module


def _ha_stubs() -> dict[str, types.ModuleType]:
    names = (
        "voluptuous", "homeassistant", "homeassistant.components", "homeassistant.config_entries",
        "homeassistant.const", "homeassistant.core", "homeassistant.exceptions", "homeassistant.helpers",
        "homeassistant.helpers.config_validation", "homeassistant.helpers.entity_registry",
        "homeassistant.helpers.label_registry", "homeassistant.helpers.dispatcher", "homeassistant.helpers.event",
        "homeassistant.helpers.storage", "homeassistant.helpers.device_registry", "homeassistant.helpers.entity",
        "homeassistant.helpers.entity_platform", "homeassistant.helpers.typing", "homeassistant.helpers.issue_registry",
        "homeassistant.components.repairs", "homeassistant.components.sensor", "homeassistant.util",
        "homeassistant.util.dt",
    )
    stubs = {name: _stub_module(name) for name in names}
    dt_mod = stubs["homeassistant.util.dt"]
    dt_mod.now = lambda: NOW[0]
    dt_mod.utcnow = lambda: NOW[0]
    def _parse(value):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None  # like the real dt_util.parse_datetime

    dt_mod.parse_datetime = _parse
    stubs["homeassistant.util"].dt = dt_mod
    stubs["homeassistant.util"].slugify = lambda value: str(value)
    stubs["homeassistant.helpers"].config_validation = stubs["homeassistant.helpers.config_validation"]
    return stubs


def _load_package():
    package = types.ModuleType(_PKG)
    package.__path__ = [str(COMPONENT_ROOT)]
    sys.modules[_PKG] = package
    spec = importlib.util.spec_from_file_location(
        _PKG, COMPONENT_ROOT / "__init__.py", submodule_search_locations=[str(COMPONENT_ROOT)]
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[_PKG] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


with patch.dict(sys.modules, _ha_stubs()):
    integration = _load_package()
    _loaded = {k: v for k, v in sys.modules.items() if k == _PKG or k.startswith(_PKG + ".")}
# patch.dict drops everything added inside; function-level `from .model import ...` needs the package again
sys.modules.update(_loaded)
const = sys.modules[f"{_PKG}.const"]


def _iso(offset: int) -> str:
    return (TODAY + timedelta(days=offset)).isoformat()


class _Hass:
    """Records shopping-list adds and serves the given existing items."""

    def __init__(self, language: str = "en", existing: tuple[str, ...] = ()) -> None:
        self.config = SimpleNamespace(language=language)
        self.existing = existing
        self.added: list[str] = []
        self.services = SimpleNamespace(async_call=self._call)

    async def _call(self, domain, service, data, blocking=False, return_response=False):
        if service == "get_items":
            return {data["entity_id"]: {"items": [{"summary": text} for text in self.existing]}}
        self.added.append(data["item"])


def _run(coro):
    return asyncio.run(coro)


def _stock(product: str, quantity: int = 1) -> dict:
    return {"inventory": {product: quantity}, "thresholds": {product: {"warning": 10, "critical": 5}}}


class TodoStringTableTests(unittest.TestCase):
    def test_every_language_has_the_same_keys_and_placeholders(self) -> None:
        table = integration._TODO_STRINGS
        self.assertEqual(set(table), {"de", "en", "es", "fr", "sv"})
        fields = lambda text: set(re.findall(r"\{(\w+)\}", text))
        for lang, strings in table.items():
            self.assertEqual(set(strings), set(table["en"]), lang)
            self.assertEqual(set(strings["products"]), set(table["en"]["products"]), lang)
            for key, text in table["en"].items():
                if isinstance(text, str):
                    self.assertEqual(fields(strings[key]), fields(text), f"{lang}.{key}")
                    self.assertTrue(strings[key].strip())

    def test_every_shopping_product_has_a_name_in_every_language(self) -> None:
        for lang, strings in integration._TODO_STRINGS.items():
            self.assertEqual(set(strings["products"]), set(integration._SHOPPING_PRODUCT_NAMES), lang)

    def test_english_names_are_unchanged(self) -> None:
        self.assertEqual(integration._TODO_STRINGS["en"]["products"], integration._SHOPPING_PRODUCT_NAMES)


class ProductShoppingItemTests(unittest.TestCase):
    def _check(self, hass, product="pad"):
        _run(integration._async_check_and_update_todo_list(hass, _stock(product), product))
        return hass.added

    def test_item_is_named_in_the_ha_language(self) -> None:
        expected = {"en": "Pads", "de": "Binden", "es": "Compresas", "fr": "Serviettes", "sv": "Bindor"}
        for lang, name in expected.items():
            self.assertEqual(self._check(_Hass(lang)), [name], lang)

    def test_unknown_language_falls_back_to_english(self) -> None:
        self.assertEqual(self._check(_Hass("ja")), ["Pads"])

    def test_an_item_in_another_language_counts_as_already_listed(self) -> None:
        self.assertEqual(self._check(_Hass("en", existing=("Binden",))), [])
        self.assertEqual(self._check(_Hass("sv", existing=("pads",))), [])

    def test_a_different_product_does_not_block(self) -> None:
        self.assertEqual(self._check(_Hass("en", existing=("Tampons",))), ["Pads"])

    def test_cup_and_underwear_never_go_on_the_list(self) -> None:
        self.assertEqual(self._check(_Hass("de"), "cup"), [])
        self.assertEqual(self._check(_Hass("de"), "underwear"), [])


class UnderwearTodoTests(unittest.TestCase):
    def _check(self, hass):
        with patch.object(integration, "_underwear_available", lambda data: 0), patch.object(
            integration, "_underwear_settings", lambda data: {"washing_threshold": 3}
        ):
            _run(integration._async_check_underwear_washing_todo(hass, {}))
        return hass.added

    def test_text_follows_the_language_and_is_not_repeated_after_a_language_change(self) -> None:
        self.assertEqual(self._check(_Hass("de")), ["Unterwäsche muss gewaschen werden"])
        self.assertEqual(self._check(_Hass("en")), ["Underwear washing needed"])
        self.assertEqual(self._check(_Hass("en", existing=("Unterwäsche muss gewaschen werden",))), [])


class ContraceptionTodoTests(unittest.TestCase):
    STATUS = {"renewal_reminder_due": True, "current_method": "iud", "renewal_due_date": "2026-11-01"}

    def _check(self, hass):
        model = sys.modules[f"{_PKG}.model"]
        with patch.object(model, "compute_contraception_status", lambda *a, **k: self.STATUS):
            _run(integration._async_check_contraception_renewal_todo(hass, SimpleNamespace(
                friendly_name="Anna", symptom_history=[], noncycle_data={}
            )))
        return hass.added

    def test_text_per_language(self) -> None:
        self.assertEqual(self._check(_Hass("en")), ["Anna: contraception method (iud) may need renewal soon (2026-11-01)"])
        self.assertEqual(self._check(_Hass("de")), ["Anna: Verhütungsmethode (iud) muss bald erneuert werden (2026-11-01)"])
        self.assertEqual(self._check(_Hass("fr")), ["Anna : méthode contraceptive (iud) : renouvellement à prévoir bientôt (2026-11-01)"])

    def test_known_methods_are_written_with_their_localized_name(self) -> None:
        self.STATUS = {**self.STATUS, "current_method": "hormonal_iud"}
        self.assertEqual(self._check(_Hass("en")), ["Anna: contraception method (Hormonal IUD) may need renewal soon (2026-11-01)"])
        self.assertEqual(self._check(_Hass("de")), ["Anna: Verhütungsmethode (Hormonspirale) muss bald erneuert werden (2026-11-01)"])
        self.assertEqual(self._check(_Hass("sv")), ["Anna: preventivmetod (Hormonspiral) kan snart behöva förnyas (2026-11-01)"])

    def test_an_item_written_by_an_older_version_with_the_raw_key_still_blocks_a_new_one(self) -> None:
        self.STATUS = {**self.STATUS, "current_method": "hormonal_iud"}
        legacy = "Anna: Verhütungsmethode (hormonal_iud) muss bald erneuert werden (2026-10-01)"
        self.assertEqual(self._check(_Hass("en", existing=(legacy,))), [])

    def test_every_language_names_every_contraception_method(self) -> None:
        for lang, names in integration._METHOD_NAMES.items():
            self.assertEqual(sorted(names), sorted(const.CONTRACEPTION_METHODS), lang)
            self.assertTrue(all(isinstance(v, str) and v.strip() for v in names.values()), lang)

    def test_an_item_for_the_same_method_in_another_language_blocks_a_new_one(self) -> None:
        old = "Anna: contraception method (iud) may need renewal soon (2026-10-01)"
        self.assertEqual(self._check(_Hass("sv", existing=(old,))), [])

    def test_another_method_or_person_does_not_block(self) -> None:
        other = "Anna: contraception method (implant) may need renewal soon (2026-10-01)"
        self.assertEqual(len(self._check(_Hass("en", existing=(other,)))), 1)


class PillRefillTodoTests(unittest.TestCase):
    def _check(self, hass):
        entry = SimpleNamespace(options={const.CONF_PILL_PAUSE_DAYS: 7})
        runtime = SimpleNamespace(
            friendly_name="Test",
            noncycle_data={},
            symptom_history=[{"date": _iso(o), "contraception_method": "pill"} for o in range(-17, 1)],
        )
        with patch.object(integration.dt_util, "now", lambda: NOW[0]):
            _run(integration._async_check_pill_refill_todo(hass, entry, runtime))
        return hass.added

    def test_text_per_language(self) -> None:
        self.assertEqual(self._check(_Hass("en")), [f"Test: order a new pill pack (current one ends {_iso(3)})"])
        self.assertEqual(self._check(_Hass("de")), [f"Test: neue Pillenpackung bestellen (aktuelle endet am {_iso(3)})"])

    def test_the_same_pack_in_another_language_is_not_added_twice(self) -> None:
        self.assertEqual(self._check(_Hass("sv", existing=(f"Test: order a new pill pack (current one ends {_iso(3)})",))), [])

    def test_an_item_for_an_earlier_pack_does_not_block(self) -> None:
        old = "Test: order a new pill pack (current one ends 2026-09-08)"
        self.assertEqual(len(self._check(_Hass("en", existing=(old,)))), 1)


if __name__ == "__main__":
    unittest.main()
