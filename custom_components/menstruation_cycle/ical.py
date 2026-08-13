"""iCalendar (ICS) feed generator for menstruation cycle predictions."""

from __future__ import annotations

import hashlib
from datetime import date, datetime, timedelta, timezone
from typing import Any

from .const import ICS_HORIZON_MONTHS_DEFAULT, ICS_HORIZON_MONTHS_MAX
from .model import project_range_windows

_PRODID = "-//menstruation_cycle//HA Menstrual Cycle//EN"
_CALNAME = "Menstrual Cycle Predictions"


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


def _vevent_lines(
    uid: str,
    dtstamp: str,
    summary: str,
    start: date,
    end_exclusive: date,
    description: str = "",
) -> list[str]:
    """Build the lines for a VEVENT block."""
    lines = [
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{dtstamp}",
        f"LAST-MODIFIED:{dtstamp}",
        f"DTSTART;VALUE=DATE:{_format_date(start)}",
        f"DTEND;VALUE=DATE:{_format_date(end_exclusive)}",
        f"SUMMARY:{summary}",
    ]
    if description:
        lines.append(f"DESCRIPTION:{description}")
    lines.append("END:VEVENT")
    return lines


def generate_ics(
    entry_id: str,
    period_forecast: dict[str, Any] | None,
    fertility_forecast: dict[str, Any] | None,
    avg_cycle_length: int | None = None,
    horizon_months: int = ICS_HORIZON_MONTHS_DEFAULT,
) -> bytes:
    """Generate RFC 5545-compatible VCALENDAR bytes for cycle predictions.

    Args:
        entry_id: Config entry ID used for deterministic UID generation.
        period_forecast: From compute_period_forecast().
        fertility_forecast: From compute_fertility_forecast().
        avg_cycle_length: Average cycle length in days (used for projection).
        horizon_months: Number of months to project forward (bounded to
            ICS_HORIZON_MONTHS_MAX).

    Returns:
        UTF-8 encoded VCALENDAR bytes (CRLF line endings per RFC 5545).
    """
    horizon_months = max(1, min(ICS_HORIZON_MONTHS_MAX, int(horizon_months)))
    today = date.today()
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
        f"X-WR-CALNAME:{_CALNAME}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]

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
            desc = f"Source: predicted"
            if period_confidence:
                desc += f"; confidence: {period_confidence}"
            lines.extend(
                _vevent_lines(
                    uid=uid,
                    dtstamp=dtstamp,
                    summary="Period (predicted)",
                    start=p_start,
                    end_exclusive=p_end + timedelta(days=1),
                    description=desc,
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
            fw_desc = f"Source: {fertility_source}"
            if fertility_confidence:
                fw_desc += f"; confidence: {fertility_confidence}"
            lines.extend(
                _vevent_lines(
                    uid=fw_uid,
                    dtstamp=dtstamp,
                    summary="Fertile window (predicted)",
                    start=f_start,
                    end_exclusive=f_end + timedelta(days=1),
                    description=fw_desc,
                )
            )

            ov_uid = _deterministic_uid(entry_id, "ovulation", window["ovulation"])
            ov_desc = f"Source: {fertility_source}"
            if fertility_confidence:
                ov_desc += f"; confidence: {fertility_confidence}"
            lines.extend(
                _vevent_lines(
                    uid=ov_uid,
                    dtstamp=dtstamp,
                    summary="Ovulation (predicted)",
                    start=ov,
                    end_exclusive=ov + timedelta(days=1),
                    description=ov_desc,
                )
            )

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines).encode("utf-8")
