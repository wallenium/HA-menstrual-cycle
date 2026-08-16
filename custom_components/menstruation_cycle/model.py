"""Cycle calculation model for menstruation gauge."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from .const import (
    CYCLE_LENGTH_OVERRIDE_MAX,
    CYCLE_LENGTH_OVERRIDE_MIN,
    DEFAULT_ONBOARDING_STAGE,
    DEFAULT_CYCLE_LENGTH,
    DEFAULT_NFP_ANALYSIS_MODE,
    DEFAULT_PERIOD_DURATION_DAYS,
    ONBOARDING_STAGE_EARLY_MENARCHE,
    ONBOARDING_STAGE_ESTABLISHED_CYCLE,
    ONBOARDING_STAGE_PRE_MENARCHE,
    ONBOARDING_STAGES,
    STATE_FERTILE,
    STATE_MENARCHE,
    STATE_MENOPAUSE,
    STATE_POSTPARTUM,
    STATE_NEUTRAL,
    STATE_PERIOD,
    STATE_PMS,
    STATE_PREGNANT,
    STATE_PRE_MENARCHE,
)

PREGNANCY_DAYS = 280  # Standard pregnancy duration in days (40 weeks)

# Day-level forecast confidence thresholds and weights.
# Score mapping is deterministic and centralized:
#   score >= 0.67 -> high
#   score >= 0.34 -> medium
#   score < 0.34 -> low
PREDICTION_CONFIDENCE_HIGH_THRESHOLD = 0.67
PREDICTION_CONFIDENCE_MEDIUM_THRESHOLD = 0.34
PREDICTION_CONFIDENCE_DECAY_PER_CYCLE = 0.14
PREDICTION_CONFIDENCE_MIN_DECAY_FACTOR = 0.3
MIN_VALID_CYCLES_FOR_HIGH_PRECISION = 4
MAX_CYCLE_STD_FOR_HIGH_PRECISION = 5.0
MIN_RECENT_LOG_ENTRIES_FOR_HIGH_PRECISION = 2
RECENT_LOG_WINDOW_DAYS = 120

PREDICTION_CONFIDENCE_WEIGHTS: dict[str, float] = {
    "regularity": 0.28,
    "history_depth": 0.20,
    "nfp": 0.17,
    "source": 0.20,
    "consistency": 0.10,
    "observed_evidence": 0.05,
}


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
    symptom_correlation_insights: list[dict[str, Any]]
    symptom_correlation_insights_reason: str | None
    onboarding_stage: str
    onboarding_stage_effective: str
    learning_phase: bool
    prediction_gating: dict[str, Any]
    days_since_last_period: int | None = None
    menopause_months_tracked: int | None = None


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


PHASE_PERIOD = "period"
PHASE_FOLLICULAR = "follicular"
PHASE_FERTILE_WINDOW = "fertile_window"
PHASE_OVULATION_DAY = "ovulation_day"
PHASE_LUTEAL = "luteal"
PHASE_LATE_LUTEAL = "late_luteal"
PHASE_ORDER = (
    PHASE_PERIOD,
    PHASE_FOLLICULAR,
    PHASE_FERTILE_WINDOW,
    PHASE_OVULATION_DAY,
    PHASE_LUTEAL,
    PHASE_LATE_LUTEAL,
)

SYMPTOM_MULTI_VALUE_KEYS = ("pain", "hygiene", "test")
SYMPTOM_SINGLE_VALUE_KEYS = ("spotting", "discharge", "intercourse", "cervical_mucus", "bleeding_strength")
_CONFIDENCE_WEIGHT = {"low": 1.0, "medium": 1.6, "high": 2.2}


def _coerce_values(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if value in (None, ""):
        return []
    text = str(value).strip()
    return [text] if text else []


def _clamp_ratio(value: float, min_ratio: float = 0.1, max_ratio: float = 8.0) -> float:
    return max(min_ratio, min(max_ratio, value))


def _phase_label(phase: str) -> str:
    labels = {
        PHASE_PERIOD: "period",
        PHASE_FOLLICULAR: "follicular phase",
        PHASE_FERTILE_WINDOW: "fertile window",
        PHASE_OVULATION_DAY: "ovulation day",
        PHASE_LUTEAL: "luteal phase",
        PHASE_LATE_LUTEAL: "late luteal phase",
    }
    return labels.get(phase, phase.replace("_", " "))


def _symptom_human_label(symptom_key: str) -> str:
    key = symptom_key.split(":", 1)[1] if ":" in symptom_key else symptom_key
    return key.replace("_", " ")


def _insight_confidence(logged_days_in_phase: int, overall_logged_days: int, symptom_occurrences: int) -> str:
    if logged_days_in_phase >= 18 and overall_logged_days >= 45 and symptom_occurrences >= 8:
        return "high"
    if logged_days_in_phase >= 10 and overall_logged_days >= 25 and symptom_occurrences >= 5:
        return "medium"
    return "low"


def _symptom_presence_keys(
    entry: dict[str, Any],
    multi_value_keys: tuple[str, ...] = SYMPTOM_MULTI_VALUE_KEYS,
    single_value_keys: tuple[str, ...] = SYMPTOM_SINGLE_VALUE_KEYS,
) -> set[str]:
    present: set[str] = set()

    for key in multi_value_keys:
        for value in _coerce_values(entry.get(key)):
            present.add(f"{key}:{value}")

    for key in single_value_keys:
        value = entry.get(key)
        if value not in (None, ""):
            present.add(f"{key}:{str(value).strip()}")

    return present


def assign_symptom_day_phase(
    day_iso: str,
    cycle_start_iso: str,
    cycle_end_anchor_iso: str,
    period_duration_days: int,
    history_set: set[str] | None = None,
    fertile_window_start_iso: str | None = None,
    fertile_window_end_iso: str | None = None,
    ovulation_day_iso: str | None = None,
    late_luteal_days: int = 5,
) -> str:
    """Assign a logged symptom day to a cycle phase."""
    day = date.fromisoformat(day_iso)
    cycle_start = date.fromisoformat(cycle_start_iso)
    cycle_end_anchor = date.fromisoformat(cycle_end_anchor_iso)
    history_days = history_set or set()

    if day_iso in history_days:
        return PHASE_PERIOD

    period_days = max(1, min(14, int(period_duration_days)))
    period_end = cycle_start + timedelta(days=period_days - 1)
    if day <= period_end:
        return PHASE_PERIOD

    ovulation_day: date | None = None
    if ovulation_day_iso:
        try:
            ovulation_day = date.fromisoformat(ovulation_day_iso)
        except ValueError:
            ovulation_day = None
    if ovulation_day and day == ovulation_day:
        return PHASE_OVULATION_DAY

    fertile_start: date | None = None
    fertile_end: date | None = None
    if fertile_window_start_iso and fertile_window_end_iso:
        try:
            fertile_start = date.fromisoformat(fertile_window_start_iso)
            fertile_end = date.fromisoformat(fertile_window_end_iso)
        except ValueError:
            fertile_start = None
            fertile_end = None
    if fertile_start and fertile_end and fertile_start <= day <= fertile_end:
        return PHASE_FERTILE_WINDOW

    late_luteal_span = max(3, min(10, int(late_luteal_days)))
    late_luteal_start = cycle_end_anchor - timedelta(days=late_luteal_span - 1)
    if day >= late_luteal_start:
        return PHASE_LATE_LUTEAL

    if ovulation_day and day > ovulation_day:
        return PHASE_LUTEAL
    if fertile_end and day > fertile_end:
        return PHASE_LUTEAL
    return PHASE_FOLLICULAR


def compute_symptom_correlation_insights(
    history: list[str],
    grouped_starts: list[str],
    symptom_history: list[dict[str, Any]],
    today: date,
    period_duration_days: int = DEFAULT_PERIOD_DURATION_DAYS,
    next_predicted_start: str | None = None,
    avg_cycle_length: int | None = None,
    fertile_window_start: str | None = None,
    fertile_window_end: str | None = None,
    ovulation_day: str | None = None,
    nfp_analysis: dict[str, Any] | None = None,
    max_insights: int = 3,
    min_logged_days_per_phase: int = 5,
    min_total_symptom_occurrences: int = 3,
) -> tuple[list[dict[str, Any]], str | None]:
    """Compute phase-based symptom correlation insights."""
    starts = []
    for start in grouped_starts:
        try:
            d = date.fromisoformat(str(start))
        except ValueError:
            continue
        if d <= today:
            starts.append(d)
    starts = sorted(set(starts))
    if not starts:
        return [], "insufficient_cycle_history"

    predicted_next_date: date | None = None
    if next_predicted_start:
        try:
            predicted_next_date = date.fromisoformat(str(next_predicted_start))
        except ValueError:
            predicted_next_date = None

    nfp_window = (nfp_analysis or {}).get("fertile_window") if isinstance(nfp_analysis, dict) else {}
    nfp_fertile_start = nfp_window.get("start") if isinstance(nfp_window, dict) else None
    nfp_fertile_end = nfp_window.get("end") if isinstance(nfp_window, dict) else None
    nfp_ovulation = (nfp_analysis or {}).get("ovulation_day") if isinstance(nfp_analysis, dict) else None

    cycle_meta: list[dict[str, Any]] = []
    for idx, start in enumerate(starts):
        next_start = starts[idx + 1] if idx + 1 < len(starts) else None
        if next_start:
            cycle_end_observed = next_start - timedelta(days=1)
            cycle_end_anchor = cycle_end_observed
            cycle_length = (next_start - start).days
            cycle_ovulation = None
            cycle_fertile_start = None
            cycle_fertile_end = None
        else:
            cycle_end_observed = today
            cycle_length = int(avg_cycle_length or DEFAULT_CYCLE_LENGTH)
            cycle_end_anchor = start + timedelta(days=max(20, min(60, cycle_length)) - 1)
            if predicted_next_date and predicted_next_date > start:
                cycle_end_anchor = predicted_next_date - timedelta(days=1)
                cycle_length = (predicted_next_date - start).days
            cycle_ovulation = nfp_ovulation or ovulation_day
            cycle_fertile_start = nfp_fertile_start or fertile_window_start
            cycle_fertile_end = nfp_fertile_end or fertile_window_end

        if not cycle_ovulation:
            offset = max(8, min(25, (max(20, min(60, cycle_length)) // 2) - 1))
            cycle_ovulation = (start + timedelta(days=offset)).isoformat()
        if not cycle_fertile_start or not cycle_fertile_end:
            try:
                ov_date = date.fromisoformat(cycle_ovulation)
                cycle_fertile_start = (ov_date - timedelta(days=5)).isoformat()
                cycle_fertile_end = (ov_date + timedelta(days=1)).isoformat()
            except ValueError:
                cycle_fertile_start = None
                cycle_fertile_end = None

        cycle_meta.append(
            {
                "start": start,
                "observed_end": cycle_end_observed,
                "end_anchor": cycle_end_anchor,
                "ovulation_day": cycle_ovulation,
                "fertile_start": cycle_fertile_start,
                "fertile_end": cycle_fertile_end,
            }
        )

    history_set = set(normalize_history(history))
    normalized_symptoms = normalize_symptoms(symptom_history)
    phase_logged_days = {phase: 0 for phase in PHASE_ORDER}
    symptom_overall_counts: dict[str, int] = {}
    symptom_phase_counts: dict[str, dict[str, int]] = {}
    overall_logged_days = 0

    for entry in normalized_symptoms:
        day_iso = entry.get("date")
        if not isinstance(day_iso, str):
            continue
        try:
            day = date.fromisoformat(day_iso)
        except ValueError:
            continue
        if day > today:
            continue

        cycle = None
        for meta in reversed(cycle_meta):
            if meta["start"] <= day <= meta["observed_end"]:
                cycle = meta
                break
        if cycle is None:
            continue

        phase = assign_symptom_day_phase(
            day_iso=day_iso,
            cycle_start_iso=cycle["start"].isoformat(),
            cycle_end_anchor_iso=cycle["end_anchor"].isoformat(),
            period_duration_days=period_duration_days,
            history_set=history_set,
            fertile_window_start_iso=cycle["fertile_start"],
            fertile_window_end_iso=cycle["fertile_end"],
            ovulation_day_iso=cycle["ovulation_day"],
        )

        phase_logged_days[phase] += 1
        overall_logged_days += 1

        day_symptoms = _symptom_presence_keys(entry)
        for symptom_key in day_symptoms:
            symptom_overall_counts[symptom_key] = symptom_overall_counts.get(symptom_key, 0) + 1
            per_phase = symptom_phase_counts.setdefault(symptom_key, {})
            per_phase[phase] = per_phase.get(phase, 0) + 1

    if overall_logged_days < min_logged_days_per_phase:
        return [], "insufficient_logged_days"

    phases_with_min_days = {phase for phase, count in phase_logged_days.items() if count >= min_logged_days_per_phase}
    if not phases_with_min_days:
        return [], "insufficient_phase_coverage"

    if not any(count >= min_total_symptom_occurrences for count in symptom_overall_counts.values()):
        return [], "insufficient_symptom_occurrences"

    insights: list[dict[str, Any]] = []
    for symptom_key, total_occurrences in symptom_overall_counts.items():
        if total_occurrences < min_total_symptom_occurrences:
            continue
        baseline_frequency = total_occurrences / overall_logged_days
        if baseline_frequency <= 0:
            continue

        for phase in PHASE_ORDER:
            logged_days_in_phase = phase_logged_days.get(phase, 0)
            if logged_days_in_phase < min_logged_days_per_phase:
                continue

            symptom_days_in_phase = symptom_phase_counts.get(symptom_key, {}).get(phase, 0)
            phase_frequency = symptom_days_in_phase / logged_days_in_phase
            raw_ratio = phase_frequency / baseline_frequency if baseline_frequency > 0 else 0.0
            ratio = round(_clamp_ratio(raw_ratio), 1)
            if ratio == 1.0:
                continue

            direction = "more_frequent" if ratio > 1 else "less_frequent"
            confidence = _insight_confidence(logged_days_in_phase, overall_logged_days, total_occurrences)
            strength = abs(raw_ratio - 1.0) * _CONFIDENCE_WEIGHT[confidence]
            if phase_frequency == 0 and total_occurrences < (min_total_symptom_occurrences + 2):
                continue

            symptom_label = _symptom_human_label(symptom_key).capitalize()
            phase_label = _phase_label(phase)
            if direction == "more_frequent":
                message = f"{symptom_label} are {ratio:.1f}x more frequent in {phase_label}."
            else:
                message = f"{symptom_label} are less common during {phase_label} ({ratio:.1f}x baseline)."

            insights.append(
                {
                    "symptom_key": symptom_key,
                    "phase": phase,
                    "ratio": ratio,
                    "direction": direction,
                    "phase_frequency": round(phase_frequency, 3),
                    "baseline_frequency": round(baseline_frequency, 3),
                    "confidence": confidence,
                    "message": message,
                    "_strength": strength,
                }
            )

    if not insights:
        return [], "no_strong_insights"

    confidence_rank = {"high": 3, "medium": 2, "low": 1}
    insights.sort(
        key=lambda item: (
            item.get("_strength", 0.0),
            confidence_rank.get(str(item.get("confidence")), 0),
            abs(float(item.get("ratio", 1.0)) - 1.0),
        ),
        reverse=True,
    )
    selected = []
    seen: set[tuple[str, str]] = set()
    for item in insights:
        key = (str(item["symptom_key"]), str(item["phase"]))
        if key in seen:
            continue
        seen.add(key)
        payload = dict(item)
        payload.pop("_strength", None)
        selected.append(payload)
        if len(selected) >= max(1, min(5, int(max_insights))):
            break
    return selected, None


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


def _recent_cycle_lengths(grouped_starts: list[str], recent_limit: int = 7) -> list[int]:
    """Return recent valid cycle lengths."""
    if len(grouped_starts) < 2:
        return []
    recent = grouped_starts[-max(2, int(recent_limit)) :]
    lengths: list[int] = []
    for idx in range(1, len(recent)):
        try:
            diff = (date.fromisoformat(recent[idx]) - date.fromisoformat(recent[idx - 1])).days
        except ValueError:
            continue
        if 10 < diff < 80:
            lengths.append(diff)
    return lengths


def _cycle_regularity_std(grouped_starts: list[str]) -> float | None:
    """Calculate standard deviation for recent cycle lengths."""
    lengths = _recent_cycle_lengths(grouped_starts)
    if not lengths:
        return None
    mean = sum(lengths) / len(lengths)
    variance = sum((x - mean) ** 2 for x in lengths) / len(lengths)
    return variance ** 0.5


def _prediction_confidence_level(score: float) -> str:
    """Map confidence score to level."""
    if score >= PREDICTION_CONFIDENCE_HIGH_THRESHOLD:
        return "high"
    if score >= PREDICTION_CONFIDENCE_MEDIUM_THRESHOLD:
        return "medium"
    return "low"


def _nfp_score(nfp_confidence: str | None) -> float:
    normalized = str(nfp_confidence or "").lower()
    if normalized == "high":
        return 0.95
    if normalized == "medium":
        return 0.75
    if normalized == "low":
        return 0.45
    return 0.55


def _regularity_score(cycle_std_days: float | None) -> float:
    if cycle_std_days is None:
        return 0.45
    if cycle_std_days <= 1.5:
        return 1.0
    if cycle_std_days <= 2.5:
        return 0.9
    if cycle_std_days <= 4:
        return 0.72
    if cycle_std_days <= 6:
        return 0.52
    return 0.32


def _history_depth_score(valid_cycles: int) -> float:
    if valid_cycles <= 0:
        return 0.05
    return max(0.2, min(1.0, valid_cycles / 8))


def _prediction_source_score(source: str) -> float:
    if source == "nfp":
        return 0.9
    if source == "hybrid":
        return 0.78
    if source == "estimated":
        return 0.62
    if source == "extrapolated":
        return 0.5
    return 0.55


def _add_confidence_day(
    by_day: dict[str, dict[str, Any]],
    iso_day: str,
    event_key: str,
    score: float,
    source: str,
    cycle_ahead: int,
    metadata: dict[str, Any],
) -> None:
    by_day.setdefault(iso_day, {})
    by_day[iso_day][event_key] = {
        "score": round(score, 3),
        "level": _prediction_confidence_level(score),
        "source": source,
        "cycle_ahead": cycle_ahead,
        "signals": metadata,
    }


def compute_prediction_day_confidence(
    grouped_starts: list[str],
    predicted_cycle_starts: list[str],
    period_duration_days: int,
    avg_cycle_length: int | None,
    nfp_analysis: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build deterministic per-day confidence metadata for predicted cycle events."""
    by_day: dict[str, dict[str, Any]] = {}
    if not predicted_cycle_starts:
        return {
            "thresholds": {
                "high": PREDICTION_CONFIDENCE_HIGH_THRESHOLD,
                "medium": PREDICTION_CONFIDENCE_MEDIUM_THRESHOLD,
            },
            "by_day": by_day,
            "signals": {
                "history_cycles": 0,
                "cycle_std_days": None,
                "nfp_confidence_level": "unknown",
                "conflicting_signals": False,
            },
        }

    cycle_std_days = _cycle_regularity_std(grouped_starts)
    valid_cycles = len(_recent_cycle_lengths(grouped_starts))
    regularity_score = _regularity_score(cycle_std_days)
    history_score = _history_depth_score(valid_cycles)

    nfp_confidence = None
    nfp_detected = False
    nfp_ovulation_iso = None
    if isinstance(nfp_analysis, dict):
        nfp_confidence = str(nfp_analysis.get("confidence_level") or "").lower() or None
        nfp_detected = bool(nfp_analysis.get("ovulation_detected"))
        nfp_ovulation_iso = nfp_analysis.get("ovulation_day")
    nfp_component = _nfp_score(nfp_confidence)

    period_days = max(1, min(14, int(period_duration_days or DEFAULT_PERIOD_DURATION_DAYS)))
    cycle_length = max(20, min(60, int(avg_cycle_length or DEFAULT_CYCLE_LENGTH)))
    ovulation_offset = max(6, min(24, (cycle_length // 2) - 1))

    for idx, start_iso in enumerate(predicted_cycle_starts):
        try:
            cycle_start = date.fromisoformat(str(start_iso))
        except ValueError:
            continue
        cycle_ahead = idx + 1
        cycle_ovulation = cycle_start + timedelta(days=ovulation_offset)
        fertile_start = cycle_ovulation - timedelta(days=5)
        fertile_end = cycle_ovulation + timedelta(days=1)

        source = "estimated"
        observed_evidence = False
        if idx == 0 and nfp_detected and nfp_confidence in ("high", "medium"):
            source = "nfp"
            observed_evidence = True
        elif idx == 0 and valid_cycles >= 3:
            source = "hybrid"
        elif idx >= 2:
            source = "extrapolated"

        conflicting_signals = False
        if idx == 0 and nfp_ovulation_iso:
            try:
                nfp_ovulation_date = date.fromisoformat(str(nfp_ovulation_iso))
                conflicting_signals = abs((nfp_ovulation_date - cycle_ovulation).days) > 2
            except ValueError:
                conflicting_signals = False
        if idx == 0 and nfp_detected and nfp_confidence == "low":
            conflicting_signals = True

        consistency_score = 0.35 if conflicting_signals else 0.88
        source_score = _prediction_source_score(source)
        observed_score = 1.0 if observed_evidence else 0.45

        base_score = (
            (regularity_score * PREDICTION_CONFIDENCE_WEIGHTS["regularity"])
            + (history_score * PREDICTION_CONFIDENCE_WEIGHTS["history_depth"])
            + (nfp_component * PREDICTION_CONFIDENCE_WEIGHTS["nfp"])
            + (source_score * PREDICTION_CONFIDENCE_WEIGHTS["source"])
            + (consistency_score * PREDICTION_CONFIDENCE_WEIGHTS["consistency"])
            + (observed_score * PREDICTION_CONFIDENCE_WEIGHTS["observed_evidence"])
        )
        decay_factor = max(
            PREDICTION_CONFIDENCE_MIN_DECAY_FACTOR,
            1.0 - (idx * PREDICTION_CONFIDENCE_DECAY_PER_CYCLE),
        )
        final_score = max(0.0, min(1.0, base_score * decay_factor))
        metadata = {
            "history_cycles": valid_cycles,
            "cycle_std_days": round(cycle_std_days, 2) if cycle_std_days is not None else None,
            "nfp_confidence_level": nfp_confidence or "unknown",
            "conflicting_signals": conflicting_signals,
            "distance_cycles": cycle_ahead,
            "observed_evidence": observed_evidence,
        }

        for day_offset in range(period_days):
            day_iso = (cycle_start + timedelta(days=day_offset)).isoformat()
            _add_confidence_day(by_day, day_iso, "period", final_score, source, cycle_ahead, metadata)

        fertile_day = fertile_start
        while fertile_day <= fertile_end:
            _add_confidence_day(
                by_day,
                fertile_day.isoformat(),
                "fertile",
                final_score,
                source,
                cycle_ahead,
                metadata,
            )
            fertile_day += timedelta(days=1)

        _add_confidence_day(
            by_day,
            cycle_ovulation.isoformat(),
            "ovulation",
            final_score,
            source,
            cycle_ahead,
            metadata,
        )

    return {
        "thresholds": {
            "high": PREDICTION_CONFIDENCE_HIGH_THRESHOLD,
            "medium": PREDICTION_CONFIDENCE_MEDIUM_THRESHOLD,
        },
        "by_day": by_day,
        "signals": {
            "history_cycles": valid_cycles,
            "cycle_std_days": round(cycle_std_days, 2) if cycle_std_days is not None else None,
            "nfp_confidence_level": nfp_confidence or "unknown",
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
    lengths = _recent_cycle_lengths(grouped_starts)
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


def _union_probability(probabilities: list[float]) -> float:
    """Combine independent overlap probabilities using union logic."""
    clamped = [max(0.0, min(1.0, float(p))) for p in probabilities if p is not None]
    if not clamped:
        return 0.0
    miss_product = 1.0
    for p in clamped:
        miss_product *= max(0.0, min(1.0, 1.0 - p))
    return max(0.0, min(1.0, 1.0 - miss_product))


def _derive_cycle_length_days(
    period_forecast: dict[str, Any] | None,
    fertility_forecast: dict[str, Any] | None,
    period_start: date | None = None,
    ovulation: date | None = None,
) -> int:
    """Derive cycle length from available forecast inputs with safe fallback."""
    for source in (period_forecast, fertility_forecast):
        if not isinstance(source, dict):
            continue
        for key in ("avg_cycle_length", "predicted_cycle_length", "cycle_length", "cycle_days"):
            raw = source.get(key)
            try:
                cycle_days = int(round(float(raw)))
            except (TypeError, ValueError):
                continue
            if 20 <= cycle_days <= 60:
                return cycle_days

    if period_start and ovulation:
        estimated = (period_start - ovulation).days + 14
        if 20 <= estimated <= 60:
            return estimated

    return 28


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
            cycle_days = _derive_cycle_length_days(period_forecast, fertility_forecast, period_start=period_start)
            period_probabilities: list[float] = []
            projected_start = period_start
            projected_end = period_end
            max_cycles = 60
            cycle_count = 0
            while projected_start <= range_end and cycle_count < max_cycles:
                period_probabilities.append(
                    _overlap_probability(
                        range_start,
                        range_end,
                        projected_start,
                        projected_end,
                        std_days,
                        confidence_weight,
                    )
                )
                projected_start += timedelta(days=cycle_days)
                projected_end += timedelta(days=cycle_days)
                cycle_count += 1
            probability = _union_probability(period_probabilities)
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

            cycle_days = _derive_cycle_length_days(period_forecast, fertility_forecast, ovulation=ovulation)
            cycle_probabilities: list[float] = []
            best_days_overlap = False
            best_start_raw = fertility_forecast.get("best_days_start")
            best_end_raw = fertility_forecast.get("best_days_end")
            best_start: date | None = None
            best_end: date | None = None
            try:
                if best_start_raw and best_end_raw:
                    best_start = date.fromisoformat(str(best_start_raw))
                    best_end = date.fromisoformat(str(best_end_raw))
            except (TypeError, ValueError):
                best_start = None
                best_end = None

            projected_fertile_start = fertile_start
            projected_fertile_end = fertile_end
            projected_ovulation = ovulation
            projected_best_start = best_start
            projected_best_end = best_end
            max_cycles = 60
            cycle_count = 0
            while projected_fertile_start <= range_end and cycle_count < max_cycles:
                fertile_probability = _overlap_probability(
                    range_start,
                    range_end,
                    projected_fertile_start,
                    projected_fertile_end,
                    uncertainty_days,
                    confidence_weight,
                )
                ovulation_probability = _overlap_probability(
                    range_start,
                    range_end,
                    projected_ovulation,
                    projected_ovulation,
                    uncertainty_days,
                    confidence_weight,
                )
                cycle_probability = max(0.0, min(1.0, (fertile_probability * 0.7) + (ovulation_probability * 0.3)))

                if projected_best_start and projected_best_end:
                    current_best_overlap = not (
                        projected_best_end < range_start or projected_best_start > range_end
                    )
                    best_days_overlap = best_days_overlap or current_best_overlap
                    if current_best_overlap:
                        cycle_probability = min(1.0, cycle_probability + 0.1)

                cycle_probabilities.append(cycle_probability)
                projected_fertile_start += timedelta(days=cycle_days)
                projected_fertile_end += timedelta(days=cycle_days)
                projected_ovulation += timedelta(days=cycle_days)
                if projected_best_start and projected_best_end:
                    projected_best_start += timedelta(days=cycle_days)
                    projected_best_end += timedelta(days=cycle_days)
                cycle_count += 1
            probability = _union_probability(cycle_probabilities)

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


def project_range_windows(
    period_forecast: dict[str, Any] | None,
    fertility_forecast: dict[str, Any] | None,
    range_start_iso: str,
    range_end_iso: str,
    avg_cycle_length: int | None = None,
) -> dict[str, Any] | None:
    """Project recurring cycle windows forward and return those overlapping the selected range.

    Returns a dict with:
        range_start: ISO date of range start.
        range_end: ISO date of range end.
        period_windows: list of {start, end} ISO dicts for all projected periods overlapping the range.
        fertility_windows: list of {fertile_start, fertile_end, ovulation} ISO dicts overlapping the range.

    Returns None for invalid input.
    """
    try:
        range_start = date.fromisoformat(str(range_start_iso))
        range_end = date.fromisoformat(str(range_end_iso))
    except (TypeError, ValueError):
        return None
    if range_start > range_end:
        return None

    cycle_days = _derive_cycle_length_days(period_forecast, fertility_forecast)
    if avg_cycle_length is not None:
        try:
            cl = int(avg_cycle_length)
            if 20 <= cl <= 60:
                cycle_days = cl
        except (TypeError, ValueError):
            pass

    max_cycles = 60
    period_windows: list[dict[str, str]] = []
    fertility_windows: list[dict[str, str]] = []

    if (
        period_forecast
        and period_forecast.get("predicted_start")
        and period_forecast.get("predicted_end")
    ):
        try:
            p_start = date.fromisoformat(str(period_forecast["predicted_start"]))
            p_end = date.fromisoformat(str(period_forecast["predicted_end"]))
        except (TypeError, ValueError):
            p_start = None
            p_end = None

        if p_start and p_end:
            projected_start = p_start
            projected_end = p_end
            cycle_count = 0
            while projected_start <= range_end and cycle_count < max_cycles:
                if projected_end >= range_start:
                    period_windows.append({
                        "start": projected_start.isoformat(),
                        "end": projected_end.isoformat(),
                    })
                projected_start += timedelta(days=cycle_days)
                projected_end += timedelta(days=cycle_days)
                cycle_count += 1

    if (
        fertility_forecast
        and fertility_forecast.get("fertile_window_start")
        and fertility_forecast.get("fertile_window_end")
        and fertility_forecast.get("ovulation_estimate")
    ):
        try:
            f_start = date.fromisoformat(str(fertility_forecast["fertile_window_start"]))
            f_end = date.fromisoformat(str(fertility_forecast["fertile_window_end"]))
            ov = date.fromisoformat(str(fertility_forecast["ovulation_estimate"]))
        except (TypeError, ValueError):
            f_start = None
            f_end = None
            ov = None

        if f_start and f_end and ov:
            proj_f_start = f_start
            proj_f_end = f_end
            proj_ov = ov
            cycle_count = 0
            while proj_f_start <= range_end and cycle_count < max_cycles:
                if proj_f_end >= range_start:
                    fertility_windows.append({
                        "fertile_start": proj_f_start.isoformat(),
                        "fertile_end": proj_f_end.isoformat(),
                        "ovulation": proj_ov.isoformat(),
                    })
                proj_f_start += timedelta(days=cycle_days)
                proj_f_end += timedelta(days=cycle_days)
                proj_ov += timedelta(days=cycle_days)
                cycle_count += 1

    return {
        "range_start": range_start.isoformat(),
        "range_end": range_end.isoformat(),
        "period_windows": period_windows,
        "fertility_windows": fertility_windows,
    }


def _normalize_onboarding_stage(stage: str | None) -> str:
    raw = str(stage or "").strip().lower()
    if raw in ONBOARDING_STAGES:
        return raw
    return DEFAULT_ONBOARDING_STAGE


def _recent_log_entry_count(symptoms: list[dict[str, Any]], now: date) -> int:
    floor = now - timedelta(days=RECENT_LOG_WINDOW_DAYS)
    count = 0
    for item in symptoms:
        raw = item.get("date") if isinstance(item, dict) else None
        if not raw:
            continue
        try:
            logged_day = date.fromisoformat(str(raw))
        except ValueError:
            continue
        if floor <= logged_day <= now:
            count += 1
    return count


def _build_prediction_gating(
    starts: list[str],
    symptoms: list[dict[str, Any]],
    now: date,
) -> dict[str, Any]:
    lengths = _recent_cycle_lengths(starts)
    valid_cycles = len(lengths)
    cycle_std = _cycle_regularity_std(starts)
    recent_logs = _recent_log_entry_count(symptoms, now)
    cycle_variability_ok = cycle_std is not None and cycle_std <= MAX_CYCLE_STD_FOR_HIGH_PRECISION
    precision_allowed = (
        valid_cycles >= MIN_VALID_CYCLES_FOR_HIGH_PRECISION
        and cycle_variability_ok
        and recent_logs >= MIN_RECENT_LOG_ENTRIES_FOR_HIGH_PRECISION
    )
    if precision_allowed:
        confidence = "high" if cycle_std is not None and cycle_std <= 2 else "medium"
    else:
        confidence = "low"
    return {
        "precision_allowed": precision_allowed,
        "confidence": confidence,
        "valid_cycles": valid_cycles,
        "cycle_std_days": round(cycle_std, 2) if cycle_std is not None else None,
        "recent_log_entries": recent_logs,
        "thresholds": {
            "min_valid_cycles": MIN_VALID_CYCLES_FOR_HIGH_PRECISION,
            "max_cycle_std_days": MAX_CYCLE_STD_FOR_HIGH_PRECISION,
            "min_recent_log_entries": MIN_RECENT_LOG_ENTRIES_FOR_HIGH_PRECISION,
            "recent_window_days": RECENT_LOG_WINDOW_DAYS,
        },
    }


def _window_bounds(center_iso: str, half_span_days: int) -> tuple[str, str] | None:
    try:
        center = date.fromisoformat(str(center_iso))
    except (TypeError, ValueError):
        return None
    span = max(2, min(10, int(half_span_days)))
    return (
        (center - timedelta(days=span)).isoformat(),
        (center + timedelta(days=span)).isoformat(),
    )


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
    onboarding_stage: str | None = None,
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
    stage_explicit = onboarding_stage is not None
    requested_stage = _normalize_onboarding_stage(onboarding_stage) if stage_explicit else DEFAULT_ONBOARDING_STAGE

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
            symptom_correlation_insights=[],
            symptom_correlation_insights_reason="unavailable_for_pregnancy",
            onboarding_stage=requested_stage,
            onboarding_stage_effective=requested_stage,
            learning_phase=False,
            prediction_gating={"precision_allowed": False, "confidence": "low"},
        )

    # If in pre-menarche mode (tracking explicitly enabled, awaiting first period)
    if requested_stage == ONBOARDING_STAGE_PRE_MENARCHE or (
        men_data.get("tracking_active") and men_data.get("is_menarche") is False
    ):
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
            symptom_correlation_insights=[],
            symptom_correlation_insights_reason="unavailable_for_pre_menarche",
            onboarding_stage=requested_stage,
            onboarding_stage_effective=ONBOARDING_STAGE_PRE_MENARCHE,
            learning_phase=True,
            prediction_gating={
                "precision_allowed": False,
                "confidence": "low",
                "reason": "pre_menarche_mode",
            },
        )

    # If postpartum mode is enabled and still within the configured window
    # (default 42 days / 6 weeks), report state=postpartum and suppress cycle/
    # fertility predictions, since there's no meaningful cycle to predict yet.
    # Once the window elapses, falls through to normal cycle logic automatically —
    # no manual "end postpartum mode" step required.
    if nc_data.get("is_postpartum") is True:
        postpartum_start_raw = nc_data.get("postpartum_start_date")
        postpartum_duration = 42
        try:
            postpartum_duration = max(1, min(365, int(nc_data.get("postpartum_duration_days") or 42)))
        except (TypeError, ValueError):
            postpartum_duration = 42

        postpartum_start_date: date | None = None
        if postpartum_start_raw:
            try:
                postpartum_start_date = date.fromisoformat(str(postpartum_start_raw))
            except ValueError:
                postpartum_start_date = None

        days_since_birth = (now - postpartum_start_date).days if postpartum_start_date else None
        still_in_window = (
            postpartum_start_date is not None
            and days_since_birth is not None
            and 0 <= days_since_birth < postpartum_duration
        )

        if still_in_window:
            return CycleModel(
                history=normalized,
                grouped_starts=grouped_cycle_starts(normalized),
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
                state=STATE_POSTPARTUM,
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
                symptom_correlation_insights=[],
                symptom_correlation_insights_reason="unavailable_for_postpartum",
                onboarding_stage=requested_stage,
                onboarding_stage_effective=requested_stage,
                learning_phase=False,
                prediction_gating={"precision_allowed": False, "confidence": "low", "reason": "postpartum_mode"},
            )

    # If menopause mode is enabled, suppress cycle/fertility predictions and instead
    # surface time-since-last-period and time-since-menopause-start, which is what's
    # clinically relevant here (menopause is confirmed after 12 consecutive months
    # without a period).
    if meno_data.get("is_menopause") is True:
        last_period_date: date | None = None
        if normalized:
            try:
                last_period_date = date.fromisoformat(normalized[-1])
            except ValueError:
                last_period_date = None
        days_since_last_period = (now - last_period_date).days if last_period_date else None

        meno_start_date: date | None = None
        raw_meno_start = meno_data.get("start_date")
        if raw_meno_start:
            try:
                meno_start_date = date.fromisoformat(str(raw_meno_start))
            except ValueError:
                meno_start_date = None
        menopause_months_tracked = (
            (now - meno_start_date).days // 30 if meno_start_date else None
        )

        return CycleModel(
            history=normalized,
            grouped_starts=grouped_cycle_starts(normalized),
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
            state=STATE_MENOPAUSE,
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
            symptom_correlation_insights=[],
            symptom_correlation_insights_reason="unavailable_for_menopause",
            onboarding_stage=requested_stage,
            onboarding_stage_effective=requested_stage,
            learning_phase=False,
            prediction_gating={"precision_allowed": False, "confidence": "low", "reason": "menopause_mode"},
            days_since_last_period=days_since_last_period,
            menopause_months_tracked=menopause_months_tracked,
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
                    symptom_correlation_insights=[],
                    symptom_correlation_insights_reason="unavailable_for_menarche",
                    onboarding_stage=requested_stage,
                    onboarding_stage_effective=ONBOARDING_STAGE_EARLY_MENARCHE,
                    learning_phase=True,
                    prediction_gating={
                        "precision_allowed": False,
                        "confidence": "low",
                        "reason": "menarche_transition",
                    },
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
    prediction_gating = _build_prediction_gating(starts, symptoms, now)
    if (
        stage_explicit
        and requested_stage == ONBOARDING_STAGE_ESTABLISHED_CYCLE
        and prediction_gating["valid_cycles"] < MIN_VALID_CYCLES_FOR_HIGH_PRECISION
    ):
        effective_stage = ONBOARDING_STAGE_EARLY_MENARCHE
    else:
        effective_stage = requested_stage
    learning_phase = effective_stage in (ONBOARDING_STAGE_PRE_MENARCHE, ONBOARDING_STAGE_EARLY_MENARCHE)
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

    low_data_mode = (
        effective_stage == ONBOARDING_STAGE_EARLY_MENARCHE
        and not bool(prediction_gating.get("precision_allowed"))
    )
    if low_data_mode:
        ovulation_day_iso = None
        fertile_start = None
        fertile_end = None

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
    if low_data_mode:
        window_center = next_start or (period_forecast or {}).get("predicted_start")
        window_bounds = _window_bounds(window_center, 4) if window_center else None
        if period_forecast is None and next_start:
            period_forecast = {
                "predicted_start": next_start,
                "predicted_end": (
                    date.fromisoformat(next_start) + timedelta(days=effective_duration - 1)
                ).isoformat(),
                "cycle_std_days": None,
                "confidence": "low",
            }
        if isinstance(period_forecast, dict):
            period_forecast["confidence"] = "low"
            period_forecast["window_mode"] = "broad"
            period_forecast["learning_phase"] = True
            if window_bounds:
                period_forecast["possible_window_start"] = window_bounds[0]
                period_forecast["possible_window_end"] = window_bounds[1]
        fertility_forecast = {
            "ovulation_estimate": None,
            "fertile_window_start": None,
            "fertile_window_end": None,
            "best_days_start": None,
            "best_days_end": None,
            "source": "estimated",
            "confidence": "low",
            "window_mode": "broad",
            "ovulation_precision_suppressed": True,
            "learning_phase": True,
        }
        if window_bounds:
            fertility_forecast["possible_window_start"] = window_bounds[0]
            fertility_forecast["possible_window_end"] = window_bounds[1]

    symptom_correlation_insights, symptom_correlation_reason = compute_symptom_correlation_insights(
        history=normalized,
        grouped_starts=starts,
        symptom_history=symptoms,
        today=now,
        period_duration_days=effective_duration,
        next_predicted_start=next_start,
        avg_cycle_length=avg_cycle,
        fertile_window_start=fertile_start,
        fertile_window_end=fertile_end,
        ovulation_day=ovulation_day_iso,
        nfp_analysis=nfp_result,
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
        symptom_correlation_insights=symptom_correlation_insights,
        symptom_correlation_insights_reason=symptom_correlation_reason,
        onboarding_stage=requested_stage,
        onboarding_stage_effective=effective_stage,
        learning_phase=learning_phase,
        prediction_gating=prediction_gating,
    )
