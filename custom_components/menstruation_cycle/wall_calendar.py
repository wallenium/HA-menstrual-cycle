"""Printable wall calendar: one year on one sheet (HTML, print it or "Print to PDF" in the browser).

Pure functions, no Home Assistant imports. The service in __init__.py collects the days; this module only draws them.
Logged period days are solid, expected ones outlined, estimated fertile days/ovulation green, symptoms a small dot.
"""

from __future__ import annotations

from datetime import date, timedelta
from html import escape
from typing import Any

WALL_CALENDAR_LANGUAGES = ("de", "en", "es", "fr", "sv")
WALL_CALENDAR_TITLE_MAX = 100

# Fields of a symptom entry that count for the small dot under a day (not temperature, tests, contraception, sex).
SYMPTOM_DOT_FIELDS = (
    "pain", "digestion", "skin", "energy_level", "sleep_quality", "mood", "breast", "urinary", "vulva_vagina", "hot_flashes",
)

_TEXT: dict[str, dict[str, Any]] = {
    "en": {
        "months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        "weekdays": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "period": "Period (logged)", "predicted": "Period (expected)", "fertile": "Fertile days (estimate)",
        "ovulation": "Ovulation (estimate)", "symptom": "Symptoms logged",
        "footer": "Based on your own entries - estimates only, no medical advice and no contraception method. Created {date}.",
        "rough": "The fertile days are a rough estimate (few logged cycles so far).",
    },
    "de": {
        "months": ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
        "weekdays": ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
        "period": "Periode (eingetragen)", "predicted": "Periode (erwartet)", "fertile": "Fruchtbare Tage (Schätzung)",
        "ovulation": "Eisprung (Schätzung)", "symptom": "Symptome eingetragen",
        "footer": "Auf Basis deiner eigenen Einträge - nur Schätzungen, keine medizinische Beratung und keine Verhütungsmethode. Erstellt am {date}.",
        "rough": "Die fruchtbaren Tage sind nur eine grobe Schätzung (bisher wenige protokollierte Zyklen).",
    },
    "fr": {
        "months": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
        "weekdays": ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"],
        "period": "Règles (enregistrées)", "predicted": "Règles (prévues)", "fertile": "Jours fertiles (estimation)",
        "ovulation": "Ovulation (estimation)", "symptom": "Symptômes enregistrés",
        "footer": "D'après vos propres entrées - simples estimations, ni conseil médical ni méthode de contraception. Créé le {date}.",
        "rough": "Les jours fertiles ne sont qu'une estimation approximative (peu de cycles enregistrés).",
    },
    "es": {
        "months": ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
        "weekdays": ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"],
        "period": "Regla (registrada)", "predicted": "Regla (prevista)", "fertile": "Días fértiles (estimación)",
        "ovulation": "Ovulación (estimación)", "symptom": "Síntomas registrados",
        "footer": "Basado en tus propios registros - solo estimaciones, sin consejo médico ni método anticonceptivo. Creado el {date}.",
        "rough": "Los días fértiles son solo una estimación aproximada (pocos ciclos registrados).",
    },
    "sv": {
        "months": ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"],
        "weekdays": ["mån", "tis", "ons", "tor", "fre", "lör", "sön"],
        "period": "Mens (loggad)", "predicted": "Mens (väntad)", "fertile": "Fertila dagar (uppskattning)",
        "ovulation": "Ägglossning (uppskattning)", "symptom": "Symtom loggade",
        "footer": "Baserat på dina egna anteckningar - bara uppskattningar, inga medicinska råd och ingen preventivmetod. Skapad {date}.",
        "rough": "De fertila dagarna är bara en grov uppskattning (få loggade cykler hittills).",
    },
}

_CSS = """
@page { size: A3 landscape; margin: 10mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0; padding: 16px; color: #222; background: #fff; }
h1 { text-align: center; margin: 0 0 14px; font-size: 28px; }
.year { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px 18px; }
.month h2 { margin: 0 0 4px; font-size: 16px; text-transform: capitalize; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th { font-size: 10px; color: #777; font-weight: 600; padding: 2px 0; }
td { height: 30px; text-align: center; vertical-align: top; font-size: 12px; padding: 2px 0; border: 1px solid #eee; position: relative; }
td.out { border-color: transparent; }
td .dot { display: block; width: 5px; height: 5px; border-radius: 50%; background: #6b4eff; margin: 1px auto 0; }
td.period { background: #e5484d; color: #fff; font-weight: 600; }
td.predicted { background: #fde4e4; box-shadow: inset 0 0 0 2px #e5484d; }
td.fertile { background: #d9f2df; }
td.ovulation { background: #2e9e5b; color: #fff; font-weight: 600; }
td.today { outline: 2px solid #222; outline-offset: -2px; font-weight: 700; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 22px; justify-content: center; margin: 16px 0 6px; font-size: 13px; }
.legend span::before { content: ""; display: inline-block; width: 14px; height: 14px; margin-right: 6px; vertical-align: -2px; border: 1px solid #ccc; }
.legend .l-period::before { background: #e5484d; border-color: #e5484d; }
.legend .l-predicted::before { background: #fde4e4; border: 2px solid #e5484d; }
.legend .l-fertile::before { background: #d9f2df; }
.legend .l-ovulation::before { background: #2e9e5b; border-color: #2e9e5b; }
.legend .l-symptom::before { width: 6px; height: 6px; border-radius: 50%; background: #6b4eff; border: 0; margin: 0 9px 0 4px; vertical-align: 2px; }
.note { text-align: center; font-size: 11px; color: #777; margin: 2px 0; }
@media (max-width: 900px) { .year { grid-template-columns: repeat(2, 1fr); } }
@media print { body { padding: 0; } .year { grid-template-columns: repeat(4, 1fr); } }
"""


def windows_to_days(windows: dict[str, Any] | None, year: int) -> tuple[set[date], set[date], set[date]]:
    """Days of the given year in the projected period windows, fertile windows and ovulation days of project_range_windows()."""
    periods: set[date] = set()
    fertile: set[date] = set()
    ovulation: set[date] = set()

    def _span(first: Any, last: Any, target: set[date]) -> None:
        try:
            day, end = date.fromisoformat(str(first)), date.fromisoformat(str(last))
        except ValueError:
            return
        while day <= end:
            if day.year == year:
                target.add(day)
            day += timedelta(days=1)

    for window in (windows or {}).get("period_windows", []):
        _span(window.get("start"), window.get("end"), periods)
    for window in (windows or {}).get("fertility_windows", []):
        _span(window.get("fertile_start"), window.get("fertile_end"), fertile)
        _span(window.get("ovulation"), window.get("ovulation"), ovulation)
    return periods, fertile, ovulation


def symptom_days(symptom_history: list[dict[str, Any]] | None, year: int) -> set[date]:
    """Days of the year with at least one everyday symptom (SYMPTOM_DOT_FIELDS) logged."""
    days: set[date] = set()
    for entry in symptom_history or []:
        if not isinstance(entry, dict) or not any(entry.get(field) not in (None, "", [], "none") for field in SYMPTOM_DOT_FIELDS):
            continue
        try:
            day = date.fromisoformat(str(entry.get("date")))
        except ValueError:
            continue
        if day.year == year:
            days.add(day)
    return days


def generate_wall_calendar_html(
    year: int,
    language: str,
    title: str,
    period_days: set[date],
    predicted_days: set[date],
    fertile_days: set[date],
    ovulation_days: set[date],
    symptoms: set[date],
    today: date,
    rough_estimate: bool = False,
) -> str:
    """The year poster as one self-contained HTML page."""
    text = _TEXT.get(str(language or "en").lower()[:2], _TEXT["en"])
    months = []
    for month in range(1, 13):
        rows = []
        first = date(year, month, 1)
        length = ((date(year + month // 12, month % 12 + 1, 1)) - first).days
        slots = [0] * first.weekday() + list(range(1, length + 1))
        slots += [0] * (-len(slots) % 7)
        for week in (slots[i:i + 7] for i in range(0, len(slots), 7)):
            cells = []
            for number in week:
                if not number:
                    cells.append('<td class="out"></td>')
                    continue
                day = date(year, month, number)
                classes = []
                if day in period_days:
                    classes.append("period")
                elif day in predicted_days:
                    classes.append("predicted")
                if day in ovulation_days:
                    classes.append("ovulation")
                elif day in fertile_days:
                    classes.append("fertile")
                if day == today:
                    classes.append("today")
                dot = '<span class="dot"></span>' if day in symptoms else ""
                cells.append(f'<td class="{" ".join(classes)}">{number}{dot}</td>')
            rows.append(f"<tr>{''.join(cells)}</tr>")
        head = "".join(f"<th>{escape(name)}</th>" for name in text["weekdays"])
        months.append(
            f'<section class="month"><h2>{escape(text["months"][month - 1])}</h2>'
            f"<table><thead><tr>{head}</tr></thead><tbody>{''.join(rows)}</tbody></table></section>"
        )
    legend = "".join(
        f'<span class="l-{key}">{escape(text[key])}</span>' for key in ("period", "predicted", "fertile", "ovulation", "symptom")
    )
    notes = [text["footer"].format(date=today.isoformat())]
    if rough_estimate and (fertile_days or ovulation_days):
        notes.insert(0, text["rough"])
    return (
        '<!DOCTYPE html>\n<html lang="{lang}"><head><meta charset="utf-8">'
        # nothing but inline styles may ever run or load here, even if some text were not escaped
        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        "<title>{title}</title><style>{css}</style></head><body>"
        "<h1>{title}</h1><div class=\"year\">{months}</div><div class=\"legend\">{legend}</div>{notes}</body></html>\n"
    ).format(
        lang=escape(str(language or "en")[:2]),
        title=escape(title),
        css=_CSS,
        months="".join(months),
        legend=legend,
        notes="".join(f'<p class="note">{escape(note)}</p>' for note in notes),
    )
