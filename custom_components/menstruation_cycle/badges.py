"""Light progress badges for the menstruation cycle integration.

Philosophy: non-gamified, supportive, calm milestone recognition.
- No points, ranks, streak pressure, or countdown anxiety.
- Max one new badge highlight surfaced per 7-day window.
- Idempotent: earned_at is stable once a badge is earned.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

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
) -> list[dict[str, Any]]:
    """Evaluate v1 progress badges from cycle data.

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

    return badges


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
