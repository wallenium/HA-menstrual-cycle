"""The texts as Home Assistant's own loader hands them out, in every language: nothing is dropped, nothing falls back to English."""
import json
from pathlib import Path

import pytest
from homeassistant.helpers.translation import async_get_translations

from test_real_ha import DOMAIN, _add_profile

FOLDER = Path(__file__).resolve().parents[2] / "custom_components" / DOMAIN / "translations"
LANGS = ("en", "de", "es", "fr", "sv")
CATEGORIES = ("config", "options", "issues", "services", "entity", "selector", "exceptions", "device")


def _flat(data, prefix=""):
    out = {}
    for key, value in data.items():
        out.update(_flat(value, f"{prefix}{key}.") if isinstance(value, dict) else {f"{prefix}{key}": value})
    return out


@pytest.mark.parametrize("lang", LANGS)
async def test_the_loader_hands_out_every_text_of_the_file(hass, lang):
    await _add_profile(hass)
    file = json.loads((FOLDER / f"{lang}.json").read_text(encoding="utf-8"))
    problems = []
    for category in CATEGORIES:
        expected = {f"component.{DOMAIN}.{category}.{k}": v for k, v in _flat(file.get(category, {})).items()}
        loaded = {k: v for k, v in (await async_get_translations(hass, lang, category, [DOMAIN])).items() if k.startswith(f"component.{DOMAIN}.{category}.")}
        problems += [f"{category}: not loaded: {k}" for k in expected.keys() - loaded.keys()]
        problems += [f"{category}: different text for {k}" for k in expected.keys() & loaded.keys() if expected[k] != loaded[k]]
    assert problems == []
    assert any(file.get(c) for c in CATEGORIES)


async def test_no_language_is_secretly_english(hass):
    """Texts that are identical to English are fine for names (Pill, Tampon), but a language must not be mostly a copy."""
    await _add_profile(hass)
    english = _flat(json.loads((FOLDER / "en.json").read_text(encoding="utf-8")))
    for lang in LANGS[1:]:
        texts = _flat(json.loads((FOLDER / f"{lang}.json").read_text(encoding="utf-8")))
        same = [k for k, v in texts.items() if v == english.get(k) and len(v) > 40]
        assert len(same) < 0.03 * len(texts), f"{lang}: {len(same)} long texts are identical to English, e.g. {same[:3]}"
