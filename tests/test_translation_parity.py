"""Every translation file must have exactly the keys of its source file (no silent fallback to English)."""

from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
LANGS = ("de", "en", "es", "fr", "sv")


def _keys(data: dict, prefix: str = "") -> set[str]:
    out: set[str] = set()
    for key, value in data.items():
        out |= _keys(value, f"{prefix}{key}.") if isinstance(value, dict) else {f"{prefix}{key}"}
    return out


# `title` is a different text in every card, so it cannot live in the shared files.
SHARED_FILE_EXCEPTIONS = {"title"}


def _inline_english_keys(source: str) -> dict[str, str]:
    """Keys of the `en: {...}` blocks and PANEL_FALLBACK_EN that the cards ship inside their JS."""
    found: dict[str, str] = {}
    for match in re.finditer(r"\ben:\s*\{|PANEL_FALLBACK_EN\s*=\s*\{", source):
        depth, index, quote = 1, match.end(), None
        while depth and index < len(source):
            char = source[index]
            if quote:
                if char == "\\":
                    index += 1
                elif char == quote:
                    quote = None
            elif char in "'\"`":
                quote = char
            elif char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
            index += 1
        block = source[match.end() : index - 1]
        for entry in re.finditer(r"^\s*([A-Za-z_]\w*)\s*:\s*(?:'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")\s*,?\s*$", block, re.M):
            found[entry.group(1)] = entry.group(0)
    return found


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

    def test_every_text_a_card_ships_in_english_is_in_the_shared_translation_files(self) -> None:
        folder = ROOT / "www" / "translations"
        shared = {lang: set(json.loads((folder / f"{lang}.json").read_text(encoding="utf-8"))) for lang in LANGS}
        problems = []
        checked = 0
        for js_file in sorted((ROOT / "www").glob("*.js")):
            for key in _inline_english_keys(js_file.read_text(encoding="utf-8")):
                if key in SHARED_FILE_EXCEPTIONS:
                    continue
                checked += 1
                problems += [f"{js_file.name}: {key} missing in {lang}.json" for lang in LANGS if key not in shared[lang]]
        self.assertGreater(checked, 500)
        self.assertEqual(problems, [])

    def test_every_service_and_field_in_services_yaml_has_a_name_and_description_in_every_language(self) -> None:
        text = (ROOT / "services.yaml").read_text(encoding="utf-8")
        services: dict[str, list[str]] = {}
        for block in re.split(r"^(?=[a-z_]+:\s*$)", text, flags=re.M):
            head = re.match(r"([a-z_]+):", block)
            if head:
                fields = re.search(r"^  fields:\n(.*)", block, re.S | re.M)
                services[head.group(1)] = re.findall(r"^    ([a-z_]+):", fields.group(1), re.M) if fields else []
        self.assertGreater(len(services), 30)
        problems = []
        for name in ["strings.json", *(f"translations/{lang}.json" for lang in LANGS)]:
            translated = json.loads((ROOT / name).read_text(encoding="utf-8"))["services"]
            for service, fields in services.items():
                entry = translated.get(service, {})
                for label in ("name", "description"):
                    if not str(entry.get(label, "")).strip():
                        problems.append(f"{name}: service {service} has no {label}")
                for field in fields:
                    for label in ("name", "description"):
                        if not str(entry.get("fields", {}).get(field, {}).get(label, "")).strip():
                            problems.append(f"{name}: {service}.{field} has no {label}")
        self.assertEqual(problems, [])

    def test_every_service_select_has_translated_option_labels(self) -> None:
        text = (ROOT / "services.yaml").read_text(encoding="utf-8")
        selects = re.findall(r"^        select:\n((?:          .*\n)+)", text, re.M)
        self.assertGreater(len(selects), 8)
        problems = []
        for name in ["strings.json", *(f"translations/{lang}.json" for lang in LANGS)]:
            translated = json.loads((ROOT / name).read_text(encoding="utf-8"))["selector"]
            for block in selects:
                key = re.search(r"translation_key:\s*(\w+)", block)
                if key is None:
                    problems.append(f"{name}: a select has no translation_key: {block.strip()[:60]!r}")
                    continue
                for option in re.findall(r"^\s+- \"?([\w-]+)\"?\s*$", block, re.M):
                    if not str(translated.get(key.group(1), {}).get("options", {}).get(option, "")).strip():
                        problems.append(f"{name}: selector {key.group(1)} has no label for {option}")
        self.assertEqual(problems, [])

    def test_no_text_looks_like_html(self) -> None:
        """hassfest rejects any string with <...>, so placeholders like <config> must not appear."""
        problems = []

        def walk(node, where):
            if isinstance(node, dict):
                for key, value in node.items():
                    walk(value, f"{where}.{key}")
            elif isinstance(node, str) and re.search(r"<.+>", node):
                problems.append(f"{where}: {node[:60]!r}")

        for name in ["strings.json", *(f"translations/{lang}.json" for lang in LANGS)]:
            walk(json.loads((ROOT / name).read_text(encoding="utf-8")), name)
        self.assertEqual(problems, [])


if __name__ == "__main__":
    unittest.main()
