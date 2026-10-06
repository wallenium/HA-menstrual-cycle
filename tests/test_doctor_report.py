"""The doctor report must be complete and fully translated in every language it offers."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

COMPONENT_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
_PKG = "tstest_doctor_report"
TODAY = date(2026, 10, 6)


def _load(module_name: str, file_name: str) -> types.ModuleType:
    spec = importlib.util.spec_from_file_location(f"{_PKG}.{module_name}", COMPONENT_ROOT / file_name)
    module = importlib.util.module_from_spec(spec)
    sys.modules[f"{_PKG}.{module_name}"] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


with patch.dict(sys.modules):
    _package = types.ModuleType(_PKG)
    _package.__path__ = [str(COMPONENT_ROOT)]
    sys.modules[_PKG] = _package
    const = _load("const", "const.py")
    _load("model", "model.py")
    statistics = _load("statistics", "statistics.py")

HISTORY = ["2026-05-01", "2026-05-30", "2026-06-28", "2026-07-27", "2026-08-25", "2026-09-23"]
SYMPTOMS = [
    {"date": "2026-09-23", "bleeding_strength": "heavy", "pain": ["cramps"], "hygiene": ["tampon"]},
    {"date": "2026-09-24", "bleeding_strength": "light", "pain": ["headache"], "cervical_mucus": "klebrig"},
]


def _report(language: str, contraception: str | None = "pill") -> str:
    stats = statistics.compute_statistics(HISTORY, SYMPTOMS, days_back=180, today=TODAY, period_duration_days=5)
    return statistics.generate_doctor_report_html(
        stats=stats, history=HISTORY, symptom_history=SYMPTOMS, profile="anna", patient_name="Anna",
        patient_birthdate="1990-05-17", language=language, report_date=TODAY.isoformat(),
        current_contraception_method=contraception,
    )


class DoctorReportTests(unittest.TestCase):
    def test_every_language_has_every_text(self) -> None:
        texts = statistics._REPORT_TEXT
        self.assertEqual(set(texts), set(const.DOCTOR_REPORT_LANGUAGES))
        for lang, entries in texts.items():
            self.assertEqual(set(entries), set(texts["en"]), f"{lang} differs from the English texts")
            self.assertTrue(all(str(v).strip() for v in entries.values()), lang)

    def test_every_label_has_every_language(self) -> None:
        wanted = set(const.DOCTOR_REPORT_LANGUAGES)
        for name in ("_REGULARITY_LABELS", "_BLEEDING_STRENGTH_LABELS", "_SYMPTOM_KEY_LABELS"):
            labels = getattr(statistics, name)
            self.assertGreater(len(labels), 2, name)
            for key, entry in labels.items():
                self.assertEqual(set(entry), wanted, f"{name}[{key}]")

    def test_report_is_written_in_the_requested_language(self) -> None:
        titles = {lang: statistics._REPORT_TEXT[lang]["title"] for lang in const.DOCTOR_REPORT_LANGUAGES}
        self.assertEqual(len(set(titles.values())), len(titles))
        for lang, title in titles.items():
            html = _report(lang)
            self.assertIn(f'<html lang="{lang}">', html)
            self.assertIn(title, html)
            self.assertNotIn("{days_back}", html)
            self.assertNotIn("{cycles}", html)

    def test_symptom_and_contraception_labels_are_translated(self) -> None:
        self.assertIn("Píldora", _report("es"))
        self.assertIn("Calambres", _report("es"))
        self.assertIn("P-piller", _report("sv"))
        self.assertIn("Crampes", _report("fr"))

    def test_other_languages_never_show_german_labels(self) -> None:
        for lang in ("en", "es", "fr", "sv"):
            html = _report(lang)
            for german in ("Zykluslänge", "Hormonspirale", "Krämpfe", "Stark"):
                self.assertNotIn(german, html, f"{lang} report contains {german}")

    def test_region_codes_and_unknown_languages(self) -> None:
        self.assertIn('<html lang="sv">', _report("sv-SE"))
        self.assertIn('<html lang="es">', _report("ES_mx"))
        self.assertIn('<html lang="en">', _report("pt"))


if __name__ == "__main__":
    unittest.main()
