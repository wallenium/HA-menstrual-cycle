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


def _log(day: str, method: str) -> dict:
    return {"date": day, "contraception_method": method}


class ContraceptionTimelineTests(unittest.TestCase):
    ENTRIES = [
        _log("2024-01-05", "pill"), _log("2024-01-06", "pill"), _log("2025-03-01", "pill"),
        _log("2025-04-10", "none"),
        _log("2025-06-01", "implant"), _log("2026-01-10", "implant"),
    ]

    def test_runs_of_the_same_method_are_merged_and_the_last_one_is_ongoing(self) -> None:
        runs = statistics.compute_contraception_timeline(self.ENTRIES)
        self.assertEqual(
            [(r["method"], r["since"], r["until"]) for r in runs],
            [("pill", "2024-01-05", "2025-03-01"), ("none", "2025-04-10", "2025-04-10"), ("implant", "2025-06-01", None)],
        )

    def test_unordered_input_and_junk_entries(self) -> None:
        junk = [*reversed(self.ENTRIES), "text", {"date": "2025-01-01"}, {"contraception_method": "pill"}, _log("", "pill")]
        self.assertEqual(statistics.compute_contraception_timeline(junk), statistics.compute_contraception_timeline(self.ENTRIES))
        self.assertEqual(statistics.compute_contraception_timeline([]), [])

    def test_only_the_newest_runs_are_kept(self) -> None:
        entries = [_log(f"2025-{m:02d}-01", "pill" if m % 2 else "condom") for m in range(1, 11)]
        runs = statistics.compute_contraception_timeline(entries, limit=3)
        self.assertEqual([r["since"] for r in runs], ["2025-08-01", "2025-09-01", "2025-10-01"])

    def test_a_confirmed_renewal_is_attached_to_its_run_only(self) -> None:
        renewed = {"method": "implant", "date": "2026-09-01"}
        runs = statistics.compute_contraception_timeline(self.ENTRIES, renewed)
        self.assertEqual([r["renewed_on"] for r in runs], [None, None, "2026-09-01"])
        for other in ({"method": "pill", "date": "2026-09-01"}, {"method": "implant", "date": "2020-01-01"}, {"method": "implant", "date": "bad"}, "x"):
            self.assertEqual([r["renewed_on"] for r in statistics.compute_contraception_timeline(self.ENTRIES, other)], [None, None, None], other)

    def test_the_report_shows_the_history_in_every_language(self) -> None:
        stats = statistics.compute_statistics(HISTORY, SYMPTOMS, days_back=180, today=TODAY, period_duration_days=5)
        timeline = statistics.compute_contraception_timeline(self.ENTRIES, {"method": "implant", "date": "2026-09-01"})
        expected = {
            "de": ("Verlauf der Verhütung", "laufend", "erneuert am 2026-09-01"),
            "en": ("Contraception history", "ongoing", "renewed 2026-09-01"),
            "es": ("Historial anticonceptivo", "en curso", "renovado el 2026-09-01"),
            "fr": ("Historique de contraception", "en cours", "renouvelé le 2026-09-01"),
            "sv": ("Preventivmedelshistorik", "pågår", "förnyat 2026-09-01"),
        }
        for lang, texts in expected.items():
            html = statistics.generate_doctor_report_html(
                stats=stats, history=HISTORY, symptom_history=SYMPTOMS, profile="anna", patient_name=None,
                patient_birthdate=None, language=lang, report_date=TODAY.isoformat(),
                current_contraception_method="implant", contraception_timeline=timeline,
            )
            for text in texts:
                self.assertIn(text, html, lang)
            self.assertIn("2024-01-05", html)
            self.assertIn("2025-03-01", html)

    def test_no_history_block_without_a_timeline(self) -> None:
        self.assertNotIn("Contraception history", _report("en"))

    def test_diaphragm_has_a_label_in_every_language(self) -> None:
        stats = statistics.compute_statistics(HISTORY, SYMPTOMS, days_back=180, today=TODAY, period_duration_days=5)
        for lang, label in (("de", "Diaphragma"), ("en", "Diaphragm"), ("es", "Diafragma"), ("fr", "Diaphragme"), ("sv", "Pessar")):
            html = statistics.generate_doctor_report_html(
                stats=stats, history=HISTORY, symptom_history=SYMPTOMS, profile="anna", patient_name=None,
                patient_birthdate=None, language=lang, report_date=TODAY.isoformat(), current_contraception_method="diaphragm",
            )
            self.assertIn(f"<td>{label}</td>", html, lang)
            self.assertNotIn("<td>diaphragm</td>", html if lang != "en" else "")


class IntermenstrualBleedingTests(unittest.TestCase):
    PERIOD = ["2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24"]

    def _stats(self, bleeding, history=None, days_back=180):
        symptoms = [{"date": d, "bleeding_strength": s} for d, s in bleeding]
        return statistics.compute_statistics(history or self.PERIOD, symptoms, days_back=days_back, today=TODAY)

    def test_bleeding_shortly_after_a_period_is_listed_with_its_strength(self) -> None:
        stats = self._stats([("2026-09-22", "heavy"), ("2026-10-02", "Light"), ("2026-10-04", "medium")])
        self.assertEqual(
            stats["intermenstrual_bleeding"],
            [{"date": "2026-10-02", "strength": "light"}, {"date": "2026-10-04", "strength": "medium"}],
        )
        self.assertEqual(stats["intermenstrual_bleeding_days"], 2)

    def test_the_14_day_boundary_none_future_and_range(self) -> None:
        stats = self._stats([("2026-10-06", "light"), ("2026-10-05", "none"), ("2026-10-04", "keine")])
        self.assertEqual([i["date"] for i in stats["intermenstrual_bleeding"]], ["2026-10-06"])
        # a period day exactly 14 days before still counts as "too close" (intermenstrual); 15 days is a missing period start
        self.assertEqual(len(self._stats([("2026-10-06", "light")], history=["2026-09-22"])["intermenstrual_bleeding"]), 1)
        self.assertEqual(self._stats([("2026-10-06", "light")], history=["2026-09-21"])["intermenstrual_bleeding"], [])
        # only the analysis range counts (cutoff 2026-10-03)
        self.assertEqual(self._stats([("2026-10-04", "light")], days_back=3)["intermenstrual_bleeding_days"], 1)
        self.assertEqual(self._stats([("2026-10-02", "light")], days_back=3)["intermenstrual_bleeding_days"], 0)
        # a future entry is ignored
        self.assertEqual(self._stats([("2026-10-07", "light")])["intermenstrual_bleeding_days"], 0)

    def test_no_history_and_no_bleeding(self) -> None:
        self.assertEqual(self._stats([], history=[])["intermenstrual_bleeding_days"], 0)
        self.assertEqual(self._stats([("2026-10-02", "")])["intermenstrual_bleeding"], [])

    def test_report_section_only_with_findings_in_every_language(self) -> None:
        stats = self._stats([("2026-10-02", "light")])
        empty = self._stats([])
        for lang in const.DOCTOR_REPORT_LANGUAGES:
            title = statistics._REPORT_TEXT[lang]["intermenstrual"]
            kwargs = dict(history=self.PERIOD, symptom_history=[], profile="a", patient_name=None, patient_birthdate=None,
                          language=lang, report_date=TODAY.isoformat())
            html = statistics.generate_doctor_report_html(stats=stats, **kwargs)
            self.assertIn(title, html, lang)
            self.assertIn("2026-10-02", html, lang)
            self.assertNotIn("{count}", html)
            self.assertNotIn(title, statistics.generate_doctor_report_html(stats=empty, **kwargs), lang)


if __name__ == "__main__":
    unittest.main()
