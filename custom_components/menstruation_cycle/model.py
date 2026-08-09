"""Cycle calculation model for menstruation gauge."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from .const import (
    CYCLE_LENGTH_OVERRIDE_MAX,
    CYCLE_LENGTH_OVERRIDE_MIN,
    DEFAULT_CYCLE_LENGTH,
    DEFAULT_NFP_ANALYSIS_MODE,
    DEFAULT_PERIOD_DURATION_DAYS,
    STATE_FERTILE,
    STATE_MENARCHE,
    STATE_NEUTRAL,
    STATE_PERIOD,
    STATE_PMS,
    STATE_PREGNANT,
    STATE_PRE_MENARCHE,
)

PREGNANCY_DAYS = 280  # Standard pregnancy duration in days (40 weeks)


@dataclass(slots=True)
class CycleModel:
    """Computed cycle values for the sensor attributes."""

    history: list[str]
    grouped_starts: list[str]
    bleeding_blocks: list[dict[str, str | int]]
    next_predicted_start: str | None
    predicted_cycle_starts: list[str]
    avg_cycle_length: int | None
    fertile_window_start: str | None
    fertile_window_end: str | None
    ovulation_day: str | None
    days_until_next_start: int | None
    period_duration_days: int
    learned_period_duration_days: int | None
    current_period: dict[str, Any] | None
    state: str
    symptom_history: list[dict[str, Any]]
    is_pregnant: bool
    pregnancy_start_date: str | None
    weeks_pregnant: int | None
    due_date: str | None
    menarche_data: dict[str, Any]
    pre_menarche_data: dict[str, Any]
    menopause_data: dict[str, Any]
    noncycle_data: dict[str, Any]
    nfp_analysis: dict[str, Any] | None
    learned_ovulation_offset: int | None
    nfp_mode: str
    period_forecast: dict[str, Any] | None
    fertility_forecast: dict[str, Any] | None


def normalize_history(history: list[str]) -> list[str]:
    """Normalize and sort history values."""
    normalized: set[str] = set()
    for raw in history:
        try:
            normalized.add(date.fromisoformat(str(raw)).isoformat())
        except ValueError:
            continue
    return sorted(normalized)


def grouped_cycle_starts(days: list[str]) -> list[str]:
    """Group contiguous bleeding entries and return starts."""
    if not days:
        return []

    starts: list[str] = []
    for idx, current in enumerate(days):
        if idx == 0:
            starts.append(current)
            continue

        prev = days[idx - 1]
        diff = (date.fromisoformat(current) - date.fromisoformat(prev)).days
        if diff > 2:
            starts.append(current)

    return starts


def bleeding_blocks(days: list[str]) -> list[list[str]]:
    """Group bleeding days into blocks (contiguous / near-contiguous entries)."""
    if not days:
        return []

    blocks: list[list[str]] = []
    current: list[str] = [days[0]]

    for idx in range(1, len(days)):
        prev = date.fromisoformat(days[idx - 1])
        current_day = date.fromisoformat(days[idx])
        diff = (current_day - prev).days
        if diff <= 2:
            current.append(days[idx])
        else:
            blocks.append(current)
            current = [days[idx]]

    blocks.append(current)
    return blocks


def learned_period_duration(default_days: int, blocks: list[list[str]]) -> tuple[int, int | None]:
    """Learn period duration from historical block lengths; only adapt upward."""
    default_norm = max(1, min(14, int(default_days)))
    if len(blocks) < 3:
        return default_norm, None

    recent = blocks[-6:]
    lengths = [len(block) for block in recent if block]
    if not lengths:
        return default_norm, None

    avg_len = round(sum(lengths) / len(lengths))
    learned = max(default_norm, max(1, min(14, avg_len)))
    return learned, avg_len


def current_period_details(
    blocks: list[list[str]],
    symptom_history: list[dict[str, Any]],
    period_duration_days: int,
    today: date,
) -> dict[str, Any] | None:
    """Return lifecycle details for the latest period block."""
    if not blocks:
        return None

    last_block = blocks[-1]
    if not last_block:
        return None

    start_iso = last_block[0]
    end_iso = last_block[-1]
    start_date = date.fromisoformat(start_iso)
    end_date = date.fromisoformat(end_iso)
    if start_date > today:
        return None

    max_duration = max(1, min(14, int(period_duration_days)))
    latest_expected_end = start_date + timedelta(days=max_duration - 1)
    today_iso = today.isoformat()
    none_date_iso: str | None = None
    none_values = {"none", "keine"}

    for entry in normalize_symptoms(symptom_history):
        entry_date = entry.get("date")
        bleeding_strength = str(entry.get("bleeding_strength", "")).strip().lower()
        if not isinstance(entry_date, str):
            continue
        if entry_date < start_iso or entry_date > today_iso:
            continue
        if bleeding_strength in none_values:
            none_date_iso = entry_date
            break

    ended_by: str | None = None
    ended_on_iso: str | None = None
    is_active = True

    if none_date_iso is not None:
        ended_by = "bleeding_none"
        ended_on_iso = none_date_iso
        is_active = False
    elif today > latest_expected_end:
        ended_by = "duration"
        ended_on_iso = latest_expected_end.isoformat()
        is_active = False

    confirmed_days = [day for day in last_block if day <= today_iso]
    days_elapsed = max(1, (today - start_date).days + 1)
    today_logged = today_iso in confirmed_days or any(
        isinstance(entry, dict) and entry.get("date") == today_iso
        for entry in symptom_history
    )

    return {
        "start": start_iso,
        "end": end_iso,
        "length": len(last_block),
        "confirmed_days": confirmed_days,
        "days_elapsed": days_elapsed,
        "effective_duration": max_duration,
        "expected_end": latest_expected_end.isoformat(),
        "today_logged": today_logged,
        "is_active": is_active,
        "ended_by": ended_by,
        "ended_on": ended_on_iso,
        "last_confirmed_day": end_date.isoformat(),
    }


def _predict_cycle_length_days(grouped_starts: list[str]) -> int | None:
    """Predict cycle length in days from recent historical starts."""
    if not grouped_starts:
        return None
    if len(grouped_starts) == 1:
        return 28
    lengths: list[int] = []
    start_index = max(1, len(grouped_starts) - 4)
    for idx in range(start_index, len(grouped_starts)):
        current = date.fromisoformat(grouped_starts[idx])
        prev = date.fromisoformat(grouped_starts[idx - 1])
        diff = (current - prev).days
        if 10 < diff < 80:
            lengths.append(diff)
    return round(sum(lengths) / len(lengths)) if lengths else 28


def predict_next_start(grouped_starts: list[str]) -> tuple[str | None, int | None]:
    """Predict next cycle start based on recent cycle lengths."""
    if not grouped_starts:
        return None, None

    avg = _predict_cycle_length_days(grouped_starts)
    if avg is None:
        return None, None
    next_start = date.fromisoformat(grouped_starts[-1]) + timedelta(days=avg)
    return next_start.isoformat(), avg


def predict_future_starts(grouped_starts: list[str], num_cycles: int = 6) -> list[str]:
    """Predict multiple future cycle starts with realistic cycle bounds."""
    if not grouped_starts:
        return []
    count = max(1, min(12, int(num_cycles)))
    avg_days = _predict_cycle_length_days(grouped_starts)
    cycle_days = max(20, min(60, int(avg_days or 28)))
    last_start = date.fromisoformat(grouped_starts[-1])
    return [
        (last_start + timedelta(days=cycle_days * idx)).isoformat()
        for idx in range(1, count + 1)
    ]


def learn_ovulation_pattern(
    symptom_history: list[dict[str, Any]],
    cycle_starts: list[str],
    period_duration_days: int = 5,
    min_cycles: int = 2,
    max_cycles: int = 5,
) -> int | None:
    """Learn average ovulation day offset from recent NFP analyses.

    Examines the last N cycle starts and extracts temperature_rise_day
    from each NFP analysis. If at least min_cycles analyses have valid
    temperature data, returns the average day offset from cycle start.

    Args:
        symptom_history: Full symptom history
        cycle_starts: Sorted list of cycle start dates (ISO format)
        period_duration_days: Days to skip at cycle start
        min_cycles: Minimum analyses needed to return a value (default 2)
        max_cycles: Maximum recent cycles to examine (default 5)

    Returns:
        int: Average day offset (e.g., 17 means ovulation ~17 days after cycle start)
        None: If insufficient data (< min_cycles with temperature data)
    """
    if not cycle_starts or len(cycle_starts) < min_cycles:
        return None

    recent_starts = cycle_starts[-max_cycles:]
    ovulation_offsets: list[int] = []

    for cycle_start_iso in recent_starts:
        try:
            cycle_start = date.fromisoformat(cycle_start_iso)
        except ValueError:
            continue

        nfp_result = analyze_nfp_cycle(symptom_history, cycle_start_iso, period_duration_days)

        # Extract temperature rise day if available (works even for LOW-confidence)
        temp_rise_day_iso = nfp_result.get("temperature_rise_day")
        if temp_rise_day_iso:
            try:
                temp_rise_day = date.fromisoformat(temp_rise_day_iso)
                offset = (temp_rise_day - cycle_start).days
                # Sanity check: ovulation should be between day 8 and day 25
                if 8 <= offset <= 25:
                    ovulation_offsets.append(offset)
            except ValueError:
                continue

    # Return average only if we have enough data points
    if len(ovulation_offsets) >= min_cycles:
        return round(sum(ovulation_offsets) / len(ovulation_offsets))

    return None


def normalize_symptoms(symptom_history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalize symptom history and ensure all dates are valid ISO format."""
    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()

    for item in symptom_history:
        if not isinstance(item, dict):
            continue
        date_str = item.get("date")
        if not date_str:
            continue
        try:
            iso_date = date.fromisoformat(str(date_str)).isoformat()
            if iso_date not in seen:
                normalized_item = dict(item)
                normalized_item["date"] = iso_date
                normalized.append(normalized_item)
                seen.add(iso_date)
        except ValueError:
            continue

    return sorted(normalized, key=lambda x: x.get("date", ""))


def calculate_pregnancy_info(pregnancy_start_date: str | None, today: date | None = None) -> tuple[int | None, str | None]:
    """Calculate weeks pregnant and due date from pregnancy start date (first day of last period)."""
    if not pregnancy_start_date:
        return None, None

    now = today or date.today()
    try:
        start = date.fromisoformat(str(pregnancy_start_date))
    except ValueError:
        return None, None

    # Reject future start dates – pregnancy cannot start in the future
    if start > now:
        return None, None

    # Gestational age uses 1-based week counting (week 1 = days 0–6 after LMP)
    weeks = (now - start).days // 7 + 1
    # Due date is 280 days after start
    due = start + timedelta(days=PREGNANCY_DAYS)

    return weeks, due.isoformat()


def analyze_nfp_cycle(
    symptom_history: list[dict[str, Any]],
    cycle_start_iso: str,
    period_duration_days: int = 5,
) -> dict[str, Any]:
    """Analyze a cycle for NFP (Natural Family Planning / Symptothermal Method) indicators.

    Uses the Roetzer rule for temperature rise detection and analyses cervical mucus
    and cervix position data.  Returns a structured result dict.  When there is
    insufficient data the returned ``confidence_level`` is ``"low"`` and
    ``ovulation_detected`` is ``False``.
    """
    empty_result: dict[str, Any] = {
        "ovulation_detected": False,
        "ovulation_day": None,
        "fertile_window": {"start": None, "end": None},
        "temperature_rise_detected": False,
        "temperature_rise_day": None,
        "temperature_peak_day": None,
        "cervical_mucus_peak": None,
        "cervix_peak": None,
        "confidence_level": "low",
        "nfp_symptom_score": 0.0,
        "details": {
            "temperature_rise_confirmed": False,
            "has_cervical_mucus_data": False,
            "has_cervix_data": False,
            "conflicting_signals": False,
        },
    }

    try:
        cycle_start = date.fromisoformat(str(cycle_start_iso))
    except (ValueError, AttributeError, TypeError):
        return empty_result

    # Collect entries from this cycle onwards, sorted by date
    cycle_symptoms: list[dict[str, Any]] = []
    for entry in symptom_history:
        if not isinstance(entry, dict):
            continue
        entry_date = entry.get("date")
        if not isinstance(entry_date, str):
            continue
        try:
            date.fromisoformat(entry_date)
        except ValueError:
            continue
        if entry_date >= cycle_start_iso:
            cycle_symptoms.append(entry)
    cycle_symptoms.sort(key=lambda x: x["date"])

    if not cycle_symptoms:
        return empty_result

    # Skip period days for ovulation indicators
    fertility_start_iso = (cycle_start + timedelta(days=period_duration_days)).isoformat()

    # -----------------------------------------------------------------------
    # Temperature Rise Detection (Roetzer Rule)
    # -----------------------------------------------------------------------
    # Build ordered list of (date_iso, temperature) pairs for this cycle.
    temp_data: list[tuple[str, float]] = []
    for entry in cycle_symptoms:
        raw_temp = entry.get("basal_temp")
        if raw_temp is None:
            continue
        try:
            temp_val = float(raw_temp)
        except (ValueError, TypeError):
            continue
        temp_data.append((entry["date"], temp_val))
    temp_data.sort(key=lambda x: x[0])

    temp_rise_day: str | None = None
    temp_rise_confirmed = False

    # Roetzer rule: baseline = lowest of the 6 preceding measurements;
    # rise confirmed when 3+ consecutive readings are >= baseline + 0.2 °C.
    # A candidate rise is only accepted when no reading within _RISE_SUSTAIN_DAYS
    # *calendar* days after the last confirmed high reading drops back below the
    # threshold.  This prevents a transient spike from being accepted as the true
    # biphasic shift, while remaining robust to multi-cycle symptom histories where
    # temperatures naturally reset after a new cycle begins far in the future.
    # At the trailing edge of available data 2 consecutive readings suffice because
    # the third day has simply not yet been logged.
    _RISE_SUSTAIN_DAYS = 7
    if len(temp_data) >= 7:
        for i in range(6, len(temp_data)):
            baseline = min(t for _, t in temp_data[i - 6 : i])
            threshold = baseline + 0.2
            # Count consecutive readings from position i that meet the threshold.
            consecutive = 0
            for j in range(i, min(i + 3, len(temp_data))):
                if temp_data[j][1] >= threshold:
                    consecutive += 1
                else:
                    break
            # Allow 2 consecutive when we are at the very end of the recorded data
            # (the third day simply has not been logged yet).
            at_data_end = (i + consecutive >= len(temp_data))
            required = 2 if at_data_end else 3
            if consecutive >= required:
                # Determine the cutoff date for the sustain window: only readings
                # that fall within _RISE_SUSTAIN_DAYS calendar days of the last
                # confirmed high reading are examined, so data from a subsequent
                # cycle (which naturally returns to lower temperatures) does not
                # invalidate a genuine rise in the current cycle.
                last_high_date = date.fromisoformat(temp_data[i + consecutive - 1][0])
                cutoff_date = last_high_date + timedelta(days=_RISE_SUSTAIN_DAYS)
                sustained = all(
                    temp_data[k][1] >= threshold
                    for k in range(i + consecutive, len(temp_data))
                    if date.fromisoformat(temp_data[k][0]) <= cutoff_date
                )
                if sustained:
                    temp_rise_day = temp_data[i][0]
                    temp_rise_confirmed = True
                    break

    # -----------------------------------------------------------------------
    # Temperature Peak Day (highest basal temperature in post-period phase)
    # -----------------------------------------------------------------------
    # Distinct from temperature_rise_day (which marks the *start* of the confirmed
    # Roetzer rise); temperature_peak_day marks the single day with the highest
    # recorded basal temperature after the period ends.
    temperature_peak_day: str | None = None
    if temp_data:
        post_period_temps = [
            (d, t) for d, t in temp_data if d >= fertility_start_iso
        ]
        if post_period_temps:
            temperature_peak_day = max(post_period_temps, key=lambda x: x[1])[0]

    # -----------------------------------------------------------------------
    # Cervical Mucus Peak
    # -----------------------------------------------------------------------
    fertile_mucus = {"cremig", "fadenziehend"}
    mucus_peak: str | None = None
    has_cervical_mucus_data = False
    for entry in cycle_symptoms:
        if entry.get("date", "") < fertility_start_iso:
            continue
        mucus = entry.get("cervical_mucus", "")
        if mucus:
            has_cervical_mucus_data = True
        if mucus in fertile_mucus:
            mucus_peak = entry["date"]  # keep updating → last fertile-quality day

    # -----------------------------------------------------------------------
    # Cervix Position Peak
    # -----------------------------------------------------------------------
    cervix_peak: str | None = None
    has_cervix_data = False
    for entry in cycle_symptoms:
        if entry.get("date", "") < fertility_start_iso:
            continue
        pos = entry.get("cervix_position", "")
        texture = entry.get("cervix_texture", "")
        if pos:
            has_cervix_data = True
        if pos == "cervix_high" and texture in ("soft", "open"):
            cervix_peak = entry["date"]  # keep updating → last favourable day

    # -----------------------------------------------------------------------
    # Ovulation Estimation
    # -----------------------------------------------------------------------
    # Ovulation ≈ 1 day after each indicator peak.
    candidate_days: list[str] = []
    if temp_rise_confirmed and temp_rise_day:
        candidate_days.append(
            (date.fromisoformat(temp_rise_day) + timedelta(days=1)).isoformat()
        )
    if mucus_peak:
        candidate_days.append(
            (date.fromisoformat(mucus_peak) + timedelta(days=1)).isoformat()
        )
    if cervix_peak:
        candidate_days.append(
            (date.fromisoformat(cervix_peak) + timedelta(days=1)).isoformat()
        )

    if not candidate_days:
        return {
            **empty_result,
            "temperature_rise_detected": temp_rise_confirmed,
            "temperature_rise_day": temp_rise_day,
            "temperature_peak_day": temperature_peak_day,
            "cervical_mucus_peak": mucus_peak,
            "cervix_peak": cervix_peak,
            "details": {
                **empty_result["details"],
                "temperature_rise_confirmed": temp_rise_confirmed,
                "has_cervical_mucus_data": has_cervical_mucus_data,
                "has_cervix_data": has_cervix_data,
            },
        }

    # Use the latest candidate as ovulation estimate (most conservative / post-ovulation)
    ovulation_day_iso = max(candidate_days)

    # Fertile window: 5 days before ovulation through 1 day after (Sensiplan standard)
    ov_date = date.fromisoformat(ovulation_day_iso)
    fertile_start_iso = (ov_date - timedelta(days=5)).isoformat()
    fertile_end_iso = (ov_date + timedelta(days=1)).isoformat()

    # -----------------------------------------------------------------------
    # Confidence Scoring
    # -----------------------------------------------------------------------
    score = 0.0
    if temp_rise_confirmed:
        score += 0.6
    if mucus_peak:
        score += 0.25
    if cervix_peak:
        score += 0.15

    # Detect conflicting signals: temperature rise and mucus peak more than
    # 5 days apart is suspicious.
    conflicting = False
    if temp_rise_day and mucus_peak:
        gap = abs((date.fromisoformat(temp_rise_day) - date.fromisoformat(mucus_peak)).days)
        if gap > 5:
            conflicting = True
            score *= 0.6

    if temp_rise_confirmed and (mucus_peak or cervix_peak):
        confidence: str = "high"
    elif (temp_rise_confirmed and mucus_peak) or (temp_rise_confirmed and cervix_peak) or (mucus_peak and cervix_peak):
        confidence = "medium"
    else:
        confidence = "low"

    if conflicting:
        confidence = "low"

    ovulation_detected = confidence in ("high", "medium")

    return {
        "ovulation_detected": ovulation_detected,
        "ovulation_day": ovulation_day_iso if ovulation_detected else None,
        "fertile_window": {
            "start": fertile_start_iso if ovulation_detected else None,
            "end": fertile_end_iso if ovulation_detected else None,
        },
        "temperature_rise_detected": temp_rise_confirmed,
        "temperature_rise_day": temp_rise_day,
        "temperature_peak_day": temperature_peak_day,
        "cervical_mucus_peak": mucus_peak,
        "cervix_peak": cervix_peak,
        "confidence_level": confidence,
        "nfp_symptom_score": round(min(1.0, max(0.0, score)), 2),
        "details": {
            "temperature_rise_confirmed": temp_rise_confirmed,
            "has_cervical_mucus_data": has_cervical_mucus_data,
            "has_cervix_data": has_cervix_data,
            "conflicting_signals": conflicting,
        },
    }


def _entry_value_set(entry: dict[str, Any], key: str) -> set[str]:
    """Return normalized string values for a symptom entry field."""
    raw_value = entry.get(key)
    if raw_value is None:
        return set()

    values = raw_value if isinstance(raw_value, (list, tuple, set)) else [raw_value]
    normalized: set[str] = set()
    for value in values:
        text = str(value).strip().lower()
        if text:
            normalized.add(text)
    return normalized


def compute_cycle_conception_likelihood(
    history: list[str],
    symptom_history: list[dict[str, Any]],
    cycle_start_iso: str,
    nfp_analysis: dict[str, Any] | None,
    fertile_window_start: str | None = None,
    fertile_window_end: str | None = None,
    ovulation_day: str | None = None,
    today: date | None = None,
) -> dict[str, Any]:
    """Estimate the current cycle's conception likelihood from cycle + symptom data."""
    result: dict[str, Any] = {
        "probability": None,
        "level": "unknown",
        "confidence": "low",
        "reason_key": "insufficient_data",
        "window_source": "none",
        "factors": {
            "unprotected_intercourse_days": 0,
            "protected_intercourse_days": 0,
            "positive_ovulation_tests": 0,
            "negative_pregnancy_tests": 0,
            "fertile_signal_count": 0,
        },
    }

    try:
        cycle_start = date.fromisoformat(str(cycle_start_iso))
    except (TypeError, ValueError):
        return result

    now = today or date.today()
    normalized_history = [day for day in normalize_history(history) if day <= now.isoformat()]
    cycle_symptoms = [
        entry
        for entry in normalize_symptoms(symptom_history)
        if cycle_start_iso <= entry.get("date", "") <= now.isoformat()
    ]

    if not cycle_symptoms and len(normalized_history) < 2:
        return result

    fw_start_date: date | None = None
    fw_end_date: date | None = None
    ovulation_date: date | None = None
    window_source = "none"
    try:
        if fertile_window_start and fertile_window_end:
            fw_start_date = date.fromisoformat(str(fertile_window_start))
            fw_end_date = date.fromisoformat(str(fertile_window_end))
            window_source = (
                "nfp"
                if nfp_analysis and nfp_analysis.get("ovulation_detected")
                else "estimated"
            )
        if ovulation_day:
            ovulation_date = date.fromisoformat(str(ovulation_day))
        elif fw_end_date is not None:
            ovulation_date = fw_end_date - timedelta(days=1)
    except ValueError:
        fw_start_date = None
        fw_end_date = None
        ovulation_date = None
        window_source = "none"

    unprotected_days: list[date] = []
    protected_days: list[date] = []
    positive_ovulation_tests = 0
    negative_ovulation_tests = 0
    positive_pregnancy_tests = 0
    negative_pregnancy_tests: list[date] = []
    late_bleeding = False

    for entry in cycle_symptoms:
        entry_date = date.fromisoformat(entry["date"])
        intercourse_values = _entry_value_set(entry, "intercourse")
        test_values = _entry_value_set(entry, "test")

        if "unprotected" in intercourse_values:
            unprotected_days.append(entry_date)
        if "protected" in intercourse_values:
            protected_days.append(entry_date)

        if "positive_ovulation" in test_values:
            positive_ovulation_tests += 1
        if "negative_ovulation" in test_values:
            negative_ovulation_tests += 1
        if "positive_pregnancy" in test_values:
            positive_pregnancy_tests += 1
        if "negative_pregnancy" in test_values:
            negative_pregnancy_tests.append(entry_date)

        bleeding_strength = str(entry.get("bleeding_strength", "")).strip().lower()
        if (
            ovulation_date is not None
            and bleeding_strength in {"medium", "heavy", "very_heavy"}
            and (entry_date - ovulation_date).days >= 7
        ):
            late_bleeding = True

    if positive_pregnancy_tests:
        return {
            **result,
            "probability": 99,
            "level": "high",
            "confidence": "high",
            "reason_key": "positive_test",
            "window_source": window_source,
            "factors": {
                **result["factors"],
                "unprotected_intercourse_days": len(unprotected_days),
                "protected_intercourse_days": len(protected_days),
                "positive_ovulation_tests": positive_ovulation_tests,
                "negative_pregnancy_tests": len(negative_pregnancy_tests),
                "fertile_signal_count": 1,
            },
        }

    nfp_details = nfp_analysis.get("details", {}) if isinstance(nfp_analysis, dict) else {}
    temp_rise_confirmed = bool(
        (isinstance(nfp_details, dict) and nfp_details.get("temperature_rise_confirmed"))
        or (isinstance(nfp_analysis, dict) and nfp_analysis.get("temperature_rise_detected"))
    )
    fertile_signal_count = sum(
        1
        for value in (
            temp_rise_confirmed,
            bool(isinstance(nfp_analysis, dict) and nfp_analysis.get("cervical_mucus_peak")),
            bool(isinstance(nfp_analysis, dict) and nfp_analysis.get("cervix_peak")),
            positive_ovulation_tests > 0,
            window_source == "nfp" and ovulation_date is not None,
        )
        if value
    )

    recent_starts = grouped_cycle_starts(normalized_history)[-7:]
    cycle_lengths: list[int] = []
    for idx in range(1, len(recent_starts)):
        diff = (date.fromisoformat(recent_starts[idx]) - date.fromisoformat(recent_starts[idx - 1])).days
        if 10 < diff < 80:
            cycle_lengths.append(diff)

    regularity_bonus = 0.0
    confidence_score = 0.05 if cycle_symptoms else 0.0
    if cycle_lengths:
        mean = sum(cycle_lengths) / len(cycle_lengths)
        variance = sum((length - mean) ** 2 for length in cycle_lengths) / len(cycle_lengths)
        std = variance ** 0.5
        if std <= 2:
            regularity_bonus = 0.03
            confidence_score += 0.18
        elif std <= 5:
            regularity_bonus = 0.02
            confidence_score += 0.1
        else:
            confidence_score += 0.03

    nfp_confidence = (
        str(nfp_analysis.get("confidence_level", "low")).lower()
        if isinstance(nfp_analysis, dict)
        else "low"
    )
    if nfp_confidence == "high":
        confidence_score += 0.32
    elif nfp_confidence == "medium":
        confidence_score += 0.22
    elif fertile_signal_count:
        confidence_score += 0.12

    if window_source != "none":
        confidence_score += 0.12
    if positive_ovulation_tests:
        confidence_score += 0.08
    if isinstance(nfp_details, dict) and nfp_details.get("conflicting_signals"):
        confidence_score -= 0.15

    probability = 0.01
    if ovulation_date is not None:
        probability += 0.05
    if fw_start_date is not None and fw_end_date is not None:
        probability += 0.04
    if temp_rise_confirmed:
        probability += 0.04
    if positive_ovulation_tests:
        probability += 0.04
    if isinstance(nfp_analysis, dict) and nfp_analysis.get("cervical_mucus_peak"):
        probability += 0.03
    if isinstance(nfp_analysis, dict) and nfp_analysis.get("cervix_peak"):
        probability += 0.02
    probability += regularity_bonus

    unprotected_best = 0
    unprotected_window = 0
    protected_window = 0

    for intercourse_day in unprotected_days:
        if ovulation_date is not None and 0 <= (ovulation_date - intercourse_day).days <= 2:
            unprotected_best += 1
        elif fw_start_date is not None and fw_end_date is not None and fw_start_date <= intercourse_day <= fw_end_date:
            unprotected_window += 1
        elif fw_start_date is not None and fw_end_date is not None:
            near_start = fw_start_date - timedelta(days=2)
            near_end = fw_end_date + timedelta(days=1)
            if near_start <= intercourse_day <= near_end:
                probability += 0.08
        else:
            probability += 0.04

    for intercourse_day in protected_days:
        if fw_start_date is not None and fw_end_date is not None and fw_start_date <= intercourse_day <= fw_end_date:
            protected_window += 1
        elif ovulation_date is not None and 0 <= (ovulation_date - intercourse_day).days <= 2:
            protected_window += 1

    if unprotected_best:
        probability += 0.22 + min(0.08, (unprotected_best - 1) * 0.04)
    elif unprotected_window:
        probability += 0.16 + min(0.06, (unprotected_window - 1) * 0.03)
    elif protected_window:
        probability += 0.04

    if negative_ovulation_tests and not positive_ovulation_tests:
        probability -= 0.03
    if isinstance(nfp_details, dict) and nfp_details.get("conflicting_signals"):
        probability -= 0.05

    late_negative_test = bool(
        ovulation_date is not None
        and any((test_day - ovulation_date).days >= 10 for test_day in negative_pregnancy_tests)
    )
    if late_negative_test:
        probability = min(probability, 0.08)

    if late_bleeding:
        probability = min(probability, 0.05)

    if not unprotected_days and not protected_days and positive_pregnancy_tests == 0:
        probability = min(probability, 0.28)

    if fertile_signal_count == 0 and not unprotected_days and not protected_days and len(cycle_symptoms) < 3:
        return {
            **result,
            "window_source": window_source,
            "factors": {
                **result["factors"],
                "unprotected_intercourse_days": len(unprotected_days),
                "protected_intercourse_days": len(protected_days),
                "positive_ovulation_tests": positive_ovulation_tests,
                "negative_pregnancy_tests": len(negative_pregnancy_tests),
                "fertile_signal_count": fertile_signal_count,
            },
        }

    probability = max(0.0, min(0.85, probability))
    probability_percent = int(round(probability * 100))

    if confidence_score >= 0.6:
        confidence = "high"
    elif confidence_score >= 0.3:
        confidence = "medium"
    else:
        confidence = "low"

    if probability_percent >= 40:
        level = "high"
    elif probability_percent >= 18:
        level = "elevated"
    else:
        level = "low"

    reason_key = "fertile_signals"
    if late_negative_test:
        reason_key = "negative_test"
    elif unprotected_best or unprotected_window:
        reason_key = "fertile_unprotected"
    elif protected_window:
        reason_key = "protected_window"
    elif late_bleeding or (temp_rise_confirmed and fw_end_date is not None and now > fw_end_date):
        reason_key = "post_ovulation"

    return {
        "probability": probability_percent,
        "level": level,
        "confidence": confidence,
        "reason_key": reason_key,
        "window_source": window_source,
        "factors": {
            "unprotected_intercourse_days": len(unprotected_days),
            "protected_intercourse_days": len(protected_days),
            "positive_ovulation_tests": positive_ovulation_tests,
            "negative_pregnancy_tests": len(negative_pregnancy_tests),
            "fertile_signal_count": fertile_signal_count,
        },
    }


def compute_period_forecast(
    grouped_starts: list[str],
    next_predicted_start: str | None,
    period_duration_days: int,
) -> dict[str, Any] | None:
    """Compute a period forecast with confidence based on cycle regularity.

    Returns a dict with:
        predicted_start: ISO date string of the next expected period start.
        predicted_end: ISO date string of the expected period end.
        cycle_std_days: Standard deviation of recent cycle lengths (int).
        confidence: 'high' (std ≤ 2), 'medium' (std ≤ 5), or 'low'.

    Returns None when fewer than 2 cycle starts are available.
    """
    if not next_predicted_start or len(grouped_starts) < 2:
        return None

    # Compute recent cycle lengths (up to 6 most recent)
    recent = grouped_starts[-7:]
    lengths: list[int] = []
    for idx in range(1, len(recent)):
        diff = (date.fromisoformat(recent[idx]) - date.fromisoformat(recent[idx - 1])).days
        if 10 < diff < 80:
            lengths.append(diff)

    if not lengths:
        return None

    mean = sum(lengths) / len(lengths)
    variance = sum((x - mean) ** 2 for x in lengths) / len(lengths)
    std = variance ** 0.5

    if std <= 2:
        confidence = "high"
    elif std <= 5:
        confidence = "medium"
    else:
        confidence = "low"

    predicted_end = (
        date.fromisoformat(next_predicted_start) + timedelta(days=period_duration_days - 1)
    ).isoformat()

    return {
        "predicted_start": next_predicted_start,
        "predicted_end": predicted_end,
        "cycle_std_days": round(std, 1),
        "confidence": confidence,
    }


def compute_fertility_forecast(
    next_predicted_start: str | None,
    avg_cycle_length: int | None,
    fertile_window_start: str | None,
    fertile_window_end: str | None,
    ovulation_day: str | None,
    nfp_analysis: dict[str, Any] | None,
) -> dict[str, Any] | None:
    """Compute a fertility / conception planning forecast.

    Returns a dict with:
        ovulation_estimate: ISO date string of the estimated ovulation day.
        fertile_window_start: Start of the fertile window (ISO date).
        fertile_window_end: End of the fertile window (ISO date).
        best_days_start: Best days for conception – 2 days before ovulation (ISO date).
        best_days_end: Best days for conception – 1 day before ovulation (ISO date).
        source: 'nfp' when derived from confirmed NFP analysis, 'estimated' otherwise.
        confidence: 'high', 'medium', or 'low'.

    Returns None when there is insufficient data to produce an estimate.
    """
    if not ovulation_day or not fertile_window_start or not fertile_window_end:
        return None

    # Determine source and confidence
    nfp_confidence = nfp_analysis.get("confidence_level") if nfp_analysis else None
    nfp_detected = nfp_analysis.get("ovulation_detected", False) if nfp_analysis else False

    if nfp_detected and nfp_confidence in ("high", "medium"):
        source = "nfp"
        confidence = nfp_confidence
    else:
        source = "estimated"
        confidence = "low" if avg_cycle_length is None else "medium"

    # Best conception days: peak fertility is ~1–2 days before ovulation
    ov_date = date.fromisoformat(ovulation_day)
    best_start = (ov_date - timedelta(days=2)).isoformat()
    best_end = (ov_date - timedelta(days=1)).isoformat()

    return {
        "ovulation_estimate": ovulation_day,
        "fertile_window_start": fertile_window_start,
        "fertile_window_end": fertile_window_end,
        "best_days_start": best_start,
        "best_days_end": best_end,
        "source": source,
        "confidence": confidence,
    }


def _overlap_probability(
    range_start: date,
    range_end: date,
    event_start: date,
    event_end: date,
    uncertainty_days: int,
    confidence_weight: float,
) -> float:
    """Estimate overlap probability between a user range and an uncertain event window."""
    uncertainty = max(0, min(21, int(uncertainty_days)))
    weighted_confidence = max(0.0, min(1.0, float(confidence_weight)))
    expanded_start = event_start - timedelta(days=uncertainty)
    expanded_end = event_end + timedelta(days=uncertainty)

    overlap_start = max(range_start, expanded_start)
    overlap_end = min(range_end, expanded_end)
    if overlap_start > overlap_end:
        return 0.0

    overlap_days = (overlap_end - overlap_start).days + 1
    expanded_days = max(1, (expanded_end - expanded_start).days + 1)
    range_days = max(1, (range_end - range_start).days + 1)

    # Blend "event coverage" and "range coverage":
    # - event coverage: how much of the likely event window is included by the user range
    # - range coverage: how much of the selected range is covered by likely event days
    event_coverage = overlap_days / expanded_days
    range_coverage = overlap_days / range_days
    base_probability = (event_coverage * 0.7) + (range_coverage * 0.3)
    return max(0.0, min(1.0, base_probability * weighted_confidence))


def _likelihood_label(probability: float) -> str:
    """Map numeric probability to user-friendly likelihood labels."""
    if probability >= 0.67:
        return "likely"
    if probability >= 0.34:
        return "possible"
    return "unlikely"


def compute_date_range_forecast(
    period_forecast: dict[str, Any] | None,
    fertility_forecast: dict[str, Any] | None,
    range_start_iso: str,
    range_end_iso: str,
) -> dict[str, Any] | None:
    """Compute date-range likelihood estimates for period and fertility planning."""
    try:
        range_start = date.fromisoformat(str(range_start_iso))
        range_end = date.fromisoformat(str(range_end_iso))
    except (TypeError, ValueError):
        return None
    if range_start > range_end:
        return None

    period_result: dict[str, Any] | None = None
    if (
        period_forecast
        and period_forecast.get("predicted_start")
        and period_forecast.get("predicted_end")
    ):
        try:
            period_start = date.fromisoformat(str(period_forecast["predicted_start"]))
            period_end = date.fromisoformat(str(period_forecast["predicted_end"]))
        except (TypeError, ValueError):
            period_start = None
            period_end = None

        if period_start and period_end:
            std_days_raw = period_forecast.get("cycle_std_days", 3)
            try:
                std_days = max(1, min(14, int(round(float(std_days_raw)))))
            except (TypeError, ValueError):
                std_days = 3

            confidence = str(period_forecast.get("confidence", "low")).lower()
            confidence_weight = 1.0 if confidence == "high" else 0.85 if confidence == "medium" else 0.65
            probability = _overlap_probability(
                range_start,
                range_end,
                period_start,
                period_end,
                std_days,
                confidence_weight,
            )
            period_result = {
                "probability": round(probability, 3),
                "probability_percent": int(round(probability * 100)),
                "likelihood": _likelihood_label(probability),
                "confidence": confidence,
                "uncertainty_days": std_days,
            }

    fertility_result: dict[str, Any] | None = None
    if (
        fertility_forecast
        and fertility_forecast.get("fertile_window_start")
        and fertility_forecast.get("fertile_window_end")
        and fertility_forecast.get("ovulation_estimate")
    ):
        try:
            fertile_start = date.fromisoformat(str(fertility_forecast["fertile_window_start"]))
            fertile_end = date.fromisoformat(str(fertility_forecast["fertile_window_end"]))
            ovulation = date.fromisoformat(str(fertility_forecast["ovulation_estimate"]))
        except (TypeError, ValueError):
            fertile_start = None
            fertile_end = None
            ovulation = None

        if fertile_start and fertile_end and ovulation:
            confidence = str(fertility_forecast.get("confidence", "low")).lower()
            source = str(fertility_forecast.get("source", "estimated")).lower()
            confidence_weight = 1.0 if confidence == "high" else 0.85 if confidence == "medium" else 0.6
            if source != "nfp":
                confidence_weight *= 0.9
            uncertainty_days = 1 if confidence == "high" else 2 if confidence == "medium" else 4
            if source != "nfp":
                uncertainty_days += 1

            fertile_probability = _overlap_probability(
                range_start,
                range_end,
                fertile_start,
                fertile_end,
                uncertainty_days,
                confidence_weight,
            )
            ovulation_probability = _overlap_probability(
                range_start,
                range_end,
                ovulation,
                ovulation,
                uncertainty_days,
                confidence_weight,
            )
            probability = max(0.0, min(1.0, (fertile_probability * 0.7) + (ovulation_probability * 0.3)))

            best_days_overlap = False
            best_start_raw = fertility_forecast.get("best_days_start")
            best_end_raw = fertility_forecast.get("best_days_end")
            try:
                if best_start_raw and best_end_raw:
                    best_start = date.fromisoformat(str(best_start_raw))
                    best_end = date.fromisoformat(str(best_end_raw))
                    best_days_overlap = not (best_end < range_start or best_start > range_end)
            except (TypeError, ValueError):
                best_days_overlap = False
            if best_days_overlap:
                probability = min(1.0, probability + 0.1)

            fertility_result = {
                "probability": round(probability, 3),
                "probability_percent": int(round(probability * 100)),
                "likelihood": _likelihood_label(probability),
                "confidence": confidence,
                "source": source,
                "uncertainty_days": uncertainty_days,
                "best_days_overlap": best_days_overlap,
            }

    return {
        "range_start": range_start.isoformat(),
        "range_end": range_end.isoformat(),
        "period": period_result,
        "fertility": fertility_result,
    }


def build_cycle_model(
    history: list[str],
    period_duration_days: int,
    symptom_history: list[dict[str, Any]] | None = None,
    pregnancy_data: dict[str, Any] | None = None,
    menarche_data: dict[str, Any] | None = None,
    pre_menarche_data: dict[str, Any] | None = None,
    menopause_data: dict[str, Any] | None = None,
    noncycle_data: dict[str, Any] | None = None,
    today: date | None = None,
    cycle_length_override: int | None = None,
    nfp_mode: str = DEFAULT_NFP_ANALYSIS_MODE,
) -> CycleModel:
    """Build complete cycle model for sensor state + attributes."""
    now = today or date.today()
    normalized = normalize_history(history)
    symptoms = normalize_symptoms(symptom_history or [])

    preg_data = pregnancy_data or {"is_pregnant": False, "start_date": None}
    is_pregnant = bool(preg_data.get("is_pregnant", False))
    pregnancy_start_date = preg_data.get("start_date")

    men_data: dict[str, Any] = {"tracking_active": False, "is_menarche": False, "menarche_date": None, "estimated_date": None, "family_menarche_age": None}
    if isinstance(menarche_data, dict):
        men_data.update(menarche_data)

    pre_men_data: dict[str, Any] = {"signs": {}, "tanner_stage": None}
    if isinstance(pre_menarche_data, dict):
        pre_men_data.update(pre_menarche_data)

    meno_data: dict[str, Any] = {"is_menopause": False, "start_date": None}
    if isinstance(menopause_data, dict):
        meno_data.update(menopause_data)

    nc_data: dict[str, Any] = {"has_noncycle": False}
    if isinstance(noncycle_data, dict):
        nc_data.update(noncycle_data)

    # If pregnant, return pregnancy state
    if is_pregnant:
        weeks, due_date = calculate_pregnancy_info(pregnancy_start_date, now)
        return CycleModel(
            history=normalized,
            grouped_starts=[],
            bleeding_blocks=[],
            next_predicted_start=None,
            predicted_cycle_starts=[],
            avg_cycle_length=None,
            fertile_window_start=None,
            fertile_window_end=None,
            ovulation_day=None,
            days_until_next_start=None,
            period_duration_days=period_duration_days,
            learned_period_duration_days=None,
            current_period=None,
            state=STATE_PREGNANT,
            symptom_history=symptoms,
            is_pregnant=True,
            pregnancy_start_date=pregnancy_start_date,
            weeks_pregnant=weeks,
            due_date=due_date,
            menarche_data=men_data,
            pre_menarche_data=pre_men_data,
            menopause_data=meno_data,
            noncycle_data=nc_data,
            nfp_analysis=None,
            learned_ovulation_offset=None,
            nfp_mode=nfp_mode,
            period_forecast=None,
            fertility_forecast=None,
        )

    # If in pre-menarche mode (tracking explicitly enabled, awaiting first period)
    if men_data.get("tracking_active") and men_data.get("is_menarche") is False:
        return CycleModel(
            history=normalized,
            grouped_starts=[],
            bleeding_blocks=[],
            next_predicted_start=men_data.get("estimated_date"),
            predicted_cycle_starts=[],
            avg_cycle_length=None,
            fertile_window_start=None,
            fertile_window_end=None,
            ovulation_day=None,
            days_until_next_start=None,
            period_duration_days=period_duration_days,
            learned_period_duration_days=None,
            current_period=None,
            state=STATE_PRE_MENARCHE,
            symptom_history=symptoms,
            is_pregnant=False,
            pregnancy_start_date=None,
            weeks_pregnant=None,
            due_date=None,
            menarche_data=men_data,
            pre_menarche_data=pre_men_data,
            menopause_data=meno_data,
            noncycle_data=nc_data,
            nfp_analysis=None,
            learned_ovulation_offset=None,
            nfp_mode=nfp_mode,
            period_forecast=None,
            fertility_forecast=None,
        )

    # If menarche has been recorded, check if we're in the menarche transition state
    if men_data.get("is_menarche") is True and men_data.get("menarche_date"):
        menarche_date_str = men_data["menarche_date"]
        try:
            menarche_date = date.fromisoformat(str(menarche_date_str))
            days_since_menarche = (now - menarche_date).days
            # Menarche state persists for first ~90 days (3 months) after first period
            if days_since_menarche <= 90 and len(normalized) <= 3:
                return CycleModel(
                    history=normalized,
                    grouped_starts=[],
                    bleeding_blocks=[],
                    next_predicted_start=None,
                    predicted_cycle_starts=[],
                    avg_cycle_length=None,
                    fertile_window_start=None,
                    fertile_window_end=None,
                    ovulation_day=None,
                    days_until_next_start=None,
                    period_duration_days=period_duration_days,
                    learned_period_duration_days=None,
                    current_period=None,
                    state=STATE_MENARCHE,
                    symptom_history=symptoms,
                    is_pregnant=False,
                    pregnancy_start_date=None,
                    weeks_pregnant=None,
                    due_date=None,
                    menarche_data=men_data,
                    pre_menarche_data=pre_men_data,
                    menopause_data=meno_data,
                    noncycle_data=nc_data,
                    nfp_analysis=None,
                    learned_ovulation_offset=None,
                    nfp_mode=nfp_mode,
                    period_forecast=None,
                    fertility_forecast=None,
                )
        except ValueError:
            pass

    # Keep model based on confirmed values up to today, but keep full history as attribute.
    base_history = [item for item in normalized if item <= now.isoformat()] or normalized

    blocks = bleeding_blocks(base_history)
    blocks_payload = [
        {
            "start": block[0],
            "end": block[-1],
            "length": len(block),
        }
        for block in blocks
        if block
    ]
    starts = grouped_cycle_starts(base_history)
    effective_duration, learned_avg_duration = learned_period_duration(period_duration_days, blocks)
    next_start, avg_cycle = predict_next_start(starts)
    predicted_starts = predict_future_starts(starts)
    # When cycle length is auto (no detected starts) and noncycle data exists,
    # use the default period duration of 5 days for cycle phase calculations.
    if avg_cycle is None and nc_data.get("has_noncycle"):
        avg_cycle = DEFAULT_PERIOD_DURATION_DAYS
    duration_shift_days = max(0, effective_duration - DEFAULT_PERIOD_DURATION_DAYS)
    if next_start and duration_shift_days:
        shifted_next_date = date.fromisoformat(next_start) + timedelta(days=duration_shift_days)
        next_start = shifted_next_date.isoformat()
        predicted_starts = [
            (date.fromisoformat(predicted_iso) + timedelta(days=duration_shift_days)).isoformat()
            for predicted_iso in predicted_starts
        ]
        if avg_cycle is not None:
            avg_cycle += duration_shift_days
    current_period = current_period_details(blocks, symptoms, effective_duration, now)

    fertile_start: str | None = None
    fertile_end: str | None = None
    ovulation_day_iso: str | None = None
    days_until: int | None = None
    learned_ov_offset: int | None = None

    if next_start:
        next_date = date.fromisoformat(next_start)
        # Determine effective cycle length: use override if valid, else avg_cycle, else default 28
        if cycle_length_override and CYCLE_LENGTH_OVERRIDE_MIN <= cycle_length_override <= CYCLE_LENGTH_OVERRIDE_MAX:
            effective_cycle = cycle_length_override
        elif avg_cycle and CYCLE_LENGTH_OVERRIDE_MIN <= avg_cycle <= CYCLE_LENGTH_OVERRIDE_MAX:
            effective_cycle = int(avg_cycle)
        else:
            effective_cycle = DEFAULT_CYCLE_LENGTH
        days_until = (next_date - now).days

        if nfp_mode == "strict":
            # STRICT MODE: Use only the current cycle's observed NFP data; no learning.
            # Ovulation and fertile window are derived solely from this cycle's NFP analysis.
            # They are set here as placeholders; the NFP analysis block below will populate them.
            pass
        else:
            # HYBRID MODE: Learn ovulation pattern from recent NFP temperature data,
            # fall back to the standard formula if insufficient data.
            # Ovulation: day floor(effective_cycle/2) from cycle start, consistent with frontend formula
            # = next_date - (effective_cycle - effective_cycle//2 + 1)
            # For 28-day: next_date - 15 = cycle_start + 13 = day 14 ✓
            learned_ov_offset = learn_ovulation_pattern(symptoms, starts, effective_duration) if starts else None
            if learned_ov_offset is not None:
                cycle_start_date_obj = date.fromisoformat(starts[-1])
                ovulation_day = cycle_start_date_obj + timedelta(days=learned_ov_offset)
            else:
                ovulation_day = next_date - timedelta(days=effective_cycle - effective_cycle // 2 + 1)
            ovulation_day_iso = ovulation_day.isoformat()
            # Fertile window: 5 days before ovulation through 1 day after (Sensiplan standard: 5+1+1=7 days)
            fertile_start = (ovulation_day - timedelta(days=5)).isoformat()
            fertile_end = (ovulation_day + timedelta(days=1)).isoformat()

    # NFP analysis: run when the current cycle start is known and symptom data exists.
    nfp_result: dict[str, Any] | None = None
    if starts and symptoms:
        current_cycle_start = starts[-1]
        nfp_result = analyze_nfp_cycle(symptoms, current_cycle_start, effective_duration)

        if nfp_mode == "strict":
            # STRICT MODE: Use only observed temperature rise day from the current cycle.
            # Show ovulation and fertile window only when confidence is high or medium.
            temp_rise_day_iso = nfp_result.get("temperature_rise_day")
            confidence = nfp_result.get("confidence_level")
            if temp_rise_day_iso and confidence and confidence != "low":
                ovulation_day_iso = temp_rise_day_iso
                temp_rise_date = date.fromisoformat(temp_rise_day_iso)
                fertile_start = (temp_rise_date - timedelta(days=5)).isoformat()
                fertile_end = (temp_rise_date + timedelta(days=1)).isoformat()
            else:
                ovulation_day_iso = None
                fertile_start = None
                fertile_end = None
        else:
            # HYBRID MODE: Override with high/medium confidence NFP result when available.
            if (
                nfp_result.get("ovulation_detected")
                and nfp_result.get("confidence_level") in ("high", "medium")
                and nfp_result.get("ovulation_day")
            ):
                ovulation_day_iso = nfp_result["ovulation_day"]
                fw = nfp_result.get("fertile_window", {})
                if fw.get("start") and fw.get("end"):
                    fertile_start = fw["start"]
                    fertile_end = fw["end"]

        nfp_result["conception_likelihood"] = compute_cycle_conception_likelihood(
            history=normalized,
            symptom_history=symptoms,
            cycle_start_iso=current_cycle_start,
            nfp_analysis=nfp_result,
            fertile_window_start=(nfp_result.get("fertile_window") or {}).get("start") or fertile_start,
            fertile_window_end=(nfp_result.get("fertile_window") or {}).get("end") or fertile_end,
            ovulation_day=nfp_result.get("ovulation_day") or ovulation_day_iso,
            today=now,
        )

    state = STATE_NEUTRAL
    if current_period and current_period.get("is_active"):
        state = STATE_PERIOD
    elif now.isoformat() in set(normalized):
        state = STATE_PERIOD
    elif fertile_start and fertile_end and fertile_start <= now.isoformat() <= fertile_end:
        state = STATE_FERTILE
    elif next_start and abs((date.fromisoformat(next_start) - now).days) <= 1:
        state = STATE_PMS

    period_forecast = compute_period_forecast(starts, next_start, effective_duration)
    fertility_forecast = compute_fertility_forecast(
        next_start, avg_cycle, fertile_start, fertile_end, ovulation_day_iso, nfp_result
    )

    return CycleModel(
        history=normalized,
        grouped_starts=starts,
        bleeding_blocks=blocks_payload,
        next_predicted_start=next_start,
        predicted_cycle_starts=predicted_starts,
        avg_cycle_length=avg_cycle,
        fertile_window_start=fertile_start,
        fertile_window_end=fertile_end,
        ovulation_day=ovulation_day_iso,
        days_until_next_start=days_until,
        period_duration_days=effective_duration,
        learned_period_duration_days=learned_avg_duration,
        current_period=current_period,
        state=state,
        symptom_history=symptoms,
        is_pregnant=False,
        pregnancy_start_date=None,
        weeks_pregnant=None,
        due_date=None,
        menarche_data=men_data,
        pre_menarche_data=pre_men_data,
        menopause_data=meno_data,
        noncycle_data=nc_data,
        nfp_analysis=nfp_result,
        learned_ovulation_offset=learned_ov_offset,
        nfp_mode=nfp_mode,
        period_forecast=period_forecast,
        fertility_forecast=fertility_forecast,
    )
