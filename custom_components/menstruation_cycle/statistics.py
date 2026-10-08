"""Statistics computation and doctor report generation for menstruation gauge."""

from __future__ import annotations

import html
import logging
from collections import Counter
from datetime import date, timedelta
from statistics import mean, stdev
from typing import Any

from .const import (
    DOCTOR_REPORT_LANGUAGES,
    LH_TEMP_LAG_PLAUSIBLE_DAYS,
    LUTEAL_PHASE_PLAUSIBLE_DAYS,
    NEW_PERIOD_MIN_GAP_DAYS,
    PREDICTION_ACCURACY_CYCLES,
    SYMPTOM_CONTRACEPTION_METHOD,
)
from .model import (
    analyze_nfp_cycle,
    bleeding_blocks,
    build_cycle_model,
    first_positive_lh_day,
    grouped_cycle_starts,
    normalize_history,
)

_LOGGER = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_iso(value: Any) -> date | None:
    """Safely parse an ISO date string."""
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None


def _symptom_entries_in_range(
    symptom_history: list[dict[str, Any]],
    start: date,
    end: date,
) -> list[dict[str, Any]]:
    """Return symptom entries whose date falls in [start, end]."""
    result = []
    for entry in symptom_history:
        d = _parse_iso(entry.get("date"))
        if d is not None and start <= d <= end:
            result.append(entry)
    return result


def _coerce_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(v) for v in value]
    if isinstance(value, str) and value:
        return [value]
    return []


# ---------------------------------------------------------------------------
# Statistics computation
# ---------------------------------------------------------------------------

def _compute_cycle_length_stats(
    grouped_starts: list[str],
    cutoff: date,
) -> dict[str, Any]:
    """Compute cycle length statistics for completed cycles since cutoff."""
    valid_starts = [s for s in grouped_starts if _parse_iso(s) is not None]
    lengths: list[int] = []
    for i in range(1, len(valid_starts)):
        s0 = _parse_iso(valid_starts[i - 1])
        s1 = _parse_iso(valid_starts[i])
        if s0 is None or s1 is None:
            continue
        if s0 < cutoff:
            continue
        length = (s1 - s0).days
        if 10 < length < 80:
            lengths.append(length)

    if not lengths:
        return {"cycles_analyzed": 0}

    avg = round(mean(lengths), 1)
    std = round(stdev(lengths), 1) if len(lengths) >= 2 else 0.0

    regularity: str
    if std <= 2:
        regularity = "very_regular"
    elif std <= 5:
        regularity = "regular"
    else:
        regularity = "irregular"

    return {
        "cycles_analyzed": len(lengths),
        "avg_cycle_length": avg,
        "min_cycle_length": min(lengths),
        "max_cycle_length": max(lengths),
        "std_cycle_length": std,
        "regularity": regularity,
        "cycle_lengths": lengths,
    }


def _build_cycle_periods(
    grouped_starts: list[str],
    cutoff: date,
    today: date,
) -> list[tuple[date, date, str]]:
    """Build (start, end, start_iso) tuples for cycles since cutoff."""
    periods: list[tuple[date, date, str]] = []
    valid = [s for s in grouped_starts if _parse_iso(s) is not None]
    for i, start_iso in enumerate(valid):
        start_d = _parse_iso(start_iso)
        if start_d is None or start_d < cutoff:
            continue
        if i + 1 < len(valid):
            next_d = _parse_iso(valid[i + 1])
            if next_d is None:
                continue
            end_d = min(today, next_d - timedelta(days=1))
        else:
            end_d = today
        if end_d >= start_d:
            periods.append((start_d, end_d, start_iso))
    return periods


def _compute_bleeding_duration_stats(
    history: list[str],
    cutoff: date,
) -> dict[str, Any]:
    """Compute bleeding duration statistics from the raw history."""
    blocks = bleeding_blocks(history)
    durations: list[int] = []
    for block in blocks:
        dates = sorted(_parse_iso(d) for d in block if _parse_iso(d) is not None)  # type: ignore[type-var]
        if not dates:
            continue
        first = dates[0]
        if first < cutoff:
            continue
        last = dates[-1]
        durations.append((last - first).days + 1)

    if not durations:
        return {}

    return {
        "avg_bleeding_duration": round(mean(durations), 1),
        "min_bleeding_duration": min(durations),
        "max_bleeding_duration": max(durations),
    }


def _compute_intermenstrual_bleeding(
    period_days: list[str],
    symptom_history: list[dict[str, Any]],
    cutoff: date,
    today: date,
) -> dict[str, Any]:
    """Bleeding logged outside the period: no period day, but one in the NEW_PERIOD_MIN_GAP_DAYS before it.

    Same rule as when logging bleeding (shortly after a period it does not start a new one). Bleeding
    further away than that is a missing period start, not intermenstrual bleeding, and is left out here.
    """
    logged = set(period_days)
    days = [d for d in map(_parse_iso, period_days) if d is not None]
    found: dict[str, str] = {}
    for entry in symptom_history:
        day = _parse_iso(entry.get("date"))
        strength = str(entry.get("bleeding_strength", "")).strip().lower()
        if day is None or not (cutoff <= day <= today) or strength in {"", "none", "keine"} or day.isoformat() in logged:
            continue
        if any(day - timedelta(days=NEW_PERIOD_MIN_GAP_DAYS) <= d < day for d in days):
            found[day.isoformat()] = strength
    items = [{"date": d, "strength": s} for d, s in sorted(found.items())]
    return {"intermenstrual_bleeding_days": len(items), "intermenstrual_bleeding": items}


def _compute_symptom_stats(
    symptom_history: list[dict[str, Any]],
    periods: list[tuple[date, date, str]],
) -> dict[str, Any]:
    """Compute symptom statistics across the given cycle periods."""
    if not periods:
        return {}

    symptom_counter: Counter[str] = Counter()
    pain_per_cycle: list[float] = []
    bleeding_strength_counter: Counter[str] = Counter()

    # Nachtrag (17.09.2026): dieselbe Lücke wie zuvor in DoctorReportData.swift
    # (App-Seite) - beide Schleifen unten kannten ursprünglich nur die Felder,
    # die beim jeweils letzten Ausbau von _compute_symptom_stats() existierten,
    # und wurden bei jedem neuen SYMPTOM_*-Feld seither nicht mitgezogen.
    # Einzelwert-Liste ergänzt um bleeding_type, training_intensity,
    # contraception_method, hot_flashes; multi_keys ergänzt um die fünf
    # Listenfelder aus SYMPTOM_MULTI_VALUE_KEYS (sensor.py) plus
    # pregnancy_symptoms - damit bleiben top_symptoms/Auswertungen konsistent
    # mit allen tatsächlich erfassbaren Feldern statt nur einer historischen
    # Teilmenge.
    # Nachtrag (22.09.2026): skin/energy_level/sleep_quality (weitere Ideen,
    # "Weitere Clue-Symptomkategorien") direkt beim Anlegen mit aufgenommen,
    # statt denselben, bereits zweimal dokumentierten Lueckentyp erneut zu
    # riskieren.
    multi_keys = ("pain", "hygiene", "test", "vulva_vagina", "urinary", "breast", "appointments", "digestion", "pregnancy_symptoms", "menopause_symptoms", "skin")

    for start_d, end_d, _ in periods:
        entries = _symptom_entries_in_range(symptom_history, start_d, end_d)
        cycle_pain_days = 0
        for entry in entries:
            pain = _coerce_list(entry.get("pain"))
            if pain:
                cycle_pain_days += 1
                for p in pain:
                    symptom_counter[f"pain:{p}"] += 1

            bleeding = entry.get("bleeding_strength")
            if isinstance(bleeding, str) and bleeding:
                bleeding_strength_counter[bleeding] += 1

            for key in ("spotting", "discharge", "intercourse", "cervical_mucus", "clots", "clot_size", "cervix_position", "cervix_texture", "libido", "smell", "bleeding_type", "training_intensity", "contraception_method", "hot_flashes", "energy_level", "sleep_quality"):
                val = entry.get(key)
                if isinstance(val, str) and val:
                    symptom_counter[f"{key}:{val}"] += 1

            for key in multi_keys:
                if key == "pain":
                    continue
                vals = _coerce_list(entry.get(key))
                for v in vals:
                    symptom_counter[f"{key}:{v}"] += 1

        pain_per_cycle.append(cycle_pain_days)

    total_cycles = len(periods)
    top_symptoms = [
        {"key": key, "count": count, "pct": round(count / total_cycles * 100)}
        for key, count in symptom_counter.most_common(15)
    ] if total_cycles else []

    bleeding_total = sum(bleeding_strength_counter.values())
    bleeding_distribution = {
        k: round(v / bleeding_total * 100)
        for k, v in bleeding_strength_counter.items()
    } if bleeding_total else {}

    avg_pain_days = round(mean(pain_per_cycle), 1) if pain_per_cycle else 0.0

    return {
        "top_symptoms": top_symptoms,
        "bleeding_strength_distribution": bleeding_distribution,
        "avg_pain_days_per_cycle": avg_pain_days,
    }


def _compute_pain_trend(
    symptom_history: list[dict[str, Any]],
    periods: list[tuple[date, date, str]],
) -> list[dict[str, Any]]:
    """Compute pain day count per cycle for trend charts."""
    trend: list[dict[str, Any]] = []
    for start_d, end_d, start_iso in periods:
        entries = _symptom_entries_in_range(symptom_history, start_d, end_d)
        pain_days = sum(1 for e in entries if _coerce_list(e.get("pain")))
        trend.append({"cycle_start": start_iso, "pain_days": pain_days})
    return trend


def _compute_cycle_table(
    period_days: list[str],
    periods: list[tuple[date, date, str]],
    pain_trend: list[dict[str, Any]],
    intermenstrual_dates: list[str],
    today: date,
    symptom_history: list[dict[str, Any]],
    period_duration_days: int,
) -> list[dict[str, Any]]:
    """One row per analysed cycle, oldest first: start, length (None while it is still running), period days,
    pain days, days with bleeding outside the period and the cycle day (1 = start) of the first positive LH test
    and of the temperature rise (None where the cycle has no such signal)."""
    rows: list[dict[str, Any]] = []
    for (start_d, end_d, start_iso), pain in zip(periods, pain_trend):
        first, last = start_d.isoformat(), end_d.isoformat()
        lh_day = first_positive_lh_day(symptom_history, start_iso, end_d)
        rise_iso = _parse_iso(analyze_nfp_cycle(symptom_history, start_iso, period_duration_days).get("temperature_rise_day"))
        rows.append(
            {
                "start": start_iso,
                "length": (end_d - start_d).days + 1 if end_d < today else None,
                "period_days": sum(1 for day in period_days if first <= day <= last),
                "pain_days": pain["pain_days"],
                "intermenstrual_days": sum(1 for day in intermenstrual_dates if first <= day <= last),
                "lh_day": (lh_day - start_d).days + 1 if lh_day else None,
                "temp_rise_day": (rise_iso - start_d).days + 1 if rise_iso else None,
            }
        )
    return rows


def compute_contraception_timeline(
    symptom_history: list[dict[str, Any]], renewed: dict[str, Any] | None = None, limit: int = 8
) -> list[dict[str, Any]]:
    """Runs of the same logged contraception method, oldest first, for the doctor report.

    Each run: method, since (first day logged), until (last day logged, None while it is the current method) and
    renewed_on (the confirmed renewal date of that method, if it falls into the run). Only the newest `limit` runs.
    """
    entries = sorted(
        (str(e["date"]), str(e[SYMPTOM_CONTRACEPTION_METHOD]))
        for e in symptom_history
        if isinstance(e, dict) and e.get("date") and e.get(SYMPTOM_CONTRACEPTION_METHOD)
    )
    runs: list[dict[str, Any]] = []
    for day, method in entries:
        if runs and runs[-1]["method"] == method:
            runs[-1]["until"] = day
        else:
            runs.append({"method": method, "since": day, "until": day})
    if runs:
        runs[-1]["until"] = None
    confirmed = renewed.get("date") if isinstance(renewed, dict) else None
    for run in runs:
        run["renewed_on"] = None
        if (
            isinstance(renewed, dict)
            and renewed.get("method") == run["method"]
            and isinstance(confirmed, str)
            and _parse_iso(confirmed) is not None
            and confirmed >= run["since"]
            and (run["until"] is None or confirmed <= run["until"])
        ):
            run["renewed_on"] = confirmed
    return runs[-limit:]


def compute_prediction_accuracy(
    history: list[str],
    period_duration_days: int = 5,
    last_n: int = PREDICTION_ACCURACY_CYCLES,
) -> dict[str, Any] | None:
    """How far off the next-period prediction was for the last completed cycles (None without a basis).

    Looks back: for each cycle start with at least two cycles of history before it, the model is rebuilt
    with only the period days up to the end of the preceding cycle, as of the day its period was over, and
    its predicted next start is compared with the real one. Uses the statistical prediction from the period
    history alone (temperature data is not replayed). diff > 0: the period came later than predicted.
    """
    starts = [d for d in (_parse_iso(s) for s in grouped_cycle_starts(history)) if d is not None]
    errors: list[dict[str, Any]] = []
    for i in range(2, len(starts)):
        actual = starts[i]
        known = [day for day in normalize_history(history) if day < actual.isoformat()]
        as_of = min(starts[i - 1] + timedelta(days=max(1, int(period_duration_days))), actual - timedelta(days=1))
        try:
            model = build_cycle_model(history=known, period_duration_days=period_duration_days, today=as_of)
        except Exception:  # noqa: BLE001 - one cycle failing must not break the summary
            _LOGGER.debug("Skipping prediction replay for the cycle starting %s", actual, exc_info=True)
            continue
        predicted = _parse_iso(model.next_predicted_start)
        if predicted is None:
            continue
        errors.append({"actual": actual.isoformat(), "predicted": predicted.isoformat(), "diff": (actual - predicted).days})
    errors = errors[-max(1, last_n):]
    if not errors:
        return None
    absolute = [abs(item["diff"]) for item in errors]
    return {
        "cycles": len(errors),
        "mean_abs_error_days": round(float(mean(absolute)), 1),
        "within_2_days": sum(1 for value in absolute if value <= 2),
        "errors": errors,
    }


def compute_last_cycle_summary(
    history: list[str], symptom_history: list[dict[str, Any]], period_duration_days: int | None = None
) -> dict[str, Any] | None:
    """Summary of the last completed cycle (between the two newest cycle starts); None before two starts are logged.

    recent_cycle_lengths holds up to six completed cycle lengths, oldest first, the last one being cycle_length (unfiltered).
    prediction_accuracy (see compute_prediction_accuracy) is only computed when period_duration_days is given.
    """
    starts = [d for d in (_parse_iso(s) for s in grouped_cycle_starts(history)) if d is not None]
    if len(starts) < 2:
        return None
    start, next_start = starts[-2], starts[-1]
    end = next_start - timedelta(days=1)
    earlier = [(b - a).days for a, b in list(zip(starts[:-2], starts[1:-1]))[-6:]]
    earlier = [days for days in earlier if 10 < days < 80]
    average = round(mean(earlier)) if earlier else None
    length = (next_start - start).days
    recent = [(b - a).days for a, b in zip(starts, starts[1:])][-6:]
    period_days = sum(1 for day in history if (d := _parse_iso(day)) is not None and start <= d <= end)
    cycle = [(start, end, start.isoformat())]
    stats = _compute_symptom_stats(symptom_history, cycle)
    return {
        "cycle_start": start.isoformat(),
        "cycle_end": end.isoformat(),
        "cycle_length": length,
        "recent_cycle_lengths": recent,
        "average_cycle_length": average,
        "days_relative_to_average": length - average if average is not None else None,
        "period_days": period_days,
        "pain_days": _compute_pain_trend(symptom_history, cycle)[0]["pain_days"],
        "logged_days": len(_symptom_entries_in_range(symptom_history, start, end)),
        "top_symptoms": [{"key": t["key"], "count": t["count"]} for t in stats["top_symptoms"][:5]],
        "bleeding_strength_distribution": stats["bleeding_strength_distribution"],
        "prediction_accuracy": (
            compute_prediction_accuracy(history, period_duration_days) if period_duration_days is not None else None
        ),
    }


def _compute_nfp_confirmation_stats(
    symptom_history: list[dict[str, Any]],
    periods: list[tuple[date, date, str]],
    period_duration_days: int,
    today: date,
) -> dict[str, Any]:
    """How many of the analyzed cycles had ovulation confirmed via the
    3-over-6 (Roetzer) temperature-rise rule, and the average cycle-day
    offset when it was. Raw basal temperature numbers alone don't tell a
    doctor much without this interpretation layer."""
    confirmed_count = 0
    day_offsets: list[int] = []
    luteal_lengths: list[int] = []
    lh_lags: list[int] = []
    for start_d, end_d, start_iso in periods:
        try:
            result = analyze_nfp_cycle(symptom_history, start_iso, period_duration_days)
        except Exception:  # noqa: BLE001 — one malformed cycle's analysis
            # failing shouldn't break the whole report.
            _LOGGER.debug("Skipping cycle starting %s in the temperature summary", start_iso, exc_info=True)
            continue
        if result.get("temperature_rise_detected"):
            confirmed_count += 1
            rise_day = _parse_iso(result.get("temperature_rise_day"))
            if rise_day is not None:
                day_offsets.append((rise_day - start_d).days + 1)
                # Days from the first positive LH test to the temperature rise (the rise normally follows the test).
                lh_day = first_positive_lh_day(symptom_history, start_iso, end_d)
                if lh_day is not None:
                    lag = (rise_day - lh_day).days
                    if LH_TEMP_LAG_PLAUSIBLE_DAYS[0] <= lag <= LH_TEMP_LAG_PLAUSIBLE_DAYS[1]:
                        lh_lags.append(lag)
                # Luteal phase = first raised reading up to the day before the next period; only finished cycles
                # (end_d < today) and plausible lengths count, so a rise found in a later cycle is ignored.
                luteal = (end_d - rise_day).days + 1
                if end_d < today and LUTEAL_PHASE_PLAUSIBLE_DAYS[0] <= luteal <= LUTEAL_PHASE_PLAUSIBLE_DAYS[1]:
                    luteal_lengths.append(luteal)

    return {
        "nfp_cycles_analyzed": len(periods),
        "nfp_confirmed_count": confirmed_count,
        "nfp_avg_confirmation_day": round(mean(day_offsets)) if day_offsets else None,
        "luteal_phase_cycles": len(luteal_lengths),
        "luteal_phase_avg": round(mean(luteal_lengths), 1) if luteal_lengths else None,
        "luteal_phase_min": min(luteal_lengths) if luteal_lengths else None,
        "luteal_phase_max": max(luteal_lengths) if luteal_lengths else None,
        "lh_lag_cycles": len(lh_lags),
        "lh_lag_avg": round(mean(lh_lags), 1) if lh_lags else None,
        "lh_lag_min": min(lh_lags) if lh_lags else None,
        "lh_lag_max": max(lh_lags) if lh_lags else None,
    }


def _compute_basal_temp_stats(
    symptom_history: list[dict[str, Any]],
    cutoff: date,
    today: date,
) -> dict[str, Any]:
    """Basal temperature summary for the analyzed period — average/min/max
    plus how many days have a reading, so a doctor can see both the general
    range and how consistently it was tracked (a handful of readings scattered
    across months reads very differently than daily tracking)."""
    readings: list[float] = []
    for entry in symptom_history:
        entry_date = _parse_iso(entry.get("date"))
        if entry_date is None or not (cutoff <= entry_date <= today):
            continue
        raw = entry.get("basal_temp")
        if raw is None:
            continue
        try:
            value = float(raw)
        except (TypeError, ValueError):
            continue
        # Same plausibility bounds as the add_symptom service validation —
        # a stray out-of-range value already couldn't have been logged
        # through the service, but defends against direct storage edits too.
        if 30.0 <= value <= 45.0:
            readings.append(value)

    if not readings:
        return {
            "basal_temp_avg": None,
            "basal_temp_min": None,
            "basal_temp_max": None,
            "basal_temp_reading_count": 0,
        }

    return {
        "basal_temp_avg": round(mean(readings), 2),
        "basal_temp_min": round(min(readings), 2),
        "basal_temp_max": round(max(readings), 2),
        "basal_temp_reading_count": len(readings),
    }


def compute_statistics(
    history: list[str],
    symptom_history: list[dict[str, Any]],
    days_back: int = 180,
    today: date | None = None,
    period_duration_days: int = 5,
) -> dict[str, Any]:
    """Compute comprehensive cycle statistics for the given look-back period."""
    today = today or date.today()
    cutoff = today - timedelta(days=max(1, days_back))

    normalized = normalize_history(history)
    usable = [h for h in normalized if _parse_iso(h) is not None and _parse_iso(h) <= today]  # type: ignore[operator]

    starts = grouped_cycle_starts(usable)
    cycle_stats = _compute_cycle_length_stats(starts, cutoff)
    bleeding_stats = _compute_bleeding_duration_stats(usable, cutoff)

    periods = _build_cycle_periods(starts, cutoff, today)
    symptom_stats = _compute_symptom_stats(symptom_history, periods)
    pain_trend = _compute_pain_trend(symptom_history, periods)
    basal_temp_stats = _compute_basal_temp_stats(symptom_history, cutoff, today)
    nfp_stats = _compute_nfp_confirmation_stats(symptom_history, periods, period_duration_days, today)
    intermenstrual = _compute_intermenstrual_bleeding(usable, symptom_history, cutoff, today)

    return {
        **cycle_stats,
        **bleeding_stats,
        **symptom_stats,
        **basal_temp_stats,
        **nfp_stats,
        **intermenstrual,
        "prediction_accuracy": compute_prediction_accuracy(usable, period_duration_days),
        "pain_trend": pain_trend,
        "cycle_table": _compute_cycle_table(
            usable,
            periods,
            pain_trend,
            [item["date"] for item in intermenstrual["intermenstrual_bleeding"]],
            today,
            symptom_history,
            period_duration_days,
        ),
        "days_back": days_back,
        "report_date": today.isoformat(),
    }


# ---------------------------------------------------------------------------
# HTML report generation (for doctor export)
# ---------------------------------------------------------------------------

_REGULARITY_LABELS: dict[str, dict[str, str]] = {
    "very_regular": {"de": "Sehr regelmäßig", "en": "Very regular", "es": "Muy regular", "fr": "Très régulier", "sv": "Mycket regelbunden"},
    "regular": {"de": "Regelmäßig", "en": "Regular", "es": "Regular", "fr": "Régulier", "sv": "Regelbunden"},
    "irregular": {"de": "Unregelmäßig", "en": "Irregular", "es": "Irregular", "fr": "Irrégulier", "sv": "Oregelbunden"},
}

_BLEEDING_STRENGTH_LABELS: dict[str, dict[str, str]] = {
    "none": {"de": "Keine", "en": "None", "es": "Ninguno", "fr": "Aucun", "sv": "Ingen"},
    "keine": {"de": "Keine", "en": "None", "es": "Ninguno", "fr": "Aucun", "sv": "Ingen"},
    "light": {"de": "Leicht", "en": "Light", "es": "Leve", "fr": "Léger", "sv": "Lätt"},
    "medium": {"de": "Normal", "en": "Medium", "es": "Normal", "fr": "Moyen", "sv": "Medel"},
    "heavy": {"de": "Stark", "en": "Heavy", "es": "Abundante", "fr": "Abondant", "sv": "Kraftig"},
    "very_heavy": {"de": "Sehr stark", "en": "Very heavy", "es": "Muy abundante", "fr": "Très abondant", "sv": "Mycket kraftig"},
}

_SYMPTOM_KEY_LABELS: dict[str, dict[str, str]] = {
    "pain:cramps": {"de": "Krämpfe", "en": "Cramps", "es": "Calambres", "fr": "Crampes", "sv": "Kramper"},
    "pain:mittelschmerz": {"de": "Mittelschmerz", "en": "Mittelschmerz", "es": "Dolor de ovulación", "fr": "Douleur d'ovulation", "sv": "Ägglossningssmärta"},
    "pain:tender_breasts": {"de": "Brustspannen", "en": "Tender breasts", "es": "Mamas sensibles", "fr": "Seins sensibles", "sv": "Ömma bröst"},
    "pain:headache": {"de": "Kopfschmerzen", "en": "Headache", "es": "Dolor de cabeza", "fr": "Maux de tête", "sv": "Huvudvärk"},
    "pain:migraine": {"de": "Migräne", "en": "Migraine", "es": "Migraña", "fr": "Migraine", "sv": "Migrän"},
    "pain:lower_back": {"de": "Rückenschmerzen", "en": "Lower back pain", "es": "Dolor lumbar", "fr": "Douleurs lombaires", "sv": "Ryggvärk"},
    "pain:vulva": {"de": "Vulvaschmerzen", "en": "Vulva pain", "es": "Dolor vulvar", "fr": "Douleur vulvaire", "sv": "Vulvasmärta"},
    "spotting:red": {"de": "Schmierblutung (rot)", "en": "Spotting (red)", "es": "Manchado (rojo)", "fr": "Spotting (rouge)", "sv": "Stänkblödning (röd)"},
    "spotting:brown": {"de": "Schmierblutung (braun)", "en": "Spotting (brown)", "es": "Manchado (marrón)", "fr": "Spotting (brun)", "sv": "Stänkblödning (brun)"},
    "discharge:reddish": {"de": "Ausfluss rötlich", "en": "Discharge reddish", "es": "Flujo rojizo", "fr": "Pertes rougeâtres", "sv": "Flytningar rödaktiga"},
    "discharge:brown": {"de": "Ausfluss braun", "en": "Discharge brown", "es": "Flujo marrón", "fr": "Pertes brunes", "sv": "Flytningar bruna"},
    "discharge:white": {"de": "Ausfluss weiß", "en": "Discharge white", "es": "Flujo blanco", "fr": "Pertes blanches", "sv": "Flytningar vita"},
    "discharge:clear": {"de": "Ausfluss klar", "en": "Discharge clear", "es": "Flujo transparente", "fr": "Pertes claires", "sv": "Flytningar klara"},
    "discharge:other": {"de": "Ausfluss ungewöhnlich", "en": "Discharge unusual", "es": "Flujo inusual", "fr": "Pertes inhabituelles", "sv": "Flytningar ovanliga"},
    "cervical_mucus:keinen": {"de": "Zervixschleim: keiner", "en": "Cervical mucus: none", "es": "Moco cervical: ninguno", "fr": "Glaire cervicale : aucune", "sv": "Livmoderhalsslem: inget"},
    "cervical_mucus:klebrig": {"de": "Zervixschleim: klebrig", "en": "Cervical mucus: sticky", "es": "Moco cervical: pegajoso", "fr": "Glaire cervicale : collante", "sv": "Livmoderhalsslem: klibbigt"},
    "cervical_mucus:cremig": {"de": "Zervixschleim: cremig", "en": "Cervical mucus: creamy", "es": "Moco cervical: cremoso", "fr": "Glaire cervicale : crémeuse", "sv": "Livmoderhalsslem: krämigt"},
    "cervical_mucus:fadenziehend": {"de": "Zervixschleim: fadenziehend", "en": "Cervical mucus: stretchy", "es": "Moco cervical: elástico", "fr": "Glaire cervicale : filante", "sv": "Livmoderhalsslem: trådigt"},
    "cervical_mucus:untypisch": {"de": "Zervixschleim: untypisch", "en": "Cervical mucus: atypical", "es": "Moco cervical: atípico", "fr": "Glaire cervicale : atypique", "sv": "Livmoderhalsslem: atypiskt"},
    "hygiene:tampon": {"de": "Tampon", "en": "Tampon", "es": "Tampón", "fr": "Tampon", "sv": "Tampong"},
    "hygiene:pad": {"de": "Binde", "en": "Pad", "es": "Compresa", "fr": "Serviette", "sv": "Binda"},
    "hygiene:cup": {"de": "Menstruationstasse", "en": "Cup", "es": "Copa menstrual", "fr": "Coupe menstruelle", "sv": "Menskopp"},
    "hygiene:liner": {"de": "Slipeinlage", "en": "Liner", "es": "Protegeslip", "fr": "Protège-slip", "sv": "Trosskydd"},
    "hygiene:period_underwear": {"de": "Periodenunterwäsche", "en": "Period underwear", "es": "Ropa interior menstrual", "fr": "Culotte menstruelle", "sv": "Mensunderkläder"},
    "intercourse:protected": {"de": "Geschützter GV", "en": "Protected intercourse", "es": "Relación sexual protegida", "fr": "Rapport protégé", "sv": "Skyddat samlag"},
    "intercourse:unprotected": {"de": "Ungeschützter GV", "en": "Unprotected intercourse", "es": "Relación sexual sin protección", "fr": "Rapport non protégé", "sv": "Oskyddat samlag"},
    "clots:yes": {"de": "Blutgerinnsel", "en": "Blood clots", "es": "Coágulos de sangre", "fr": "Caillots sanguins", "sv": "Blodproppar"},
    "clot_size:small": {"de": "Gerinnsel klein", "en": "Clots small", "es": "Coágulos pequeños", "fr": "Petits caillots", "sv": "Små proppar"},
    "clot_size:medium": {"de": "Gerinnsel mittel", "en": "Clots medium", "es": "Coágulos medianos", "fr": "Caillots moyens", "sv": "Medelstora proppar"},
    "clot_size:large": {"de": "Gerinnsel groß", "en": "Clots large", "es": "Coágulos grandes", "fr": "Gros caillots", "sv": "Stora proppar"},
    "cervix_position:cervix_high": {"de": "Muttermund hoch", "en": "Cervix high", "es": "Cuello uterino alto", "fr": "Col haut", "sv": "Livmoderhals hög"},
    "cervix_position:cervix_mid": {"de": "Muttermund mittel", "en": "Cervix mid", "es": "Cuello uterino medio", "fr": "Col à mi-hauteur", "sv": "Livmoderhals mellan"},
    "cervix_position:cervix_low": {"de": "Muttermund niedrig", "en": "Cervix low", "es": "Cuello uterino bajo", "fr": "Col bas", "sv": "Livmoderhals låg"},
    "cervix_texture:firm": {"de": "Muttermund fest", "en": "Cervix firm", "es": "Cuello uterino firme", "fr": "Col ferme", "sv": "Livmoderhals fast"},
    "cervix_texture:soft": {"de": "Muttermund weich", "en": "Cervix soft", "es": "Cuello uterino blando", "fr": "Col mou", "sv": "Livmoderhals mjuk"},
    "cervix_texture:open": {"de": "Muttermund offen", "en": "Cervix open", "es": "Cuello uterino abierto", "fr": "Col ouvert", "sv": "Livmoderhals öppen"},
    "libido:libido_low": {"de": "Libido niedrig", "en": "Libido low", "es": "Libido baja", "fr": "Libido faible", "sv": "Libido låg"},
    "libido:normal": {"de": "Libido normal", "en": "Libido normal", "es": "Libido normal", "fr": "Libido normale", "sv": "Libido normal"},
    "libido:libido_high": {"de": "Libido hoch", "en": "Libido high", "es": "Libido alta", "fr": "Libido élevée", "sv": "Libido hög"},
    "smell:normal": {"de": "Geruch normal", "en": "Smell normal", "es": "Olor normal", "fr": "Odeur normale", "sv": "Lukt normal"},
    "smell:inconspicuous": {"de": "Geruch unauffällig", "en": "Smell inconspicuous", "es": "Olor discreto", "fr": "Odeur discrète", "sv": "Lukt obetydlig"},
    "smell:unpleasant": {"de": "Geruch unangenehm", "en": "Smell unpleasant", "es": "Olor desagradable", "fr": "Odeur désagréable", "sv": "Lukt obehaglig"},
    "smell:fishy": {"de": "Geruch fischig", "en": "Smell fishy", "es": "Olor a pescado", "fr": "Odeur de poisson", "sv": "Lukt fisklik"},
    "test:positive_ovulation": {"de": "Ovulationstest positiv", "en": "Ovulation test positive", "es": "Test de ovulación positivo", "fr": "Test d'ovulation positif", "sv": "Ägglossningstest positivt"},
    "test:negative_ovulation": {"de": "Ovulationstest negativ", "en": "Ovulation test negative", "es": "Test de ovulación negativo", "fr": "Test d'ovulation négatif", "sv": "Ägglossningstest negativt"},
    "test:positive_pregnancy": {"de": "Schwangerschaftstest positiv", "en": "Pregnancy test positive", "es": "Test de embarazo positivo", "fr": "Test de grossesse positif", "sv": "Graviditetstest positivt"},
    "test:negative_pregnancy": {"de": "Schwangerschaftstest negativ", "en": "Pregnancy test negative", "es": "Test de embarazo negativo", "fr": "Test de grossesse négatif", "sv": "Graviditetstest negativt"},
}


def _label(key: str, labels_map: dict[str, dict[str, str]], lang: str, fallback: str | None = None) -> str:
    entry = labels_map.get(key)
    if entry:
        return entry.get(lang) or entry.get("en") or key
    return fallback or key.replace("_", " ").title()


def _h(text: Any) -> str:
    return html.escape(str(text))


# Text of the doctor report per language; {days_back} and {cycles} are filled in by generate_doctor_report_html.
_REPORT_TEXT: dict[str, dict[str, str]] = {
    "de": {
        "title": "Menstruationszyklus-Bericht",
        "subtitle": "Medizinischer Bericht",
        "patient_info": "Patientendaten",
        "patient_name": "Name",
        "patient_birthdate": "Geburtsdatum",
        "report_date": "Berichtsdatum",
        "profile": "Profil",
        "period": "Analysierter Zeitraum: letzte {days_back} Tage",
        "cycles": "Analysierte Zyklen: {cycles}",
        "cycle_length": "Zykluslänge",
        "avg": "Ø",
        "min": "Min",
        "max": "Max",
        "std": "Stabw.",
        "days": "Tage",
        "regularity": "Regelmäßigkeit",
        "prediction_accuracy": "Trefferquote der Vorhersage (rückblickend)",
        "prediction_accuracy_summary": "Die Periode begann im Schnitt {mean} Tage neben dem vorhergesagten Tag; {within} von {cycles} Zyklen lagen höchstens 2 Tage daneben.",
        "bleeding_duration": "Blutungsdauer",
        "bleeding_strength": "Blutungsstärke-Verteilung",
        "bleeding_strength_single": "Stärke",
        "intermenstrual": "Blutungen außerhalb der Periode",
        "intermenstrual_summary": "{count} Tag(e) mit erfasster Blutung außerhalb der Periode im Analysezeitraum.",
        "top_symptoms": "Häufigste Symptome (Häufigkeit)",
        "basal_temp": "Basaltemperatur",
        "basal_temp_avg": "Durchschnitt",
        "basal_temp_range": "Bereich",
        "basal_temp_readings": "Messungen erfasst",
        "nfp_confirmation": "Eisprung bestätigt (3-über-6-Regel)",
        "nfp_confirmation_summary": "In {confirmed} von {total} analysierten Zyklen bestätigt.",
        "nfp_confirmation_day": "Durchschnittlich bestätigt an Zyklustag",
        "luteal_phase": "Lutealphase (erster erhöhter Messwert bis Periodenbeginn)",
        "luteal_phase_summary": "Ø {avg} Tage (Min {min}, Max {max}) in {cycles} abgeschlossenen Zyklen.",
        "lh_lag": "LH-Test und Temperaturanstieg",
        "lh_lag_summary": "Der Temperaturanstieg folgte im Mittel {avg} Tage (Min {min}, Max {max}) nach dem ersten positiven LH-Test, in {cycles} Zyklen.",
        "current_status": "Aktueller Status",
        "current_contraception": "Aktuelle Verhütungsmethode",
        "contraception_history": "Verlauf der Verhütung",
        "contraception_from": "Von",
        "contraception_until": "Bis",
        "contraception_ongoing": "laufend",
        "contraception_renewed": "erneuert am {date}",
        "pain_trend": "Schmerztage pro Zyklus (Trend)",
        "cycle_start": "Zyklusbeginn",
        "cycle_overview": "Zyklusübersicht",
        "cycle_length_col": "Länge",
        "period_days_col": "Periodentage",
        "intermenstrual_col": "Blutung außerhalb der Periode (Tage)",
        "ovulation_signs_col": "Eisprung-Zeichen (Zyklustag)",
        "temp_short": "Temp.",
        "cycle_ongoing": "laufend",
        "pain_days": "Schmerztage",
        "cycle_data": "Zyklusdaten",
        "date": "Datum",
        "no_data": "Keine Daten vorhanden",
        "footer": "Dieser Bericht wurde automatisch von der Menstruation Gauge Integration (Home Assistant) erstellt.",
        "avg_pain_days": "Ø Schmerztage/Zyklus",
    },
    "en": {
        "title": "Menstrual Cycle Report",
        "subtitle": "Medical Report",
        "patient_info": "Patient Information",
        "patient_name": "Name",
        "patient_birthdate": "Date of Birth",
        "report_date": "Report Date",
        "profile": "Profile",
        "period": "Analysis period: last {days_back} days",
        "cycles": "Cycles analyzed: {cycles}",
        "cycle_length": "Cycle Length",
        "avg": "Avg",
        "min": "Min",
        "max": "Max",
        "std": "Std Dev",
        "days": "days",
        "regularity": "Regularity",
        "prediction_accuracy": "Prediction accuracy (looking back)",
        "prediction_accuracy_summary": "The period started {mean} days away from the predicted day on average; {within} of {cycles} cycles were off by at most 2 days.",
        "bleeding_duration": "Bleeding Duration",
        "bleeding_strength": "Bleeding Strength Distribution",
        "bleeding_strength_single": "Strength",
        "intermenstrual": "Bleeding outside the period",
        "intermenstrual_summary": "{count} day(s) with logged bleeding outside the period in the analysis period.",
        "top_symptoms": "Top Symptoms (frequency)",
        "basal_temp": "Basal Body Temperature",
        "basal_temp_avg": "Average",
        "basal_temp_range": "Range",
        "basal_temp_readings": "Readings logged",
        "nfp_confirmation": "Ovulation Confirmed (3-over-6 Rule)",
        "nfp_confirmation_summary": "Confirmed in {confirmed} of {total} analyzed cycles.",
        "nfp_confirmation_day": "Average confirmation on cycle day",
        "luteal_phase": "Luteal phase (first raised reading until the next period)",
        "luteal_phase_summary": "Avg {avg} days (min {min}, max {max}) over {cycles} completed cycles.",
        "lh_lag": "LH test and temperature rise",
        "lh_lag_summary": "The temperature rise followed the first positive LH test by {avg} days on average (min {min}, max {max}) in {cycles} cycles.",
        "current_status": "Current Status",
        "current_contraception": "Current Contraception Method",
        "contraception_history": "Contraception history",
        "contraception_from": "From",
        "contraception_until": "Until",
        "contraception_ongoing": "ongoing",
        "contraception_renewed": "renewed {date}",
        "pain_trend": "Pain Days per Cycle (Trend)",
        "cycle_start": "Cycle Start",
        "cycle_overview": "Cycle overview",
        "cycle_length_col": "Length",
        "period_days_col": "Period days",
        "intermenstrual_col": "Bleeding outside the period (days)",
        "ovulation_signs_col": "Ovulation signs (cycle day)",
        "temp_short": "Temp.",
        "cycle_ongoing": "ongoing",
        "pain_days": "Pain Days",
        "cycle_data": "Cycle Data",
        "date": "Date",
        "no_data": "No data available",
        "footer": "This report was automatically generated by the Menstruation Cycle integration (Home Assistant).",
        "avg_pain_days": "Avg pain days/cycle",
    },
    "es": {
        "title": "Informe del ciclo menstrual",
        "subtitle": "Informe médico",
        "patient_info": "Datos de la paciente",
        "patient_name": "Nombre",
        "patient_birthdate": "Fecha de nacimiento",
        "report_date": "Fecha del informe",
        "profile": "Perfil",
        "period": "Período analizado: últimos {days_back} días",
        "cycles": "Ciclos analizados: {cycles}",
        "cycle_length": "Duración del ciclo",
        "avg": "Prom.",
        "min": "Mín.",
        "max": "Máx.",
        "std": "Desv. est.",
        "days": "días",
        "regularity": "Regularidad",
        "prediction_accuracy": "Precisión de la predicción (retrospectiva)",
        "prediction_accuracy_summary": "El periodo empezó de media a {mean} días del día previsto; {within} de {cycles} ciclos se desviaron como máximo 2 días.",
        "bleeding_duration": "Duración del sangrado",
        "bleeding_strength": "Distribución de la intensidad del sangrado",
        "bleeding_strength_single": "Intensidad",
        "intermenstrual": "Sangrado fuera del periodo",
        "intermenstrual_summary": "{count} día(s) con sangrado registrado fuera del periodo en el periodo analizado.",
        "top_symptoms": "Síntomas más frecuentes (frecuencia)",
        "basal_temp": "Temperatura basal",
        "basal_temp_avg": "Promedio",
        "basal_temp_range": "Rango",
        "basal_temp_readings": "Mediciones registradas",
        "nfp_confirmation": "Ovulación confirmada (regla de 3 sobre 6)",
        "nfp_confirmation_summary": "Confirmada en {confirmed} de {total} ciclos analizados.",
        "nfp_confirmation_day": "Confirmada de media en el día del ciclo",
        "luteal_phase": "Fase lútea (primera lectura elevada hasta el siguiente periodo)",
        "luteal_phase_summary": "Media de {avg} días (mín. {min}, máx. {max}) en {cycles} ciclos completos.",
        "lh_lag": "Prueba LH y aumento de temperatura",
        "lh_lag_summary": "El aumento de temperatura siguió a la primera prueba LH positiva una media de {avg} días (mín. {min}, máx. {max}) en {cycles} ciclos.",
        "current_status": "Estado actual",
        "current_contraception": "Método anticonceptivo actual",
        "contraception_history": "Historial anticonceptivo",
        "contraception_from": "Desde",
        "contraception_until": "Hasta",
        "contraception_ongoing": "en curso",
        "contraception_renewed": "renovado el {date}",
        "pain_trend": "Días de dolor por ciclo (tendencia)",
        "cycle_start": "Inicio del ciclo",
        "cycle_overview": "Resumen de ciclos",
        "cycle_length_col": "Duración",
        "period_days_col": "Días de periodo",
        "intermenstrual_col": "Sangrado fuera del periodo (días)",
        "ovulation_signs_col": "Signos de ovulación (día del ciclo)",
        "temp_short": "Temp.",
        "cycle_ongoing": "en curso",
        "pain_days": "Días de dolor",
        "cycle_data": "Datos del ciclo",
        "date": "Fecha",
        "no_data": "No hay datos disponibles",
        "footer": "Este informe fue generado automáticamente por la integración Menstruation Cycle (Home Assistant).",
        "avg_pain_days": "Prom. de días de dolor/ciclo",
    },
    "fr": {
        "title": "Rapport sur le cycle menstruel",
        "subtitle": "Rapport médical",
        "patient_info": "Informations sur la patiente",
        "patient_name": "Nom",
        "patient_birthdate": "Date de naissance",
        "report_date": "Date du rapport",
        "profile": "Profil",
        "period": "Période analysée : {days_back} derniers jours",
        "cycles": "Cycles analysés : {cycles}",
        "cycle_length": "Durée du cycle",
        "avg": "Moy.",
        "min": "Min.",
        "max": "Max.",
        "std": "Écart type",
        "days": "jours",
        "regularity": "Régularité",
        "prediction_accuracy": "Précision de la prévision (rétrospective)",
        "prediction_accuracy_summary": "Les règles ont commencé en moyenne à {mean} jours du jour prévu ; {within} cycles sur {cycles} s'écartaient d'au plus 2 jours.",
        "bleeding_duration": "Durée des saignements",
        "bleeding_strength": "Répartition de l'intensité des saignements",
        "bleeding_strength_single": "Intensité",
        "intermenstrual": "Saignements en dehors des règles",
        "intermenstrual_summary": "{count} jour(s) avec saignement enregistré en dehors des règles sur la période analysée.",
        "top_symptoms": "Symptômes les plus fréquents (fréquence)",
        "basal_temp": "Température basale",
        "basal_temp_avg": "Moyenne",
        "basal_temp_range": "Plage",
        "basal_temp_readings": "Mesures enregistrées",
        "nfp_confirmation": "Ovulation confirmée (règle des 3 sur 6)",
        "nfp_confirmation_summary": "Confirmée dans {confirmed} cycle(s) sur {total} analysé(s).",
        "nfp_confirmation_day": "Confirmée en moyenne au jour du cycle",
        "luteal_phase": "Phase lutéale (première mesure élevée jusqu'aux règles suivantes)",
        "luteal_phase_summary": "Moyenne de {avg} jours (min {min}, max {max}) sur {cycles} cycles terminés.",
        "lh_lag": "Test LH et montée de température",
        "lh_lag_summary": "La montée de température a suivi le premier test LH positif de {avg} jours en moyenne (min {min}, max {max}) sur {cycles} cycles.",
        "current_status": "Statut actuel",
        "current_contraception": "Méthode de contraception actuelle",
        "contraception_history": "Historique de contraception",
        "contraception_from": "Depuis",
        "contraception_until": "Jusqu'au",
        "contraception_ongoing": "en cours",
        "contraception_renewed": "renouvelé le {date}",
        "pain_trend": "Jours de douleur par cycle (tendance)",
        "cycle_start": "Début du cycle",
        "cycle_overview": "Aperçu des cycles",
        "cycle_length_col": "Durée",
        "period_days_col": "Jours de règles",
        "intermenstrual_col": "Saignement hors règles (jours)",
        "ovulation_signs_col": "Signes d'ovulation (jour du cycle)",
        "temp_short": "Temp.",
        "cycle_ongoing": "en cours",
        "pain_days": "Jours de douleur",
        "cycle_data": "Données du cycle",
        "date": "Date",
        "no_data": "Aucune donnée disponible",
        "footer": "Ce rapport a été généré automatiquement par l'intégration Menstruation Cycle (Home Assistant).",
        "avg_pain_days": "Moy. jours de douleur/cycle",
    },
    "sv": {
        "title": "Rapport om menscykeln",
        "subtitle": "Medicinsk rapport",
        "patient_info": "Patientuppgifter",
        "patient_name": "Namn",
        "patient_birthdate": "Födelsedatum",
        "report_date": "Rapportdatum",
        "profile": "Profil",
        "period": "Analyserad period: senaste {days_back} dagarna",
        "cycles": "Analyserade cykler: {cycles}",
        "cycle_length": "Cykellängd",
        "avg": "Snitt",
        "min": "Min",
        "max": "Max",
        "std": "Standardavv.",
        "days": "dagar",
        "regularity": "Regelbundenhet",
        "prediction_accuracy": "Prognosens träffsäkerhet (i efterhand)",
        "prediction_accuracy_summary": "Menstruationen började i genomsnitt {mean} dagar från den förutspådda dagen; {within} av {cycles} cykler låg högst 2 dagar fel.",
        "bleeding_duration": "Blödningens längd",
        "bleeding_strength": "Fördelning av blödningens styrka",
        "bleeding_strength_single": "Styrka",
        "intermenstrual": "Blödning utanför menstruationen",
        "intermenstrual_summary": "{count} dag(ar) med loggad blödning utanför menstruationen under analysperioden.",
        "top_symptoms": "Vanligaste symtom (frekvens)",
        "basal_temp": "Basaltemperatur",
        "basal_temp_avg": "Genomsnitt",
        "basal_temp_range": "Intervall",
        "basal_temp_readings": "Registrerade mätningar",
        "nfp_confirmation": "Ägglossning bekräftad (3-över-6-regeln)",
        "nfp_confirmation_summary": "Bekräftad i {confirmed} av {total} analyserade cykler.",
        "nfp_confirmation_day": "Bekräftad i genomsnitt på cykeldag",
        "luteal_phase": "Lutealfas (första förhöjda mätningen till nästa menstruation)",
        "luteal_phase_summary": "Medel {avg} dagar (min {min}, max {max}) över {cycles} avslutade cykler.",
        "lh_lag": "LH-test och temperaturstigning",
        "lh_lag_summary": "Temperaturstigningen kom i genomsnitt {avg} dagar efter det första positiva LH-testet (min {min}, max {max}) i {cycles} cykler.",
        "current_status": "Aktuell status",
        "current_contraception": "Aktuellt preventivmedel",
        "contraception_history": "Preventivmedelshistorik",
        "contraception_from": "Från",
        "contraception_until": "Till",
        "contraception_ongoing": "pågår",
        "contraception_renewed": "förnyat {date}",
        "pain_trend": "Smärtdagar per cykel (trend)",
        "cycle_start": "Cykelstart",
        "cycle_overview": "Cykelöversikt",
        "cycle_length_col": "Längd",
        "period_days_col": "Mensdagar",
        "intermenstrual_col": "Blödning utanför menstruationen (dagar)",
        "ovulation_signs_col": "Ägglossningstecken (cykeldag)",
        "temp_short": "Temp.",
        "cycle_ongoing": "pågår",
        "pain_days": "Smärtdagar",
        "cycle_data": "Cykeldata",
        "date": "Datum",
        "no_data": "Inga data tillgängliga",
        "footer": "Den här rapporten skapades automatiskt av integrationen Menstruation Cycle (Home Assistant).",
        "avg_pain_days": "Snitt smärtdagar/cykel",
    },
}


def generate_doctor_report_html(
    stats: dict[str, Any],
    history: list[str],
    symptom_history: list[dict[str, Any]],
    profile: str,
    patient_name: str | None,
    patient_birthdate: str | None,
    language: str = "de",
    report_date: str | None = None,
    current_contraception_method: str | None = None,
    contraception_timeline: list[dict[str, Any]] | None = None,
) -> str:
    """Generate a professional HTML doctor report from computed statistics."""
    code = language.lower().replace("_", "-").split("-")[0]
    lang = code if code in DOCTOR_REPORT_LANGUAGES else "en"
    # Prefer the already-resolved, timezone-correct date computed by
    # compute_statistics over date.today() (system timezone, which can
    # differ from HA's configured timezone) — this function's own
    # date.today() is now only a last-resort fallback if stats somehow
    # doesn't carry a report_date at all.
    today_str = report_date or stats.get("report_date") or date.today().isoformat()
    today = _parse_iso(today_str) or date.today()
    days_back = stats.get("days_back", 180)
    cycles_analyzed = stats.get("cycles_analyzed", 0)

    T = {**_REPORT_TEXT["en"], **_REPORT_TEXT[lang]}
    T["period"] = T["period"].format(days_back=days_back)
    T["cycles"] = T["cycles"].format(cycles=cycles_analyzed)

    # Patient info section
    patient_section = ""
    if patient_name or patient_birthdate:
        rows = ""
        if patient_name:
            rows += f"<tr><td>{_h(T['patient_name'])}</td><td>{_h(patient_name)}</td></tr>"
        if patient_birthdate:
            rows += f"<tr><td>{_h(T['patient_birthdate'])}</td><td>{_h(patient_birthdate)}</td></tr>"
        patient_section = f"""
        <section class="section">
          <h2>{_h(T['patient_info'])}</h2>
          <table class="info-table"><tbody>{rows}</tbody></table>
        </section>"""

    # Cycle length stats
    cycle_length_html = T["no_data"]
    if cycles_analyzed > 0:
        avg = stats.get("avg_cycle_length", "–")
        mn = stats.get("min_cycle_length", "–")
        mx = stats.get("max_cycle_length", "–")
        std = stats.get("std_cycle_length", "–")
        regularity_key = stats.get("regularity", "")
        regularity_label = _label(regularity_key, _REGULARITY_LABELS, lang)
        cycle_length_html = f"""
        <table class="stats-table">
          <tr><th>{_h(T['avg'])}</th><th>{_h(T['min'])}</th><th>{_h(T['max'])}</th><th>{_h(T['std'])}</th><th>{_h(T['regularity'])}</th></tr>
          <tr>
            <td>{avg} {_h(T['days'])}</td>
            <td>{mn} {_h(T['days'])}</td>
            <td>{mx} {_h(T['days'])}</td>
            <td>{std} {_h(T['days'])}</td>
            <td>{_h(regularity_label)}</td>
          </tr>
        </table>"""

    accuracy = stats.get("prediction_accuracy")
    if accuracy:
        cycle_length_html += f"""
        <h3 style="font-size:12px;color:#666;margin-top:12px;">{_h(T['prediction_accuracy'])}</h3>
        <p>{_h(T['prediction_accuracy_summary'].format(
            mean=accuracy['mean_abs_error_days'], within=accuracy['within_2_days'], cycles=accuracy['cycles']))}</p>"""

    # One row per cycle, newest first
    cycle_table_html = T["no_data"]
    if stats.get("cycle_table"):
        def _length_cell(row: dict[str, Any]) -> str:
            if row["length"] is None:
                return _h(T["cycle_ongoing"])
            return _h(f"{row['length']} {T['days']}")

        def _signs_cell(row: dict[str, Any]) -> str:
            parts = [f"LH {row['lh_day']}"] if row.get("lh_day") else []
            parts += [f"{T['temp_short']} {row['temp_rise_day']}"] if row.get("temp_rise_day") else []
            return _h(" · ".join(parts) or "–")

        # The signs column only appears when at least one cycle has an LH test or a temperature rise.
        show_signs = any(row.get("lh_day") or row.get("temp_rise_day") for row in stats["cycle_table"])
        ct_rows = "".join(
            f"<tr><td>{_h(row['start'])}</td><td>{_length_cell(row)}</td><td>{row['period_days']}</td>"
            f"<td>{row['pain_days']}</td><td>{row['intermenstrual_days']}</td>"
            f"{'<td>' + _signs_cell(row) + '</td>' if show_signs else ''}</tr>"
            for row in reversed(stats["cycle_table"])
        )
        signs_header = f"<th>{_h(T['ovulation_signs_col'])}</th>" if show_signs else ""
        cycle_table_html = f"""
        <table class="stats-table">
          <tr><th>{_h(T['cycle_start'])}</th><th>{_h(T['cycle_length_col'])}</th><th>{_h(T['period_days_col'])}</th><th>{_h(T['pain_days'])}</th><th>{_h(T['intermenstrual_col'])}</th>{signs_header}</tr>
          {ct_rows}
        </table>"""

    # Bleeding duration
    bleeding_dur_html = T["no_data"]
    if stats.get("avg_bleeding_duration") is not None:
        avg_b = stats.get("avg_bleeding_duration", "–")
        mn_b = stats.get("min_bleeding_duration", "–")
        mx_b = stats.get("max_bleeding_duration", "–")
        bleeding_dur_html = f"""
        <table class="stats-table">
          <tr><th>{_h(T['avg'])}</th><th>{_h(T['min'])}</th><th>{_h(T['max'])}</th></tr>
          <tr>
            <td>{avg_b} {_h(T['days'])}</td>
            <td>{mn_b} {_h(T['days'])}</td>
            <td>{mx_b} {_h(T['days'])}</td>
          </tr>
        </table>"""

    # Bleeding strength distribution
    dist = stats.get("bleeding_strength_distribution", {})
    bs_rows = ""
    for k, pct in sorted(dist.items(), key=lambda x: -x[1]):
        label = _label(k, _BLEEDING_STRENGTH_LABELS, lang, k)
        bs_rows += f"<tr><td>{_h(label)}</td><td>{pct}%</td><td><div class='bar' style='width:{min(pct,100)}%'></div></td></tr>"
    bleeding_strength_html = f"<table class='dist-table'>{bs_rows}</table>" if bs_rows else T["no_data"]

    # Current status (contraception method) — shown separately from the
    # frequency-based symptom tables below, since it's a current state, not
    # something to count occurrences of.
    _CONTRACEPTION_METHOD_LABELS: dict[str, dict[str, str]] = {
        "none": {"de": "Keine", "en": "None", "es": "Ninguno", "fr": "Aucun", "sv": "Ingen"},
        "pill": {"de": "Pille", "en": "Pill", "es": "Píldora", "fr": "Pilule", "sv": "P-piller"},
        "hormonal_iud": {"de": "Hormonspirale", "en": "Hormonal IUD", "es": "DIU hormonal", "fr": "DIU hormonal", "sv": "Hormonspiral"},
        "copper_iud": {"de": "Kupferspirale", "en": "Copper IUD", "es": "DIU de cobre", "fr": "DIU au cuivre", "sv": "Kopparspiral"},
        "implant": {"de": "Implantat", "en": "Implant", "es": "Implante", "fr": "Implant", "sv": "Implantat"},
        "patch": {"de": "Verhütungspflaster", "en": "Patch", "es": "Parche", "fr": "Patch", "sv": "Plåster"},
        "ring": {"de": "Vaginalring", "en": "Ring", "es": "Anillo vaginal", "fr": "Anneau vaginal", "sv": "Vaginalring"},
        "injection": {"de": "Hormonspritze", "en": "Injection", "es": "Inyección", "fr": "Injection", "sv": "Injektion"},
        "condom": {"de": "Kondom", "en": "Condom", "es": "Preservativo", "fr": "Préservatif", "sv": "Kondom"},
        "diaphragm": {"de": "Diaphragma", "en": "Diaphragm", "es": "Diafragma", "fr": "Diaphragme", "sv": "Pessar"},
        "other": {"de": "Andere", "en": "Other", "es": "Otro", "fr": "Autre", "sv": "Annat"},
    }
    current_status_html = ""
    if current_contraception_method:
        method_label = _label(current_contraception_method, _CONTRACEPTION_METHOD_LABELS, lang, current_contraception_method)
        current_status_html = f"""
    <table class="stats-table">
      <tr><th>{_h(T['current_contraception'])}</th></tr>
      <tr><td>{_h(method_label)}</td></tr>
    </table>"""
        if contraception_timeline:
            history_rows = ""
            for run in contraception_timeline:
                label = _label(run["method"], _CONTRACEPTION_METHOD_LABELS, lang, run["method"])
                if run.get("renewed_on"):
                    label += f" ({T['contraception_renewed'].format(date=run['renewed_on'])})"
                until = run["until"] or T["contraception_ongoing"]
                history_rows += f"<tr><td>{_h(label)}</td><td>{_h(run['since'])}</td><td>{_h(until)}</td></tr>"
            current_status_html += f"""
    <h3 style="font-size:12px;color:#666;margin-top:12px;">{_h(T['contraception_history'])}</h3>
    <table class="stats-table">
      <tr><th>{_h(T['current_contraception'])}</th><th>{_h(T['contraception_from'])}</th><th>{_h(T['contraception_until'])}</th></tr>
      {history_rows}
    </table>"""

    # Basal body temperature — was entirely absent from earlier versions of
    # this report despite being tracked by the app; a doctor discussing NFP,
    # ovulation, or cycle irregularities would reasonably expect to see it.
    basal_temp_html = T["no_data"]
    if stats.get("basal_temp_reading_count"):
        avg_t = stats.get("basal_temp_avg")
        min_t = stats.get("basal_temp_min")
        max_t = stats.get("basal_temp_max")
        count_t = stats.get("basal_temp_reading_count")
        basal_temp_html = f"""
        <table class="stats-table">
          <tr><th>{_h(T['basal_temp_avg'])}</th><th>{_h(T['basal_temp_range'])}</th><th>{_h(T['basal_temp_readings'])}</th></tr>
          <tr>
            <td>{avg_t} °C</td>
            <td>{min_t}–{max_t} °C</td>
            <td>{count_t}</td>
          </tr>
        </table>"""

    nfp_total = stats.get("nfp_cycles_analyzed", 0)
    if nfp_total:
        nfp_confirmed = stats.get("nfp_confirmed_count", 0)
        nfp_summary = T["nfp_confirmation_summary"].replace("{confirmed}", str(nfp_confirmed)).replace("{total}", str(nfp_total))
        nfp_day = stats.get("nfp_avg_confirmation_day")
        nfp_day_line = f"<p>{_h(T['nfp_confirmation_day'])}: <strong>{nfp_day}</strong></p>" if nfp_day is not None else ""
        basal_temp_html += f"""
        <h3 style="font-size:12px;color:#666;margin-top:12px;">{_h(T['nfp_confirmation'])}</h3>
        <p>{_h(nfp_summary)}</p>
        {nfp_day_line}"""
    if stats.get("luteal_phase_cycles"):
        luteal_summary = T["luteal_phase_summary"].format(
            avg=stats["luteal_phase_avg"], min=stats["luteal_phase_min"], max=stats["luteal_phase_max"],
            cycles=stats["luteal_phase_cycles"],
        )
        basal_temp_html += f"""
        <h3 style="font-size:12px;color:#666;margin-top:12px;">{_h(T['luteal_phase'])}</h3>
        <p>{_h(luteal_summary)}</p>"""
    if stats.get("lh_lag_cycles"):
        lh_summary = T["lh_lag_summary"].format(
            avg=stats["lh_lag_avg"], min=stats["lh_lag_min"], max=stats["lh_lag_max"], cycles=stats["lh_lag_cycles"],
        )
        basal_temp_html += f"""
        <h3 style="font-size:12px;color:#666;margin-top:12px;">{_h(T['lh_lag'])}</h3>
        <p>{_h(lh_summary)}</p>"""

    # Bleeding outside the period (neutral listing, no assessment)
    intermenstrual_html = ""
    if stats.get("intermenstrual_bleeding"):
        im_rows = "".join(
            f"<tr><td>{_h(item['date'])}</td><td>{_h(_label(item['strength'], _BLEEDING_STRENGTH_LABELS, lang, item['strength']))}</td></tr>"
            for item in stats["intermenstrual_bleeding"]
        )
        intermenstrual_html = f"""
  <section class="section">
    <h2>{_h(T['intermenstrual'])}</h2>
    <p>{_h(T['intermenstrual_summary'].format(count=stats.get('intermenstrual_bleeding_days', 0)))}</p>
    <table class='stats-table'>
      <tr><th>{_h(T['date'])}</th><th>{_h(T['bleeding_strength_single'])}</th></tr>
      {im_rows}
    </table>
  </section>"""

    # Top symptoms
    top_syms = stats.get("top_symptoms", [])
    sym_rows = ""
    for s in top_syms:
        key = s.get("key", "")
        pct = s.get("pct", 0)
        label = _label(key, _SYMPTOM_KEY_LABELS, lang, key)
        sym_rows += f"<tr><td>{_h(label)}</td><td>{pct}%</td><td><div class='bar' style='width:{min(pct,100)}%'></div></td></tr>"
    top_sym_html = f"<table class='dist-table'>{sym_rows}</table>" if sym_rows else T["no_data"]

    # Pain trend
    trend = stats.get("pain_trend", [])
    trend_rows = ""
    for pt in trend:
        trend_rows += f"<tr><td>{_h(pt.get('cycle_start',''))}</td><td>{pt.get('pain_days',0)}</td></tr>"
    avg_pain = stats.get("avg_pain_days_per_cycle", 0)
    pain_trend_html = T["no_data"]
    if trend_rows:
        pain_trend_html = f"""
        <p>{_h(T['avg_pain_days'])}: <strong>{avg_pain}</strong></p>
        <table class='stats-table'>
          <tr><th>{_h(T['cycle_start'])}</th><th>{_h(T['pain_days'])}</th></tr>
          {trend_rows}
        </table>"""

    # Raw cycle data table
    normalized = normalize_history(history)
    today_iso = today.isoformat()
    cutoff_iso = (today - timedelta(days=days_back)).isoformat()
    recent_history = sorted(
        (d for d in normalized if cutoff_iso <= d <= today_iso),
        reverse=True,
    )
    history_rows = "".join(
        f"<tr><td>{_h(d)}</td></tr>" for d in recent_history
    )
    raw_data_html = f"""
    <table class='stats-table'>
      <tr><th>{_h(T['date'])}</th></tr>
      {history_rows}
    </table>""" if history_rows else T["no_data"]

    return f"""<!DOCTYPE html>
<html lang="{_h(lang)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{_h(T['title'])}</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #222; background: #fff; padding: 20mm; }}
    h1 {{ font-size: 22px; color: #c0392b; margin-bottom: 4px; }}
    h2 {{ font-size: 15px; color: #555; border-bottom: 1px solid #ddd; margin: 18px 0 8px; padding-bottom: 4px; }}
    .subtitle {{ color: #888; font-size: 12px; margin-bottom: 20px; }}
    .meta {{ color: #666; font-size: 11px; margin-bottom: 24px; }}
    .meta span {{ margin-right: 20px; }}
    .section {{ margin-bottom: 24px; page-break-inside: avoid; }}
    table {{ border-collapse: collapse; width: 100%; }}
    td, th {{ border: 1px solid #ddd; padding: 6px 10px; text-align: left; }}
    th {{ background: #f5f5f5; font-weight: 600; }}
    .info-table td:first-child {{ font-weight: 600; width: 160px; background: #fafafa; }}
    .dist-table td:last-child {{ width: 120px; }}
    .bar {{ height: 12px; background: #c0392b; border-radius: 4px; min-width: 2px; }}
    footer {{ margin-top: 30px; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 8px; }}
    @media print {{
      body {{ padding: 10mm; }}
      .no-print {{ display: none !important; }}
    }}
  </style>
</head>
<body>
  <h1>🩸 {_h(T['title'])}</h1>
  <div class="subtitle">{_h(T['subtitle'])}</div>
  <div class="meta">
    <span>{_h(T['report_date'])}: {_h(today_str)}</span>
    <span>{_h(T['profile'])}: {_h(profile)}</span>
    <span>{_h(T['period'])}</span>
    <span>{_h(T['cycles'])}</span>
  </div>

  {patient_section}

  {f'''<section class="section">
    <h2>{_h(T['current_status'])}</h2>
    {current_status_html}
  </section>''' if current_status_html else ''}

  <section class="section">
    <h2>{_h(T['cycle_length'])}</h2>
    {cycle_length_html}
  </section>

  <section class="section">
    <h2>{_h(T['cycle_overview'])}</h2>
    {cycle_table_html}
  </section>

  <section class="section">
    <h2>{_h(T['basal_temp'])}</h2>
    {basal_temp_html}
  </section>

  <section class="section">
    <h2>{_h(T['bleeding_duration'])}</h2>
    {bleeding_dur_html}
  </section>

  <section class="section">
    <h2>{_h(T['bleeding_strength'])}</h2>
    {bleeding_strength_html}
  </section>

  {intermenstrual_html}

  <section class="section">
    <h2>{_h(T['top_symptoms'])}</h2>
    {top_sym_html}
  </section>

  <section class="section">
    <h2>{_h(T['pain_trend'])}</h2>
    {pain_trend_html}
  </section>

  <section class="section">
    <h2>{_h(T['cycle_data'])}</h2>
    {raw_data_html}
  </section>

  <footer>{_h(T['footer'])}</footer>
</body>
</html>"""
