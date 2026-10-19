"""Printable wall calendar (wall_calendar.py)."""

from __future__ import annotations

import importlib.util
import re
import sys
import types
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

COMPONENT_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
_PKG = "tstest_wall_calendar"


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
    _load("const", "const.py")
    wall = _load("wall_calendar", "wall_calendar.py")

TODAY = date(2026, 10, 4)


def _html(**kw):
    args = dict(year=2026, language="en", title="Anna 2026", period_days=set(), predicted_days=set(), fertile_days=set(),
                ovulation_days=set(), symptoms=set(), today=TODAY, rough_estimate=False)
    args.update(kw)
    return wall.generate_wall_calendar_html(**args)


def _count(html: str, cls: str) -> int:
    return len(re.findall(rf'<td class="[^"]*\b{cls}\b[^"]*">', html))


class WallCalendarHtmlTests(unittest.TestCase):
    def test_every_day_of_the_year_appears_once(self) -> None:
        html = _html()
        cells = re.findall(r'<td class="[^"]*">(\d+)', html)
        self.assertEqual(len(cells), 365)
        self.assertEqual(len(re.findall(r"<section class=\"month\">", html)), 12)
        self.assertEqual(len(re.findall(r'<td class="[^"]*">(\d+)', _html(year=2028))), 366)

    def test_weeks_start_on_monday(self) -> None:
        html = _html()
        self.assertIn("<th>Mon</th><th>Tue</th>", html)
        # 1 January 2026 is a Thursday: three empty cells come first in the first row of January
        january = html[html.index("January"):html.index("February")]
        self.assertTrue(january.split("<tbody><tr>")[1].startswith('<td class="out"></td>' * 3 + '<td class="">1</td>'))

    def test_classes_and_precedence(self) -> None:
        d = date
        html = _html(
            period_days={d(2026, 3, 1), d(2026, 3, 2)}, predicted_days={d(2026, 11, 1), d(2026, 3, 2)},
            fertile_days={d(2026, 11, 10), d(2026, 11, 11)}, ovulation_days={d(2026, 11, 11)},
            symptoms={d(2026, 3, 1), d(2027, 3, 1)},
        )
        self.assertEqual(_count(html, "period"), 2)
        self.assertEqual(_count(html, "predicted"), 1)  # a logged day wins over the expectation
        self.assertEqual(_count(html, "fertile"), 1)  # the ovulation day is not also drawn as fertile
        self.assertEqual(_count(html, "ovulation"), 1)
        self.assertEqual(html.count('class="dot"'), 1)  # other years do not show
        self.assertEqual(_count(html, "today"), 1)
        self.assertEqual(_count(_html(today=date(2027, 1, 1)), "today"), 0)

    def test_page_forbids_scripts_and_external_loads(self) -> None:
        html = _html()
        self.assertIn("Content-Security-Policy", html)
        self.assertIn("default-src 'none'", html)
        self.assertNotRegex(html.lower(), r"<script|<link|<img|<iframe|src=|href=|javascript:")

    def test_title_is_escaped(self) -> None:
        html = _html(title='<script>alert("x")</script>')
        self.assertNotIn("<script>", html)
        self.assertIn("&lt;script&gt;", html)

    def test_every_language_has_every_text(self) -> None:
        keys = set(wall._TEXT["en"])
        for lang in wall.WALL_CALENDAR_LANGUAGES:
            self.assertEqual(set(wall._TEXT[lang]), keys, lang)
            self.assertEqual(len(wall._TEXT[lang]["months"]), 12)
            self.assertEqual(len(wall._TEXT[lang]["weekdays"]), 7)
            html = _html(language=lang)
            self.assertIn(wall._TEXT[lang]["months"][9], html)
            self.assertIn(f'lang="{lang}"', html)
        self.assertIn("Oktober", _html(language="de-AT"[:2]))
        self.assertIn("October", _html(language="xx"))

    def test_rough_note_only_when_fertile_days_are_drawn(self) -> None:
        note = wall._TEXT["en"]["rough"]
        self.assertNotIn(note, _html(rough_estimate=True))
        self.assertIn(note, _html(rough_estimate=True, fertile_days={date(2026, 11, 10)}))
        self.assertNotIn(note, _html(rough_estimate=False, fertile_days={date(2026, 11, 10)}))


class WallCalendarDaysTests(unittest.TestCase):
    def test_windows_are_cut_to_the_year(self) -> None:
        windows = {
            "period_windows": [{"start": "2026-12-30", "end": "2027-01-02"}, {"start": "bad", "end": "x"}],
            "fertility_windows": [{"fertile_start": "2026-12-31", "fertile_end": "2027-01-01", "ovulation": "2027-01-01"}],
        }
        periods, fertile, ovulation = wall.windows_to_days(windows, 2026)
        self.assertEqual(periods, {date(2026, 12, 30), date(2026, 12, 31)})
        self.assertEqual((fertile, ovulation), ({date(2026, 12, 31)}, set()))
        self.assertEqual(wall.windows_to_days(None, 2026), (set(), set(), set()))

    def test_symptom_days_count_everyday_symptoms_only(self) -> None:
        history = [
            {"date": "2026-03-01", "pain": ["cramps"]},
            {"date": "2026-03-02", "mood": "good"},
            {"date": "2026-03-03", "basal_temp": 36.5, "contraception_method": "pill"},
            {"date": "2026-03-04", "pain": [], "skin": "none"},
            {"date": "2025-03-01", "pain": ["cramps"]},
            {"date": "junk", "pain": ["cramps"]},
            "not a dict",
        ]
        self.assertEqual(wall.symptom_days(history, 2026), {date(2026, 3, 1), date(2026, 3, 2)})
        self.assertEqual(wall.symptom_days(None, 2026), set())


if __name__ == "__main__":
    unittest.main()
