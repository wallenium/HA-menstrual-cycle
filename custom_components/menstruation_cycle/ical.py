"""iCalendar (ICS) feed generator for menstruation cycle predictions."""

from __future__ import annotations

import hashlib
from datetime import date, datetime, timedelta, timezone
from typing import Any

from .const import (
    CALENDAR_LOGGED_PERIODS_LOOKBACK_DAYS,
    CONF_CALENDAR_CONTRACEPTION_EVENTS,
    CONF_CALENDAR_LOGGED_PERIODS,
    CONF_CALENDAR_LUTEAL_FORECAST,
    CONF_CALENDAR_OVULATION_EVENTS,
    CONF_CALENDAR_PREGNANCY_EVENTS,
    CONF_PILL_PAUSE_DAYS,
    CONTRACEPTION_METHOD_PILL,
    DEFAULT_CALENDAR_CONTRACEPTION_EVENTS,
    DEFAULT_CALENDAR_LOGGED_PERIODS,
    DEFAULT_CALENDAR_LUTEAL_FORECAST,
    DEFAULT_CALENDAR_OVULATION_EVENTS,
    DEFAULT_CALENDAR_PREGNANCY_EVENTS,
    DEFAULT_PILL_PAUSE_DAYS,
    ICS_HORIZON_MONTHS_DEFAULT,
    ICS_HORIZON_MONTHS_MAX,
    NONCYCLE_CONTRACEPTION_RENEWED,
)
from .model import (
    analyze_nfp_cycle,
    bleeding_blocks,
    compute_contraception_status,
    contraception_rhythm_schedule,
    first_positive_lh_day,
    grouped_cycle_starts,
    pill_pack_end,
    project_range_windows,
)

_PRODID = "-//menstruation_cycle//HA Menstrual Cycle//EN"

# Small, self-contained translation table for the handful of strings an
# external calendar client (Google/Apple Calendar etc.) actually sees. This
# feed is fetched by calendar apps via a subscription URL, not through an
# authenticated HA session, so there's no per-request browser language to use
# — hass.config.language (how the HA instance itself is set up) is the only
# consistently-available signal, passed in by the caller as `lang`.
_ICS_STRINGS: dict[str, dict[str, str]] = {
    "en": {
        "calname": "Menstrual Cycle Predictions",
        "period": "Period (predicted)",
        "fertile_window": "Fertile window (predicted)",
        "ovulation": "Ovulation (predicted)",
        "checkup": "Routine checkup due",
        "pregnancy_due": "Due date (calculated)",
        "contraception_renewal": "Contraception: renewal due",
        "pill_pack_end": "Pill pack ends",
        "patch_change": "Change patch",
        "patch_remove": "Remove patch",
        "patch_new": "Apply new patch",
        "ring_remove": "Remove ring",
        "ring_insert": "Insert new ring",
        "source_predicted": "Source: predicted",
        "period_logged": "Period",
        "period_luteal": "Period (luteal phase forecast)",
        "source_logged": "Source: logged",
        "ovulation_logged": "Ovulation (from your logs)",
        "source_temp": "Source: temperature",
        "source_lh": "Source: ovulation test",
        "source_prefix": "Source",
        "confidence": "confidence",
    },
    "de": {
        "calname": "Zyklusvorhersagen",
        "period": "Periode (vorhergesagt)",
        "fertile_window": "Fruchtbares Fenster (vorhergesagt)",
        "ovulation": "Eisprung (vorhergesagt)",
        "checkup": "Routine-Vorsorge fällig",
        "pregnancy_due": "Entbindungstermin (berechnet)",
        "contraception_renewal": "Verhütung: Erneuerung fällig",
        "pill_pack_end": "Pillenpackung endet",
        "patch_change": "Pflaster wechseln",
        "patch_remove": "Pflaster entfernen",
        "patch_new": "Neues Pflaster aufkleben",
        "ring_remove": "Ring entfernen",
        "ring_insert": "Neuen Ring einsetzen",
        "source_predicted": "Quelle: Vorhersage",
        "period_logged": "Periode",
        "period_luteal": "Periode (Prognose aus Lutealphase)",
        "source_logged": "Quelle: erfasst",
        "ovulation_logged": "Eisprung (nach deinen Einträgen)",
        "source_temp": "Quelle: Temperatur",
        "source_lh": "Quelle: Ovulationstest",
        "source_prefix": "Quelle",
        "confidence": "Konfidenz",
    },
    "fr": {
        "calname": "Prévisions du cycle menstruel",
        "period": "Règles (prévu)",
        "fertile_window": "Fenêtre de fertilité (prévu)",
        "ovulation": "Ovulation (prévu)",
        "checkup": "Contrôle de routine à prévoir",
        "pregnancy_due": "Date prévue d'accouchement (calculée)",
        "contraception_renewal": "Contraception : renouvellement à prévoir",
        "pill_pack_end": "Fin de la plaquette de pilule",
        "patch_change": "Changer le patch",
        "patch_remove": "Retirer le patch",
        "patch_new": "Poser un nouveau patch",
        "ring_remove": "Retirer l'anneau",
        "ring_insert": "Insérer un nouvel anneau",
        "source_predicted": "Source : prévision",
        "period_logged": "Règles",
        "period_luteal": "Règles (prévision par phase lutéale)",
        "source_logged": "Source : enregistré",
        "ovulation_logged": "Ovulation (d'après tes saisies)",
        "source_temp": "Source : température",
        "source_lh": "Source : test d'ovulation",
        "source_prefix": "Source",
        "confidence": "confiance",
    },
    "es": {
        "calname": "Predicciones del ciclo menstrual",
        "period": "Menstruación (previsto)",
        "fertile_window": "Ventana fértil (previsto)",
        "ovulation": "Ovulación (previsto)",
        "checkup": "Revisión de rutina pendiente",
        "pregnancy_due": "Fecha prevista de parto (calculada)",
        "contraception_renewal": "Anticoncepción: renovación pendiente",
        "pill_pack_end": "Fin del envase de la píldora",
        "patch_change": "Cambiar el parche",
        "patch_remove": "Quitar el parche",
        "patch_new": "Poner un parche nuevo",
        "ring_remove": "Quitar el anillo",
        "ring_insert": "Colocar un anillo nuevo",
        "source_predicted": "Fuente: predicción",
        "period_logged": "Menstruación",
        "period_luteal": "Menstruación (previsión por fase lútea)",
        "source_logged": "Fuente: registrado",
        "ovulation_logged": "Ovulación (según tus registros)",
        "source_temp": "Fuente: temperatura",
        "source_lh": "Fuente: prueba de ovulación",
        "source_prefix": "Fuente",
        "confidence": "confianza",
    },
    "sv": {
        "calname": "Cykelprognoser",
        "period": "Mens (förutspått)",
        "fertile_window": "Fertilt fönster (förutspått)",
        "ovulation": "Ägglossning (förutspått)",
        "checkup": "Rutinkontroll aktuell",
        "pregnancy_due": "Beräknat förlossningsdatum",
        "contraception_renewal": "Preventivmedel: förnyelse aktuell",
        "pill_pack_end": "P-pillerkartan tar slut",
        "patch_change": "Byt plåster",
        "patch_remove": "Ta bort plåstret",
        "patch_new": "Sätt på nytt plåster",
        "ring_remove": "Ta bort ringen",
        "ring_insert": "Sätt in ny ring",
        "source_predicted": "Källa: prognos",
        "period_logged": "Mens",
        "period_luteal": "Mens (prognos via lutealfas)",
        "source_logged": "Källa: loggad",
        "ovulation_logged": "Ägglossning (enligt dina loggar)",
        "source_temp": "Källa: temperatur",
        "source_lh": "Källa: ägglossningstest",
        "source_prefix": "Källa",
        "confidence": "konfidens",
    },
}


def _ics_strings(lang: str | None) -> dict[str, str]:
    """Resolve the translation table for a language code, falling back to
    English for anything unset or unsupported. Only looks at the first two
    letters, so regional variants (e.g. "de-AT", "en-GB") still match."""
    key = str(lang or "en").strip().lower()[:2]
    return _ICS_STRINGS.get(key, _ICS_STRINGS["en"])


def collect_extra_events(
    options: Any,
    runtime: Any,
    due_date: str | None,
    lang: str | None,
    today: date,
    luteal_date: str | None = None,
) -> list[tuple[str, date, date, str]]:
    """Opt-in all-day events for the calendar entity and the ICS feed: (kind, first day, last day, summary).

    Pregnancy due date (only while pregnancy mode is on) and contraception dates (renewal due, end of the pill
    pack, next patch/ring steps) each follow their own option and are off by default. Summaries stay generic
    (no method name) because the ICS feed is shared via token. The luteal-phase period date (luteal_date, the
    model's luteal_forecast.predicted_start) is a fourth opt-in; it is left out once it lies in the past.
    """
    strings = _ics_strings(lang)
    events: list[tuple[str, date, date, str]] = []
    if options.get(CONF_CALENDAR_PREGNANCY_EVENTS, DEFAULT_CALENDAR_PREGNANCY_EVENTS) and due_date and runtime.pregnancy_data.get("is_pregnant"):
        try:
            due = date.fromisoformat(due_date)
            events.append(("pregnancy_due", due, due, strings["pregnancy_due"]))
        except ValueError:
            pass
    if options.get(CONF_CALENDAR_CONTRACEPTION_EVENTS, DEFAULT_CALENDAR_CONTRACEPTION_EVENTS):
        status = compute_contraception_status(
            runtime.symptom_history, today=today, renewed=runtime.noncycle_data.get(NONCYCLE_CONTRACEPTION_RENEWED)
        )
        if status["renewal_due_date"]:
            renewal = date.fromisoformat(status["renewal_due_date"])
            events.append(("contraception_renewal", renewal, renewal, strings["contraception_renewal"]))
        if status["current_method"] == CONTRACEPTION_METHOD_PILL:
            end = pill_pack_end(status, int(options.get(CONF_PILL_PAUSE_DAYS, DEFAULT_PILL_PAUSE_DAYS)))
            if end is not None:
                events.append(("pill_pack_end", end, end, strings["pill_pack_end"]))
        for day, event in contraception_rhythm_schedule(status, today):
            events.append((event, day, day, strings[event]))
    if options.get(CONF_CALENDAR_LOGGED_PERIODS, DEFAULT_CALENDAR_LOGGED_PERIODS):
        cutoff = today - timedelta(days=CALENDAR_LOGGED_PERIODS_LOOKBACK_DAYS)
        for block in bleeding_blocks(sorted(set(runtime.history))):
            start, end = date.fromisoformat(block[0]), date.fromisoformat(block[-1])
            if end >= cutoff:
                events.append(("period_logged", start, end, strings["period_logged"]))
    if options.get(CONF_CALENDAR_OVULATION_EVENTS, DEFAULT_CALENDAR_OVULATION_EVENTS):
        events.extend(_ovulation_events(runtime, today, strings))
    if options.get(CONF_CALENDAR_LUTEAL_FORECAST, DEFAULT_CALENDAR_LUTEAL_FORECAST) and luteal_date:
        predicted = date.fromisoformat(luteal_date)
        if predicted >= today:
            events.append(("period_luteal", predicted, predicted, strings["period_luteal"]))
    return events


# Source note shown in the description of the events built from the person's own logs.
_EVENT_SOURCE_KEYS = {"period_logged": "source_logged", "ovulation_temp": "source_temp", "ovulation_lh": "source_lh"}


def _ovulation_events(runtime: Any, today: date, strings: dict[str, str]) -> list[tuple[str, date, date, str]]:
    """One event per cycle of the last year whose ovulation the logs show: the temperature analysis if it
    detected one, else the day after the first positive ovulation test. Cycles without either are left out."""
    starts = grouped_cycle_starts(sorted(set(runtime.history)))
    cutoff = (today - timedelta(days=CALENDAR_LOGGED_PERIODS_LOOKBACK_DAYS)).isoformat()
    duration = int(getattr(runtime, "period_duration_days", 5) or 5)
    events: list[tuple[str, date, date, str]] = []
    for index, start in enumerate(starts):
        next_start = starts[index + 1] if index + 1 < len(starts) else None
        if next_start is not None and next_start < cutoff:
            continue
        # analyze_nfp_cycle reads everything after the start, so cut off the next cycle's entries
        symptoms = [entry for entry in runtime.symptom_history if next_start is None or str(entry.get("date", "")) < next_start]
        result = analyze_nfp_cycle(symptoms, start, duration)
        if result["ovulation_detected"] and result["ovulation_day"]:
            day, kind = date.fromisoformat(result["ovulation_day"]), "ovulation_temp"
        elif (lh_day := first_positive_lh_day(symptoms, start, date.max)) is not None:
            day, kind = lh_day + timedelta(days=1), "ovulation_lh"
        else:
            continue
        events.append((kind, day, day, strings["ovulation_logged"]))
    return events


def _format_date(d: date) -> str:
    """Format a date as ICS DATE value (YYYYMMDD)."""
    return d.strftime("%Y%m%d")


def _format_dtstamp(dt: datetime) -> str:
    """Format a datetime as ICS DTSTAMP (UTC, basic format)."""
    return dt.strftime("%Y%m%dT%H%M%SZ")


def _deterministic_uid(entry_id: str, event_type: str, start_date: str) -> str:
    """Generate a deterministic UID for an event so clients update instead of duplicating."""
    raw = f"{entry_id}-{event_type}-{start_date}"
    digest = hashlib.sha256(raw.encode()).hexdigest()[:24]
    return f"{digest}@menstruation_cycle.ha"


def _escape_ics_text(value: str) -> str:
    """Escape a value for an RFC 5545 TEXT property (SUMMARY/DESCRIPTION/...).

    Per RFC 5545 §3.3.11, backslash, comma, semicolon and newline are
    reserved and must be backslash-escaped. Order matters: backslash first,
    so escaping the other characters doesn't double-escape their own
    backslashes.
    """
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
    )


def _vevent_lines(
    uid: str,
    dtstamp: str,
    summary: str,
    start: date,
    end_exclusive: date,
    description: str = "",
    alarm_days_before: int | None = None,
) -> list[str]:
    """Build the lines for a VEVENT block.

    alarm_days_before (HA-Idee 2, "weitere Ideen fuer Features?" 28.09.2026):
    when set to a positive number, adds a VALARM so calendar apps that
    subscribe to this feed (Apple/Google Calendar, ...) can show their own
    native reminder ahead of the event, instead of relying purely on HA's
    separate notify_service push. Whole-day DATE events need an explicit
    DTSTART-relative trigger (VALUE=DATE-TIME with a negative duration would
    be ambiguous against a date-only DTSTART), so this uses TRIGGER;VALUE=
    DURATION:-P{n}D, which every mainstream calendar app resolves against
    the event's own start date.
    """
    lines = [
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{dtstamp}",
        f"LAST-MODIFIED:{dtstamp}",
        f"DTSTART;VALUE=DATE:{_format_date(start)}",
        f"DTEND;VALUE=DATE:{_format_date(end_exclusive)}",
        f"SUMMARY:{_escape_ics_text(summary)}",
    ]
    if description:
        lines.append(f"DESCRIPTION:{_escape_ics_text(description)}")
    if alarm_days_before and alarm_days_before > 0:
        lines.extend(
            [
                "BEGIN:VALARM",
                "ACTION:DISPLAY",
                f"DESCRIPTION:{_escape_ics_text(summary)}",
                f"TRIGGER;VALUE=DURATION:-P{alarm_days_before}D",
                "END:VALARM",
            ]
        )
    lines.append("END:VEVENT")
    return lines


def generate_ics(
    entry_id: str,
    period_forecast: dict[str, Any] | None,
    fertility_forecast: dict[str, Any] | None,
    avg_cycle_length: int | None = None,
    horizon_months: int = ICS_HORIZON_MONTHS_DEFAULT,
    lang: str | None = None,
    period_alarm_days_before: int | None = None,
    checkup_due: date | None = None,
    today: date | None = None,
    extra_events: list[tuple[str, date, date, str]] | None = None,
) -> bytes:
    """Generate RFC 5545-compatible VCALENDAR bytes for cycle predictions.

    Args:
        entry_id: Config entry ID used for deterministic UID generation.
        period_forecast: From compute_period_forecast().
        fertility_forecast: From compute_fertility_forecast().
        avg_cycle_length: Average cycle length in days (used for projection).
        horizon_months: Number of months to project forward (bounded to
            ICS_HORIZON_MONTHS_MAX).
        lang: Language code for calendar name/event text (e.g. "de", "en").
            Typically hass.config.language, since this feed is fetched by
            external calendar apps with no per-request browser language
            available. Falls back to English if unset/unsupported.

    Returns:
        UTF-8 encoded VCALENDAR bytes (CRLF line endings per RFC 5545).
    """
    strings = _ics_strings(lang)
    horizon_months = max(1, min(ICS_HORIZON_MONTHS_MAX, int(horizon_months)))
    today = today or date.today()
    range_end = today + timedelta(days=horizon_months * 31)

    dtstamp = _format_dtstamp(datetime.now(tz=timezone.utc))

    windows = project_range_windows(
        period_forecast=period_forecast,
        fertility_forecast=fertility_forecast,
        range_start_iso=today.isoformat(),
        range_end_iso=range_end.isoformat(),
        avg_cycle_length=avg_cycle_length,
    )

    lines: list[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:{_PRODID}",
        f"X-WR-CALNAME:{strings['calname']}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]

    if checkup_due is not None:
        lines.extend(
            _vevent_lines(
                uid=_deterministic_uid(entry_id, "checkup", checkup_due.isoformat()),
                dtstamp=dtstamp,
                summary=strings["checkup"],
                start=checkup_due,
                end_exclusive=checkup_due + timedelta(days=1),
            )
        )

    for kind, day, last_day, summary in extra_events or []:
        if day > range_end:
            continue
        lines.extend(
            _vevent_lines(
                uid=_deterministic_uid(entry_id, kind, day.isoformat()),
                dtstamp=dtstamp,
                summary=summary,
                start=day,
                end_exclusive=last_day + timedelta(days=1),
                description=strings[_EVENT_SOURCE_KEYS[kind]] if kind in _EVENT_SOURCE_KEYS else "",
            )
        )

    if windows:
        period_confidence = (period_forecast or {}).get("confidence", "")
        fertility_confidence = (fertility_forecast or {}).get("confidence", "")
        fertility_source = (fertility_forecast or {}).get("source", "estimated")

        for window in windows.get("period_windows", []):
            try:
                p_start = date.fromisoformat(str(window["start"]))
                p_end = date.fromisoformat(str(window["end"]))
            except (KeyError, TypeError, ValueError):
                continue
            uid = _deterministic_uid(entry_id, "period", window["start"])
            desc = strings["source_predicted"]
            if period_confidence:
                desc += f"; {strings['confidence']}: {period_confidence}"
            lines.extend(
                _vevent_lines(
                    uid=uid,
                    dtstamp=dtstamp,
                    summary=strings["period"],
                    start=p_start,
                    end_exclusive=p_end + timedelta(days=1),
                    description=desc,
                    alarm_days_before=period_alarm_days_before,
                )
            )

        for window in windows.get("fertility_windows", []):
            try:
                f_start = date.fromisoformat(str(window["fertile_start"]))
                f_end = date.fromisoformat(str(window["fertile_end"]))
                ov = date.fromisoformat(str(window["ovulation"]))
            except (KeyError, TypeError, ValueError):
                continue

            fw_uid = _deterministic_uid(entry_id, "fertile", window["fertile_start"])
            fw_desc = f"{strings['source_prefix']}: {fertility_source}"
            if fertility_confidence:
                fw_desc += f"; {strings['confidence']}: {fertility_confidence}"
            lines.extend(
                _vevent_lines(
                    uid=fw_uid,
                    dtstamp=dtstamp,
                    summary=strings["fertile_window"],
                    start=f_start,
                    end_exclusive=f_end + timedelta(days=1),
                    description=fw_desc,
                )
            )

            ov_uid = _deterministic_uid(entry_id, "ovulation", window["ovulation"])
            ov_desc = f"{strings['source_prefix']}: {fertility_source}"
            if fertility_confidence:
                ov_desc += f"; {strings['confidence']}: {fertility_confidence}"
            lines.extend(
                _vevent_lines(
                    uid=ov_uid,
                    dtstamp=dtstamp,
                    summary=strings["ovulation"],
                    start=ov,
                    end_exclusive=ov + timedelta(days=1),
                    description=ov_desc,
                )
            )

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines).encode("utf-8")
