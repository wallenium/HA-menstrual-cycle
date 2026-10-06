"""Every translation file must have exactly the keys of its source file (no silent fallback to English)."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
LANGS = ("de", "en", "es", "fr", "sv")


def _keys(data: dict, prefix: str = "") -> set[str]:
    out: set[str] = set()
    for key, value in data.items():
        out |= _keys(value, f"{prefix}{key}.") if isinstance(value, dict) else {f"{prefix}{key}"}
    return out


def _load(path: Path) -> set[str]:
    return _keys(json.loads(path.read_text(encoding="utf-8")))


class TranslationParityTests(unittest.TestCase):
    def _compare(self, source: Path, files: list[Path]) -> None:
        expected = _load(source)
        self.assertGreater(len(expected), 100)
        problems = []
        for path in files:
            keys = _load(path)
            problems += [f"{path.name}: missing {k}" for k in sorted(expected - keys)]
            problems += [f"{path.name}: unknown {k}" for k in sorted(keys - expected)]
        self.assertEqual(problems, [])

    def test_integration_translations_match_strings_json(self) -> None:
        self._compare(ROOT / "strings.json", [ROOT / "translations" / f"{lang}.json" for lang in LANGS])

    def test_panel_translations_match_german_source(self) -> None:
        folder = ROOT / "www" / "translations"
        self._compare(folder / "de.json", [folder / f"{lang}.json" for lang in LANGS if lang != "de"])


if __name__ == "__main__":
    unittest.main()
