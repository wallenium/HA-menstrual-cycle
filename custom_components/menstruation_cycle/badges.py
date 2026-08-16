"""Light progress badges for the menstruation cycle integration.

Philosophy: non-gamified, supportive, calm milestone recognition.
- No points, ranks, streak pressure, or countdown anxiety.
- Max one new badge highlight surfaced per 7-day window.
- Idempotent: earned_at is stable once a badge is earned.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from .model import SYMPTOM_MULTI_VALUE_KEYS, SYMPTOM_SINGLE_VALUE_KEYS

# Tuneable constant: minimum number of distinct log days in the last 30 days
# required to earn the consistent_logging_30d badge.
CONSISTENT_LOGGING_MIN_DAYS = 10

# Minimum prediction confidence to count as "pattern emerging"
PATTERN_EMERGING_CONFIDENCE_THRESHOLD = 0.34  # medium-confidence territory


_V1_BADGE_KEYS = [
    "first_entry",
    "cycles_3_logged",
    "cycles_6_logged",
    "consistent_logging_30d",
    "pattern_emerging",
]

_V2_BADGE_KEYS = [
    "symptom_variety",
    "nfp_confirmed_ovulation",
    "insights_unlocked",
    "temperature_tracker",
    "cycles_12_logged",
    "doctor_report_exported",
    "profile_personalized",
    "first_sign_logged",
    "signs_explored",
]

# All category keys that count toward "symptom_variety" — mirrors the same
# categories used by compute_symptom_correlation_insights in model.py, minus
# bleeding_strength (that's just period logging, not a distinct symptom).
_VARIETY_CATEGORY_KEYS = tuple(
    key for key in (*SYMPTOM_MULTI_VALUE_KEYS, *SYMPTOM_SINGLE_VALUE_KEYS) if key != "bleeding_strength"
)
_SYMPTOM_VARIETY_MIN_CATEGORIES = 5

# The 7 pre-menarche body-sign categories tracked via add_pre_menarche_sign.
_PRE_MENARCHE_SIGN_KEYS = (
    "pubic_hair", "breast", "height_spurt", "mood", "acne", "body_odor", "discharge",
)

_BASAL_TEMP_TRACKER_MIN_DAYS = 10
_CYCLES_LOGGED_EXTENDED = 12


def _parse_iso(value: Any) -> date | None:
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None


def _count_log_days_in_last_30(
    history: list[str],
    symptom_history: list[dict[str, Any]],
    today: date,
) -> int:
    """Count distinct days with any logged entry (bleeding or symptom) in last 30 days."""
    cutoff = today - timedelta(days=29)
    logged: set[str] = set()
    for raw in history:
        d = _parse_iso(raw)
        if d is not None and cutoff <= d <= today:
            logged.add(d.isoformat())
    for entry in symptom_history:
        d = _parse_iso(entry.get("date"))
        if d is not None and cutoff <= d <= today:
            logged.add(d.isoformat())
    return len(logged)


def _is_pattern_available(
    grouped_starts: list[str],
    nfp_analysis: dict[str, Any] | None,
    avg_cycle_length: int | None,
) -> bool:
    """Return True when enough data exists to suggest an emerging pattern."""
    # Need at least 3 cycle starts
    if len(grouped_starts) < 3:
        return False
    # If we have an average cycle length we have a statistical pattern
    if avg_cycle_length is not None and avg_cycle_length > 0:
        return True
    # NFP confidence can also indicate pattern
    if isinstance(nfp_analysis, dict):
        conf = nfp_analysis.get("nfp_symptom_score")
        if conf is not None:
            try:
                if float(conf) >= PATTERN_EMERGING_CONFIDENCE_THRESHOLD:
                    return True
            except (TypeError, ValueError):
                pass
    return False


def evaluate_badges(
    history: list[str],
    symptom_history: list[dict[str, Any]],
    grouped_starts: list[str],
    *,
    nfp_analysis: dict[str, Any] | None = None,
    avg_cycle_length: int | None = None,
    today: date | None = None,
    existing_badges: list[dict[str, Any]] | None = None,
    consistent_logging_min_days: int = CONSISTENT_LOGGING_MIN_DAYS,
    symptom_correlation_insights: list[dict[str, Any]] | None = None,
    birth_date: str | None = None,
    family_menarche_age: int | float | None = None,
    pre_menarche_signs: dict[str, Any] | None = None,
    doctor_report_exported: bool = False,
) -> list[dict[str, Any]]:
    """Evaluate v1 + v2 progress badges from cycle data.

    Deterministic and idempotent: already-earned badges keep their original
    earned_at timestamp.  New badges are stamped with today's ISO date.

    Args:
        history: List of ISO bleeding-day strings.
        symptom_history: List of symptom entry dicts (each must have a 'date' key).
        grouped_starts: List of cycle-start ISO date strings.
        nfp_analysis: Optional NFP analysis dict from the model.
        avg_cycle_length: Average cycle length in days (or None if unknown).
        today: Reference date (defaults to date.today()).
        existing_badges: Previously computed badge list (preserves earned_at).
        consistent_logging_min_days: Tuneable threshold for consistent logging.

    Returns:
        List of badge dicts, one per v1 badge key.
    """
    if today is None:
        today = date.today()
    today_iso = today.isoformat()

    # Build lookup of previously earned badges to preserve earned_at
    prev_earned: dict[str, str] = {}
    for b in (existing_badges or []):
        if isinstance(b, dict) and b.get("state") == "earned":
            key = b.get("key")
            ea = b.get("earned_at")
            if key and ea:
                prev_earned[key] = str(ea)

    # -----------------------------------------------------------------------
    # Evaluate conditions
    # -----------------------------------------------------------------------
    total_log_days = len(set(
        d for raw in history for d in [_parse_iso(raw)] if d is not None
    ))
    num_starts = len(grouped_starts)
    log_days_30 = _count_log_days_in_last_30(history, symptom_history, today)
    pattern_available = _is_pattern_available(grouped_starts, nfp_analysis, avg_cycle_length)

    def _make_badge(
        key: str,
        earned: bool,
        in_progress_value: int | None = None,
        in_progress_target: int | None = None,
    ) -> dict[str, Any]:
        if earned:
            earned_at = prev_earned.get(key) or today_iso
            return {
                "key": key,
                "state": "earned",
                "earned_at": earned_at,
            }
        if in_progress_value is not None and in_progress_target is not None and in_progress_value > 0:
            return {
                "key": key,
                "state": "in_progress",
                "earned_at": None,
                "progress_value": in_progress_value,
                "progress_target": in_progress_target,
            }
        return {
            "key": key,
            "state": "locked",
            "earned_at": None,
        }

    badges: list[dict[str, Any]] = []

    # first_entry
    badges.append(_make_badge("first_entry", total_log_days >= 1))

    # cycles_3_logged
    if num_starts >= 3:
        badges.append(_make_badge("cycles_3_logged", True))
    else:
        badges.append(_make_badge("cycles_3_logged", False, num_starts, 3))

    # cycles_6_logged
    if num_starts >= 6:
        badges.append(_make_badge("cycles_6_logged", True))
    else:
        badges.append(_make_badge("cycles_6_logged", False, num_starts, 6))

    # consistent_logging_30d
    if log_days_30 >= consistent_logging_min_days:
        badges.append(_make_badge("consistent_logging_30d", True))
    else:
        badges.append(_make_badge(
            "consistent_logging_30d", False,
            log_days_30, consistent_logging_min_days,
        ))

    # pattern_emerging
    badges.append(_make_badge("pattern_emerging", pattern_available))

    # --- v2 badges -----------------------------------------------------

    # symptom_variety — distinct symptom categories ever logged (not values,
    # just categories: e.g. logging "pain" once counts, regardless of which
    # pain type). Naturally monotonic under normal use.
    variety_categories = set()
    for entry in symptom_history:
        if not isinstance(entry, dict):
            continue
        for key in _VARIETY_CATEGORY_KEYS:
            value = entry.get(key)
            if isinstance(value, list):
                if any(str(v).strip() for v in value):
                    variety_categories.add(key)
            elif value not in (None, "", "none"):
                variety_categories.add(key)
    if len(variety_categories) >= _SYMPTOM_VARIETY_MIN_CATEGORIES:
        badges.append(_make_badge("symptom_variety", True))
    else:
        badges.append(_make_badge(
            "symptom_variety", False, len(variety_categories), _SYMPTOM_VARIETY_MIN_CATEGORIES,
        ))

    # nfp_confirmed_ovulation — sticky: NFP confidence fluctuates cycle to
    # cycle, but reaching "high" confidence once is a genuine milestone worth
    # keeping, not something that should disappear next cycle.
    nfp_high_now = isinstance(nfp_analysis, dict) and str(nfp_analysis.get("confidence_level")) == "high"
    badges.append(_make_badge("nfp_confirmed_ovulation", nfp_high_now or "nfp_confirmed_ovulation" in prev_earned))

    # insights_unlocked — sticky for the same reason (insights availability
    # depends on recent data density and disappears e.g. during pregnancy).
    insights_now = bool(symptom_correlation_insights)
    badges.append(_make_badge("insights_unlocked", insights_now or "insights_unlocked" in prev_earned))

    # temperature_tracker — basal temperature logged on enough distinct days
    # within any single tracked cycle (not just anywhere in history).
    max_temp_days = _max_basal_temp_days_in_any_cycle(symptom_history, grouped_starts, today)
    if max_temp_days >= _BASAL_TEMP_TRACKER_MIN_DAYS:
        badges.append(_make_badge("temperature_tracker", True))
    else:
        badges.append(_make_badge(
            "temperature_tracker", False, max_temp_days, _BASAL_TEMP_TRACKER_MIN_DAYS,
        ))

    # cycles_12_logged — natural extension of cycles_3/6_logged.
    if num_starts >= _CYCLES_LOGGED_EXTENDED:
        badges.append(_make_badge("cycles_12_logged", True))
    else:
        badges.append(_make_badge("cycles_12_logged", False, num_starts, _CYCLES_LOGGED_EXTENDED))

    # doctor_report_exported — one-time action flag, sticky by nature (the
    # flag itself is already persistent, but OR with prev_earned for safety).
    badges.append(_make_badge(
        "doctor_report_exported", bool(doctor_report_exported) or "doctor_report_exported" in prev_earned,
    ))

    # profile_personalized — both birth_date and family_menarche_age set,
    # which sharpens every menarche-related estimate the app makes.
    has_birth_date = bool(birth_date)
    has_family_age = family_menarche_age not in (None, "", 0)
    profile_personalized_now = has_birth_date and has_family_age
    badges.append(_make_badge(
        "profile_personalized", profile_personalized_now or "profile_personalized" in prev_earned,
    ))

    # Pre-menarche body-sign badges (only meaningful in pre-menarche mode, but
    # harmless/locked elsewhere since pre_menarche_signs will simply be empty).
    signs = pre_menarche_signs if isinstance(pre_menarche_signs, dict) else {}
    logged_sign_keys = {
        key for key in _PRE_MENARCHE_SIGN_KEYS
        if _pre_menarche_sign_is_logged(signs.get(key))
    }
    first_sign_now = len(logged_sign_keys) >= 1
    badges.append(_make_badge("first_sign_logged", first_sign_now or "first_sign_logged" in prev_earned))

    if len(logged_sign_keys) >= len(_PRE_MENARCHE_SIGN_KEYS):
        badges.append(_make_badge("signs_explored", True))
    else:
        badges.append(_make_badge(
            "signs_explored", False, len(logged_sign_keys), len(_PRE_MENARCHE_SIGN_KEYS),
        ))

    return badges


def _pre_menarche_sign_is_logged(raw: Any) -> bool:
    """A pre-menarche sign entry counts as logged in either the legacy plain-string
    format or the current {stage, logged_at, updated_at} dict format."""
    if raw is None or raw == "" or raw == "none":
        return False
    if isinstance(raw, dict):
        stage = raw.get("stage")
        return stage not in (None, "", "none")
    return True


def _max_basal_temp_days_in_any_cycle(
    symptom_history: list[dict[str, Any]],
    grouped_starts: list[str],
    today: date,
) -> int:
    """Return the highest count of distinct days with a logged basal_temp value
    within any single cycle window (bounded by consecutive grouped_starts, or by
    today for the current in-progress cycle)."""
    temp_days: set[date] = set()
    for entry in symptom_history:
        if not isinstance(entry, dict):
            continue
        if entry.get("basal_temp") in (None, ""):
            continue
        d = _parse_iso(entry.get("date"))
        if d is not None:
            temp_days.add(d)
    if not temp_days:
        return 0

    starts = sorted(d for d in (_parse_iso(s) for s in grouped_starts) if d is not None)
    if not starts:
        return len(temp_days)

    boundaries = starts + [today + timedelta(days=1)]
    best = 0
    for i in range(len(boundaries) - 1):
        window_start, window_end = boundaries[i], boundaries[i + 1]
        count = sum(1 for d in temp_days if window_start <= d < window_end)
        best = max(best, count)
    return best


def new_badges_this_week(
    badges: list[dict[str, Any]],
    today: date | None = None,
) -> list[str]:
    """Return keys of badges earned within the last 7 days.

    At most one badge key is surfaced per 7-day window (throttling).
    The most recently earned badge takes priority when multiple qualify.
    """
    if today is None:
        today = date.today()
    cutoff = today - timedelta(days=6)

    recent: list[tuple[date, str]] = []
    for b in badges:
        if not isinstance(b, dict) or b.get("state") != "earned":
            continue
        ea = _parse_iso(b.get("earned_at"))
        if ea is not None and cutoff <= ea <= today:
            recent.append((ea, str(b["key"])))

    if not recent:
        return []

    # Surface at most one: the most recently earned
    recent.sort(key=lambda x: x[0], reverse=True)
    return [recent[0][1]]
