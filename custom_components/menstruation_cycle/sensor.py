"""Sensor platform for menstruation gauge."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from statistics import mean
import json
import logging
import math
import re
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.typing import StateType
from homeassistant.util import dt as dt_util

from .const import (
    ATTR_AGE_AT_TRACKING,
    ATTR_AVG_CYCLE_LENGTH,
    ATTR_AWAITING_MENARCHE,
    menstruation_object_ids_for_profile,
    ATTR_BIRTH_DATE,
    ATTR_BLEEDING_BLOCKS,
    ATTR_DAYS_UNTIL_MENARCHE,
    ATTR_DAYS_UNTIL_NEXT_START,
    ATTR_DUE_DATE,
    ATTR_ESTIMATED_MENARCHE_DATE,
    ATTR_FAMILY_MENARCHE_AGE,
    ATTR_FERTILE_WINDOW_END,
    ATTR_FERTILE_WINDOW_START,
    ATTR_ICS_URL,
    ATTR_OVULATION_DAY,
    ATTR_GROUPED_STARTS,
    ATTR_HISTORY,
    ATTR_IS_PREGNANT,
    ATTR_NEXT_PREDICTED_START,
    ATTR_PREDICTED_CYCLE_STARTS,
    ATTR_PERIOD_DURATION_DAYS,
    ATTR_PRE_MENARCHE_DATA,
    ATTR_PREDICTION_DAY_CONFIDENCE,
    ATTR_PREGNANCY_DATA,
    ATTR_PREGNANCY_HIGH_RISK,
    ATTR_PREGNANCY_RISK_NOTES,
    ATTR_PREGNANCY_START_DATE,
    ATTR_SYMPTOM_HISTORY,
    ATTR_WEEKS_PREGNANT,
    ATTR_MENOPAUSE_DATA,
    ATTR_IS_POSTPARTUM,
    ATTR_POSTPARTUM_DATA,
    ATTR_POSTPARTUM_DURATION,
    ATTR_NFP_ANALYSIS,
    ATTR_ONBOARDING_STAGE,
    ATTR_ONBOARDING_STAGE_EFFECTIVE,
    ATTR_PERIOD_FORECAST,
    ATTR_PREDICTION_GATING,
    ATTR_FERTILITY_FORECAST,
    ATTR_LEARNING_PHASE,
    CONF_BIRTH_DATE,
    DEFAULT_MENARCHE_AGE_MAX,
    DEFAULT_MENARCHE_AGE_MIN,
    DEFAULT_MENARCHE_AGE_TYPICAL,
    CONF_NFP_ANALYSIS_MODE,
    CONF_NUM_PREDICTIONS,
    DEFAULT_NFP_ANALYSIS_MODE,
    DEFAULT_NUM_PREDICTIONS,
    DOMAIN,
    MAX_NUM_PREDICTIONS,
    SIGNAL_HISTORY_UPDATED,
)
from .badges import evaluate_badges, new_badges_this_week
from .model import (
    bleeding_blocks,
    build_cycle_model,
    compute_contraception_status,
    compute_prediction_day_confidence,
    estimate_menarche_from_signs,
    grouped_cycle_starts,
    normalize_history,
    predict_future_starts,
)

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up sensor from config entry."""
    async_add_entities(
        [
            MenstruationGaugeSensor(hass, entry),
            ProductUsageStatsConsolidatedSensor(hass, entry),
            MenstruationBasalTempSensor(hass, entry),
        ],
        True,
    )


PRODUCT_USAGE_PRODUCTS = ("tampon", "pad", "cup", "liner", "underwear")
PRODUCT_USAGE_CYCLES_CONSIDERED = 3
PRODUCT_USAGE_TIMELINE_DAYS = 30
SYMPTOM_SENSOR_HISTORY_LIMIT = 60
SYMPTOM_STATS_MAX_CYCLES = 6
SYMPTOM_MULTI_VALUE_KEYS = ("pain", "hygiene", "test")
BLEEDING_STRENGTH_PRIORITY = {"none": 0, "keine": 0, "light": 1, "medium": 2, "heavy": 3, "very_heavy": 4}
CYCLE_STATS_MAX_CYCLES = 12
CYCLE_RECENT_LIMIT = 12
CYCLE_HISTORY_LIMIT_MONTHS = 18
ATTR_MAX_STRING_LENGTH = 180
ATTR_MAX_LIST_ITEMS = 30
ATTR_MAX_DICT_ITEMS = 20
ATTR_MAX_NESTING_DEPTH = 3
ATTR_TARGET_SIZE_BYTES = 8 * 1024
ATTR_HARD_LIMIT_BYTES = 15 * 1024
PRODUCT_USAGE_PRODUCT_ALIASES = {
    "tampon": "tampon",
    "tampons": "tampon",
    "pad": "pad",
    "pads": "pad",
    "binde": "pad",
    "binden": "pad",
    "cup": "cup",
    "cups": "cup",
    "menstrual_cup": "cup",
    "menstrual cup": "cup",
    "liner": "liner",
    "liners": "liner",
    "pantyliner": "liner",
    "pantyliners": "liner",
    "slipeinlage": "liner",
    "slipeinlagen": "liner",
    "underwear": "underwear",
    "period_underwear": "underwear",
    "period underwear": "underwear",
    "period_panties": "underwear",
    "period panties": "underwear",
    "period_panty": "underwear",
    "period panty": "underwear",
    "periodenunterwaesche": "underwear",
    "periodenunterwäsche": "underwear",
}

_DROPPED_ATTRIBUTE_KEYS = {
    ATTR_PREDICTION_DAY_CONFIDENCE,
    "friendly_name",
    "menarche_data",
    "noncycle_data",
}

_SIZE_SHEDDING_ORDER = [
    "product_usage_timeline",
    ATTR_SYMPTOM_HISTORY,
    "progress_badges",
    "cycle_statistics",
    "symptom_correlation_insights",
    ATTR_HISTORY,
]


def _debug_attr_drop(key: str, reason: str) -> None:
    _LOGGER.debug("Dropping menstruation attribute '%s': %s", key, reason)


def _debug_attr_trim(path: str, reason: str) -> None:
    _LOGGER.debug("Compacting menstruation attribute '%s': %s", path, reason)


def _trim_string(value: str, path: str) -> str:
    if len(value) <= ATTR_MAX_STRING_LENGTH:
        return value
    _debug_attr_trim(path, f"truncated string from {len(value)} chars")
    return f"{value[:ATTR_MAX_STRING_LENGTH]}…"


def _sanitize_attr_value(value: Any, path: str, depth: int = 0) -> Any:
    if value is None:
        return None

    if isinstance(value, bool):
        return value

    if isinstance(value, int):
        return value

    if isinstance(value, float):
        return value if math.isfinite(value) else None

    if isinstance(value, str):
        return _trim_string(value, path)

    if isinstance(value, datetime):
        return value.date().isoformat()

    if isinstance(value, date):
        return value.isoformat()

    if depth >= ATTR_MAX_NESTING_DEPTH:
        _debug_attr_drop(path, "max nesting depth exceeded")
        return None

    if isinstance(value, (list, tuple)):
        items = list(value)
        if len(items) > ATTR_MAX_LIST_ITEMS:
            _debug_attr_trim(path, f"capped list from {len(items)} to {ATTR_MAX_LIST_ITEMS} items")
            items = items[-ATTR_MAX_LIST_ITEMS:]
        return [
            sanitized
            for idx, item in enumerate(items)
            if (sanitized := _sanitize_attr_value(item, f"{path}[{idx}]", depth + 1)) is not None
        ]

    if isinstance(value, dict):
        keys = list(value.keys())
        if len(keys) > ATTR_MAX_DICT_ITEMS:
            _debug_attr_trim(path, f"capped dict keys from {len(keys)} to {ATTR_MAX_DICT_ITEMS}")
            keys = keys[:ATTR_MAX_DICT_ITEMS]
        compact: dict[str, Any] = {}
        for key in keys:
            sanitized = _sanitize_attr_value(value.get(key), f"{path}.{key}", depth + 1)
            if sanitized is not None:
                compact[str(key)] = sanitized
        return compact

    _debug_attr_drop(path, f"unsupported type {type(value).__name__}")
    return None


def _safe_attr_size(attrs: dict[str, Any]) -> int:
    try:
        return len(json.dumps(attrs, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    except (TypeError, ValueError):
        return ATTR_HARD_LIMIT_BYTES + 1


def _compact_forecast_payload(payload: Any) -> Any:
    if not isinstance(payload, dict):
        return payload
    compact = dict(payload)
    if "day_confidence" in compact:
        _debug_attr_drop("forecast.day_confidence", "high-cardinality confidence map")
        compact.pop("day_confidence", None)
    return compact


def _compact_bleeding_blocks(blocks: Any) -> Any:
    if not isinstance(blocks, list):
        return blocks
    trimmed = blocks[-6:] if len(blocks) > 6 else blocks
    if len(blocks) > 6:
        _debug_attr_trim(ATTR_BLEEDING_BLOCKS, f"capped list from {len(blocks)} to {len(trimmed)}")
    compact = []
    for item in trimmed:
        if not isinstance(item, dict):
            continue
        compact.append(
            {
                "start": item.get("start"),
                "end": item.get("end"),
                "length": item.get("length"),
            }
        )
    return compact


def _compact_cycle_statistics(stats: Any) -> Any:
    if not isinstance(stats, dict):
        return stats
    compact = dict(stats)
    recent = compact.get("recent_cycles")
    if isinstance(recent, list) and len(recent) > 6:
        compact["recent_cycles"] = recent[-6:]
        _debug_attr_trim("cycle_statistics.recent_cycles", f"capped list from {len(recent)} to 6")
    return compact


def _compact_usage_timeline(timeline: Any) -> Any:
    if not isinstance(timeline, list):
        return timeline
    trimmed = timeline[-ATTR_MAX_LIST_ITEMS:] if len(timeline) > ATTR_MAX_LIST_ITEMS else timeline
    if len(timeline) > ATTR_MAX_LIST_ITEMS:
        _debug_attr_trim("product_usage_timeline", f"capped list from {len(timeline)} to {ATTR_MAX_LIST_ITEMS}")
    compact = []
    for entry in trimmed:
        if not isinstance(entry, dict):
            continue
        compact.append(
            {
                "date": entry.get("date"),
                "product": entry.get("product"),
                "quantity": entry.get("quantity"),
            }
        )
    return compact


def _compact_symptom_history_entries(entries: Any) -> Any:
    if not isinstance(entries, list):
        return entries
    trimmed = entries[-ATTR_MAX_LIST_ITEMS:] if len(entries) > ATTR_MAX_LIST_ITEMS else entries
    if len(entries) > ATTR_MAX_LIST_ITEMS:
        _debug_attr_trim(ATTR_SYMPTOM_HISTORY, f"capped list from {len(entries)} to {ATTR_MAX_LIST_ITEMS}")
    keep_keys = {
        "date",
        "symptom_data",
        "bleeding_strength",
        "intercourse",
        "basal_temp",
        "pain",
        "cervical_mucus",
        "discharge",
        "mood",
    }
    compact = []
    for entry in trimmed:
        if not isinstance(entry, dict):
            continue
        compact.append({key: entry.get(key) for key in keep_keys if key in entry})
    return compact


def _build_compact_sensor_attributes(raw_attrs: dict[str, Any]) -> dict[str, StateType]:
    attrs = dict(raw_attrs)
    for key in _DROPPED_ATTRIBUTE_KEYS:
        if key in attrs:
            _debug_attr_drop(key, "optional verbose attribute")
            attrs.pop(key, None)

    attrs[ATTR_PERIOD_FORECAST] = _compact_forecast_payload(attrs.get(ATTR_PERIOD_FORECAST))
    attrs[ATTR_FERTILITY_FORECAST] = _compact_forecast_payload(attrs.get(ATTR_FERTILITY_FORECAST))
    attrs[ATTR_BLEEDING_BLOCKS] = _compact_bleeding_blocks(attrs.get(ATTR_BLEEDING_BLOCKS))
    attrs["cycle_statistics"] = _compact_cycle_statistics(attrs.get("cycle_statistics"))
    attrs["product_usage_timeline"] = _compact_usage_timeline(attrs.get("product_usage_timeline"))
    attrs[ATTR_SYMPTOM_HISTORY] = _compact_symptom_history_entries(attrs.get(ATTR_SYMPTOM_HISTORY))

    attrs["history_count"] = len(attrs.get(ATTR_HISTORY) or []) if isinstance(attrs.get(ATTR_HISTORY), list) else 0
    attrs["last_cycle_start"] = (
        attrs.get(ATTR_GROUPED_STARTS)[-1]
        if isinstance(attrs.get(ATTR_GROUPED_STARTS), list) and attrs.get(ATTR_GROUPED_STARTS)
        else None
    )
    attrs["predicted_starts_preview"] = (
        attrs.get(ATTR_PREDICTED_CYCLE_STARTS)[:3]
        if isinstance(attrs.get(ATTR_PREDICTED_CYCLE_STARTS), list)
        else []
    )

    compact: dict[str, StateType] = {}
    for key, value in attrs.items():
        sanitized = _sanitize_attr_value(value, key)
        if sanitized is not None:
            compact[key] = sanitized

    serialized_size = _safe_attr_size(compact)
    if serialized_size > ATTR_TARGET_SIZE_BYTES:
        for key in _SIZE_SHEDDING_ORDER:
            if serialized_size <= ATTR_TARGET_SIZE_BYTES:
                break
            if key not in compact:
                continue
            _debug_attr_drop(key, f"serialized payload too large ({serialized_size} bytes)")
            compact.pop(key, None)
            serialized_size = _safe_attr_size(compact)

    if serialized_size > ATTR_HARD_LIMIT_BYTES:
        _debug_attr_trim("attributes", f"payload still large ({serialized_size} bytes), forcing hard-size summary")
        compact = {
            "profile": compact.get("profile"),
            "cycle_day": compact.get("cycle_day"),
            "cycle_start_date": compact.get("cycle_start_date"),
            ATTR_NEXT_PREDICTED_START: compact.get(ATTR_NEXT_PREDICTED_START),
            ATTR_DAYS_UNTIL_NEXT_START: compact.get(ATTR_DAYS_UNTIL_NEXT_START),
            ATTR_FERTILE_WINDOW_START: compact.get(ATTR_FERTILE_WINDOW_START),
            ATTR_FERTILE_WINDOW_END: compact.get(ATTR_FERTILE_WINDOW_END),
            ATTR_OVULATION_DAY: compact.get(ATTR_OVULATION_DAY),
            ATTR_PERIOD_FORECAST: compact.get(ATTR_PERIOD_FORECAST),
            ATTR_FERTILITY_FORECAST: compact.get(ATTR_FERTILITY_FORECAST),
            ATTR_PREGNANCY_DATA: compact.get(ATTR_PREGNANCY_DATA),
            ATTR_ONBOARDING_STAGE: compact.get(ATTR_ONBOARDING_STAGE),
            ATTR_ONBOARDING_STAGE_EFFECTIVE: compact.get(ATTR_ONBOARDING_STAGE_EFFECTIVE),
            "history_count": compact.get("history_count"),
            "last_cycle_start": compact.get("last_cycle_start"),
            "predicted_starts_preview": compact.get("predicted_starts_preview"),
        }
    return compact


def _group_product_usage_by_date(product_usage: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in product_usage:
        date_str = entry.get("date")
        if isinstance(date_str, str):
            grouped[date_str].append(entry)
    return grouped


def _empty_product_counts() -> dict[str, int]:
    return {product: 0 for product in PRODUCT_USAGE_PRODUCTS}


def _entry_quantity(entry: dict[str, Any]) -> int:
    return _coerce_quantity(entry.get("quantity", 1))


def _coerce_quantity(value: Any, default: int = 1) -> int:
    parsed: float | None
    if isinstance(value, bool):
        parsed = None
    elif isinstance(value, (int, float)):
        parsed = float(value)
    else:
        text = str(value or "").strip()
        if not text:
            parsed = None
        else:
            match = re.search(r"[-+]?\d+(?:[.,]\d+)?", text)
            if match is None:
                parsed = None
            else:
                try:
                    parsed = float(match.group(0).replace(",", "."))
                except ValueError:
                    parsed = None
    if parsed is None or not math.isfinite(parsed) or parsed <= 0:
        return max(1, int(default))
    return max(1, int(parsed))


def _normalize_product_usage_product(raw: Any) -> str | None:
    value = str(raw or "").strip().lower()
    if not value:
        return None
    normalized = value.replace("-", "_")
    return PRODUCT_USAGE_PRODUCT_ALIASES.get(normalized) or PRODUCT_USAGE_PRODUCT_ALIASES.get(value)


def _count_products(entries: list[dict[str, Any]]) -> dict[str, int]:
    counts = _empty_product_counts()
    for entry in entries:
        product = entry.get("product")
        if product not in counts:
            continue
        counts[product] += _entry_quantity(entry)
    return counts


def _count_products_for_block(
    grouped_usage: dict[str, list[dict[str, Any]]],
    block: list[str] | tuple[str, ...],
) -> dict[str, int]:
    counts = _empty_product_counts()
    for day in block:
        for entry in grouped_usage.get(day, []):
            product = entry.get("product")
            if product not in counts:
                continue
            counts[product] += _entry_quantity(entry)
    return counts


def _build_product_usage_stats(
    history: list[str],
    product_usage: list[dict[str, Any]],
    today: date,
    symptom_history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    normalized_history = normalize_history(history)
    usable_history = [item for item in normalized_history if item <= today.isoformat()] or normalized_history
    blocks = bleeding_blocks(usable_history)
    grouped_usage = _group_product_usage_by_date(_merge_product_usage_sources(product_usage, symptom_history or []))

    today_counts = _count_products(grouped_usage.get(today.isoformat(), []))

    recent_blocks = [block for block in blocks[-PRODUCT_USAGE_CYCLES_CONSIDERED:] if block]
    cycle_totals = [_count_products_for_block(grouped_usage, block) for block in recent_blocks]
    cycles_considered = len(cycle_totals)

    average_per_cycle = {
        product: round(mean([cycle[product] for cycle in cycle_totals]), 1) if cycles_considered else 0.0
        for product in PRODUCT_USAGE_PRODUCTS
    }

    this_cycle = _count_products_for_block(grouped_usage, blocks[-1]) if blocks else _empty_product_counts()

    return {
        "today": today_counts,
        "this_cycle": this_cycle,
        "stats": {
            "average_per_cycle": average_per_cycle,
            "cycles_considered": cycles_considered,
        },
    }


def _parse_iso_date(raw: Any) -> date | None:
    if raw in (None, ""):
        return None
    if isinstance(raw, date):
        return raw
    if isinstance(raw, datetime):
        return raw.date()

    text = str(raw).strip()
    if not text:
        return None

    try:
        return date.fromisoformat(text)
    except ValueError:
        pass

    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    except ValueError:
        pass

    try:
        numeric = float(text)
    except ValueError:
        return None

    if not numeric.is_integer():
        return None

    try:
        timestamp = int(numeric)
        if abs(timestamp) >= 1_000_000_000_000:
            timestamp /= 1000
        return datetime.utcfromtimestamp(timestamp).date()
    except (OverflowError, OSError, ValueError):
        return None


def _normalize_product_usage_entry(entry: dict[str, Any]) -> dict[str, Any] | None:
    entry_date = (
        _parse_iso_date(entry.get("date"))
        or _parse_iso_date(entry.get("created_at"))
        or _parse_iso_date(entry.get("logged_at"))
        or _parse_iso_date(entry.get("timestamp"))
    )
    product = _normalize_product_usage_product(entry.get("product"))
    if entry_date is None or product is None:
        return None
    return {
        **entry,
        "date": entry_date.isoformat(),
        "product": product,
        "quantity": _entry_quantity(entry),
        "action": str(entry.get("action", "used")).strip().lower() or "used",
    }


def _aggregate_day_confidence_levels(
    confidence_by_day: dict[str, Any] | None,
    day_keys: list[str],
    event_key: str,
) -> str:
    """Aggregate day-level confidence for an event window."""
    if not isinstance(confidence_by_day, dict) or not day_keys:
        return "low"

    level_order = {"high": 2, "medium": 1, "low": 0}
    best_level = "low"
    seen = False
    for day_iso in day_keys:
        event_map = confidence_by_day.get(day_iso)
        if not isinstance(event_map, dict):
            continue
        event_conf = event_map.get(event_key)
        if not isinstance(event_conf, dict):
            continue
        level = str(event_conf.get("level", "low")).lower()
        if level_order.get(level, 0) > level_order.get(best_level, 0):
            best_level = level
        seen = True
    return best_level if seen else "low"


def _merge_product_usage_sources(
    product_usage: list[dict[str, Any]],
    symptom_history: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    normalized_usage: list[dict[str, Any]] = []
    explicit_pairs: set[tuple[str, str]] = set()

    for raw_entry in product_usage:
        if not isinstance(raw_entry, dict):
            continue
        normalized_entry = _normalize_product_usage_entry(raw_entry)
        if normalized_entry is None:
            continue
        normalized_usage.append(normalized_entry)
        explicit_pairs.add((normalized_entry["date"], normalized_entry["product"]))

    for symptom_entry in symptom_history:
        if not isinstance(symptom_entry, dict):
            continue
        entry_date = _parse_iso_date(symptom_entry.get("date"))
        if entry_date is None:
            continue

        for raw_product in _coerce_multi_values(symptom_entry.get("hygiene")):
            product = _normalize_product_usage_product(raw_product)
            date_key = entry_date.isoformat()
            if product is None or (date_key, product) in explicit_pairs:
                continue
            normalized_usage.append(
                {
                    "date": date_key,
                    "product": product,
                    "quantity": 1,
                    "action": "used",
                }
            )

    return sorted(
        normalized_usage,
        key=lambda item: (item.get("date", ""), item.get("product", ""), item.get("action", "")),
    )


def _symptom_entries_for_period(
    symptom_history: list[dict[str, Any]],
    start: date,
    end: date,
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for entry in symptom_history:
        entry_date = _parse_iso_date(entry.get("date"))
        if entry_date is None or entry_date < start or entry_date > end:
            continue
        entries.append(entry)
    return entries


def _coerce_multi_values(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if item not in (None, "")]
    if value in (None, ""):
        return []
    return [str(value)]


def _summarize_symptoms_for_period(
    symptom_history: list[dict[str, Any]],
    start: date,
    end: date,
) -> dict[str, Any]:
    period_entries = _symptom_entries_for_period(symptom_history, start, end)
    if not period_entries:
        return {}

    if start == end and len(period_entries) == 1:
        return {
            key: value
            for key, value in period_entries[0].items()
            if key != "date" and value not in (None, "", [], {})
        }

    summary: dict[str, Any] = {}

    bleeding_values: list[tuple[int, str]] = []
    for index, entry in enumerate(period_entries):
        value = entry.get("bleeding_strength")
        if not isinstance(value, str):
            continue
        bleeding_values.append((index, value))
    if bleeding_values:
        _, strongest_bleeding = max(
            bleeding_values,
            key=lambda item: (BLEEDING_STRENGTH_PRIORITY.get(item[1], 0), item[0]),
        )
        summary["bleeding_strength"] = strongest_bleeding

    for key in ("spotting", "discharge", "intercourse", "cervical_mucus"):
        values = [str(entry[key]) for entry in period_entries if entry.get(key) not in (None, "")]
        if values:
            summary[key] = Counter(values).most_common(1)[0][0]

    for key in SYMPTOM_MULTI_VALUE_KEYS:
        days_with_value = 0
        value_counter: Counter[str] = Counter()
        for entry in period_entries:
            values = _coerce_multi_values(entry.get(key))
            if not values:
                continue
            days_with_value += 1
            value_counter.update(values)

        if not value_counter:
            continue

        types = [name for name, _ in value_counter.most_common()]
        summary[f"{key}_days"] = days_with_value
        summary[f"{key}_types"] = types
        if key == "pain":
            summary["pain_days"] = days_with_value
            summary["pain_types"] = types

    basal_temps: list[float] = []
    for entry in period_entries:
        value = entry.get("basal_temp")
        if value in (None, ""):
            continue
        try:
            basal_temps.append(float(value))
        except (TypeError, ValueError):
            continue
    if basal_temps:
        summary["basal_temp_average"] = round(mean(basal_temps), 1)
        summary["basal_temp_min"] = round(min(basal_temps), 1)
        summary["basal_temp_max"] = round(max(basal_temps), 1)

    return summary


def _build_symptom_statistics(
    history: list[str],
    symptom_history: list[dict[str, Any]],
    today: date,
) -> dict[str, Any]:
    normalized_history = normalize_history(history)
    usable_history = [item for item in normalized_history if item <= today.isoformat()] or normalized_history
    cycle_starts = grouped_cycle_starts(usable_history)
    cycle_starts = cycle_starts[-SYMPTOM_STATS_MAX_CYCLES:]

    periods: list[tuple[date, date]] = []
    for idx, start_iso in enumerate(cycle_starts):
        start_date = _parse_iso_date(start_iso)
        if start_date is None:
            continue
        if idx + 1 < len(cycle_starts):
            next_start = _parse_iso_date(cycle_starts[idx + 1])
            if next_start is None:
                continue
            end_date = min(today, next_start - timedelta(days=1))
        else:
            end_date = today
        if end_date >= start_date:
            periods.append((start_date, end_date))

    if not periods:
        return {"cycles_analyzed": 0}

    cycles_analyzed = len(periods)
    cycles_with_pain = 0
    pain_days_per_cycle: list[int] = []
    pain_types: Counter[str] = Counter()
    bleeding_strengths: Counter[str] = Counter()
    discharge: Counter[str] = Counter()
    cervical_mucus: Counter[str] = Counter()
    basal_temps: list[float] = []

    for start, end in periods:
        entries = _symptom_entries_for_period(symptom_history, start, end)
        cycle_pain_days = 0
        for entry in entries:
            pain_values = _coerce_multi_values(entry.get("pain"))
            if pain_values:
                cycle_pain_days += 1
                pain_types.update(pain_values)

            bleeding = entry.get("bleeding_strength")
            if isinstance(bleeding, str) and bleeding:
                bleeding_strengths[bleeding] += 1

            mucus = entry.get("cervical_mucus")
            if isinstance(mucus, str) and mucus:
                cervical_mucus[mucus] += 1

            discharge_value = entry.get("discharge")
            if isinstance(discharge_value, str) and discharge_value:
                discharge[discharge_value] += 1

            temp_value = entry.get("basal_temp")
            if temp_value not in (None, ""):
                try:
                    basal_temps.append(float(temp_value))
                except (TypeError, ValueError):
                    pass

        pain_days_per_cycle.append(cycle_pain_days)
        if cycle_pain_days > 0:
            cycles_with_pain += 1

    pain_total = sum(pain_types.values())
    bleeding_total = sum(bleeding_strengths.values())

    typical_bleeding = None
    if bleeding_strengths:
        top_count = max(bleeding_strengths.values())
        candidates = [value for value, count in bleeding_strengths.items() if count == top_count]
        typical_bleeding = max(candidates, key=lambda value: BLEEDING_STRENGTH_PRIORITY.get(value, 0))

    return {
        "pain_frequency": round((cycles_with_pain / cycles_analyzed) * 100) if cycles_analyzed else 0,
        "average_pain_days_per_cycle": round(mean(pain_days_per_cycle), 1) if pain_days_per_cycle else 0.0,
        "common_pain_types": {
            key: round((count / pain_total) * 100)
            for key, count in pain_types.items()
        } if pain_total else {},
        "typical_bleeding_strength": typical_bleeding,
        "bleeding_strength_distribution": {
            key: round((count / bleeding_total) * 100)
            for key, count in bleeding_strengths.items()
        } if bleeding_total else {},
        "typical_discharge": discharge.most_common(1)[0][0] if discharge else None,
        "typical_cervical_mucus": cervical_mucus.most_common(1)[0][0] if cervical_mucus else None,
        "average_basal_temp": round(mean(basal_temps), 1) if basal_temps else None,
        "cycles_analyzed": cycles_analyzed,
    }


def _compact_symptom_history(symptom_history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if len(symptom_history) <= SYMPTOM_SENSOR_HISTORY_LIMIT:
        return symptom_history
    return symptom_history[-SYMPTOM_SENSOR_HISTORY_LIMIT:]


def _compact_product_usage_for_sensor(
    product_usage: list[dict[str, Any]],
    symptom_history: list[dict[str, Any]],
    today: date,
    days: int = PRODUCT_USAGE_TIMELINE_DAYS,
) -> list[dict[str, Any]]:
    """Limit product usage to a recent window for sensor broadcasting."""
    merged_usage = _merge_product_usage_sources(product_usage, symptom_history)
    if not merged_usage:
        return merged_usage
    cutoff = today - timedelta(days=max(days - 1, 0))
    compact_entries: list[dict[str, Any]] = []
    for entry in merged_usage:
        entry_date = _parse_iso_date(entry.get("date"))
        if entry_date is None or entry_date > today or entry_date < cutoff:
            continue
        compact_entries.append(entry)
    return compact_entries


def _compact_history_for_sensor(history: list[str], today: date, months: int = CYCLE_HISTORY_LIMIT_MONTHS) -> list[str]:
    """Limit history to recent months for sensor broadcasting."""
    if not history:
        return history
    cutoff = today - timedelta(days=int(months * 30.44))
    cutoff_iso = cutoff.isoformat()
    compact = [d for d in history if d >= cutoff_iso]
    return compact if compact else history


def _compact_grouped_starts_for_sensor(grouped_starts: list[str], today: date, months: int = CYCLE_HISTORY_LIMIT_MONTHS) -> list[str]:
    """Limit grouped_starts to recent months for sensor broadcasting."""
    if not grouped_starts:
        return grouped_starts
    cutoff = today - timedelta(days=int(months * 30.44))
    cutoff_iso = cutoff.isoformat()
    compact = [d for d in grouped_starts if d >= cutoff_iso]
    # Always include at least the last 2 entries so cycle-length calculations still work in cards
    if len(compact) < 2 and len(grouped_starts) >= 2:
        compact = grouped_starts[-2:]
    return compact if compact else grouped_starts


def _build_cycle_statistics(
    grouped_starts: list[str],
    bleeding_blocks_payload: list[dict[str, str | int]],
    today: date,
) -> dict[str, Any]:
    """Build pre-calculated cycle statistics for the sensor attribute."""
    if not grouped_starts:
        return {"cycles_analyzed": 0}

    recent_starts = grouped_starts[-(CYCLE_STATS_MAX_CYCLES + 1):]

    cycle_lengths: list[int] = []
    recent_cycles: list[dict[str, Any]] = []

    for idx in range(1, len(recent_starts)):
        start_iso = recent_starts[idx - 1]
        next_iso = recent_starts[idx]
        start_d = _parse_iso_date(start_iso)
        next_d = _parse_iso_date(next_iso)
        if start_d is None or next_d is None:
            continue
        length = (next_d - start_d).days
        if 10 < length < 80:
            cycle_lengths.append(length)
            recent_cycles.append({
                "start": start_iso,
                "end": (next_d - timedelta(days=1)).isoformat(),
                "length": length,
            })

    current_start_iso = grouped_starts[-1]
    current_start_d = _parse_iso_date(current_start_iso)
    if current_start_d is not None:
        days_in_current = (today - current_start_d).days + 1
        recent_cycles.append({
            "start": current_start_iso,
            "end": None,
            "length": days_in_current,
        })

    if not cycle_lengths:
        return {
            "cycles_analyzed": 0,
            "recent_cycles": recent_cycles[-CYCLE_RECENT_LIMIT:],
        }

    avg_cycle = round(mean(cycle_lengths), 1)
    min_cycle = min(cycle_lengths)
    max_cycle = max(cycle_lengths)
    regular_count = sum(1 for length in cycle_lengths if abs(length - avg_cycle) <= 3)
    regularity = round((regular_count / len(cycle_lengths)) * 100)

    avg_period_duration: float | None = None
    if bleeding_blocks_payload:
        recent_blocks = bleeding_blocks_payload[-CYCLE_STATS_MAX_CYCLES:]
        durations = [
            block["length"]
            for block in recent_blocks
            if isinstance(block.get("length"), int)
        ]
        if durations:
            avg_period_duration = round(mean(durations), 1)

    return {
        "average_cycle_length": avg_cycle,
        "average_period_duration": avg_period_duration,
        "cycles_analyzed": len(cycle_lengths),
        "min_cycle_length": min_cycle,
        "max_cycle_length": max_cycle,
        "cycle_regularity_percent": regularity,
        "recent_cycles": recent_cycles[-CYCLE_RECENT_LIMIT:],
    }


def _get_current_bleeding_block(current_period: dict[str, Any] | None) -> dict[str, Any] | None:
    """Return the lifecycle-aware period block for the latest cycle."""
    if not isinstance(current_period, dict):
        return None
    return dict(current_period)


def _device_info_for_entry(hass: HomeAssistant, entry: ConfigEntry) -> DeviceInfo:
    """Build the shared DeviceInfo grouping every entity for a profile (config
    entry) — main cycle sensor, product usage, basal temperature, etc. — under one
    device in Settings > Devices & Services. Without this, each entity appeared
    standalone with no way to see at a glance which profile it belonged to, which
    matters especially for households tracking more than one person."""
    runtime = hass.data[DOMAIN][entry.entry_id]
    return DeviceInfo(
        identifiers={(DOMAIN, entry.entry_id)},
        name=runtime.friendly_name,
        manufacturer="HA-menstrual-cycle",
        model="Cycle Tracker Profile",
        entry_type=DeviceEntryType.SERVICE,
    )


class MenstruationGaugeSensor(SensorEntity):
    """Expose cycle state and computed attributes including symptoms and pregnancy."""

    _attr_has_entity_name = True

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_menstruation"
        runtime = self.hass.data[DOMAIN][self._entry.entry_id]
        # None = this is the device's primary entity; with has_entity_name + device
        # grouping, it displays as just the device (profile) name, e.g. "Anna",
        # instead of duplicating the name as both device and entity ("Anna Anna").
        self._attr_name = None
        # Separately, force a "menstruation_"-prefixed entity_id (independent of
        # the clean display name above) so it stays findable when searching or
        # browsing a flat entity list across many integrations — "sensor.anna"
        # alone gives no hint this is cycle-tracking data.
        self._attr_suggested_object_id = menstruation_object_ids_for_profile(runtime.friendly_name)["_menstruation"]
        self._state: str = "neutral"
        self._attrs: dict[str, StateType] = {}
        self._icon: str | None = runtime.icon or None

    @property
    def device_info(self) -> DeviceInfo:
        return _device_info_for_entry(self.hass, self._entry)

    async def async_added_to_hass(self) -> None:
        """Register update signals and daily refresh."""
        self.async_on_remove(
            async_dispatcher_connect(self.hass, SIGNAL_HISTORY_UPDATED, self._handle_runtime_update)
        )
        self.async_on_remove(
            async_track_time_change(
                self.hass,
                self._handle_daily_refresh,
                hour=0,
                minute=0,
                second=5,
            )
        )
        # Force one recalculation on add/startup so day-based attributes are never stale.
        self.async_schedule_update_ha_state(True)

    async def async_update(self) -> None:
        """Update sensor from shared runtime."""
        runtime = self.hass.data[DOMAIN][self._entry.entry_id]
        today = dt_util.now().date()
        self._icon = runtime.icon or None
        model = build_cycle_model(
            history=runtime.history,
            period_duration_days=runtime.period_duration_days,
            symptom_history=runtime.symptom_history,
            pregnancy_data=runtime.pregnancy_data,
            menarche_data=runtime.menarche_data,
            pre_menarche_data=runtime.pre_menarche_data,
            menopause_data=runtime.menopause_data,
            noncycle_data=runtime.noncycle_data,
            today=today,
            cycle_length_override=runtime.cycle_length_override,
            nfp_mode=self._entry.options.get(CONF_NFP_ANALYSIS_MODE, DEFAULT_NFP_ANALYSIS_MODE),
            onboarding_stage=getattr(runtime, "onboarding_stage", None),
        )
        usage_stats = _build_product_usage_stats(
            runtime.history,
            runtime.product_usage,
            today,
            runtime.symptom_history,
        )
        symptom_data_today = _summarize_symptoms_for_period(model.symptom_history, today, today)

        symptom_data_this_cycle: dict[str, Any] = {}
        if model.grouped_starts:
            cycle_start = _parse_iso_date(model.grouped_starts[-1])
            if cycle_start is not None:
                symptom_data_this_cycle = _summarize_symptoms_for_period(
                    model.symptom_history,
                    cycle_start,
                    today,
                )

        symptom_statistics = _build_symptom_statistics(model.history, model.symptom_history, today)
        compact_symptom_history = _compact_symptom_history(model.symptom_history)
        compact_product_usage = _compact_product_usage_for_sensor(
            runtime.product_usage,
            runtime.symptom_history,
            today,
        )

        # Cycle start / day in current cycle
        cycle_start_date: str | None = model.grouped_starts[-1] if model.grouped_starts else None
        cycle_day: int | None = None
        if cycle_start_date:
            start_d = _parse_iso_date(cycle_start_date)
            if start_d is not None:
                cycle_day = (today - start_d).days + 1

        cycle_statistics = _build_cycle_statistics(model.grouped_starts, model.bleeding_blocks, today)
        current_bleeding_block = _get_current_bleeding_block(model.current_period)
        raw_num_predictions = self._entry.options.get(CONF_NUM_PREDICTIONS, DEFAULT_NUM_PREDICTIONS)
        try:
            num_predictions = int(raw_num_predictions)
        except (TypeError, ValueError):
            num_predictions = DEFAULT_NUM_PREDICTIONS
        num_predictions = max(1, min(MAX_NUM_PREDICTIONS, num_predictions))
        predicted_cycle_starts = predict_future_starts(model.grouped_starts, num_predictions)
        if model.learning_phase and not bool((model.prediction_gating or {}).get("precision_allowed")):
            predicted_cycle_starts = []
        prediction_day_confidence = compute_prediction_day_confidence(
            model.grouped_starts,
            predicted_cycle_starts,
            model.period_duration_days,
            model.avg_cycle_length,
            model.nfp_analysis,
        )
        confidence_by_day = prediction_day_confidence.get("by_day", {})

        period_forecast = dict(model.period_forecast) if isinstance(model.period_forecast, dict) else model.period_forecast
        if isinstance(period_forecast, dict) and period_forecast.get("predicted_start") and period_forecast.get("predicted_end"):
            start = _parse_iso_date(period_forecast.get("predicted_start"))
            end = _parse_iso_date(period_forecast.get("predicted_end"))
            if start and end and start <= end:
                period_days: list[str] = []
                day_cursor = start
                while day_cursor <= end:
                    period_days.append(day_cursor.isoformat())
                    day_cursor += timedelta(days=1)
                period_forecast["day_confidence"] = {
                    day_iso: confidence_by_day.get(day_iso, {}).get("period", {"level": "low", "source": "estimated"})
                    for day_iso in period_days
                }
                period_forecast["window_confidence"] = _aggregate_day_confidence_levels(confidence_by_day, period_days, "period")

        fertility_forecast = dict(model.fertility_forecast) if isinstance(model.fertility_forecast, dict) else model.fertility_forecast
        if isinstance(fertility_forecast, dict):
            fertile_start = _parse_iso_date(fertility_forecast.get("fertile_window_start"))
            fertile_end = _parse_iso_date(fertility_forecast.get("fertile_window_end"))
            if fertile_start and fertile_end and fertile_start <= fertile_end:
                fertile_days: list[str] = []
                day_cursor = fertile_start
                while day_cursor <= fertile_end:
                    fertile_days.append(day_cursor.isoformat())
                    day_cursor += timedelta(days=1)
                fertility_forecast["day_confidence"] = {
                    day_iso: confidence_by_day.get(day_iso, {}).get("fertile", {"level": "low", "source": "estimated"})
                    for day_iso in fertile_days
                }
                ovulation_iso = str(fertility_forecast.get("ovulation_estimate") or "")
                ovulation_conf = confidence_by_day.get(ovulation_iso, {}).get("ovulation", {"level": "low", "source": "estimated"})
                fertility_forecast["ovulation_confidence"] = ovulation_conf
                fertile_window_conf = _aggregate_day_confidence_levels(confidence_by_day, fertile_days, "fertile")
                ovulation_level = str(ovulation_conf.get("level", "low")).lower()
                if ovulation_level == "high" or fertile_window_conf == "high":
                    fertility_forecast["window_confidence"] = "high"
                elif ovulation_level == "medium" or fertile_window_conf == "medium":
                    fertility_forecast["window_confidence"] = "medium"
                else:
                    fertility_forecast["window_confidence"] = "low"

        # Compact history/grouped_starts for sensor broadcasting (full data stays in storage)
        sensor_history = _compact_history_for_sensor(model.history, today)
        sensor_grouped_starts = _compact_grouped_starts_for_sensor(model.grouped_starts, today)

        # Progress badges — evaluated from full history, idempotent
        existing_badges: list[dict] = []
        prev_attrs = self._attrs or {}
        if isinstance(prev_attrs.get("progress_badges"), list):
            existing_badges = prev_attrs["progress_badges"]
        progress_badges = evaluate_badges(
            model.history,
            model.symptom_history,
            model.grouped_starts,
            nfp_analysis=model.nfp_analysis,
            avg_cycle_length=model.avg_cycle_length,
            today=today,
            existing_badges=existing_badges,
            symptom_correlation_insights=model.symptom_correlation_insights,
            birth_date=self._entry.data.get(CONF_BIRTH_DATE),
            family_menarche_age=model.menarche_data.get("family_menarche_age"),
            pre_menarche_signs=(model.pre_menarche_data or {}).get("signs"),
            doctor_report_exported=bool((runtime.noncycle_data or {}).get("doctor_report_exported")),
        )
        progress_badges_new_this_week = new_badges_this_week(progress_badges, today=today)

        self._state = model.state
        has_history = bool(model.history)
        resolved_menarche_date = self._resolve_estimated_menarche_date(
            model.pre_menarche_data, model.menarche_data, self._entry.data.get(CONF_BIRTH_DATE)
        )

        raw_attrs = {
            ATTR_HISTORY: sensor_history,
            ATTR_SYMPTOM_HISTORY: compact_symptom_history,
            ATTR_GROUPED_STARTS: sensor_grouped_starts,
            ATTR_BLEEDING_BLOCKS: model.bleeding_blocks,
            ATTR_NEXT_PREDICTED_START: model.next_predicted_start,
            ATTR_PREDICTED_CYCLE_STARTS: predicted_cycle_starts,
            ATTR_AVG_CYCLE_LENGTH: model.avg_cycle_length,
            ATTR_FERTILE_WINDOW_START: model.fertile_window_start,
            ATTR_FERTILE_WINDOW_END: model.fertile_window_end,
            ATTR_OVULATION_DAY: model.ovulation_day,
            ATTR_DAYS_UNTIL_NEXT_START: model.days_until_next_start,
            ATTR_PERIOD_DURATION_DAYS: model.period_duration_days if has_history else None,
            "period_duration_default_days": runtime.period_duration_days if has_history else None,
            "period_duration_learned_avg_days": model.learned_period_duration_days if has_history else None,
            ATTR_IS_PREGNANT: model.is_pregnant,
            ATTR_PREGNANCY_START_DATE: model.pregnancy_start_date,
            ATTR_WEEKS_PREGNANT: model.weeks_pregnant,
            ATTR_DUE_DATE: model.due_date,
            ATTR_PREGNANCY_HIGH_RISK: bool(runtime.pregnancy_data.get("high_risk", False)),
            ATTR_PREGNANCY_RISK_NOTES: runtime.pregnancy_data.get("risk_notes") or None,
            ATTR_PREGNANCY_DATA: {
                "is_pregnant": model.is_pregnant,
                "start_date": model.pregnancy_start_date,
                "weeks_pregnant": model.weeks_pregnant,
                "due_date": model.due_date,
                "high_risk": bool(runtime.pregnancy_data.get("high_risk", False)),
                "risk_notes": runtime.pregnancy_data.get("risk_notes") or None,
            },
            ATTR_BIRTH_DATE: self._entry.data.get(CONF_BIRTH_DATE),
            ATTR_AGE_AT_TRACKING: self._calculate_age(self._entry.data.get(CONF_BIRTH_DATE)),
            ATTR_ESTIMATED_MENARCHE_DATE: resolved_menarche_date,
            ATTR_DAYS_UNTIL_MENARCHE: self._calculate_days_until_menarche(resolved_menarche_date),
            "menarche_data": model.menarche_data,
            ATTR_PRE_MENARCHE_DATA: model.pre_menarche_data,
            ATTR_MENOPAUSE_DATA: model.menopause_data,
            "days_since_last_period": model.days_since_last_period,
            "menopause_months_tracked": model.menopause_months_tracked,
            ATTR_IS_POSTPARTUM: bool(model.noncycle_data.get("is_postpartum", False)),
            ATTR_POSTPARTUM_DURATION: model.noncycle_data.get("postpartum_duration_days") or 42,
            ATTR_POSTPARTUM_DATA: {
                "is_postpartum": bool(model.noncycle_data.get("is_postpartum", False)),
                "start_date": model.noncycle_data.get("postpartum_start_date"),
                "duration_days": model.noncycle_data.get("postpartum_duration_days") or 42,
                "days_since_birth": self._calculate_days_since(model.noncycle_data.get("postpartum_start_date")),
            },
            "noncycle_data": model.noncycle_data,
            "profile": runtime.profile,
            "entry_id": self._entry.entry_id,
            "friendly_name": runtime.friendly_name,
            # Explicit marker so consumers (e.g. the dashboard panel's entity/profile
            # picker) can reliably identify "this is the one sensor per profile that
            # represents a selectable person", instead of guessing from entity_id
            # naming patterns — which silently broke once entity IDs were renamed to
            # the searchable "menstruation_"-prefixed scheme, since the other two
            # per-profile sensors (product usage, basal temp) also carry profile+
            # entry_id and no longer happened to be excluded by name.
            "is_primary_profile_sensor": True,
            "contraception_status": compute_contraception_status(model.symptom_history, today=today),
            "product_usage_today": usage_stats["today"],
            "product_usage_this_cycle": usage_stats["this_cycle"],
            "product_usage_stats": usage_stats["stats"],
            "product_usage_timeline": compact_product_usage,
            "symptom_data_today": symptom_data_today,
            "symptom_data_this_cycle": symptom_data_this_cycle,
            "symptom_statistics": symptom_statistics,
            "symptom_correlation_insights": model.symptom_correlation_insights,
            "symptom_correlation_insights_reason": model.symptom_correlation_insights_reason,
            "cycle_start_date": cycle_start_date,
            "cycle_day": cycle_day,
            "current_bleeding_block": current_bleeding_block,
            "cycle_statistics": cycle_statistics,
            "cycle_length_override": runtime.cycle_length_override,
            ATTR_NFP_ANALYSIS: model.nfp_analysis,
            "learned_ovulation_offset": model.learned_ovulation_offset,
            "nfp_mode": model.nfp_mode,
            ATTR_ONBOARDING_STAGE: model.onboarding_stage,
            ATTR_ONBOARDING_STAGE_EFFECTIVE: model.onboarding_stage_effective,
            ATTR_LEARNING_PHASE: model.learning_phase,
            ATTR_PREDICTION_GATING: model.prediction_gating,
            ATTR_PERIOD_FORECAST: period_forecast,
            ATTR_FERTILITY_FORECAST: fertility_forecast,
            ATTR_PREDICTION_DAY_CONFIDENCE: prediction_day_confidence,
            ATTR_ICS_URL: f"/{DOMAIN}/ics/{runtime.ics_token}.ics",
            "progress_badges": progress_badges,
            "progress_badges_new_this_week": progress_badges_new_this_week,
        }
        self._attrs = _build_compact_sensor_attributes(raw_attrs)

    def _resolve_estimated_menarche_date(
        self,
        pre_menarche_data: dict[str, Any],
        menarche_data: dict[str, Any],
        birth_date: str | None,
    ) -> str | None:
        """Resolve the best available menarche date estimate, in priority
        order: (1) sign-based estimate from logged, dated pubertal signs —
        the most reliable predictor once real physical signs are observed;
        (2) birth_date + family_menarche_age demographic correlation; (3) a
        previously/manually stored estimated_date as a last resort.

        This is the server-side counterpart to the dashboard's own
        three-tier priority (dynamic signs > sensor attribute > age-only
        fallback) — previously the sensor only ever computed tier 2 and 3,
        meaning the signs-based estimate the dashboard already showed was
        never reflected in the sensor's own attributes, so anything reading
        the raw sensor (e.g. an external app via the API) got a
        substantially less accurate number than what the dashboard displayed.
        """
        sign_estimate = estimate_menarche_from_signs(pre_menarche_data.get("signs") if isinstance(pre_menarche_data, dict) else None)
        if sign_estimate:
            return sign_estimate["estimated_date"]
        demographic_estimate = self._calculate_estimated_menarche_date(
            birth_date, menarche_data.get("family_menarche_age")
        )
        return demographic_estimate or menarche_data.get("estimated_date")

    def _calculate_days_until_menarche(self, estimated_date: str | None) -> int | None:
        """Calculate days until an already-resolved estimated menarche date
        (see _resolve_estimated_menarche_date) — kept as a separate method
        since "days until" and "the date itself" are both exposed as
        distinct sensor attributes, but must always agree with each other,
        which is why the resolution itself now happens exactly once, not
        independently in both places.
        """
        if not estimated_date:
            return None
        try:
            est_date = date.fromisoformat(str(estimated_date))
            today = dt_util.now().date()
            return (est_date - today).days
        except (TypeError, ValueError):
            return None

    # Mother-daughter menarche-age correlation from meta-analytic literature
    # (Towne et al. 2005; pooled meta-analyses report r≈0.27, 95% CI 0.17-0.36).
    # Twin studies find higher heritability (50-80%), but the simple mother-daughter
    # correlation is the right coefficient here since we only have one data point
    # (the mother's age), not a full family/genetic model.
    _MENARCHE_MOTHER_CORRELATION = 0.27

    def _calculate_estimated_menarche_date(
        self, birth_date: str | None, family_menarche_age: int | float | None
    ) -> str | None:
        """Estimate menarche date from birth_date + family_menarche_age (mother's age at
        menarche), regressed toward the population-typical age rather than copied
        directly. A raw 1:1 copy would systematically predict too late: the
        mother-daughter correlation is only moderate (r≈0.27), and there's a well
        documented secular trend of daughters reaching menarche earlier than their
        mothers (better nutrition across generations). Regression to the mean captures
        both effects without needing separate secular-trend bookkeeping. Falls back to
        the population-typical age alone when no family value has been recorded."""
        if not birth_date:
            return None
        try:
            born = date.fromisoformat(str(birth_date))
        except (TypeError, ValueError):
            return None

        age_years = DEFAULT_MENARCHE_AGE_TYPICAL
        if family_menarche_age:
            try:
                mother_age = float(family_menarche_age)
                if DEFAULT_MENARCHE_AGE_MIN <= mother_age <= DEFAULT_MENARCHE_AGE_MAX:
                    age_years = DEFAULT_MENARCHE_AGE_TYPICAL + self._MENARCHE_MOTHER_CORRELATION * (
                        mother_age - DEFAULT_MENARCHE_AGE_TYPICAL
                    )
            except (TypeError, ValueError):
                pass

        whole_years = int(age_years)
        extra_days = round((age_years - whole_years) * 365)
        try:
            estimated = born.replace(year=born.year + whole_years) + timedelta(days=extra_days)
        except ValueError:
            # Feb 29 birth_date landing on a non-leap year — fall back to Feb 28.
            estimated = born.replace(year=born.year + whole_years, day=28) + timedelta(days=extra_days)
        return estimated.isoformat()

    def _calculate_age(self, birth_date: str | None) -> int | None:
        """Calculate current age in whole years from a stored birth_date."""
        if not birth_date:
            return None
        try:
            born = date.fromisoformat(str(birth_date))
        except (TypeError, ValueError):
            return None
        today = dt_util.now().date()
        if born > today:
            return None
        years = today.year - born.year
        if (today.month, today.day) < (born.month, born.day):
            years -= 1
        return max(0, years)

    def _calculate_days_since(self, iso_date: str | None) -> int | None:
        """Return whole days elapsed since a stored ISO date, or None if unset/invalid."""
        if not iso_date:
            return None
        try:
            start = date.fromisoformat(str(iso_date))
        except (TypeError, ValueError):
            return None
        today = dt_util.now().date()
        if start > today:
            return None
        return (today - start).days

    @property
    def state(self) -> StateType:
        """Return current cycle state."""
        return self._state

    @property
    def extra_state_attributes(self) -> dict[str, StateType]:
        """Return extra attributes for card rendering."""
        return self._attrs

    @property
    def icon(self) -> str | None:
        """Return icon."""
        return self._icon

    @property
    def suggested_display_precision(self) -> int | None:
        """No numeric precision needed."""
        return None

    @property
    def unit_of_measurement(self) -> str | None:
        """No unit for string states."""
        return None

    @property
    def should_poll(self) -> bool:
        """Updates come via dispatcher; no polling needed."""
        return False

    @property
    def available(self) -> bool:
        """Sensor is available when runtime exists."""
        return self._entry.entry_id in self.hass.data.get(DOMAIN, {})

    @property
    def force_update(self) -> bool:
        """State changes only when model changes."""
        return False

    @property
    def native_value(self) -> StateType:
        """Return sensor state."""
        return self._state

    @property
    def name(self) -> str | None:
        """Return entity name."""
        return self._attr_name

    @property
    def translation_key(self) -> str | None:
        """Translation key for future localization."""
        return None

    @property
    def entity_registry_enabled_default(self) -> bool:
        """Enable by default."""
        return True

    def _safe_schedule_update(self) -> None:
        """Schedule a state refresh on the HA event loop (thread-safe)."""
        if not self.hass:
            return

        def _do_update() -> None:
            if self.hass and self.hass.is_running:
                self.async_schedule_update_ha_state(True)

        self.hass.loop.call_soon_threadsafe(_do_update)

    def _handle_runtime_update(self) -> None:
        self._safe_schedule_update()

    def _handle_daily_refresh(self, _now: datetime) -> None:
        self._safe_schedule_update()


class ProductUsageStatsConsolidatedSensor(SensorEntity):
    """Consolidated product usage sensor for today's total and per-product stats."""

    _attr_has_entity_name = True
    # MEASUREMENT (not TOTAL_INCREASING) — this tracks *today's* count, which
    # resets to 0 each day rather than accumulating indefinitely, so it should
    # be graphed as a snapshot value like a temperature reading, not a running
    # total. Adding this unlocks the same native HA history/long-term-statistics
    # support the basal-temperature sensor got.
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self._entry = entry
        runtime = self.hass.data[DOMAIN][entry.entry_id]
        self._friendly_name = runtime.friendly_name
        self._attr_unique_id = f"{entry.entry_id}_period_products_today"
        # Friendly-name prefix dropped — has_entity_name + device grouping already
        # provides "Anna" as a prefix automatically, so this now shows as
        # "Anna Period products today" instead of the old doubled-up
        # "Anna Anna: Period products today".
        self._attr_name = "Period products today"
        self._attr_suggested_object_id = menstruation_object_ids_for_profile(self._friendly_name)["_period_products_today"]
        self._icon = "mdi:chart-box"
        self._attr_native_unit_of_measurement = "items"
        self._attr_native_value = 0
        self._attrs: dict[str, StateType] = {}

    @property
    def device_info(self) -> DeviceInfo:
        return _device_info_for_entry(self.hass, self._entry)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(self.hass, SIGNAL_HISTORY_UPDATED, self._handle_runtime_update)
        )
        self.async_on_remove(
            async_track_time_change(
                self.hass,
                self._handle_daily_refresh,
                hour=0,
                minute=0,
                second=5,
            )
        )

    async def async_update(self) -> None:
        runtime = self.hass.data[DOMAIN][self._entry.entry_id]
        self._friendly_name = runtime.friendly_name

        stats = _build_product_usage_stats(
            runtime.history,
            runtime.product_usage,
            dt_util.now().date(),
            runtime.symptom_history,
        )
        today = stats["today"]
        this_cycle = stats["this_cycle"]
        averages = stats["stats"]["average_per_cycle"]
        self._attr_native_value = sum(int(today.get(product, 0)) for product in PRODUCT_USAGE_PRODUCTS)
        self._attrs = {
            "profile": runtime.profile,
            "friendly_name": runtime.friendly_name,
            "entry_id": self._entry.entry_id,
            "today": today,
            "this_cycle": this_cycle,
            "average_per_cycle": averages,
            "cycles_considered": stats["stats"]["cycles_considered"],
        }

    @property
    def native_value(self) -> StateType:
        return self._attr_native_value

    @property
    def extra_state_attributes(self) -> dict[str, StateType]:
        return self._attrs

    @property
    def icon(self) -> str | None:
        return self._icon

    @property
    def should_poll(self) -> bool:
        return False

    @property
    def available(self) -> bool:
        return self._entry.entry_id in self.hass.data.get(DOMAIN, {})

    def _safe_schedule_update(self) -> None:
        """Schedule a state refresh on the HA event loop (thread-safe)."""
        if not self.hass:
            return

        def _do_update() -> None:
            if self.hass and self.hass.is_running:
                self.async_schedule_update_ha_state(True)

        self.hass.loop.call_soon_threadsafe(_do_update)

    def _handle_runtime_update(self) -> None:
        self._safe_schedule_update()

    def _handle_daily_refresh(self, _now: datetime) -> None:
        self._safe_schedule_update()


async def _async_save_backfill_flag(runtime: Any) -> None:
    """Minimal local persist of runtime.noncycle_data (used only for the
    one-time basal_temp_stats_backfilled flag). Doesn't need the full
    model-refresh/dispatch behavior that __init__.py's _async_save_and_notify
    does for user-facing edits — this just needs the flag to survive a restart.
    """
    await runtime.storage.async_save(
        runtime.history,
        runtime.period_duration_days,
        runtime.symptom_history,
        runtime.product_usage,
        runtime.pregnancy_data,
        runtime.menarche_data,
        runtime.pre_menarche_data,
        runtime.menopause_data,
        runtime.noncycle_data,
        cycle_length_override=runtime.cycle_length_override,
        onboarding_stage=runtime.onboarding_stage,
    )


class MenstruationBasalTempSensor(SensorEntity):
    """Dedicated basal-temperature sensor.

    Basal temperature previously only existed buried inside the main gauge
    sensor's `symptom_history` attribute — fine for reading a single day's value,
    but it meant no native Home Assistant history/statistics graph, no long-term
    statistics, and no easy Grafana export, since none of that works from an
    attribute list. This sensor exposes the same data as a proper numeric
    measurement entity (device_class=temperature, state_class=measurement) so it
    gets all of that automatically going forward.
    """

    _attr_has_entity_name = True
    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_icon = "mdi:thermometer"

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self._entry = entry
        runtime = self.hass.data[DOMAIN][entry.entry_id]
        self._friendly_name = runtime.friendly_name
        self._attr_unique_id = f"{entry.entry_id}_basal_temp"
        # Friendly-name prefix dropped — see the product-usage sensor's comment
        # for why (device grouping now provides it automatically).
        self._attr_name = "Basal temperature"
        self._attr_suggested_object_id = menstruation_object_ids_for_profile(self._friendly_name)["_basal_temp"]
        self._attr_native_value: float | None = None
        self._attrs: dict[str, StateType] = {}

    @property
    def device_info(self) -> DeviceInfo:
        return _device_info_for_entry(self.hass, self._entry)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(self.hass, SIGNAL_HISTORY_UPDATED, self._handle_runtime_update)
        )
        await self.async_update()
        # One-time backfill of historical basal_temp entries into HA's own
        # long-term statistics, so the new entity's history graph shows the full
        # existing record instead of starting empty from today. Runs after the
        # entity is registered (needs its own entity_id) and only once ever,
        # guarded by a persisted flag — safe to leave enabled permanently since it
        # no-ops on every subsequent load.
        await _async_backfill_basal_temp_statistics(self.hass, self._entry, self.entity_id)

    async def async_update(self) -> None:
        runtime = self.hass.data[DOMAIN][self._entry.entry_id]
        self._friendly_name = runtime.friendly_name

        latest_date: str | None = None
        latest_value: float | None = None
        for entry in runtime.symptom_history or []:
            if not isinstance(entry, dict):
                continue
            raw_temp = entry.get("basal_temp")
            entry_date = entry.get("date")
            if raw_temp in (None, "") or not entry_date:
                continue
            try:
                temp_value = float(raw_temp)
            except (TypeError, ValueError):
                continue
            if latest_date is None or str(entry_date) > latest_date:
                latest_date = str(entry_date)
                latest_value = temp_value

        self._attr_native_value = latest_value
        self._attrs = {
            "profile": runtime.profile,
            "friendly_name": runtime.friendly_name,
            "date": latest_date,
        }

    @property
    def extra_state_attributes(self) -> dict[str, StateType]:
        return self._attrs

    @property
    def should_poll(self) -> bool:
        return False

    @property
    def available(self) -> bool:
        return self._entry.entry_id in self.hass.data.get(DOMAIN, {})

    def _safe_schedule_update(self) -> None:
        if not self.hass:
            return

        def _do_update() -> None:
            if self.hass and self.hass.is_running:
                self.async_schedule_update_ha_state(True)

        self.hass.loop.call_soon_threadsafe(_do_update)

    def _handle_runtime_update(self) -> None:
        self._safe_schedule_update()


async def _async_backfill_basal_temp_statistics(
    hass: HomeAssistant, entry: ConfigEntry, entity_id: str
) -> None:
    """One-time import of historical basal_temp entries into the recorder's
    long-term statistics table, so the new sensor's history graph reflects the
    full existing record instead of only data logged from now on.

    Guarded by a persisted flag in noncycle_data so this only ever runs once per
    config entry, and wrapped defensively since the recorder statistics API has
    shifted across Home Assistant versions — a failure here should never break
    integration setup, just skip the backfill and log a warning.
    """
    runtime = hass.data[DOMAIN][entry.entry_id]
    if runtime.noncycle_data.get("basal_temp_stats_backfilled"):
        return

    try:
        from homeassistant.components.recorder import get_instance
        from homeassistant.components.recorder.models import StatisticData, StatisticMetaData
        from homeassistant.components.recorder.statistics import async_import_statistics
        from homeassistant.components.recorder.db_schema import Statistics
    except ImportError:
        _LOGGER.debug("Recorder component unavailable — skipping basal_temp statistics backfill.")
        return

    points: list[StatisticData] = []
    seen_hours: set[Any] = set()
    for hist_entry in runtime.symptom_history or []:
        if not isinstance(hist_entry, dict):
            continue
        raw_temp = hist_entry.get("basal_temp")
        entry_date = hist_entry.get("date")
        if raw_temp in (None, "") or not entry_date:
            continue
        try:
            temp_value = float(raw_temp)
            day = date.fromisoformat(str(entry_date))
        except (TypeError, ValueError):
            continue
        # Statistics are stored hourly; anchor each day's single reading to local
        # midnight so every day gets exactly one point.
        start = dt_util.start_of_local_day(day)
        if start in seen_hours:
            continue
        seen_hours.add(start)
        points.append(StatisticData(start=start, mean=temp_value, min=temp_value, max=temp_value))

    if not points:
        # Nothing to backfill (no historical basal_temp data yet) — still mark as
        # done so we don't re-scan on every future restart for no reason.
        runtime.noncycle_data["basal_temp_stats_backfilled"] = True
        await _async_save_backfill_flag(runtime)
        return

    points.sort(key=lambda p: p["start"])
    metadata = StatisticMetaData(
        has_mean=True,
        has_sum=False,
        name=f"{runtime.friendly_name}: Basal temperature",
        source="recorder",
        statistic_id=entity_id,
        unit_of_measurement=UnitOfTemperature.CELSIUS,
    )

    try:
        get_instance(hass).async_import_statistics(metadata, points, Statistics)
    except Exception:  # noqa: BLE001 — defensive: never let a recorder API
        # mismatch across HA versions break integration setup.
        try:
            # Some HA versions expose this as a standalone function instead of
            # (or in addition to) the Recorder instance method above.
            async_import_statistics(hass, metadata, points)
        except Exception:
            _LOGGER.warning(
                "Could not backfill basal_temp statistics for %s — the recorder "
                "statistics API may differ on this Home Assistant version. The "
                "sensor itself still works normally; only historical backfill "
                "was skipped.",
                entity_id,
                exc_info=True,
            )
            return

    runtime.noncycle_data["basal_temp_stats_backfilled"] = True
    await _async_save_backfill_flag(runtime)
    _LOGGER.info("Backfilled %d historical basal_temp readings into %s statistics.", len(points), entity_id)
