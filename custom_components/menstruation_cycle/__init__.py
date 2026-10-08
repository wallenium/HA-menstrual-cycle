"""Menstruation gauge integration."""

from __future__ import annotations

import copy
import inspect
import json
import logging
import re
import secrets
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from urllib.parse import parse_qs, urlsplit

import voluptuous as vol

from homeassistant import config_entries as ce
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_TYPE, STATE_UNAVAILABLE, STATE_UNKNOWN, Platform, UnitOfTime
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError

try:
    from homeassistant.core import SupportsResponse
except ImportError:
    SupportsResponse = None  # type: ignore[assignment,misc]
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import label_registry as lr
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_call_later, async_track_state_change_event, async_track_time_change
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util
from homeassistant.util import slugify

from .const import (
    ATTR_HISTORY,
    EVENT_CYCLE_START_LOGGED,
    EVENT_PILL_TAKEN,
    EVENT_PRODUCT_CONSUMED,
    ATTR_PERIOD_DURATION_DAYS,
    ATTR_PRODUCT_USAGE,
    ATTR_SYMPTOM_HISTORY,
    ATTR_VISIBILITY_LEVEL,
    CONF_LINKED_PERSON_ENTITY_ID,
    CONF_BASAL_TEMP_SENSOR_ENTITY_ID,
    STATE_PERIOD,
    STATE_FERTILE,
    STATE_PMS,
    STATE_NEUTRAL,
    STATE_PRIVATE,
    STATE_PREGNANT,
    VISIBILITY_LEVEL_FULL,
    VISIBILITY_LEVEL_PRIVATE,
    CONF_ONBOARDING_STAGE,
    CONF_VISIBILITY_LEVEL,
    CONF_SHOW_CYCLE_DASHBOARD,
    CONF_DASHBOARD_ENABLED,
    CONF_NOTIFICATIONS_ENABLED,
    CONF_NOTIFY_SERVICE,
    CONF_NOTIFY_PERIOD_ENABLED,
    CONF_NOTIFY_PERIOD_LEAD_DAYS,
    CONF_NOTIFY_FERTILE_ENABLED,
    CONF_NOTIFY_FERTILE_LEAD_DAYS,
    CONF_NOTIFY_OVULATION_ENABLED,
    CONF_NOTIFY_LOG_REMINDER_ENABLED,
    CONF_NOTIFY_LOG_REMINDER_TIME,
    CONF_NOTIFY_OVULATION_LEAD_DAYS,
    CONF_NOTIFY_PARTNER_SERVICE,
    CONF_NOTIFY_TIME,
    NOTIFY_LEAD_DAYS_MAX,
    CONF_NFP_ANALYSIS_MODE,
    DEFAULT_NOTIFICATIONS_ENABLED,
    DEFAULT_NOTIFY_PERIOD_ENABLED,
    DEFAULT_NOTIFY_PERIOD_LEAD_DAYS,
    DEFAULT_NOTIFY_FERTILE_ENABLED,
    DEFAULT_NOTIFY_FERTILE_LEAD_DAYS,
    DEFAULT_NOTIFY_OVULATION_ENABLED,
    DEFAULT_NOTIFY_LOG_REMINDER_ENABLED,
    DEFAULT_NOTIFY_LOG_REMINDER_TIME,
    DEFAULT_NOTIFY_OVULATION_LEAD_DAYS,
    DEFAULT_NOTIFY_TIME,
    EVENT_MOBILE_APP_NOTIFICATION_ACTION,
    NOTIFY_ACTION_PERIOD_STARTED_PREFIX,
    NOTIFY_ACTION_PILL_TAKEN_PREFIX,
    NONCYCLE_CONTRACEPTION_RENEWED,
    CONF_NOTIFY_FERTILE_MUTE_HORMONAL,
    CONF_NOTIFY_UNPROTECTED_HINT,
    CONF_NOTIFY_CYCLE_HINT,
    CONF_NOTIFY_TEST_HINT,
    CONF_NOTIFY_LH_HINT,
    CONF_NOTIFY_TEMP_REMINDER,
    SUPPLY_CHECK_LEAD_DAYS,
    SUPPLY_USAGE_GAP_DAYS,
    SUPPLY_USAGE_MAX_PERIODS,
    SUPPLY_USAGE_MIN_PERIODS,
    CONF_NOTIFY_PREGNANCY_UPDATES,
    DEFAULT_NOTIFY_FERTILE_MUTE_HORMONAL,
    DEFAULT_NOTIFY_UNPROTECTED_HINT,
    DEFAULT_NOTIFY_CYCLE_HINT,
    DEFAULT_NOTIFY_TEST_HINT,
    DEFAULT_NOTIFY_LH_HINT,
    DEFAULT_NOTIFY_TEMP_REMINDER,
    TEST_HINT_DAYS_AFTER_OVULATION,
    LH_HINT_LEAD_DAYS,
    LH_HINT_WINDOW_DAYS,
    TEMP_REMINDER_LOOKBACK_DAYS,
    TEMP_REMINDER_MIN_LOGGED_DAYS,
    TEMP_REMINDER_DAYS_AFTER_OVULATION,
    DEFAULT_NOTIFY_PREGNANCY_UPDATES,
    UNPROTECTED_HINT_MAX_DAYS,
    NOTIFY_ACTION_RENEWED_PREFIX,
    CONTRACEPTION_RENEWAL_MONTHS,
    CONTRACEPTION_RHYTHM_EVENTS,
    CONTRACEPTION_RHYTHM_START_EVENTS,
    SERVICE_CONFIRM_CONTRACEPTION_RENEWAL,
    SERVICE_CREATE_PERIODS_FROM_BLEEDING,
    NOTIFY_PILL_FOLLOWUP_HOURS_MAX,
    CONF_PILL_PAUSE_DAYS,
    DEFAULT_PILL_PAUSE_DAYS,
    NOTIFY_ACTION_PILL_SNOOZE_PREFIX,
    NOTIFY_ACTION_LOG_SNOOZE_PREFIX,
    NOTIFY_SNOOZE_SECONDS,
    CONF_NOTIFY_PILL_ENABLED,
    CONF_NOTIFY_PILL_TIME,
    DEFAULT_NOTIFY_PILL_ENABLED,
    DEFAULT_NOTIFY_PILL_TIME,
    CONF_NOTIFY_PILL_FOLLOWUP_HOURS,
    DEFAULT_NOTIFY_PILL_FOLLOWUP_HOURS,
    CONF_NOTIFY_RECAP_ENABLED,
    DEFAULT_NOTIFY_RECAP_ENABLED,
    PILL_REFILL_LEAD_DAYS,
    CONF_NOTIFY_OVERDUE_ENABLED,
    CONF_NOTIFY_CHECKUP_ENABLED,
    CONF_NOTIFY_PILL_GAP_ENABLED,
    DEFAULT_NOTIFY_OVERDUE_ENABLED,
    DEFAULT_NOTIFY_CHECKUP_ENABLED,
    DEFAULT_NOTIFY_PILL_GAP_ENABLED,
    CHECKUP_NOTIFY_LEAD_DAYS,
    NEW_PERIOD_MIN_GAP_DAYS,
    PERIOD_OVERDUE_DAYS,
    PILL_PAUSE_DAYS_MAX,
    CONF_CHECKUP_INTERVAL_MONTHS,
    DEFAULT_CHECKUP_INTERVAL_MONTHS,
    CONTRACEPTION_METHOD_PILL,
    SYMPTOM_CONTRACEPTION_METHOD,
    SYMPTOM_INTERCOURSE,
    DEFAULT_NFP_ANALYSIS_MODE,
    CONF_FRIENDLY_NAME,
    CONF_ICON,
    CONF_NAME,
    CONF_PROFILE,
    DEFAULT_DASHBOARD_ENABLED,
    DEFAULT_NAME,
    DEFAULT_ONBOARDING_STAGE,
    DEFAULT_VISIBILITY_LEVEL,
    DEFAULT_PERIOD_DURATION_DAYS,
    DEFAULT_MENARCHE_AGE_MAX,
    DEFAULT_MENARCHE_AGE_MIN,
    DOMAIN,
    ONBOARDING_STAGES,
    VISIBILITY_LEVELS,
    PRE_MENARCHE_SIGN_OPTIONS,
    SERVICE_ADD_CYCLE_START,
    SERVICE_ADD_PRE_MENARCHE_SIGN,
    SERVICE_FIELD_ACTION,
    SERVICE_ADD_SYMPTOM,
    SERVICE_ERASE_ALL_HISTORY,
    SERVICE_EXPORT_HISTORY,
    SERVICE_FIELD_DATE,
    SERVICE_FIELD_DATES,
    SERVICE_FIELD_ENTRIES,
    SERVICE_FIELD_DAYS,
    SERVICE_FIELD_ENTITY_ID,
    SERVICE_FIELD_ENTRY_ID,
    SERVICE_FIELD_ERASE_ALL,
    SERVICE_FIELD_ESTIMATED_MENARCHE_DATE,
    SERVICE_FIELD_FAMILY_MENARCHE_AGE,
    SERVICE_FIELD_FILENAME,
    SERVICE_FIELD_FORMAT,
    SERVICE_FIELD_IS_PREGNANT,
    SERVICE_FIELD_IS_MENOPAUSE,
    SERVICE_FIELD_MENOPAUSE_START_DATE,
    SERVICE_FIELD_PRODUCT,
    SERVICE_FIELD_PREGNANCY_START_DATE,
    SERVICE_FIELD_PRE_MENARCHE_SIGN,
    SERVICE_FIELD_PROFILE,
    SERVICE_FIELD_QUANTITY,
    SERVICE_FIELD_SYMPTOM_DATA,
    SERVICE_FIELD_TANNER_STAGE,
    SERVICE_FIELD_WARNING_THRESHOLD,
    SERVICE_GET_MENARCHE_INFO,
    SERVICE_GET_SYMPTOM,
    SERVICE_GET_FULL_HISTORY,
    SERVICE_GET_CYCLE_PREDICTIONS,
    SERVICE_COMPARE_CURRENT_CYCLE,
    SERVICE_GET_LAST_CYCLE_SUMMARY,
    SERVICE_GET_HOUSEHOLD_SUMMARY,
    SERVICE_LOG_FIRST_PERIOD,
    SERVICE_LOG_PRODUCT_USAGE,
    SERVICE_REIMPORT_BASAL_TEMP_STATS,
    SERVICE_MANAGE_HOUSEHOLD_INVENTORY,
    SERVICE_FIELD_CRITICAL_THRESHOLD,
    SERVICE_REFRESH_CYCLE_MODEL,
    SERVICE_SEND_TEST_NOTIFICATION,
    SERVICE_FIELD_INVENTORY_ACTION,
    SERVICE_FIELD_MEMBER,
    SERVICE_FIELD_AREA_ID,
    SERVICE_FIELD_ENABLED,
    SERVICE_REMOVE_CYCLE_START,
    SERVICE_REMOVE_PRE_MENARCHE_SIGN,
    SERVICE_REMOVE_SYMPTOM,
    SERVICE_SET_CYCLE_HISTORY,
    SERVICE_SET_MENARCHE_MODE,
    SERVICE_SET_MENOPAUSE_MODE,
    SERVICE_SET_PERIOD_DURATION,
    SERVICE_SET_PREGNANCY_MODE,
    SERVICE_SET_PROFILE_VISIBILITY,
    SERVICE_FIELD_VISIBILITY_LEVEL,
    SERVICE_GET_DASHBOARD_PREFS,
    SERVICE_SAVE_DASHBOARD_PREFS,
    SERVICE_FIELD_PREFS,
    SERVICE_SAVE_TIMER_STATE,
    SERVICE_EXPORT_DOCTOR_REPORT,
    SERVICE_FIELD_DAYS_BACK,
    SERVICE_FIELD_FUTURE_CYCLES,
    SERVICE_FIELD_PATIENT_NAME,
    SERVICE_FIELD_PATIENT_BIRTHDATE,
    SERVICE_FIELD_LANGUAGE,
    DOCTOR_REPORT_LANGUAGES,
    SERVICE_UPDATE_MENARCHE_DATE,
    SERVICE_UPDATE_MENOPAUSE_DATE,
    SERVICE_UPDATE_PREGNANCY_DATE,
    SIGNAL_HISTORY_UPDATED,
    STORAGE_KEY,
    STORAGE_KEY_LEGACY,
    STORAGE_VERSION,
    SYMPTOM_BASAL_TEMP,
    SYMPTOM_CLOTS,
    SYMPTOM_CLOT_SIZE,
    SYMPTOM_MOOD,
    SYMPTOM_MOOD_MAX_LENGTH,
    SYMPTOM_NOTE,
    SYMPTOM_NOTE_MAX_LENGTH,
    SYMPTOM_OPTIONS,
    TANNER_STAGE_1,
    TANNER_STAGE_2,
    TANNER_STAGE_3,
    TANNER_STAGE_4,
    TANNER_STAGE_5,
    ICS_HORIZON_MONTHS_DEFAULT,
    ICS_TOKEN_KEY,
    ICS_TOKEN_CREATED_AT_KEY,
    CONF_TEMPERATURE_UNIT,
    TEMPERATURE_UNIT_FAHRENHEIT,
    DEFAULT_TEMPERATURE_UNIT,
    SERVICE_EXPORT_FULL_BACKUP,
    BACKUP_FORMAT_VERSION,
    SERVICE_IMPORT_FULL_BACKUP,
    SERVICE_REPAIR_STORAGE,
    SERVICE_FIELD_MODE,
    SERVICE_FIELD_CONFIRM,
    IMPORT_FULL_BACKUP_MODES,
    DEFAULT_IMPORT_FULL_BACKUP_MODE,
    SERVICE_IMPORT_CYCLE_HISTORY,
    SERVICE_IMPORT_SYMPTOM_HISTORY,
    SERVICE_FIELD_DATE_FORMAT,
    IMPORT_DATE_FORMATS,
    DEFAULT_IMPORT_DATE_FORMAT,
    CYCLE_LENGTH_OVERRIDE_MIN,
)
from .ical import collect_extra_events, generate_ics
from .model import (
    _count_pain_days,
    build_cycle_model,
    build_cycle_predictions,
    cycle_pattern_signals,
    cycle_wellness_score,
    current_cycle_phase,
    find_implausible_cycle_gaps,
    grouped_cycle_starts,
    normalize_history,
)
from .statistics import (
    compute_contraception_timeline,
    compute_last_cycle_summary,
    compute_statistics,
    generate_doctor_report_html,
)
from .storage import MenstruationStorage

PLATFORMS: list[Platform] = [Platform.SENSOR, Platform.CALENDAR, Platform.TODO, Platform.IMAGE]
MANIFEST_PATH = Path(__file__).with_name("manifest.json")
WWW_DIR = Path(__file__).parent / "www"
ASSETS_DIR = Path(__file__).parent / "assets"
# "buttons" added 15.09.2026: the iOS/macOS app's symptom-entry icon-button
# SVGs (Assets.xcassets/buttons/, same imageset source files, ~70 icons for
# flow/pain/hygiene/mucus/spotting/breast/contraception/cervix/libido/clots/
# smell/intercourse/pregnancy symptoms/test results) - added to this repo's
# assets/buttons/ folder directly by the user, exposed here the same way the
# existing pregnancy/period/state/brands folders already are, for a future
# Lovelace card that logs symptoms with the same icon-chip pickers as the app.
_ALLOWED_ASSET_SUBFOLDERS: frozenset[str] = frozenset({"pregnancy", "period", "state", "brands", "buttons", "avatars"})
# How many days ahead the household timeline forecast is trimmed to.
_TIMELINE_HORIZON_DAYS = 30
_HTTP_ROUTES_REGISTERED_KEY = f"{DOMAIN}_http_routes_registered"
_LOVELACE_RESOURCES_ENSURED_KEY = f"{DOMAIN}_lovelace_resources_ensured"
_LOVELACE_RESOURCES_SCHEDULED_KEY = f"{DOMAIN}_lovelace_resources_scheduled"
_DASHBOARD_PANEL_REGISTERED_KEY = f"{DOMAIN}_dashboard_panel_registered"
_DASHBOARD_PANEL_URL_PATH = "cycle-dashboard"
_DASHBOARD_PANEL_TITLE = "Cycle Dashboard"
_DASHBOARD_PANEL_ICON = "mdi:view-dashboard-outline"

_PROFILE_LABEL_PREFIX = "Cycle: "

# Domain that was used before the rename to menstruation_cycle
OLD_DOMAIN = "menstruation_gauge"


def _load_manifest_version() -> str:
    """Read the integration version from manifest.json for cache busting."""
    try:
        with MANIFEST_PATH.open(encoding="utf-8") as manifest_file:
            version = json.load(manifest_file).get("version")
    except (OSError, TypeError, ValueError):
        return "0.0.0"
    return str(version or "0.0.0")


def _build_card_static_url(filename: str) -> str:
    """Build the HTTP handler path for a card JS file."""
    return f"/{DOMAIN}/{filename}"


def _build_card_resource_url(filename: str) -> str:
    """Build the Lovelace resource URL with version-based cache busting."""
    return f"{_build_card_static_url(filename)}?v={RESOURCE_VERSION}"


RESOURCE_VERSION = _load_manifest_version()
CARD_RESOURCE_TYPE = "module"
EXPORT_DIR_NAME = "menstruation_cycle_exports"
CARD_FILES = [
    "menstruation-i18n.js",
    "menstruation-functions.js",
    "menstruation-gauge-card.js",
    "menstruation-cycle-heatmap-card.js",
    "menstruation-calendar-card.js",
    "menstruation-countdown-timer.js",
    "menstruation-product-inventory-card.js",
    "menstruation-cycle-card-compact.js",
    "menstruation-cycle-compact-status-card.js",
    "menstruation-cycle-history-card-row.js",
    "menstruation-statistics-card.js",
    "menstruation-support-card.js",
    "menstruation-cycle-dashboard-panel.js",
]
LOVELACE_RESOURCES = [
    (
        _build_card_resource_url(filename),
        _build_card_static_url(filename),
        filename,
    )
    for filename in CARD_FILES
]
VALID_PRODUCT_USAGE_PRODUCTS = {"tampon", "pad", "cup", "underwear", "liner"}
VALID_PRODUCT_USAGE_ACTIONS = {"used", "emptied"}
HOUSEHOLD_INVENTORY_STATE_ENTITY_ID = "sensor.household_product_stock"
HOUSEHOLD_INVENTORY_DATA_KEY = f"{DOMAIN}_household_inventory"
HOUSEHOLD_INVENTORY_STORE_KEY = f"{STORAGE_KEY}.household_inventory"
# Wunsch 01.10.2026: dashboard widget/category prefs, synced server-side
# instead of being stuck to one browser's localStorage.
DASHBOARD_PREFS_DATA_KEY = f"{DOMAIN}_dashboard_prefs"
DASHBOARD_PREFS_STORE_KEY = f"{STORAGE_KEY}.dashboard_prefs"
HOUSEHOLD_CONSUMPTION_LOG_LIMIT = 50
HOUSEHOLD_PRODUCTS = ("tampon", "pad", "cup", "liner", "underwear")

# Products that should NOT trigger a shopping list entry (cup is emptied/reused;
# underwear is washed, not purchased).
_SKIP_SHOPPING_PRODUCTS: frozenset[str] = frozenset({"cup", "underwear"})

# Display names used when adding items to the HA shopping list.
_SHOPPING_PRODUCT_NAMES: dict[str, str] = {
    "tampon": "Tampons",
    "pad": "Pads",
    "liner": "Liners",
    "underwear": "Period underwear",
}

_TODO_SHOPPING_LIST_ENTITY = "todo.shopping_list"
_DEFAULT_UNDERWEAR_TOTAL_OWNED = 12
_DEFAULT_UNDERWEAR_WASHING_THRESHOLD = 3
_SERVICE_FIELD_UNDERWEAR_TOTAL_OWNED = "underwear_total_owned"

_LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class MenstruationRuntime:
    """Runtime data for one profile."""

    storage: MenstruationStorage
    profile: str
    friendly_name: str
    icon: str
    history: list[str]
    period_duration_days: int
    symptom_history: list[dict[str, Any]]
    product_usage: list[dict[str, Any]]
    ics_token: str = ""
    pregnancy_data: dict[str, Any] = field(default_factory=lambda: {"is_pregnant": False, "start_date": None})
    menarche_data: dict[str, Any] = field(default_factory=lambda: {"tracking_active": False, "is_menarche": False, "menarche_date": None, "estimated_date": None, "family_menarche_age": None})
    pre_menarche_data: dict[str, Any] = field(default_factory=lambda: {"signs": {}, "tanner_stage": None})
    menopause_data: dict[str, Any] = field(default_factory=lambda: {"is_menopause": False, "start_date": None})
    noncycle_data: dict[str, Any] = field(default_factory=lambda: {
        "has_noncycle": False,
        "doctor_report_exported": False,
        "is_postpartum": False,
        "postpartum_start_date": None,
        "postpartum_duration_days": 42,
        "basal_temp_stats_backfilled": False,
    })
    onboarding_stage: str = DEFAULT_ONBOARDING_STAGE
    # Sichtbarkeitsstufe fuer sensible Attribute (Feature-Wunsch 02.09.2026,
    # "abgestufte Eltern-Sichtbarkeit"), siehe Kommentar an
    # const.py::CONF_VISIBILITY_LEVEL.
    visibility_level: str = DEFAULT_VISIBILITY_LEVEL
    unregister_midnight_listener: Callable[[], None] | None = None
    unregister_notify_listener: Callable[[], None] | None = None
    unregister_log_listener: Callable[[], None] | None = None
    unregister_pill_listener: Callable[[], None] | None = None
    unregister_basal_temp_listener: Callable[[], None] | None = None
    options_update_unsub: Callable[[], None] | None = None
    cycle_length_override: int | None = None
    # HA-Idee 6 (weitere Ideen, 15.09.2026): wann der aktuelle ics_token
    # erzeugt/rotiert wurde, siehe repairs.py::async_check_stale_ics_token.
    ics_token_created_at: str = ""


CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


def _default_household_inventory_data() -> dict[str, Any]:
    inventory = {product: 0 for product in HOUSEHOLD_PRODUCTS}
    inventory["cup"] = 1
    thresholds = {product: {"warning": 10, "critical": 5} for product in HOUSEHOLD_PRODUCTS}
    thresholds["underwear"] = {
        "warning": _DEFAULT_UNDERWEAR_WASHING_THRESHOLD,
        "critical": max(0, _DEFAULT_UNDERWEAR_WASHING_THRESHOLD - 1),
    }
    thresholds["cup"] = {"warning": 0, "critical": 0}
    return {
        "inventory": inventory,
        "thresholds": thresholds,
        "consumption_log": [],
        "last_usage": None,
        "underwear_settings": {
            "total_owned": _DEFAULT_UNDERWEAR_TOTAL_OWNED,
            "washing_threshold": _DEFAULT_UNDERWEAR_WASHING_THRESHOLD,
        },
        # HA-Idee ("weitere neue Ideen", 29.09.2026): optionale Zuordnung von
        # Verbrauchsereignissen zu HA-Areas (Raeumen) - Standard AUS, siehe
        # set_area_tracking-Action und _async_register_consumption.
        "track_by_area": False,
    }


def _normalize_household_inventory_data(data: Any) -> dict[str, Any]:
    defaults = _default_household_inventory_data()
    if not isinstance(data, dict):
        return defaults

    inventory_raw = data.get("inventory", {})
    thresholds_raw = data.get("thresholds", {})
    underwear_settings_raw = data.get("underwear_settings", {})
    inventory: dict[str, int] = {}
    thresholds: dict[str, dict[str, int]] = {}
    default_underwear = defaults["underwear_settings"]
    if isinstance(underwear_settings_raw, dict):
        total_owned_raw = underwear_settings_raw.get("total_owned", default_underwear["total_owned"])
        washing_threshold_raw = underwear_settings_raw.get("washing_threshold", default_underwear["washing_threshold"])
    else:
        total_owned_raw = default_underwear["total_owned"]
        washing_threshold_raw = default_underwear["washing_threshold"]

    try:
        total_owned = max(1, int(total_owned_raw))
    except (TypeError, ValueError):
        total_owned = default_underwear["total_owned"]
    try:
        washing_threshold = max(0, int(washing_threshold_raw))
    except (TypeError, ValueError):
        washing_threshold = default_underwear["washing_threshold"]
    washing_threshold = min(washing_threshold, total_owned)

    for product in HOUSEHOLD_PRODUCTS:
        try:
            quantity = int(inventory_raw.get(product, defaults["inventory"][product])) if isinstance(inventory_raw, dict) else defaults["inventory"][product]
        except (TypeError, ValueError):
            quantity = defaults["inventory"][product]
        normalized_quantity = max(0, quantity)
        if product == "cup":
            normalized_quantity = 1
        elif product == "underwear":
            normalized_quantity = min(normalized_quantity, total_owned)
        inventory[product] = normalized_quantity

        product_thresholds = thresholds_raw.get(product, {}) if isinstance(thresholds_raw, dict) else {}
        try:
            warning = int(product_thresholds.get("warning", defaults["thresholds"][product]["warning"])) if isinstance(product_thresholds, dict) else defaults["thresholds"][product]["warning"]
        except (TypeError, ValueError):
            warning = defaults["thresholds"][product]["warning"]
        try:
            critical = int(product_thresholds.get("critical", defaults["thresholds"][product]["critical"])) if isinstance(product_thresholds, dict) else defaults["thresholds"][product]["critical"]
        except (TypeError, ValueError):
            critical = defaults["thresholds"][product]["critical"]
        if warning < critical:
            warning = critical
        thresholds[product] = {"warning": max(0, warning), "critical": max(0, critical)}

    thresholds["cup"] = {"warning": 0, "critical": 0}
    thresholds["underwear"] = {
        "warning": washing_threshold,
        "critical": max(0, min(washing_threshold, washing_threshold - 1)),
    }

    normalized_log: list[dict[str, Any]] = []
    for entry in data.get("consumption_log", []) if isinstance(data.get("consumption_log"), list) else []:
        if not isinstance(entry, dict):
            continue
        product = str(entry.get("product", "")).strip().lower()
        if product not in HOUSEHOLD_PRODUCTS:
            continue
        try:
            quantity = max(1, int(entry.get("quantity", 1)))
        except (TypeError, ValueError):
            quantity = 1
        timestamp = str(entry.get("timestamp", "")).strip()
        if not timestamp:
            continue
        log_entry = {
            "product": product,
            "quantity": quantity,
            "member": str(entry.get("member", "")).strip() or "unknown",
            "timestamp": timestamp,
            "source": str(entry.get("source", "")).strip() or "manual",
        }
        area_id = str(entry.get("area_id", "")).strip() or None
        if area_id:
            log_entry["area_id"] = area_id
            log_entry["area_name"] = str(entry.get("area_name", "")).strip() or area_id
        normalized_log.append(log_entry)

    last_usage = data.get("last_usage")
    if not isinstance(last_usage, dict):
        last_usage = normalized_log[-1] if normalized_log else None

    return {
        "inventory": inventory,
        "thresholds": thresholds,
        "consumption_log": normalized_log[-HOUSEHOLD_CONSUMPTION_LOG_LIMIT:],
        "last_usage": last_usage,
        "underwear_settings": {
            "total_owned": total_owned,
            "washing_threshold": washing_threshold,
        },
        "track_by_area": bool(data.get("track_by_area", False)),
    }


def _typical_use_per_period(consumption_log: list, product: str, today: date) -> int | None:
    """Typical quantity of a product used per period, from the household consumption log.

    Usage days at most SUPPLY_USAGE_GAP_DAYS apart form one period; a period that is still running is left out, and so
    is the oldest one when the log is full (it may be cut off). Needs SUPPLY_USAGE_MIN_PERIODS finished periods,
    averages the last SUPPLY_USAGE_MAX_PERIODS (rounded up); None otherwise.
    """
    per_day: dict[date, int] = {}
    for item in consumption_log:
        if not isinstance(item, dict) or str(item.get("product", "")).lower() != product:
            continue
        try:
            day = date.fromisoformat(str(item.get("timestamp", ""))[:10])
            per_day[day] = per_day.get(day, 0) + max(1, int(item.get("quantity", 1)))
        except (TypeError, ValueError):
            continue
    periods: list[int] = []
    previous: date | None = None
    for day in sorted(per_day):
        if previous is None or (day - previous).days > SUPPLY_USAGE_GAP_DAYS:
            periods.append(0)
        periods[-1] += per_day[day]
        previous = day
    if previous is not None and (today - previous).days <= SUPPLY_USAGE_GAP_DAYS:
        periods.pop()  # still running
    if len(consumption_log) >= HOUSEHOLD_CONSUMPTION_LOG_LIMIT and periods:
        periods.pop(0)  # the log is full, so its oldest period may be cut off
    periods = periods[-SUPPLY_USAGE_MAX_PERIODS:]
    if len(periods) < SUPPLY_USAGE_MIN_PERIODS:
        return None
    return -(-sum(periods) // len(periods))


def _household_supply_short_details(household_data: dict[str, Any], today: date) -> dict[str, dict[str, int]]:
    """{product: {"stock", "need"}} for purchasable products below their typical need per period."""
    inventory = household_data.get("inventory", {})
    log = household_data.get("consumption_log", [])
    short: dict[str, dict[str, int]] = {}
    for product in HOUSEHOLD_PRODUCTS:
        if product in _SKIP_SHOPPING_PRODUCTS or product not in _SHOPPING_PRODUCT_NAMES:
            continue
        need = _typical_use_per_period(log, product, today)
        stock = max(0, int(inventory.get(product, 0)))
        if need is not None and stock < need:
            short[product] = {"stock": stock, "need": need}
    return short


def _household_supply_shortfalls(household_data: dict[str, Any], today: date) -> list[str]:
    """"Tampons 8/14" (stock/typical need per period) for purchasable products below their typical need."""
    return [
        f"{_SHOPPING_PRODUCT_NAMES[product]} {detail['stock']}/{detail['need']}"
        for product, detail in _household_supply_short_details(household_data, today).items()
    ]


def _household_period_upcoming(hass: HomeAssistant, today: date) -> bool:
    """True if a (not private) profile's next period is predicted within SUPPLY_CHECK_LEAD_DAYS."""
    for runtime in hass.data.get(DOMAIN, {}).values():
        if not isinstance(runtime, MenstruationRuntime) or runtime.visibility_level == VISIBILITY_LEVEL_PRIVATE:
            continue
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
            nfp_mode=DEFAULT_NFP_ANALYSIS_MODE,
            onboarding_stage=getattr(runtime, "onboarding_stage", None),
        )
        days = model.days_until_next_start
        if days is not None and 0 <= days <= SUPPLY_CHECK_LEAD_DAYS:
            return True
    return False


def _async_check_household_supply(hass: HomeAssistant, household_data: dict[str, Any]) -> None:
    """Raise (or clear) the "supplies may not last the next period" issue; cheap and idempotent."""
    from .repairs import async_check_household_supply_short

    today = dt_util.now().date()
    items = _household_supply_shortfalls(household_data, today) if _household_period_upcoming(hass, today) else []
    async_check_household_supply_short(hass, items)


def _household_members(hass: HomeAssistant) -> list[dict[str, str]]:
    members: list[dict[str, str]] = []
    for runtime in hass.data.get(DOMAIN, {}).values():
        if not isinstance(runtime, MenstruationRuntime):
            continue
        members.append({"profile": runtime.profile, "name": runtime.friendly_name})
    members.sort(key=lambda item: item["name"].lower())
    return members


def _underwear_settings(household_data: dict[str, Any]) -> dict[str, int]:
    defaults = _default_household_inventory_data()["underwear_settings"]
    raw = household_data.get("underwear_settings", {})
    if not isinstance(raw, dict):
        raw = {}
    try:
        total_owned = max(1, int(raw.get("total_owned", defaults["total_owned"])))
    except (TypeError, ValueError):
        total_owned = defaults["total_owned"]
    try:
        washing_threshold = max(0, int(raw.get("washing_threshold", defaults["washing_threshold"])))
    except (TypeError, ValueError):
        washing_threshold = defaults["washing_threshold"]
    washing_threshold = min(washing_threshold, total_owned)
    return {"total_owned": total_owned, "washing_threshold": washing_threshold}


def _underwear_available(household_data: dict[str, Any]) -> int:
    settings = _underwear_settings(household_data)
    in_use = max(0, int((household_data.get("inventory") or {}).get("underwear", 0)))
    return max(0, settings["total_owned"] - min(in_use, settings["total_owned"]))


_RESTOCK_FORECAST_PRODUCTS: tuple[str, ...] = tuple(_SHOPPING_PRODUCT_NAMES.keys())


def _average_daily_usage_from_log(consumption_log: list, product: str) -> float:
    """Average daily usage of one product from the consumption log.

    Direct Python port of the card's own JS _averageDailyUsageFromLog
    (www/menstruation-product-inventory-card.js) - kept byte-for-byte
    equivalent so the backend forecast (idea 4, "weitere neue Ideen",
    29.09.2026) agrees with what the card has shown for underwear all along.
    ponytail: a single-day log overstates the daily rate (span floors to 1
    day) - same known ceiling the JS version already accepted, no fix here.
    """
    entries = [e for e in consumption_log if isinstance(e, dict) and str(e.get("product", "")).lower() == product]
    if not entries:
        return 0.0
    dates = sorted(
        d for d in (str(e.get("timestamp", "")).strip()[:10] for e in entries) if re.match(r"^\d{4}-\d{2}-\d{2}$", d)
    )
    if not dates:
        return 0.0
    total_quantity = sum(max(1, int(e.get("quantity", 1))) for e in entries)
    start = date.fromisoformat(dates[0])
    end = date.fromisoformat(dates[-1])
    days_span = max(1, (end - start).days + 1)
    return total_quantity / days_span


def _household_restock_forecast(household_data: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """"Reicht noch fuer ca. N Tage"-Schaetzung pro Haushaltsprodukt (idea 4,
    "weitere neue Ideen", 29.09.2026) - generalizes the card's underwear-only
    _averageDailyUsageFromLog to every purchasable product (never cup, which
    is emptied/reused rather than stocked). Underwear uses the number
    currently AVAILABLE (clean, unworn) as its "stock", matching the card's
    own washing-recommendation math - not the in-use count.
    """
    consumption_log = household_data.get("consumption_log", [])
    inventory = household_data.get("inventory", {})
    forecast: dict[str, dict[str, Any]] = {}
    for product in _RESTOCK_FORECAST_PRODUCTS:
        stock = _underwear_available(household_data) if product == "underwear" else max(0, int(inventory.get(product, 0)))
        daily_usage = _average_daily_usage_from_log(consumption_log, product)
        days_remaining = round(stock / daily_usage, 1) if daily_usage > 0 else None
        forecast[product] = {"daily_usage": round(daily_usage, 2), "days_remaining": days_remaining}
    return forecast



async def _async_update_household_inventory_state(hass: HomeAssistant) -> None:
    household_data = hass.data.get(HOUSEHOLD_INVENTORY_DATA_KEY)
    if not isinstance(household_data, dict):
        return

    inventory = household_data.get("inventory", {})
    thresholds = household_data.get("thresholds", {})
    underwear_settings = _underwear_settings(household_data)
    underwear_in_use = max(0, min(int(inventory.get("underwear", 0)), underwear_settings["total_owned"]))
    inventory["underwear"] = underwear_in_use
    inventory["cup"] = 1
    total_stock = sum(max(0, int(inventory.get(product, 0))) for product in HOUSEHOLD_PRODUCTS)
    today = dt_util.now().date()
    supply_short = _household_supply_short_details(household_data, today) if _household_period_upcoming(hass, today) else {}

    hass.states.async_set(
        HOUSEHOLD_INVENTORY_STATE_ENTITY_ID,
        total_stock,
        {
            "friendly_name": "Household Product Stock",
            "inventory": {product: max(0, int(inventory.get(product, 0))) for product in HOUSEHOLD_PRODUCTS},
            "thresholds": {
                product: {
                    "warning": max(0, int((thresholds.get(product) or {}).get("warning", 10))),
                    "critical": max(0, int((thresholds.get(product) or {}).get("critical", 5))),
                }
                for product in HOUSEHOLD_PRODUCTS
            },
            "consumption_log": list(household_data.get("consumption_log", []))[-HOUSEHOLD_CONSUMPTION_LOG_LIMIT:],
            "last_usage": household_data.get("last_usage"),
            "household_members": _household_members(hass),
            "underwear_total_owned": underwear_settings["total_owned"],
            "underwear_washing_threshold": underwear_settings["washing_threshold"],
            "underwear_available": max(0, underwear_settings["total_owned"] - underwear_in_use),
            # HA-Idee ("weitere neue Ideen", 29.09.2026): optionales Area-Tracking.
            "track_by_area": bool(household_data.get("track_by_area", False)),
            "area_usage": _household_area_usage_breakdown(household_data.get("consumption_log", [])),
            # Makes this sensor visible to the logbook "continuous domain" filter, suppressing its raw state-change entries in favor of logbook.py's description.
            "unit_of_measurement": "pcs",
            "restock_forecast": _household_restock_forecast(household_data),
            # Only filled while a period is near; the same rule as the "supplies may not last" repair issue.
            "supply_short": supply_short,
        },
    )


def _household_area_usage_breakdown(consumption_log: list) -> dict[str, dict[str, Any]]:
    """Aggregate consumption_log entries by area (HA-Idee, "weitere neue
    Ideen", 29.09.2026) - e.g. "how much got used in the upstairs vs.
    downstairs bathroom" for restocking each room's own stash.

    Derived on the fly from the (already-capped) consumption_log rather than
    a separate persisted per-area stock structure - stock itself stays one
    shared household pool (see _async_register_consumption's comment); only
    WHERE items get used is optionally tracked. Entries without an area_id
    (the vast majority when track_by_area is off, or simply not tagged) are
    skipped, so this is an empty dict whenever nothing has been tagged yet.
    """
    breakdown: dict[str, dict[str, Any]] = {}
    for entry in consumption_log:
        if not isinstance(entry, dict):
            continue
        area_id = entry.get("area_id")
        if not area_id:
            continue
        bucket = breakdown.setdefault(area_id, {"area_name": entry.get("area_name") or area_id, "total": 0})
        bucket["total"] += max(1, int(entry.get("quantity", 1)))
    return breakdown


async def _async_save_household_inventory(hass: HomeAssistant) -> None:
    household_data = hass.data.get(HOUSEHOLD_INVENTORY_DATA_KEY)
    if not isinstance(household_data, dict):
        return

    store = Store(hass, STORAGE_VERSION, HOUSEHOLD_INVENTORY_STORE_KEY)
    await store.async_save(household_data)
    await _async_update_household_inventory_state(hass)


async def _async_ensure_household_inventory_loaded(hass: HomeAssistant) -> None:
    if HOUSEHOLD_INVENTORY_DATA_KEY in hass.data:
        await _async_update_household_inventory_state(hass)
        return

    store = Store(hass, STORAGE_VERSION, HOUSEHOLD_INVENTORY_STORE_KEY)
    loaded = await store.async_load()
    hass.data[HOUSEHOLD_INVENTORY_DATA_KEY] = _normalize_household_inventory_data(loaded)
    await _async_update_household_inventory_state(hass)


async def _async_ensure_dashboard_prefs_loaded(hass: HomeAssistant) -> dict[str, Any]:
    """Lazily loads the {"<user_id>:<profile>": {...prefs}} map backing
    get/save_dashboard_prefs below, mirroring the household inventory
    load-on-first-use pattern above.
    """
    data = hass.data.get(DASHBOARD_PREFS_DATA_KEY)
    if isinstance(data, dict):
        return data
    store = Store(hass, STORAGE_VERSION, DASHBOARD_PREFS_STORE_KEY)
    loaded = await store.async_load()
    data = loaded if isinstance(loaded, dict) else {}
    hass.data[DASHBOARD_PREFS_DATA_KEY] = data
    return data


def _dashboard_prefs_key(call: ServiceCall, profile: str) -> str:
    # ponytail: no auth/merge beyond this - last writer for a given
    # user+profile wins, same as the localStorage cache it replaces.
    user_id = call.context.user_id or "anon"
    return f"{user_id}:{profile}"


async def _async_handle_get_dashboard_prefs(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    data = await _async_ensure_dashboard_prefs_loaded(hass)
    profile = str(call.data.get(SERVICE_FIELD_PROFILE) or "default").strip() or "default"
    return {"prefs": data.get(_dashboard_prefs_key(call, profile))}


async def _async_handle_save_dashboard_prefs(hass: HomeAssistant, call: ServiceCall) -> None:
    prefs = call.data.get(SERVICE_FIELD_PREFS)
    if not isinstance(prefs, dict):
        return
    data = await _async_ensure_dashboard_prefs_loaded(hass)
    profile = str(call.data.get(SERVICE_FIELD_PROFILE) or "default").strip() or "default"
    data[_dashboard_prefs_key(call, profile)] = prefs
    store = Store(hass, STORAGE_VERSION, DASHBOARD_PREFS_STORE_KEY)
    await store.async_save(data)


async def _async_register_consumption(
    hass: HomeAssistant,
    product: str,
    quantity: int,
    member: str,
    *,
    source: str,
    area_id: str | None = None,
) -> None:
    household_data = hass.data.get(HOUSEHOLD_INVENTORY_DATA_KEY)
    if not isinstance(household_data, dict):
        await _async_ensure_household_inventory_loaded(hass)
        household_data = hass.data.get(HOUSEHOLD_INVENTORY_DATA_KEY)
    if not isinstance(household_data, dict):
        return

    inventory = household_data.setdefault("inventory", {})
    current = max(0, int(inventory.get(product, 0)))
    qty = max(1, int(quantity))
    if product == "cup":
        inventory[product] = 1
    elif product == "underwear":
        total_owned = _underwear_settings(household_data)["total_owned"]
        inventory[product] = min(total_owned, current + qty)
    else:
        inventory[product] = max(0, current - qty)

    entry = {
        "product": product,
        "quantity": qty,
        "member": member.strip() or "unknown",
        "timestamp": dt_util.now().isoformat(),
        "source": source,
    }
    # HA-Idee ("weitere neue Ideen", 29.09.2026): Area nur anhaengen, wenn
    # track_by_area aktiv ist UND ein gueltiger HA-Area-id uebergeben wurde -
    # bewusst tolerant (ungueltige/fehlende Area wird nur ignoriert, nie ein
    # Fehler), da area_id reine Zusatzinfo fuer die Verbrauchsstatistik ist,
    # nicht Teil des eigentlichen Lager-Datenmodells (das bleibt ein
    # gemeinsamer Topf, siehe Roadmap-Begruendung).
    if area_id and household_data.get("track_by_area"):
        from homeassistant.helpers import area_registry as ar

        area = ar.async_get(hass).async_get_area(area_id)
        if area is not None:
            entry["area_id"] = area_id
            entry["area_name"] = area.name

    # Fired for every consumption, from either service path; described in logbook.py.
    hass.bus.async_fire(EVENT_PRODUCT_CONSUMED, dict(entry))
    household_data["last_usage"] = entry
    log = household_data.setdefault("consumption_log", [])
    if isinstance(log, list):
        log.append(entry)
        household_data["consumption_log"] = log[-HOUSEHOLD_CONSUMPTION_LOG_LIMIT:]

    await _async_save_household_inventory(hass)

    # HA-6 (M-Cycle_HA-Component-Roadmap.md): this used to only run for the
    # rarely-used manage_household_inventory service's "consume" action - the
    # much more common everyday path, log_product_usage (called by the
    # product-inventory card's timer buttons), funnels through this same
    # function but never triggered the shopping-list sync. Moving the checks
    # here means ANY consumption path keeps the native HA shopping list
    # (todo.shopping_list) in sync, not just the rarely-called service.
    await _async_check_and_update_todo_list(hass, household_data, product)
    if product == "underwear":
        await _async_check_underwear_washing_todo(hass, household_data)
    from .repairs import async_check_household_inventory_critical

    async_check_household_inventory_critical(hass, _household_inventory_critical_products(household_data))
    _async_check_household_supply(hass, household_data)


def _apply_optional_thresholds(
    household_data: dict,
    product: str,
    warning: int | None,
    critical: int | None,
) -> None:
    """Persist threshold values supplied by the card config, if any."""
    if product == "cup":
        return
    if warning is None and critical is None:
        return
    stored = household_data.setdefault("thresholds", {}).setdefault(
        product, {"warning": 10, "critical": 5}
    )
    if warning is not None:
        stored["warning"] = max(0, int(warning))
    if critical is not None:
        stored["critical"] = max(0, int(critical))
    if product == "underwear":
        settings = _underwear_settings(household_data)
        settings["washing_threshold"] = min(settings["total_owned"], max(0, int(stored.get("warning", settings["washing_threshold"]))))
        household_data["underwear_settings"] = settings


async def _async_check_and_update_todo_list(hass: HomeAssistant, household_data: dict, product: str) -> None:
    """Add a product to the HA shopping list when its stock reaches the warning threshold.

    Cup and underwear are intentionally excluded: cups are reusable (only emptied)
    and underwear needs washing rather than purchasing.
    """
    if product in _SKIP_SHOPPING_PRODUCTS:
        return

    if product not in _SHOPPING_PRODUCT_NAMES:
        return
    display_name = _todo_strings(hass.config.language)["products"][product]

    inventory = household_data.get("inventory", {})
    quantity = max(0, int(inventory.get(product, 0)))
    thresholds = household_data.get("thresholds", {})
    threshold = thresholds.get(product, {})
    warning = max(0, int(threshold.get("warning", 10) if isinstance(threshold, dict) else 10))

    if quantity > warning:
        return

    added = await _async_add_todo_item_if_missing(
        hass, display_name, same_as=_todo_variants(lambda t: t["products"][product])
    )
    if added:
        _LOGGER.info(
            "Added '%s' to shopping list (stock: %d, warning threshold: %d).",
            display_name, quantity, warning,
        )


def _household_inventory_critical_products(household_data: dict[str, Any]) -> list[str]:
    """Return display names of purchasable products at/below their CRITICAL
    threshold (HA-Idee 2, "weitere Ideen?", 27.09.2026).

    Mirrors _async_check_and_update_todo_list's exclusions (cup is reusable,
    underwear is washed rather than bought - see _SKIP_SHOPPING_PRODUCTS)
    since "critical" only makes sense for the same purchasable products that
    already get a shopping-list entry at the warning threshold.
    """
    inventory = household_data.get("inventory", {})
    thresholds = household_data.get("thresholds", {})
    critical_products: list[str] = []
    for product in HOUSEHOLD_PRODUCTS:
        if product in _SKIP_SHOPPING_PRODUCTS:
            continue
        display_name = _SHOPPING_PRODUCT_NAMES.get(product)
        if not display_name:
            continue
        quantity = max(0, int(inventory.get(product, 0)))
        threshold = thresholds.get(product, {})
        critical = max(0, int(threshold.get("critical", 5) if isinstance(threshold, dict) else 5))
        if quantity <= critical:
            critical_products.append(display_name)
    return critical_products


# Texts of the shopping-list items this integration adds, per Home Assistant language (English fallback).
# Method names for texts the backend writes itself (same wording as the panel's opt_<method> strings).
_METHOD_NAMES: dict[str, dict[str, str]] = {
    "en": {
        "none": "None",
        "pill": "Pill",
        "hormonal_iud": "Hormonal IUD",
        "copper_iud": "Copper IUD",
        "implant": "Implant",
        "patch": "Patch",
        "ring": "Ring",
        "injection": "Injection",
        "condom": "Condom",
        "diaphragm": "Diaphragm",
        "other": "Other",
    },
    "de": {
        "none": "Keine",
        "pill": "Pille",
        "hormonal_iud": "Hormonspirale",
        "copper_iud": "Kupferspirale",
        "implant": "Implantat",
        "patch": "Verhütungspflaster",
        "ring": "Vaginalring",
        "injection": "Dreimonatsspritze",
        "condom": "Kondom",
        "diaphragm": "Diaphragma",
        "other": "Sonstiges",
    },
    "es": {
        "none": "Ninguno",
        "pill": "Píldora",
        "hormonal_iud": "DIU hormonal",
        "copper_iud": "DIU de cobre",
        "implant": "Implante",
        "patch": "Parche anticonceptivo",
        "ring": "Anillo vaginal",
        "injection": "Inyección trimestral",
        "condom": "Preservativo",
        "diaphragm": "Diafragma",
        "other": "Otro",
    },
    "fr": {
        "none": "Aucun",
        "pill": "Pilule",
        "hormonal_iud": "Stérilet hormonal",
        "copper_iud": "Stérilet en cuivre",
        "implant": "Implant",
        "patch": "Patch contraceptif",
        "ring": "Anneau vaginal",
        "injection": "Injection trimestrielle",
        "condom": "Préservatif",
        "diaphragm": "Diaphragme",
        "other": "Autre",
    },
    "sv": {
        "none": "Inga",
        "pill": "P-piller",
        "hormonal_iud": "Hormonspiral",
        "copper_iud": "Kopparspiral",
        "implant": "Implantat",
        "patch": "Preventivplåster",
        "ring": "Vaginalring",
        "injection": "P-spruta",
        "condom": "Kondom",
        "diaphragm": "Pessar",
        "other": "Annat",
    },
}


_TODO_STRINGS: dict[str, dict[str, Any]] = {
    "en": {
        "methods": _METHOD_NAMES["en"],
        "products": {"tampon": "Tampons", "pad": "Pads", "liner": "Liners", "underwear": "Period underwear"},
        "underwear_wash": "Underwear washing needed",
        "contraception_prefix": "{name}: contraception method ({method})",
        "contraception_renewal": "{prefix} may need renewal soon ({date})",
        "pill_refill": "{name}: order a new pill pack (current one ends {date})",
    },
    "de": {
        "methods": _METHOD_NAMES["de"],
        "products": {"tampon": "Tampons", "pad": "Binden", "liner": "Slipeinlagen", "underwear": "Periodenunterwäsche"},
        "underwear_wash": "Unterwäsche muss gewaschen werden",
        "contraception_prefix": "{name}: Verhütungsmethode ({method})",
        "contraception_renewal": "{prefix} muss bald erneuert werden ({date})",
        "pill_refill": "{name}: neue Pillenpackung bestellen (aktuelle endet am {date})",
    },
    "es": {
        "methods": _METHOD_NAMES["es"],
        "products": {"tampon": "Tampones", "pad": "Compresas", "liner": "Protectores diarios", "underwear": "Ropa interior menstrual"},
        "underwear_wash": "Hay que lavar la ropa interior",
        "contraception_prefix": "{name}: método anticonceptivo ({method})",
        "contraception_renewal": "{prefix} puede necesitar renovación pronto ({date})",
        "pill_refill": "{name}: pedir un nuevo envase de píldoras (el actual termina el {date})",
    },
    "fr": {
        "methods": _METHOD_NAMES["fr"],
        "products": {"tampon": "Tampons", "pad": "Serviettes", "liner": "Protège-slips", "underwear": "Culottes menstruelles"},
        "underwear_wash": "Culottes à laver",
        "contraception_prefix": "{name} : méthode contraceptive ({method})",
        "contraception_renewal": "{prefix} : renouvellement à prévoir bientôt ({date})",
        "pill_refill": "{name} : commander une nouvelle plaquette de pilules (l'actuelle se termine le {date})",
    },
    "sv": {
        "methods": _METHOD_NAMES["sv"],
        "products": {"tampon": "Tamponger", "pad": "Bindor", "liner": "Trosskydd", "underwear": "Mensunderkläder"},
        "underwear_wash": "Underkläder behöver tvättas",
        "contraception_prefix": "{name}: preventivmetod ({method})",
        "contraception_renewal": "{prefix} kan snart behöva förnyas ({date})",
        "pill_refill": "{name}: beställ ny p-pillerförpackning (nuvarande tar slut {date})",
    },
}


def _todo_strings(lang: str | None) -> dict[str, Any]:
    return _TODO_STRINGS.get(str(lang or "en").strip().lower()[:2], _TODO_STRINGS["en"])


def _todo_variants(make: Callable[[dict[str, Any]], str]) -> list[str]:
    """The same item text in every language, so a duplicate is found after a language change."""
    return list(dict.fromkeys(make(strings) for strings in _TODO_STRINGS.values()))



async def _async_add_todo_item_if_missing(
    hass: HomeAssistant,
    item: str,
    *,
    duplicate_contains: Iterable[str] | str | None = None,
    same_as: Iterable[str] = (),
) -> bool:
    """Add an item to todo.shopping_list unless an equivalent item already exists.

    same_as: other spellings of the item (other languages) that count as an exact duplicate;
    duplicate_contains: texts that count as a duplicate when part of an existing item.
    """
    normalized_item = item.strip().lower()
    if not normalized_item:
        return False

    same = {normalized_item, *(text.strip().lower() for text in same_as)}
    contains = [duplicate_contains] if isinstance(duplicate_contains, str) else list(duplicate_contains or [])
    contains = [text.strip().lower() for text in contains if text.strip()]
    # Check for duplicate entry before adding.
    already_listed = False
    try:
        response = await hass.services.async_call(
            "todo",
            "get_items",
            {"entity_id": _TODO_SHOPPING_LIST_ENTITY},
            blocking=True,
            return_response=True,
        )
        if isinstance(response, dict):
            items = response.get(_TODO_SHOPPING_LIST_ENTITY, {}).get("items", [])
            for todo_item in (items if isinstance(items, list) else []):
                summary = str(todo_item.get("summary", "")).strip().lower()
                if summary in same or any(text in summary for text in contains):
                    already_listed = True
                    break
    except Exception as ex:  # noqa: BLE001
        _LOGGER.debug("Could not read shopping list to check for duplicates: %s", ex)

    if already_listed:
        _LOGGER.debug("'%s' is already on the shopping list; skipping.", item)
        return False

    try:
        await hass.services.async_call(
            "todo",
            "add_item",
            {"entity_id": _TODO_SHOPPING_LIST_ENTITY, "item": item},
            blocking=True,
        )
        return True
    except Exception as ex:  # noqa: BLE001
        _LOGGER.warning("Could not add '%s' to shopping list: %s", item, ex)
        return False


async def _async_check_underwear_washing_todo(hass: HomeAssistant, household_data: dict[str, Any]) -> None:
    settings = _underwear_settings(household_data)
    if _underwear_available(household_data) > settings["washing_threshold"]:
        return
    await _async_add_todo_item_if_missing(
        hass,
        _todo_strings(hass.config.language)["underwear_wash"],
        same_as=_todo_variants(lambda t: t["underwear_wash"]),
    )


# Small, self-contained translation table for the two notification types,
# matching the pattern used in ical.py for the same reason: these are sent to
# the person directly, so they're worth localizing properly (see _TODO_STRINGS for list items).
_NOTIFY_STRINGS: dict[str, dict[str, str]] = {
    "en": {
        "period_title": "Period reminder",
        "period_message": "{name}: period is predicted to start on {date}.",
        "fertile_title": "Fertile window reminder",
        "fertile_message": "{name}: the fertile window starts on {date}.",
        "ovulation_title": "Ovulation reminder",
        "ovulation_message": "{name}: ovulation is estimated for {date}.",
        "action_period_started": "Period started",
        "log_title": "Log reminder",
        "log_message": "{name}: nothing logged for today yet.",
        "pill_title": "Pill reminder",
        "pill_message": "{name}: time to take the pill.",
        "action_pill_taken": "Pill taken",
        "action_snooze": "Remind me in 1 hour",
        "rhythm_title": "Patch/ring reminder",
        "rhythm_patch_change": "{name}: today is a patch change day (usual 28-day rhythm; your leaflet is authoritative).",
        "rhythm_patch_remove": "{name}: the patch-free week starts today (usual 28-day rhythm; your leaflet is authoritative).",
        "rhythm_patch_new": "{name}: the patch-free week ends today, a new patch is due (usual 28-day rhythm; your leaflet is authoritative).",
        "rhythm_ring_remove": "{name}: the ring comes out today, the ring-free week starts (usual 28-day rhythm; your leaflet is authoritative).",
        "rhythm_ring_insert": "{name}: the ring-free week ends today, a new ring is due (usual 28-day rhythm; your leaflet is authoritative).",
        "action_renewed": "Started today",
        "unprotected_title": "Unprotected intercourse logged",
        "unprotected_message": "{name}: unprotected intercourse was logged. If a pregnancy is not wanted, a pharmacy or doctor can advise on emergency contraception right away - the sooner, the better.",
        "pregnancy_title": "Pregnancy",
        "pregnancy_week_message": "{name}: week {week} of the pregnancy. Calculated due date: {date}.",
        "pregnancy_trimester_message": "{name}: trimester {trimester} begins (week {week}). Calculated due date: {date}.",
        "recap_title": "Cycle recap",
        "recap_message": "{name}: cycle finished - {cycle_days} days long, period lasted {period_days} days.",
        "recap_longer": "That is {days} days longer than the average ({average} days).",
        "recap_shorter": "That is {days} days shorter than the average ({average} days).",
        "recap_in_line": "In line with the average ({average} days).",
        "recap_pain": "Pain days: {pain_days}.",
        "cyclehint_title": "Cycle length",
        "cyclehint_short": "{name}: the last 3 cycles were each shorter than {limit} days ({lengths} days). This is not a diagnosis; you could mention it at your next check-up.",
        "cyclehint_long": "{name}: the last 3 cycles were each longer than {limit} days ({lengths} days). This is not a diagnosis; you could mention it at your next check-up.",
        "cyclehint_longer": "{name}: the last cycle was {days} days longer than your previous average ({average} days). Single deviations are common; if it keeps happening you could mention it at your next check-up.",
        "cyclehint_shorter": "{name}: the last cycle was {days} days shorter than your previous average ({average} days). Single deviations are common; if it keeps happening you could mention it at your next check-up.",
        "testhint_title": "Pregnancy test",
        "testhint_message": "{name}: it is {days} days since the confirmed ovulation ({date}). A pregnancy test is meaningful from about now. This is only a rule of thumb, not medical advice.",
        "lhhint_title": "Ovulation tests",
        "lhhint_message": "{name}: ovulation is expected in about {days} days ({date}). If you use ovulation (LH) tests, now is a good time to start testing. This is only a rule of thumb, not medical advice.",
        "tempreminder_title": "Basal temperature",
        "tempreminder_message": "{name}: the fertile window is near (ovulation expected around {date}). Please measure and log your basal body temperature today.",
        "overdue_title": "Period overdue",
        "overdue_message": "{name}: the period is {days} days past the predicted start ({date}). If it has started, please log it.",
        "checkup_title": "Checkup reminder",
        "checkup_message": "{name}: the next checkup is due on {date}. A good time to book an appointment.",
        "pill_gap_message": "{name}: the last logged pill was {days} days ago. If pills were missed, protection may be reduced - see your pill's leaflet or ask a pharmacist. If you only forgot to log it, please add it now.",
        "test_title": "Test notification",
        "test_message": "{name}: this is a test notification. Reminders will arrive here.",
        "badge_title": "New badge unlocked",
        "badge_message": "{name} unlocked the \"{badge}\" badge.",
    },
    "de": {
        "period_title": "Perioden-Erinnerung",
        "period_message": "{name}: Die Periode wird voraussichtlich am {date} beginnen.",
        "fertile_title": "Erinnerung: fruchtbares Fenster",
        "fertile_message": "{name}: Das fruchtbare Fenster beginnt am {date}.",
        "ovulation_title": "Erinnerung: Eisprung",
        "ovulation_message": "{name}: Der Eisprung wird für den {date} geschätzt.",
        "action_period_started": "Periode hat begonnen",
        "log_title": "Eintrags-Erinnerung",
        "log_message": "{name}: Für heute ist noch nichts eingetragen.",
        "pill_title": "Pillen-Erinnerung",
        "pill_message": "{name}: Zeit für die Pille.",
        "action_pill_taken": "Pille genommen",
        "action_snooze": "In 1 Stunde erinnern",
        "rhythm_title": "Pflaster-/Ring-Erinnerung",
        "rhythm_patch_change": "{name}: heute ist Pflasterwechsel (üblicher 28-Tage-Rhythmus; maßgeblich ist der Beipackzettel).",
        "rhythm_patch_remove": "{name}: heute beginnt die pflasterfreie Woche (üblicher 28-Tage-Rhythmus; maßgeblich ist der Beipackzettel).",
        "rhythm_patch_new": "{name}: die pflasterfreie Woche endet heute, ein neues Pflaster ist fällig (üblicher 28-Tage-Rhythmus; maßgeblich ist der Beipackzettel).",
        "rhythm_ring_remove": "{name}: heute kommt der Ring raus, die ringfreie Woche beginnt (üblicher 28-Tage-Rhythmus; maßgeblich ist der Beipackzettel).",
        "rhythm_ring_insert": "{name}: die ringfreie Woche endet heute, ein neuer Ring ist fällig (üblicher 28-Tage-Rhythmus; maßgeblich ist der Beipackzettel).",
        "action_renewed": "Heute neu begonnen",
        "unprotected_title": "Ungeschützter Verkehr eingetragen",
        "unprotected_message": "{name}: Es wurde ungeschützter Verkehr eingetragen. Wenn keine Schwangerschaft gewünscht ist, können Apotheke oder Arztpraxis sofort zur Notfallverhütung beraten - je früher, desto besser.",
        "pregnancy_title": "Schwangerschaft",
        "pregnancy_week_message": "{name}: Schwangerschaftswoche {week}. Berechneter Entbindungstermin: {date}.",
        "pregnancy_trimester_message": "{name}: das {trimester}. Trimester beginnt (Woche {week}). Berechneter Entbindungstermin: {date}.",
        "recap_title": "Zyklus-Rückblick",
        "recap_message": "{name}: Zyklus abgeschlossen - {cycle_days} Tage lang, die Periode dauerte {period_days} Tage.",
        "recap_longer": "Das sind {days} Tage mehr als der Durchschnitt ({average} Tage).",
        "recap_shorter": "Das sind {days} Tage weniger als der Durchschnitt ({average} Tage).",
        "recap_in_line": "Entspricht dem Durchschnitt ({average} Tage).",
        "recap_pain": "Schmerztage: {pain_days}.",
        "cyclehint_title": "Zykluslänge",
        "cyclehint_short": "{name}: Die letzten 3 Zyklen waren jeweils kürzer als {limit} Tage ({lengths} Tage). Das ist keine Diagnose; du kannst es beim nächsten Vorsorgetermin erwähnen.",
        "cyclehint_long": "{name}: Die letzten 3 Zyklen waren jeweils länger als {limit} Tage ({lengths} Tage). Das ist keine Diagnose; du kannst es beim nächsten Vorsorgetermin erwähnen.",
        "cyclehint_longer": "{name}: Der letzte Zyklus war {days} Tage länger als dein bisheriger Durchschnitt ({average} Tage). Einzelne Abweichungen sind häufig; wenn es öfter vorkommt, kannst du es beim nächsten Vorsorgetermin erwähnen.",
        "cyclehint_shorter": "{name}: Der letzte Zyklus war {days} Tage kürzer als dein bisheriger Durchschnitt ({average} Tage). Einzelne Abweichungen sind häufig; wenn es öfter vorkommt, kannst du es beim nächsten Vorsorgetermin erwähnen.",
        "testhint_title": "Schwangerschaftstest",
        "testhint_message": "{name}: Seit dem bestätigten Eisprung ({date}) sind {days} Tage vergangen. Ein Schwangerschaftstest ist ungefähr ab jetzt aussagekräftig. Das ist nur ein Richtwert, keine medizinische Beratung.",
        "lhhint_title": "Ovulationstests",
        "lhhint_message": "{name}: Der Eisprung wird in etwa {days} Tagen erwartet ({date}). Wenn du Ovulationstests (LH) verwendest, ist jetzt ein guter Zeitpunkt, mit dem Testen zu beginnen. Das ist nur ein Richtwert, keine medizinische Beratung.",
        "tempreminder_title": "Basaltemperatur",
        "tempreminder_message": "{name}: Das fruchtbare Fenster rückt näher (Eisprung etwa am {date}). Bitte miss heute deine Basaltemperatur und trage sie ein.",
        "overdue_title": "Periode überfällig",
        "overdue_message": "{name}: Die Periode ist {days} Tage nach dem vorhergesagten Beginn ({date}) noch nicht eingetragen. Falls sie begonnen hat, bitte eintragen.",
        "checkup_title": "Kontrolltermin-Erinnerung",
        "checkup_message": "{name}: Die nächste Kontrolle ist am {date} fällig. Ein guter Zeitpunkt, einen Termin zu vereinbaren.",
        "pill_gap_message": "{name}: Die letzte eingetragene Pille war vor {days} Tagen. Falls Einnahmen vergessen wurden, kann der Schutz eingeschränkt sein - siehe Beipackzettel oder in der Apotheke nachfragen. Falls es nur nicht eingetragen wurde, bitte jetzt nachtragen.",
        "test_title": "Testbenachrichtigung",
        "test_message": "{name}: Das ist eine Testbenachrichtigung. Erinnerungen kommen hier an.",
        "badge_title": "Neues Abzeichen freigeschaltet",
        "badge_message": "{name} hat das Abzeichen \"{badge}\" freigeschaltet.",
    },
    "fr": {
        "period_title": "Rappel de règles",
        "period_message": "{name} : les règles devraient commencer le {date}.",
        "fertile_title": "Rappel : fenêtre de fertilité",
        "fertile_message": "{name} : la fenêtre de fertilité commence le {date}.",
        "ovulation_title": "Rappel : ovulation",
        "ovulation_message": "{name} : l'ovulation est estimée au {date}.",
        "action_period_started": "Règles commencées",
        "log_title": "Rappel de saisie",
        "log_message": "{name} : rien n'est encore enregistré pour aujourd'hui.",
        "pill_title": "Rappel de pilule",
        "pill_message": "{name} : c'est l'heure de prendre la pilule.",
        "action_pill_taken": "Pilule prise",
        "action_snooze": "Me rappeler dans 1 heure",
        "rhythm_title": "Rappel patch/anneau",
        "rhythm_patch_change": "{name} : aujourd'hui, changement de patch (rythme habituel de 28 jours ; la notice fait foi).",
        "rhythm_patch_remove": "{name} : la semaine sans patch commence aujourd'hui (rythme habituel de 28 jours ; la notice fait foi).",
        "rhythm_patch_new": "{name} : la semaine sans patch se termine aujourd'hui, un nouveau patch est à poser (rythme habituel de 28 jours ; la notice fait foi).",
        "rhythm_ring_remove": "{name} : l'anneau est à retirer aujourd'hui, la semaine sans anneau commence (rythme habituel de 28 jours ; la notice fait foi).",
        "rhythm_ring_insert": "{name} : la semaine sans anneau se termine aujourd'hui, un nouvel anneau est à poser (rythme habituel de 28 jours ; la notice fait foi).",
        "action_renewed": "Commencé aujourd'hui",
        "unprotected_title": "Rapport non protégé saisi",
        "unprotected_message": "{name} : un rapport non protégé a été saisi. Si une grossesse n'est pas souhaitée, une pharmacie ou un médecin peut conseiller tout de suite sur la contraception d'urgence - le plus tôt est le mieux.",
        "pregnancy_title": "Grossesse",
        "pregnancy_week_message": "{name} : semaine {week} de la grossesse. Date prévue d'accouchement calculée : {date}.",
        "pregnancy_trimester_message": "{name} : le trimestre {trimester} commence (semaine {week}). Date prévue d'accouchement calculée : {date}.",
        "recap_title": "Bilan du cycle",
        "recap_message": "{name} : cycle terminé - {cycle_days} jours, règles de {period_days} jours.",
        "recap_longer": "C'est {days} jours de plus que la moyenne ({average} jours).",
        "recap_shorter": "C'est {days} jours de moins que la moyenne ({average} jours).",
        "recap_in_line": "Conforme à la moyenne ({average} jours).",
        "recap_pain": "Jours de douleur : {pain_days}.",
        "cyclehint_title": "Durée du cycle",
        "cyclehint_short": "{name} : les 3 derniers cycles duraient chacun moins de {limit} jours ({lengths} jours). Ce n'est pas un diagnostic ; vous pouvez en parler lors de votre prochain suivi.",
        "cyclehint_long": "{name} : les 3 derniers cycles duraient chacun plus de {limit} jours ({lengths} jours). Ce n'est pas un diagnostic ; vous pouvez en parler lors de votre prochain suivi.",
        "cyclehint_longer": "{name} : le dernier cycle était plus long de {days} jours que votre moyenne habituelle ({average} jours). Un écart isolé est fréquent ; si cela se répète, vous pouvez en parler lors de votre prochain suivi.",
        "cyclehint_shorter": "{name} : le dernier cycle était plus court de {days} jours que votre moyenne habituelle ({average} jours). Un écart isolé est fréquent ; si cela se répète, vous pouvez en parler lors de votre prochain suivi.",
        "testhint_title": "Test de grossesse",
        "testhint_message": "{name} : {days} jours se sont écoulés depuis l'ovulation confirmée ({date}). Un test de grossesse est fiable à partir d'environ ce moment. Ce n'est qu'un repère, pas un avis médical.",
        "lhhint_title": "Tests d'ovulation",
        "lhhint_message": "{name} : l'ovulation est attendue dans environ {days} jours ({date}). Si vous utilisez des tests d'ovulation (LH), c'est le bon moment pour commencer. Ce n'est qu'un repère, pas un avis médical.",
        "tempreminder_title": "Température basale",
        "tempreminder_message": "{name} : la fenêtre de fertilité approche (ovulation attendue vers le {date}). Pensez à mesurer et enregistrer votre température basale aujourd'hui.",
        "overdue_title": "Règles en retard",
        "overdue_message": "{name} : les règles ont {days} jours de retard sur le début prévu ({date}). Si elles ont commencé, merci de les saisir.",
        "checkup_title": "Rappel de contrôle",
        "checkup_message": "{name} : le prochain contrôle est dû le {date}. Bon moment pour prendre rendez-vous.",
        "pill_gap_message": "{name} : la dernière pilule saisie date de {days} jours. Si des prises ont été oubliées, la protection peut être réduite - voir la notice ou demander conseil en pharmacie. Si elle a seulement été oubliée dans la saisie, merci de l'ajouter maintenant.",
        "test_title": "Notification de test",
        "test_message": "{name} : ceci est une notification de test. Les rappels arriveront ici.",
        "badge_title": "Nouveau badge débloqué",
        "badge_message": "{name} a débloqué le badge « {badge} ».",
    },
    "es": {
        "period_title": "Recordatorio de menstruación",
        "period_message": "{name}: se prevé que la menstruación comience el {date}.",
        "fertile_title": "Recordatorio: ventana fértil",
        "fertile_message": "{name}: la ventana fértil comienza el {date}.",
        "ovulation_title": "Recordatorio: ovulación",
        "ovulation_message": "{name}: la ovulación se estima para el {date}.",
        "action_period_started": "La regla ha empezado",
        "log_title": "Recordatorio de registro",
        "log_message": "{name}: todavía no hay nada registrado para hoy.",
        "pill_title": "Recordatorio de la píldora",
        "pill_message": "{name}: es hora de tomar la píldora.",
        "action_pill_taken": "Píldora tomada",
        "action_snooze": "Recordar en 1 hora",
        "rhythm_title": "Recordatorio de parche/anillo",
        "rhythm_patch_change": "{name}: hoy toca cambiar el parche (ritmo habitual de 28 días; manda el prospecto).",
        "rhythm_patch_remove": "{name}: hoy empieza la semana sin parche (ritmo habitual de 28 días; manda el prospecto).",
        "rhythm_patch_new": "{name}: hoy termina la semana sin parche, toca un parche nuevo (ritmo habitual de 28 días; manda el prospecto).",
        "rhythm_ring_remove": "{name}: hoy se retira el anillo y empieza la semana sin anillo (ritmo habitual de 28 días; manda el prospecto).",
        "rhythm_ring_insert": "{name}: hoy termina la semana sin anillo, toca un anillo nuevo (ritmo habitual de 28 días; manda el prospecto).",
        "action_renewed": "Empezado hoy",
        "unprotected_title": "Relación sin protección registrada",
        "unprotected_message": "{name}: se registró una relación sin protección. Si no se desea un embarazo, una farmacia o un médico pueden orientar de inmediato sobre la anticoncepción de emergencia: cuanto antes, mejor.",
        "pregnancy_title": "Embarazo",
        "pregnancy_week_message": "{name}: semana {week} del embarazo. Fecha prevista de parto calculada: {date}.",
        "pregnancy_trimester_message": "{name}: comienza el trimestre {trimester} (semana {week}). Fecha prevista de parto calculada: {date}.",
        "recap_title": "Resumen del ciclo",
        "recap_message": "{name}: ciclo terminado - {cycle_days} días de duración, la menstruación duró {period_days} días.",
        "recap_longer": "Son {days} días más que la media ({average} días).",
        "recap_shorter": "Son {days} días menos que la media ({average} días).",
        "recap_in_line": "En línea con la media ({average} días).",
        "recap_pain": "Días con dolor: {pain_days}.",
        "cyclehint_title": "Duración del ciclo",
        "cyclehint_short": "{name}: los últimos 3 ciclos duraron cada uno menos de {limit} días ({lengths} días). No es un diagnóstico; puedes mencionarlo en tu próxima revisión.",
        "cyclehint_long": "{name}: los últimos 3 ciclos duraron cada uno más de {limit} días ({lengths} días). No es un diagnóstico; puedes mencionarlo en tu próxima revisión.",
        "cyclehint_longer": "{name}: el último ciclo fue {days} días más largo que tu media anterior ({average} días). Las desviaciones aisladas son frecuentes; si se repite, puedes mencionarlo en tu próxima revisión.",
        "cyclehint_shorter": "{name}: el último ciclo fue {days} días más corto que tu media anterior ({average} días). Las desviaciones aisladas son frecuentes; si se repite, puedes mencionarlo en tu próxima revisión.",
        "testhint_title": "Prueba de embarazo",
        "testhint_message": "{name}: han pasado {days} días desde la ovulación confirmada ({date}). Una prueba de embarazo es fiable aproximadamente a partir de ahora. Es solo una pauta orientativa, no un consejo médico.",
        "lhhint_title": "Pruebas de ovulación",
        "lhhint_message": "{name}: se espera la ovulación en unos {days} días ({date}). Si usas pruebas de ovulación (LH), ahora es un buen momento para empezar. Es solo una pauta orientativa, no un consejo médico.",
        "tempreminder_title": "Temperatura basal",
        "tempreminder_message": "{name}: la ventana fértil se acerca (ovulación esperada hacia el {date}). Mide y registra hoy tu temperatura basal.",
        "overdue_title": "Menstruación retrasada",
        "overdue_message": "{name}: la menstruación lleva {days} días de retraso sobre el inicio previsto ({date}). Si ya empezó, por favor regístrala.",
        "checkup_title": "Recordatorio de revisión",
        "checkup_message": "{name}: la próxima revisión vence el {date}. Buen momento para pedir cita.",
        "pill_gap_message": "{name}: la última píldora registrada fue hace {days} días. Si se olvidaron tomas, la protección puede verse reducida - consulta el prospecto o pregunta en la farmacia. Si solo faltó registrarla, añádela ahora.",
        "test_title": "Notificación de prueba",
        "test_message": "{name}: esta es una notificación de prueba. Los recordatorios llegarán aquí.",
        "badge_title": "Nueva insignia desbloqueada",
        "badge_message": "{name} desbloqueó la insignia \"{badge}\".",
    },
    "sv": {
        "period_title": "Mens-påminnelse",
        "period_message": "{name}: mensen väntas börja den {date}.",
        "fertile_title": "Påminnelse: fertilt fönster",
        "fertile_message": "{name}: det fertila fönstret börjar den {date}.",
        "ovulation_title": "Påminnelse: ägglossning",
        "ovulation_message": "{name}: ägglossning beräknas den {date}.",
        "action_period_started": "Mensen har börjat",
        "log_title": "Påminnelse att logga",
        "log_message": "{name}: inget är loggat för idag än.",
        "pill_title": "Påminnelse: p-piller",
        "pill_message": "{name}: dags att ta p-pillret.",
        "action_pill_taken": "P-piller taget",
        "action_snooze": "Påminn om 1 timme",
        "rhythm_title": "Påminnelse: plåster/ring",
        "rhythm_patch_change": "{name}: idag är det plåsterbyte (vanlig rytm på 28 dagar; bipacksedeln gäller).",
        "rhythm_patch_remove": "{name}: den plåsterfria veckan börjar idag (vanlig rytm på 28 dagar; bipacksedeln gäller).",
        "rhythm_patch_new": "{name}: den plåsterfria veckan slutar idag, ett nytt plåster ska sättas på (vanlig rytm på 28 dagar; bipacksedeln gäller).",
        "rhythm_ring_remove": "{name}: ringen tas ut idag och den ringfria veckan börjar (vanlig rytm på 28 dagar; bipacksedeln gäller).",
        "rhythm_ring_insert": "{name}: den ringfria veckan slutar idag, en ny ring ska sättas in (vanlig rytm på 28 dagar; bipacksedeln gäller).",
        "action_renewed": "Påbörjad idag",
        "unprotected_title": "Oskyddat samlag loggat",
        "unprotected_message": "{name}: oskyddat samlag har loggats. Om graviditet inte önskas kan ett apotek eller en läkare genast ge råd om akut preventivmedel - ju tidigare desto bättre.",
        "pregnancy_title": "Graviditet",
        "pregnancy_week_message": "{name}: graviditetsvecka {week}. Beräknat förlossningsdatum: {date}.",
        "pregnancy_trimester_message": "{name}: trimester {trimester} börjar (vecka {week}). Beräknat förlossningsdatum: {date}.",
        "recap_title": "Cykelsammanfattning",
        "recap_message": "{name}: cykeln är avslutad - {cycle_days} dagar lång, mensen varade {period_days} dagar.",
        "recap_longer": "Det är {days} dagar längre än genomsnittet ({average} dagar).",
        "recap_shorter": "Det är {days} dagar kortare än genomsnittet ({average} dagar).",
        "recap_in_line": "I linje med genomsnittet ({average} dagar).",
        "recap_pain": "Smärtdagar: {pain_days}.",
        "cyclehint_title": "Cykellängd",
        "cyclehint_short": "{name}: de tre senaste cyklerna var var och en kortare än {limit} dagar ({lengths} dagar). Det är ingen diagnos; du kan nämna det vid nästa kontroll.",
        "cyclehint_long": "{name}: de tre senaste cyklerna var var och en längre än {limit} dagar ({lengths} dagar). Det är ingen diagnos; du kan nämna det vid nästa kontroll.",
        "cyclehint_longer": "{name}: den senaste cykeln var {days} dagar längre än ditt tidigare genomsnitt ({average} dagar). Enstaka avvikelser är vanliga; om det upprepas kan du nämna det vid nästa kontroll.",
        "cyclehint_shorter": "{name}: den senaste cykeln var {days} dagar kortare än ditt tidigare genomsnitt ({average} dagar). Enstaka avvikelser är vanliga; om det upprepas kan du nämna det vid nästa kontroll.",
        "testhint_title": "Graviditetstest",
        "testhint_message": "{name}: Det har gått {days} dagar sedan den bekräftade ägglossningen ({date}). Ett graviditetstest är ungefär från nu tillförlitligt. Det är bara en tumregel, inget medicinskt råd.",
        "lhhint_title": "Ovulationstester",
        "lhhint_message": "{name}: Ägglossning förväntas om cirka {days} dagar ({date}). Om du använder ovulationstester (LH) är det nu en bra tidpunkt att börja. Det är bara en tumregel, inget medicinskt råd.",
        "tempreminder_title": "Basaltemperatur",
        "tempreminder_message": "{name}: Det fertila fönstret närmar sig (ägglossning väntas runt {date}). Mät och registrera din basaltemperatur idag.",
        "overdue_title": "Mensen är försenad",
        "overdue_message": "{name}: mensen är {days} dagar efter beräknad start ({date}). Om den har börjat, logga den gärna nu.",
        "checkup_title": "Påminnelse om kontroll",
        "checkup_message": "{name}: nästa kontroll ska göras den {date}. Bra tillfälle att boka tid.",
        "pill_gap_message": "{name}: det senast loggade p-pillret var för {days} dagar sedan. Om tabletter har glömts kan skyddet vara nedsatt - se bipacksedeln eller fråga på apotek. Om det bara glömdes att logga, lägg till det nu.",
        "test_title": "Testavisering",
        "test_message": "{name}: det här är en testavisering. Påminnelser kommer att visas här.",
        "badge_title": "Nytt märke upplåst",
        "badge_message": "{name} låste upp märket \"{badge}\".",
    },
}


def _notify_strings(lang: str | None) -> dict[str, str]:
    key = str(lang or "en").strip().lower()[:2]
    return _NOTIFY_STRINGS.get(key, _NOTIFY_STRINGS["en"])


async def _async_check_and_send_notifications(hass: HomeAssistant, entry: ConfigEntry, runtime: "MenstruationRuntime") -> None:
    """Send proactive notifications for an upcoming period or the start of the
    fertile window, if enabled for this profile.

    Everything else in this integration is pull-only (the person has to open
    the dashboard or a card to see anything) — this is the one place that
    actively reaches out. Opt-in per profile (CONF_NOTIFICATIONS_ENABLED, the
    master switch for both events below), targeting whatever notify service
    the person configures (CONF_NOTIFY_SERVICE, e.g. "mobile_app_pixel" or
    "notify.mobile_app_pixel" — both accepted). Falls back to
    persistent_notification if no service is configured, so turning this on
    always does *something* visible even without a mobile app set up.

    HA-9 (M-Cycle_HA-Component-Roadmap.md, 15.09.2026): each of the two event
    types (period start / fertile window start) has its own enable-flag and
    configurable lead time (CONF_NOTIFY_PERIOD_ENABLED/_LEAD_DAYS and
    CONF_NOTIFY_FERTILE_ENABLED/_LEAD_DAYS) instead of one fixed, hardcoded
    lead (previously always 1 day ahead for the period, same-day for the
    fertile window) — the defaults still match that previous behaviour
    exactly, so existing setups are unaffected unless the person changes them.

    De-duplicated by remembering the last date notified for each event type in
    noncycle_data — only re-notifies if the predicted date actually changes
    (e.g. the forecast shifts), not every single day the flag would otherwise
    still be true.
    """
    if not entry.options.get(CONF_NOTIFICATIONS_ENABLED, DEFAULT_NOTIFICATIONS_ENABLED):
        return

    period_notify_enabled = bool(entry.options.get(CONF_NOTIFY_PERIOD_ENABLED, DEFAULT_NOTIFY_PERIOD_ENABLED))
    fertile_notify_enabled = bool(entry.options.get(CONF_NOTIFY_FERTILE_ENABLED, DEFAULT_NOTIFY_FERTILE_ENABLED))
    ovulation_notify_enabled = bool(entry.options.get(CONF_NOTIFY_OVULATION_ENABLED, DEFAULT_NOTIFY_OVULATION_ENABLED))
    recap_notify_enabled = bool(entry.options.get(CONF_NOTIFY_RECAP_ENABLED, DEFAULT_NOTIFY_RECAP_ENABLED))
    overdue_notify_enabled = bool(entry.options.get(CONF_NOTIFY_OVERDUE_ENABLED, DEFAULT_NOTIFY_OVERDUE_ENABLED))
    checkup_notify_enabled = bool(entry.options.get(CONF_NOTIFY_CHECKUP_ENABLED, DEFAULT_NOTIFY_CHECKUP_ENABLED))
    pregnancy_notify_enabled = bool(entry.options.get(CONF_NOTIFY_PREGNANCY_UPDATES, DEFAULT_NOTIFY_PREGNANCY_UPDATES))
    cycle_hint_enabled = bool(entry.options.get(CONF_NOTIFY_CYCLE_HINT, DEFAULT_NOTIFY_CYCLE_HINT))
    test_hint_enabled = bool(entry.options.get(CONF_NOTIFY_TEST_HINT, DEFAULT_NOTIFY_TEST_HINT))
    lh_hint_enabled = bool(entry.options.get(CONF_NOTIFY_LH_HINT, DEFAULT_NOTIFY_LH_HINT))
    temp_reminder_enabled = bool(entry.options.get(CONF_NOTIFY_TEMP_REMINDER, DEFAULT_NOTIFY_TEMP_REMINDER))
    if not any(
        (
            period_notify_enabled,
            fertile_notify_enabled,
            ovulation_notify_enabled,
            recap_notify_enabled,
            overdue_notify_enabled,
            checkup_notify_enabled,
            pregnancy_notify_enabled,
            cycle_hint_enabled,
            test_hint_enabled,
            lh_hint_enabled,
            temp_reminder_enabled,
        )
    ):
        return
    period_lead_days = max(
        0, min(NOTIFY_LEAD_DAYS_MAX, int(entry.options.get(CONF_NOTIFY_PERIOD_LEAD_DAYS, DEFAULT_NOTIFY_PERIOD_LEAD_DAYS)))
    )
    fertile_lead_days = max(
        0, min(NOTIFY_LEAD_DAYS_MAX, int(entry.options.get(CONF_NOTIFY_FERTILE_LEAD_DAYS, DEFAULT_NOTIFY_FERTILE_LEAD_DAYS)))
    )
    ovulation_lead_days = max(
        0, min(NOTIFY_LEAD_DAYS_MAX, int(entry.options.get(CONF_NOTIFY_OVULATION_LEAD_DAYS, DEFAULT_NOTIFY_OVULATION_LEAD_DAYS)))
    )

    from .model import (
        build_cycle_model,
        compute_contraception_status,
        cycle_length_hint,
        next_checkup_due,
        pregnancy_week_notification,
    )

    today = dt_util.now().date()
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
        nfp_mode=entry.options.get(CONF_NFP_ANALYSIS_MODE, DEFAULT_NFP_ANALYSIS_MODE),
        onboarding_stage=getattr(runtime, "onboarding_stage", None),
    )

    # The sensor state and the dashboard keep showing the forecast; only these two messages are skipped.
    mute_fertility = bool(
        entry.options.get(CONF_NOTIFY_FERTILE_MUTE_HORMONAL, DEFAULT_NOTIFY_FERTILE_MUTE_HORMONAL)
    ) and compute_contraception_status(runtime.symptom_history, today=today, renewed=_renewed(runtime))["is_hormonal"]

    strings = _notify_strings(hass.config.language)
    async def _send(title: str, message: str, actions: list[dict[str, str]] | None = None) -> None:
        await _async_send_notification(hass, entry, title, message, actions)

    # Optional second target (e.g. a partner's phone) that only gets the date
    # reminders below, never badges or any health detail. Respects the profile's
    # visibility level: nothing at "private", fertile window/ovulation only at "full"
    # (status_only deliberately hides those, same as the sensor attributes).
    partner_raw = str(entry.options.get(CONF_NOTIFY_PARTNER_SERVICE, "") or "").strip()
    partner_target = (
        tuple(partner_raw.split(".", 1)) if "." in partner_raw else ("notify", partner_raw)
    ) if partner_raw and runtime.visibility_level != VISIBILITY_LEVEL_PRIVATE else None

    async def _send_partner(title: str, message: str, *, full_only: bool = False) -> None:
        if partner_target is None or (full_only and runtime.visibility_level != VISIBILITY_LEVEL_FULL):
            return
        try:
            await hass.services.async_call(partner_target[0], partner_target[1], {"title": title, "message": message})
        except Exception as ex:  # noqa: BLE001 - a bad partner target must never block the user's own notification
            _LOGGER.warning("Could not send partner notification via %s.%s: %s", partner_target[0], partner_target[1], ex)

    period_start = (model.period_forecast or {}).get("predicted_start")
    fertile_start = (model.fertility_forecast or {}).get("fertile_window_start")
    ovulation_day = (model.fertility_forecast or {}).get("ovulation_estimate")
    notified_something = False

    if period_start and period_notify_enabled:
        period_target_iso = (today + timedelta(days=period_lead_days)).isoformat()
        if period_start == period_target_iso and runtime.noncycle_data.get("notified_period_start") != period_start:
            await _send(
                strings["period_title"],
                strings["period_message"].format(name=runtime.friendly_name, date=period_start),
                actions=[
                    {
                        "action": f"{NOTIFY_ACTION_PERIOD_STARTED_PREFIX}{entry.entry_id}",
                        "title": strings["action_period_started"],
                    }
                ],
            )
            await _send_partner(
                strings["period_title"],
                strings["period_message"].format(name=runtime.friendly_name, date=period_start),
            )
            runtime.noncycle_data["notified_period_start"] = period_start
            notified_something = True

    if fertile_start and fertile_notify_enabled and not mute_fertility:
        fertile_target_iso = (today + timedelta(days=fertile_lead_days)).isoformat()
        if fertile_start == fertile_target_iso and runtime.noncycle_data.get("notified_fertile_start") != fertile_start:
            await _send(
                strings["fertile_title"],
                strings["fertile_message"].format(name=runtime.friendly_name, date=fertile_start),
            )
            await _send_partner(
                strings["fertile_title"],
                strings["fertile_message"].format(name=runtime.friendly_name, date=fertile_start),
                full_only=True,
            )
            runtime.noncycle_data["notified_fertile_start"] = fertile_start
            notified_something = True

    if ovulation_day and ovulation_notify_enabled and not mute_fertility:
        ovulation_target_iso = (today + timedelta(days=ovulation_lead_days)).isoformat()
        if ovulation_day == ovulation_target_iso and runtime.noncycle_data.get("notified_ovulation_day") != ovulation_day:
            await _send(
                strings["ovulation_title"],
                strings["ovulation_message"].format(name=runtime.friendly_name, date=ovulation_day),
            )
            await _send_partner(
                strings["ovulation_title"],
                strings["ovulation_message"].format(name=runtime.friendly_name, date=ovulation_day),
                full_only=True,
            )
            runtime.noncycle_data["notified_ovulation_day"] = ovulation_day
            notified_something = True

    # Recap of the cycle that just ended, once per new cycle start; own target only (health detail, never the partner).
    if recap_notify_enabled and len(model.grouped_starts) >= 2:
        latest, previous = model.grouped_starts[-1], model.grouped_starts[-2]
        days_since_start = (today - date.fromisoformat(latest)).days
        if runtime.noncycle_data.get("notified_cycle_recap") != latest and 0 <= days_since_start <= 7:
            block = next((b for b in model.bleeding_blocks if b["start"] == previous), None)
            # ponytail: falls back to the configured duration if no bleeding block starts exactly on the previous start
            message = strings["recap_message"].format(
                name=runtime.friendly_name,
                cycle_days=(date.fromisoformat(latest) - date.fromisoformat(previous)).days,
                period_days=block["length"] if block else model.period_duration_days,
            )
            summary = compute_last_cycle_summary(runtime.history, runtime.symptom_history) or {}
            average, diff = summary.get("average_cycle_length"), summary.get("days_relative_to_average")
            if average is not None and diff is not None:
                key = "recap_in_line" if abs(diff) <= 1 else "recap_longer" if diff > 0 else "recap_shorter"
                message += " " + strings[key].format(days=abs(diff), average=average)
            if summary.get("pain_days"):
                message += " " + strings["recap_pain"].format(pain_days=summary["pain_days"])
            await _send(strings["recap_title"], message)
            runtime.noncycle_data["notified_cycle_recap"] = latest
            notified_something = True

    # Unusual cycle length: only when it newly shows up with this period start (not again for every further cycle of a
    # streak), once per start, own target only, neutral wording.
    if cycle_hint_enabled and len(model.grouped_starts) >= 2:
        latest = model.grouped_starts[-1]
        days_since_start = (today - date.fromisoformat(latest)).days
        if runtime.noncycle_data.get("notified_cycle_hint") != latest and 0 <= days_since_start <= 7:
            hint = cycle_length_hint(model.grouped_starts)
            before = cycle_length_hint(model.grouped_starts[:-1])
            if hint is not None and (before is None or before["kind"] != hint["kind"]):
                message = strings[f"cyclehint_{hint['kind']}"].format(
                    name=runtime.friendly_name,
                    limit=hint.get("limit"),
                    lengths=", ".join(str(days) for days in hint.get("lengths", [])),
                    days=hint.get("days"),
                    average=hint.get("average"),
                )
                await _send(strings["cyclehint_title"], message)
            runtime.noncycle_data["notified_cycle_hint"] = latest
            notified_something = True

    # Pregnancy-test timing for people trying to conceive: once per cycle, TEST_HINT_DAYS_AFTER_OVULATION days after an
    # ovulation the NFP analysis confirmed (a short window so one missed daily run does not lose it); own target only.
    nfp = model.nfp_analysis if isinstance(model.nfp_analysis, dict) else {}
    confirmed_ovulation = nfp.get("ovulation_day")  # None unless the analysis confirmed it
    if (
        test_hint_enabled
        and confirmed_ovulation
        and model.grouped_starts
        and not mute_fertility
        and runtime.noncycle_data.get("notified_test_hint") != model.grouped_starts[-1]
        and 0 <= (today - date.fromisoformat(confirmed_ovulation)).days - TEST_HINT_DAYS_AFTER_OVULATION <= 2
    ):
        await _send(
            strings["testhint_title"],
            strings["testhint_message"].format(
                name=runtime.friendly_name, date=confirmed_ovulation, days=TEST_HINT_DAYS_AFTER_OVULATION
            ),
        )
        runtime.noncycle_data["notified_test_hint"] = model.grouped_starts[-1]
        notified_something = True

    # Ovulation-test start hint: once per cycle, LH_HINT_LEAD_DAYS before the expected ovulation (a short window so one
    # missed daily run does not lose it).
    if (
        lh_hint_enabled
        and ovulation_day
        and model.grouped_starts
        and not mute_fertility
        and runtime.noncycle_data.get("notified_lh_hint") != model.grouped_starts[-1]
    ):
        # A positive LH test or a confirmed ovulation already moved the estimate to the past/tomorrow, so no extra check.
        days_to_ovulation = (date.fromisoformat(ovulation_day) - today).days
        if LH_HINT_LEAD_DAYS - LH_HINT_WINDOW_DAYS <= days_to_ovulation <= LH_HINT_LEAD_DAYS:
            await _send(
                strings["lhhint_title"],
                strings["lhhint_message"].format(
                    name=runtime.friendly_name, date=ovulation_day, days=days_to_ovulation
                ),
            )
            runtime.noncycle_data["notified_lh_hint"] = model.grouped_starts[-1]
            notified_something = True

    # Basal temperature reminder: around the expected ovulation, until a temperature rise is confirmed, for people who
    # log their temperature regularly and have not logged today's value yet.
    if (
        temp_reminder_enabled
        and ovulation_day
        and fertile_start
        and not confirmed_ovulation
        and runtime.noncycle_data.get("notified_temp_reminder") != today.isoformat()
        and date.fromisoformat(fertile_start)
        <= today
        <= date.fromisoformat(ovulation_day) + timedelta(days=TEMP_REMINDER_DAYS_AFTER_OVULATION)
    ):
        logged_days = {
            str(entry.get("date"))
            for entry in runtime.symptom_history
            if isinstance(entry, dict) and entry.get("basal_temp") not in (None, "")
        }
        recent_days = {(today - timedelta(days=offset)).isoformat() for offset in range(1, TEMP_REMINDER_LOOKBACK_DAYS + 1)}
        if today.isoformat() not in logged_days and len(logged_days & recent_days) >= TEMP_REMINDER_MIN_LOGGED_DAYS:
            await _send(
                strings["tempreminder_title"],
                strings["tempreminder_message"].format(name=runtime.friendly_name, date=ovulation_day),
            )
            runtime.noncycle_data["notified_temp_reminder"] = today.isoformat()
            notified_something = True

    # Overdue period: same gate as the repair issue (repairs.py::async_check_period_overdue); once per predicted start, own target only.
    days_to_start = model.days_until_next_start
    if (
        overdue_notify_enabled
        and days_to_start is not None
        and days_to_start <= -PERIOD_OVERDUE_DAYS
        and model.state != STATE_PERIOD
        and (model.prediction_gating or {}).get("precision_allowed")
    ):
        predicted_iso = (today + timedelta(days=days_to_start)).isoformat()
        if runtime.noncycle_data.get("notified_period_overdue") != predicted_iso:
            await _send(
                strings["overdue_title"],
                strings["overdue_message"].format(name=runtime.friendly_name, days=-days_to_start, date=predicted_iso),
                actions=[
                    {
                        "action": f"{NOTIFY_ACTION_PERIOD_STARTED_PREFIX}{entry.entry_id}",
                        "title": strings["action_period_started"],
                    }
                ],
            )
            runtime.noncycle_data["notified_period_overdue"] = predicted_iso
            notified_something = True

    # Checkup due within CHECKUP_NOTIFY_LEAD_DAYS (or already overdue when first checked); once per due date, own target only.
    if checkup_notify_enabled:
        checkup_due = next_checkup_due(
            runtime.symptom_history,
            int(entry.options.get(CONF_CHECKUP_INTERVAL_MONTHS, DEFAULT_CHECKUP_INTERVAL_MONTHS)),
        )
        if (
            checkup_due is not None
            and (checkup_due - today).days <= CHECKUP_NOTIFY_LEAD_DAYS
            and runtime.noncycle_data.get("notified_checkup_due") != checkup_due.isoformat()
        ):
            await _send(
                strings["checkup_title"],
                strings["checkup_message"].format(name=runtime.friendly_name, date=checkup_due.isoformat()),
            )
            runtime.noncycle_data["notified_checkup_due"] = checkup_due.isoformat()
            notified_something = True

    # Weekly pregnancy message (own target only, neutral text); the trimester text replaces it on the day a trimester starts.
    if pregnancy_notify_enabled and runtime.pregnancy_data.get("is_pregnant"):
        due = pregnancy_week_notification(
            runtime.pregnancy_data.get("start_date"), today, runtime.noncycle_data.get("notified_pregnancy_week")
        )
        if due is not None:
            key = "pregnancy_trimester_message" if due["trimester"] else "pregnancy_week_message"
            await _send(
                strings["pregnancy_title"],
                strings[key].format(
                    name=runtime.friendly_name, week=due["week"], trimester=due["trimester"], date=model.due_date or "?"
                ),
            )
            runtime.noncycle_data["notified_pregnancy_week"] = due["week"]
            notified_something = True

    # Reads the badge already computed by sensor.py (progress_badges_new_this_week)
    # instead of recomputing evaluate_badges here - avoids a second copy of that logic.
    entity_reg = er.async_get(hass)
    sensor_entity_id = entity_reg.async_get_entity_id("sensor", DOMAIN, f"{entry.entry_id}_menstruation")
    sensor_state = hass.states.get(sensor_entity_id) if sensor_entity_id else None
    new_badges = (sensor_state.attributes.get("progress_badges_new_this_week") if sensor_state else None) or []
    if new_badges:
        badge_key = str(new_badges[0])
        if runtime.noncycle_data.get("notified_badge") != badge_key:
            # ponytail: badge key -> label is a plain "snake_case to Title Case"
            # conversion, not the real per-badge titles the frontend cards use -
            # good enough for a notification, upgrade if a nicer label is wanted.
            badge_label = badge_key.replace("_", " ").title()
            await _send(
                strings["badge_title"],
                strings["badge_message"].format(name=runtime.friendly_name, badge=badge_label),
            )
            runtime.noncycle_data["notified_badge"] = badge_key
            notified_something = True

    if notified_something:
        await _async_save_and_notify(hass, runtime)


def _resolve_notify_target(entry: ConfigEntry) -> tuple[str, str]:
    """(domain, service) of the profile's notify target; falls back to a persistent notification."""
    raw_service = str(entry.options.get(CONF_NOTIFY_SERVICE, "") or "").strip()
    if not raw_service:
        return "persistent_notification", "create"
    if "." in raw_service:
        domain, service = raw_service.split(".", 1)
        return domain, service
    return "notify", raw_service


async def _async_send_notification(
    hass: HomeAssistant,
    entry: ConfigEntry,
    title: str,
    message: str,
    actions: list[dict[str, str]] | None = None,
) -> None:
    """Send one notification to the profile's own target. Action buttons are only
    attached for mobile_app targets (the only ones that understand them)."""
    from .repairs import async_create_notify_target_issue, async_delete_notify_target_issue

    notify_domain, notify_service = _resolve_notify_target(entry)
    target = f"{notify_domain}.{notify_service}"
    if not hass.services.has_service(notify_domain, notify_service):
        _LOGGER.warning("Notify service %s does not exist, cannot send notification for %s", target, entry.entry_id)
        async_create_notify_target_issue(hass, entry.entry_id, entry.title, target)
        return
    try:
        if notify_domain == "persistent_notification":
            await hass.services.async_call(
                "persistent_notification",
                "create",
                {"title": title, "message": message, "notification_id": f"menstruation_cycle_{entry.entry_id}_{title}"},
            )
        else:
            payload: dict[str, Any] = {"title": title, "message": message}
            if actions and notify_service.startswith("mobile_app_"):
                payload["data"] = {"actions": actions}
            await hass.services.async_call(notify_domain, notify_service, payload)
        async_delete_notify_target_issue(hass, entry.entry_id)
    except Exception as ex:  # noqa: BLE001 - a bad/misconfigured notify target must never crash the scheduled run
        _LOGGER.warning("Could not send notification via %s: %s", target, ex)
        async_create_notify_target_issue(hass, entry.entry_id, entry.title, target)


async def _async_send_log_reminder(hass: HomeAssistant, entry: ConfigEntry, runtime: "MenstruationRuntime") -> None:
    """Evening reminder when nothing (cycle start or symptoms) is logged for today yet."""
    if not entry.options.get(CONF_NOTIFICATIONS_ENABLED, DEFAULT_NOTIFICATIONS_ENABLED):
        return
    today_iso = dt_util.now().date().isoformat()
    if today_iso in runtime.history or any(
        isinstance(e, dict) and e.get("date") == today_iso for e in runtime.symptom_history
    ):
        return
    strings = _notify_strings(hass.config.language)
    await _async_send_notification(
        hass,
        entry,
        strings["log_title"],
        strings["log_message"].format(name=runtime.friendly_name),
        [{"action": f"{NOTIFY_ACTION_LOG_SNOOZE_PREFIX}{entry.entry_id}", "title": strings["action_snooze"]}],
    )


async def _async_send_pill_reminder(hass: HomeAssistant, entry: ConfigEntry, runtime: "MenstruationRuntime") -> None:
    """Remind to take the pill while pill is the profile's current method and today's intake is not logged yet."""
    if not entry.options.get(CONF_NOTIFICATIONS_ENABLED, DEFAULT_NOTIFICATIONS_ENABLED):
        return
    from .model import compute_contraception_status, pill_break_active

    today = dt_util.now().date()
    today_iso = today.isoformat()
    status = compute_contraception_status(runtime.symptom_history, today=today, renewed=_renewed(runtime))
    if status["current_method"] != CONTRACEPTION_METHOD_PILL:
        return
    pause_days = int(entry.options.get(CONF_PILL_PAUSE_DAYS, DEFAULT_PILL_PAUSE_DAYS))
    if pill_break_active(status, today, pause_days):
        return
    # ponytail: intake == today's entry has contraception_method "pill"; no separate per-day intake field
    if any(
        isinstance(e, dict) and e.get("date") == today_iso and e.get(SYMPTOM_CONTRACEPTION_METHOD) == CONTRACEPTION_METHOD_PILL
        for e in runtime.symptom_history
    ):
        return
    strings = _notify_strings(hass.config.language)
    message = strings["pill_message"]
    last_taken = status.get("pill_last_taken")
    gap_days = (today - date.fromisoformat(last_taken)).days if last_taken else 0
    # Without a configured pack break only gaps longer than any normal break are unambiguous (a break is not "forgotten").
    if (
        entry.options.get(CONF_NOTIFY_PILL_GAP_ENABLED, DEFAULT_NOTIFY_PILL_GAP_ENABLED)
        and gap_days >= 2
        and (pause_days > 0 or gap_days > PILL_PAUSE_DAYS_MAX)
    ):
        message = strings["pill_gap_message"]
    await _async_send_notification(
        hass,
        entry,
        strings["pill_title"],
        message.format(name=runtime.friendly_name, days=gap_days),
        [
            {"action": f"{NOTIFY_ACTION_PILL_TAKEN_PREFIX}{entry.entry_id}", "title": strings["action_pill_taken"]},
            {"action": f"{NOTIFY_ACTION_PILL_SNOOZE_PREFIX}{entry.entry_id}", "title": strings["action_snooze"]},
        ],
    )


async def _async_send_rhythm_reminder(hass: HomeAssistant, entry: ConfigEntry, runtime: "MenstruationRuntime") -> None:
    """Patch/ring: reminder on each step of the 28-day rhythm (change, remove, new), once per step."""
    if not entry.options.get(CONF_NOTIFICATIONS_ENABLED, DEFAULT_NOTIFICATIONS_ENABLED):
        return
    from .model import compute_contraception_status

    today = dt_util.now().date()
    rhythm = compute_contraception_status(runtime.symptom_history, today=today, renewed=_renewed(runtime))["rhythm"]
    if not rhythm or rhythm["days_until"] != 0:
        return
    event = rhythm["event"]
    step = f"{event}:{rhythm['date']}"
    # the follow-up time of the pill reminder fires this function again on the same day
    if runtime.noncycle_data.get("notified_rhythm") == step:
        return
    strings = _notify_strings(hass.config.language)
    actions = None
    if event in CONTRACEPTION_RHYTHM_START_EVENTS:
        actions = [{"action": f"{NOTIFY_ACTION_RENEWED_PREFIX}{entry.entry_id}", "title": strings["action_renewed"]}]
    await _async_send_notification(
        hass, entry, strings["rhythm_title"], strings[f"rhythm_{event}"].format(name=runtime.friendly_name), actions
    )
    runtime.noncycle_data["notified_rhythm"] = step


async def _async_send_unprotected_hint(hass: HomeAssistant, entry: ConfigEntry, runtime: "MenstruationRuntime", date_iso: str) -> None:
    """Opt-in neutral hint after unprotected intercourse was logged (ask a pharmacy or doctor about emergency contraception).

    Only for today or the last UNPROTECTED_HINT_MAX_DAYS days (older entries are back-filling), once per day,
    never during pregnancy or menopause, own target only. No dosing and no medical advice in the text.
    """
    if not entry.options.get(CONF_NOTIFICATIONS_ENABLED, DEFAULT_NOTIFICATIONS_ENABLED):
        return
    if not entry.options.get(CONF_NOTIFY_UNPROTECTED_HINT, DEFAULT_NOTIFY_UNPROTECTED_HINT):
        return
    if runtime.pregnancy_data.get("is_pregnant") or runtime.menopause_data.get("is_menopause"):
        return
    age = (dt_util.now().date() - date.fromisoformat(date_iso)).days
    if not 0 <= age <= UNPROTECTED_HINT_MAX_DAYS or runtime.noncycle_data.get("notified_unprotected") == date_iso:
        return
    strings = _notify_strings(hass.config.language)
    try:
        await _async_send_notification(
            hass, entry, strings["unprotected_title"], strings["unprotected_message"].format(name=runtime.friendly_name)
        )
    except Exception:  # noqa: BLE001 - a failing notification must never break saving the symptom
        _LOGGER.exception("Could not send the unprotected-intercourse hint for %s", entry.entry_id)
        return
    runtime.noncycle_data["notified_unprotected"] = date_iso


def _is_unprotected(value: Any) -> bool:
    values = value if isinstance(value, (list, tuple, set)) else [value]
    return any(str(item).strip().lower() == "unprotected" for item in values)


_SNOOZE_SENDERS = {"pill": _async_send_pill_reminder, "log": _async_send_log_reminder}


def _arm_snooze(hass: HomeAssistant, entry: ConfigEntry, runtime: "MenstruationRuntime", kind: str, delay: float) -> None:
    """Re-send the reminder of this kind after delay seconds (the timer is cancelled when the entry unloads)."""

    async def _async_snoozed(_now: datetime) -> None:
        runtime.noncycle_data.get("snooze_due", {}).pop(kind, None)
        try:
            await _SNOOZE_SENDERS[kind](hass, entry, runtime)
            await _async_save_and_notify(hass, runtime)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Snoozed reminder failed for %s", entry.entry_id)

    entry.async_on_unload(async_call_later(hass, delay, _async_snoozed))


def _rearm_snoozes(hass: HomeAssistant, entry: ConfigEntry, runtime: "MenstruationRuntime") -> None:
    """Re-arm snoozes that were pending at shutdown; unknown ones and ones overdue by more than the snooze length are dropped."""
    snooze_due = runtime.noncycle_data.get("snooze_due")
    for kind, due_iso in list(snooze_due.items()) if isinstance(snooze_due, dict) else []:
        due_dt = dt_util.parse_datetime(str(due_iso))
        remaining = (due_dt - dt_util.utcnow()).total_seconds() if due_dt else -NOTIFY_SNOOZE_SECONDS
        if kind in _SNOOZE_SENDERS and remaining > -NOTIFY_SNOOZE_SECONDS:
            _arm_snooze(hass, entry, runtime, kind, max(remaining, 1))
        else:
            snooze_due.pop(kind, None)


async def _async_schedule_snooze(hass: HomeAssistant, entry: ConfigEntry, runtime: "MenstruationRuntime", kind: str) -> None:
    # The due time is stored so a restart within the hour re-arms the timer (see the re-arm loop in async_setup_entry).
    due = dt_util.utcnow() + timedelta(seconds=NOTIFY_SNOOZE_SECONDS)
    runtime.noncycle_data.setdefault("snooze_due", {})[kind] = due.isoformat()
    await _async_save_and_notify(hass, runtime)
    _arm_snooze(hass, entry, runtime, kind, NOTIFY_SNOOZE_SECONDS)


async def _async_handle_mobile_action(hass: HomeAssistant, entry: ConfigEntry, runtime: "MenstruationRuntime", event: Any) -> None:
    # "Period started" logs today as a cycle start, "Pill taken" logs today's pill intake, snooze re-sends the reminder later.
    action = event.data.get("action")
    base = {SERVICE_FIELD_ENTRY_ID: entry.entry_id, SERVICE_FIELD_DATE: dt_util.now().date().isoformat()}
    try:
        if action == f"{NOTIFY_ACTION_PERIOD_STARTED_PREFIX}{entry.entry_id}":
            await _async_handle_add(hass, SimpleNamespace(data=base))
        elif action == f"{NOTIFY_ACTION_PILL_TAKEN_PREFIX}{entry.entry_id}":
            symptom_data = {SYMPTOM_CONTRACEPTION_METHOD: CONTRACEPTION_METHOD_PILL}
            await _async_handle_add_symptom(hass, SimpleNamespace(data={**base, SERVICE_FIELD_SYMPTOM_DATA: symptom_data}))
        elif action == f"{NOTIFY_ACTION_RENEWED_PREFIX}{entry.entry_id}":
            await _async_handle_confirm_contraception_renewal(hass, SimpleNamespace(data={SERVICE_FIELD_ENTRY_ID: entry.entry_id}))
        elif action == f"{NOTIFY_ACTION_PILL_SNOOZE_PREFIX}{entry.entry_id}":
            await _async_schedule_snooze(hass, entry, runtime, "pill")
        elif action == f"{NOTIFY_ACTION_LOG_SNOOZE_PREFIX}{entry.entry_id}":
            await _async_schedule_snooze(hass, entry, runtime, "log")
    except Exception:  # noqa: BLE001
        _LOGGER.exception("Could not handle notification action %s for %s", action, entry.entry_id)


def _profile_last_activity_date(runtime: "MenstruationRuntime") -> str | None:
    """Most recent history/symptom entry date, or None if nothing logged yet or
    this profile's life stage doesn't call for regular logging (pregnancy/
    pre-menarche/postpartum) - see repairs.py::async_check_profile_inactive."""
    if runtime.pregnancy_data.get("is_pregnant"):
        return None
    if runtime.noncycle_data.get("is_postpartum"):
        return None
    if runtime.menarche_data.get("tracking_active") and not runtime.menarche_data.get("is_menarche"):
        return None
    dates = list(runtime.history)
    dates.extend(e.get("date") for e in runtime.symptom_history if isinstance(e, dict) and e.get("date"))
    return max(dates) if dates else None


async def _async_import_basal_temp_from_linked_sensor(
    hass: HomeAssistant, entry: ConfigEntry, runtime: "MenstruationRuntime", today: date
) -> None:
    """Auto-fill today's basal_temp from a linked HA sensor (e.g. a smart
    thermometer), see const.py::CONF_BASAL_TEMP_SENSOR_ENTITY_ID. Competitor
    research ("weitere ideen?", 02.10.2026) found several trackers can pull a
    BBT reading from a paired device instead of manual entry every morning.

    The reading is stored under the day the sensor last updated (today or, for a
    reading that arrived while HA was down, yesterday); older readings are ignored
    so a stale sensor value never turns into a fresh data point.
    Never overwrites a value already present for that day - a manual
    add_symptom entry (or a previous import) always wins.
    """
    entity_id = str(entry.options.get(CONF_BASAL_TEMP_SENSOR_ENTITY_ID, "") or "").strip()
    if not entity_id:
        return

    state = hass.states.get(entity_id)
    if state is None or state.state in (None, "", STATE_UNKNOWN, STATE_UNAVAILABLE):
        return

    try:
        temp_value = float(state.state)
    except (TypeError, ValueError):
        return

    unit = str(state.attributes.get("unit_of_measurement", "") or "")
    celsius = (temp_value - 32.0) * 5.0 / 9.0 if unit in ("°F", "F") else temp_value
    # Same plausibility range as the manual basal_temp entry path
    # (_async_handle_add_symptom) - a sensor glitch (0, out-of-range default
    # value, etc.) should be silently ignored rather than corrupting NFP data.
    if not 30.0 <= celsius <= 45.0:
        return

    reading_day = dt_util.as_local(state.last_updated).date()
    if not 0 <= (today - reading_day).days <= 1:
        return
    day_iso = reading_day.isoformat()
    existing = next((e for e in runtime.symptom_history if e.get("date") == day_iso), None)
    if existing is not None:
        if existing.get(SYMPTOM_BASAL_TEMP) is not None:
            return
        existing[SYMPTOM_BASAL_TEMP] = round(celsius, 2)
    else:
        runtime.symptom_history.append({"date": day_iso, SYMPTOM_BASAL_TEMP: round(celsius, 2)})
        runtime.symptom_history.sort(key=lambda x: x.get("date", ""))

    await _async_save_and_notify(hass, runtime)


def _register_basal_temp_listener(hass: HomeAssistant, entry: ConfigEntry, runtime: "MenstruationRuntime") -> None:
    """Import a new reading of the linked temperature sensor as soon as it arrives."""
    if runtime.unregister_basal_temp_listener:
        runtime.unregister_basal_temp_listener()
        runtime.unregister_basal_temp_listener = None
    entity_id = str(entry.options.get(CONF_BASAL_TEMP_SENSOR_ENTITY_ID, "") or "").strip()
    if not entity_id:
        return

    async def _on_sensor_change(event: Any) -> None:
        try:
            await _async_import_basal_temp_from_linked_sensor(hass, entry, runtime, dt_util.now().date())
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Basal-temp import after sensor update failed for %s", entry.entry_id)

    runtime.unregister_basal_temp_listener = async_track_state_change_event(hass, [entity_id], _on_sensor_change)


def _renewed(runtime: "MenstruationRuntime") -> dict[str, Any] | None:
    """The confirmed contraception renewal stored for this profile, if any."""
    value = runtime.noncycle_data.get(NONCYCLE_CONTRACEPTION_RENEWED)
    return value if isinstance(value, dict) else None


async def _async_check_contraception_renewal_todo(hass: HomeAssistant, runtime: "MenstruationRuntime") -> None:
    """Add a todo-list reminder when the current contraception method's
    estimated renewal/replacement date is approaching.

    Only fires for methods with a known typical validity period (IUD,
    implant, injection — see CONTRACEPTION_RENEWAL_MONTHS); other methods
    (pill, patch, ring, condom) don't have a multi-month/year "replace this"
    concept in the same sense, so no reminder is generated for them.

    Checked once daily from the midnight refresh cycle, since the reminder is
    purely a function of the passage of time (today vs. the estimated due
    date), not something that changes when a symptom is logged.
    """
    from .model import compute_contraception_status

    status = compute_contraception_status(runtime.symptom_history, today=dt_util.now().date(), renewed=_renewed(runtime))
    if not status.get("renewal_reminder_due"):
        return
    method = status.get("current_method")
    due_date = status.get("renewal_due_date")
    if not method or not due_date:
        return

    def prefix(strings: dict[str, Any], raw: bool = False) -> str:
        label = method if raw else strings["methods"].get(method, method)
        return strings["contraception_prefix"].format(name=runtime.friendly_name, method=label)

    strings = _todo_strings(hass.config.language)
    item_text = strings["contraception_renewal"].format(prefix=prefix(strings), date=due_date)
    # the raw-key spelling is what older versions wrote, so their open items still count as duplicates
    known = _todo_variants(prefix) + _todo_variants(lambda s: prefix(s, raw=True))
    await _async_add_todo_item_if_missing(hass, item_text, duplicate_contains=known)


async def _async_check_pill_refill_todo(hass: HomeAssistant, entry: ConfigEntry, runtime: "MenstruationRuntime") -> None:
    """Shopping-list item shortly before the running pill pack ends (only with a configured pack break)."""
    from .model import compute_contraception_status, pill_pack_end

    today = dt_util.now().date()
    status = compute_contraception_status(runtime.symptom_history, today=today, renewed=_renewed(runtime))
    if status["current_method"] != CONTRACEPTION_METHOD_PILL:
        return
    end = pill_pack_end(status, int(entry.options.get(CONF_PILL_PAUSE_DAYS, DEFAULT_PILL_PAUSE_DAYS)))
    if end is None or not 0 <= (end - today).days <= PILL_REFILL_LEAD_DAYS:
        return
    # the end date in the text makes the item unique per pack, so a ticked-off item does not block the next pack
    def text(strings: dict[str, Any]) -> str:
        return strings["pill_refill"].format(name=runtime.friendly_name, date=end.isoformat())

    await _async_add_todo_item_if_missing(
        hass, text(_todo_strings(hass.config.language)), same_as=_todo_variants(text)
    )


def _profile_from_entry(entry: ConfigEntry) -> str:
    profile = slugify(str(entry.data.get(CONF_PROFILE, ""))).strip("_")
    if profile:
        return profile
    legacy_name = str(entry.data.get(CONF_NAME, DEFAULT_NAME))
    return slugify(legacy_name).strip("_") or "default"


def _friendly_name_from_entry(entry: ConfigEntry) -> str:
    return str(entry.data.get(CONF_FRIENDLY_NAME) or entry.data.get(CONF_NAME) or DEFAULT_NAME).strip() or DEFAULT_NAME


def _icon_from_entry(entry: ConfigEntry) -> str:
    return str(entry.data.get(CONF_ICON, "")).strip()


def _normalize_date_or_raise(value: str) -> str:
    try:
        return date.fromisoformat(str(value)).isoformat()
    except ValueError as err:
        raise HomeAssistantError(f"Invalid date '{value}', expected YYYY-MM-DD") from err


def _runtime_by_profile(hass: HomeAssistant, profile: str) -> MenstruationRuntime:
    domain_data: dict[str, MenstruationRuntime] = hass.data.get(DOMAIN, {})
    if not domain_data:
        raise HomeAssistantError("No menstruation_cycle config entry loaded")

    wanted = slugify(str(profile)).strip("_")
    for runtime in domain_data.values():
        if runtime.profile == wanted:
            return runtime
    raise HomeAssistantError(f"Unknown profile '{profile}'.")


def _runtime_for_call(hass: HomeAssistant, call: ServiceCall) -> MenstruationRuntime:
    domain_data: dict[str, MenstruationRuntime] = hass.data.get(DOMAIN, {})
    if not domain_data:
        raise HomeAssistantError("No menstruation_cycle config entry loaded")

    profile = call.data.get(SERVICE_FIELD_PROFILE)
    if profile is not None and str(profile).strip():
        return _runtime_by_profile(hass, str(profile))

    entity_id = call.data.get(SERVICE_FIELD_ENTITY_ID)
    if entity_id is not None and str(entity_id).strip():
        state_obj = hass.states.get(str(entity_id).strip())
        if state_obj is None:
            raise HomeAssistantError(f"Unknown entity_id '{entity_id}'.")
        runtime_entry_id = state_obj.attributes.get("entry_id")
        if runtime_entry_id and runtime_entry_id in domain_data:
            return domain_data[runtime_entry_id]
        raise HomeAssistantError(f"Entity '{entity_id}' is not a menstruation_cycle sensor.")

    entry_id = call.data.get(SERVICE_FIELD_ENTRY_ID)
    if entry_id is not None and str(entry_id).strip():
        runtime = domain_data.get(str(entry_id).strip())
        if runtime is not None:
            return runtime
        raise HomeAssistantError(f"Unknown entry_id '{entry_id}'.")

    if len(domain_data) == 1:
        return next(iter(domain_data.values()))

    known = ", ".join(sorted(runtime.profile for runtime in domain_data.values()))
    raise HomeAssistantError(
        f"Multiple profiles configured. Provide '{SERVICE_FIELD_PROFILE}' in service data. Known: {known}"
    )


async def _async_save_and_notify(hass: HomeAssistant, runtime: MenstruationRuntime) -> None:
    runtime.history = normalize_history(runtime.history)
    runtime.period_duration_days = max(1, min(14, int(runtime.period_duration_days)))
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
        visibility_level=runtime.visibility_level,
    )
    await _async_refresh_cycle_model(hass, {_entry_id_for_runtime(hass, runtime)})
    # HA-5 (M-Cycle_HA-Component-Roadmap.md): keep HA's own long-term statistics
    # in sync with every history/symptom change, not just on integration load.
    # Wrapped defensively inside the helper itself, so a recorder hiccup here
    # never blocks the actual save above.
    await _async_sync_cycle_statistics(hass, runtime)




async def _async_sync_cycle_statistics(hass: HomeAssistant, runtime: MenstruationRuntime) -> None:
    """Feed average cycle length and pain-days-per-cycle into Home Assistant's
    native long-term statistics (HA-5, M-Cycle_HA-Component-Roadmap.md).

    Both are already computed per-cycle for the sensor attributes/doctor report
    (see sensor.py::_build_cycle_statistics / _build_symptom_statistics), but
    only shown in this integration's own cards - never fed into HA's built-in
    history graphs. Unlike basal_temp (sensor.py::_async_backfill_basal_temp_
    statistics), there's no single sensor entity whose own state IS the cycle
    length or the pain-day count, so this can't use source="recorder" tied to
    an entity_id - it uses genuinely *external* statistics instead
    (source=DOMAIN, statistic_id="menstruation_cycle:<profile>_...").

    Recomputes the full per-cycle series and re-upserts it every time this
    runs (after every history-affecting service call, see _async_save_and_
    notify) rather than only appending the newest point - the recorder's
    statistics import is idempotent per (statistic_id, start), re-sending
    already-known points is a cheap no-op, and this avoids having to reason
    about incremental-append edge cases (edited/removed cycle starts,
    backfilled old symptom entries, etc.) for what is always a small, single-
    household history.
    """
    try:
        from homeassistant.components.recorder.models import StatisticData, StatisticMetaData
        from homeassistant.components.recorder.statistics import async_add_external_statistics
    except ImportError:
        _LOGGER.debug("Recorder component unavailable — skipping cycle statistics sync.")
        return

    starts = grouped_cycle_starts(runtime.history)
    if len(starts) < 2:
        return  # need at least one *completed* cycle (a start plus the next one)

    length_points: list[StatisticData] = []
    pain_points: list[StatisticData] = []
    for idx in range(1, len(starts)):
        try:
            start_d = date.fromisoformat(starts[idx - 1])
            next_d = date.fromisoformat(starts[idx])
        except (TypeError, ValueError):
            continue
        length = (next_d - start_d).days
        if not (10 < length < 80):
            continue  # same sanity bounds as sensor.py::_build_cycle_statistics

        point_start = dt_util.start_of_local_day(start_d)
        length_points.append(
            StatisticData(start=point_start, mean=float(length), min=float(length), max=float(length))
        )

        pain_days = _count_pain_days(runtime.symptom_history, start_d, next_d)
        pain_points.append(
            StatisticData(start=point_start, mean=float(pain_days), min=float(pain_days), max=float(pain_days))
        )

    if not length_points:
        return

    length_metadata = StatisticMetaData(
        has_mean=True,
        has_sum=False,
        name=f"{runtime.friendly_name}: Average cycle length",
        source=DOMAIN,
        statistic_id=f"{DOMAIN}:{runtime.profile}_cycle_length",
        unit_of_measurement=UnitOfTime.DAYS,
    )
    pain_metadata = StatisticMetaData(
        has_mean=True,
        has_sum=False,
        name=f"{runtime.friendly_name}: Pain days per cycle",
        source=DOMAIN,
        statistic_id=f"{DOMAIN}:{runtime.profile}_pain_days",
        unit_of_measurement=UnitOfTime.DAYS,
    )

    try:
        async_add_external_statistics(hass, length_metadata, length_points)
        if pain_points:
            async_add_external_statistics(hass, pain_metadata, pain_points)
    except Exception:  # noqa: BLE001 — defensive: never let a recorder API
        # mismatch across HA versions break a normal history save.
        _LOGGER.warning(
            "Could not sync cycle statistics for '%s' — the recorder statistics "
            "API may differ on this Home Assistant version. Cards and the "
            "doctor report are unaffected; only the HA-native statistics graphs "
            "were skipped.",
            runtime.profile,
            exc_info=True,
        )


def _entry_id_for_runtime(hass: HomeAssistant, runtime: MenstruationRuntime) -> str:
    for entry_id, candidate in hass.data.get(DOMAIN, {}).items():
        if candidate is runtime:
            return entry_id
    raise HomeAssistantError(f"Runtime for profile '{runtime.profile}' is not registered.")


async def _async_rotate_ics_token(hass: HomeAssistant, entry_id: str) -> None:
    """Generate a fresh ICS calendar-feed token for one profile and persist
    it, invalidating any URL built from the previous token immediately.

    Called from repairs.py::StaleIcsTokenRepairFlow when the user clicks
    *Fix* on the stale-ICS-token repair issue (HA-Idee 6, "weitere Ideen"
    15.09.2026). Mirrors the same generate-and-save pattern used for the
    token's very first creation in async_setup_entry above.
    """
    runtime: MenstruationRuntime | None = hass.data.get(DOMAIN, {}).get(entry_id)
    if runtime is None:
        _LOGGER.warning("Cannot rotate ICS token — profile '%s' is not currently loaded.", entry_id)
        return

    new_token = secrets.token_urlsafe(32)
    await runtime.storage.async_save_ics_token(new_token)
    runtime.ics_token = new_token
    runtime.ics_token_created_at = dt_util.utcnow().isoformat()
    _LOGGER.info("Rotated ICS calendar-feed token for profile '%s'.", runtime.profile)


def _target_entry_ids_for_call(hass: HomeAssistant, call: ServiceCall | None = None) -> set[str]:
    domain_data: dict[str, MenstruationRuntime] = hass.data.get(DOMAIN, {})
    if not domain_data:
        return set()

    if call is None or not call.data:
        return set(domain_data)

    runtime = _runtime_for_call(hass, call)
    return {_entry_id_for_runtime(hass, runtime)}


async def _async_refresh_cycle_model(hass: HomeAssistant, entry_ids: set[str] | None = None) -> None:
    """Trigger recalculation for loaded cycle sensors and force entity updates."""
    async_dispatcher_send(hass, SIGNAL_HISTORY_UPDATED)

    entity_registry = er.async_get(hass)
    target_entry_ids = entry_ids or set(hass.data.get(DOMAIN, {}))
    entity_ids: list[str] = []

    for entry_id in target_entry_ids:
        for entity_entry in er.async_entries_for_config_entry(entity_registry, entry_id):
            if entity_entry.domain == Platform.SENSOR:
                entity_ids.append(entity_entry.entity_id)

    if entity_ids:
        await hass.services.async_call(
            "homeassistant",
            "update_entity",
            {"entity_id": entity_ids},
            blocking=True,
        )




def _register_domain_services(hass: HomeAssistant) -> None:
    """Register all domain services globally (once per domain load)."""

    common_profile_field = {
        vol.Optional(SERVICE_FIELD_ENTITY_ID): cv.entity_id,
        vol.Optional(SERVICE_FIELD_PROFILE): cv.string,
        vol.Optional(SERVICE_FIELD_ENTRY_ID): cv.string,
    }

    async def async_add(call: ServiceCall) -> None:
        await _async_handle_add(hass, call)

    async def async_remove(call: ServiceCall) -> None:
        await _async_handle_remove(hass, call)

    async def async_set_history(call: ServiceCall) -> None:
        await _async_handle_set_history(hass, call)

    async def async_import_cycle_history(call: ServiceCall) -> dict[str, Any]:
        return await _async_handle_import_cycle_history(hass, call)

    async def async_import_symptom_history(call: ServiceCall) -> dict[str, Any]:
        return await _async_handle_import_symptom_history(hass, call)

    async def async_set_period_duration(call: ServiceCall) -> None:
        await _async_handle_set_period_duration(hass, call)

    async def async_erase_all_history(call: ServiceCall) -> None:
        await _async_handle_erase_all_history(hass, call)

    async def async_export_history(call: ServiceCall) -> None:
        await _async_handle_export_history(hass, call)

    async def async_export_full_backup(call: ServiceCall) -> dict[str, Any]:
        return await _async_handle_export_full_backup(hass, call)

    async def async_import_full_backup(call: ServiceCall) -> dict[str, Any]:
        return await _async_handle_import_full_backup(hass, call)

    async def async_repair_storage(call: ServiceCall) -> dict[str, Any]:
        return await _async_handle_repair_storage(hass, call)

    async def async_get_household_summary(call: ServiceCall) -> dict[str, Any]:
        return await _async_handle_get_household_summary(hass, call)

    async def async_refresh_cycle_model(call: ServiceCall) -> None:
        await _async_handle_refresh_cycle_model(hass, call)

    async def async_log_product_usage(call: ServiceCall) -> None:
        await _async_handle_log_product_usage(hass, call)

    async def async_reimport_basal_temp_statistics(call: ServiceCall) -> None:
        await _async_handle_reimport_basal_temp_statistics(hass, call)

    async def async_manage_household_inventory(call: ServiceCall) -> None:
        await _async_handle_manage_household_inventory(hass, call)

    async def async_add_symptom(call: ServiceCall) -> None:
        await _async_handle_add_symptom(hass, call)

    async def async_remove_symptom(call: ServiceCall) -> None:
        await _async_handle_remove_symptom(hass, call)

    async def async_get_symptom(call: ServiceCall) -> dict[str, Any]:
        return await _async_handle_get_symptom(hass, call)

    async def async_get_full_history(call: ServiceCall) -> dict[str, Any]:
        return await _async_handle_get_full_history(hass, call)

    async def async_get_cycle_predictions(call: ServiceCall) -> dict[str, Any]:
        return await _async_handle_get_cycle_predictions(hass, call)

    async def async_set_pregnancy_mode(call: ServiceCall) -> None:
        await _async_handle_set_pregnancy_mode(hass, call)

    async def async_update_pregnancy_date(call: ServiceCall) -> None:
        await _async_handle_update_pregnancy_date(hass, call)

    async def async_set_menarche_mode(call: ServiceCall) -> None:
        await _async_handle_set_menarche_mode(hass, call)

    async def async_update_menarche_date(call: ServiceCall) -> None:
        await _async_handle_update_menarche_date(hass, call)

    async def async_log_first_period(call: ServiceCall) -> None:
        await _async_handle_log_first_period(hass, call)

    async def async_get_menarche_info(call: ServiceCall) -> dict[str, Any]:
        return await _async_handle_get_menarche_info(hass, call)

    async def async_add_pre_menarche_sign(call: ServiceCall) -> None:
        await _async_handle_add_pre_menarche_sign(hass, call)

    async def async_remove_pre_menarche_sign(call: ServiceCall) -> None:
        await _async_handle_remove_pre_menarche_sign(hass, call)

    async def async_set_menopause_mode(call: ServiceCall) -> None:
        await _async_handle_set_menopause_mode(hass, call)

    async def async_update_menopause_date(call: ServiceCall) -> None:
        await _async_handle_update_menopause_date(hass, call)

    async def async_save_timer_state(call: ServiceCall) -> None:
        await _async_handle_save_timer_state(hass, call)

    async def async_export_doctor_report(call: ServiceCall) -> dict[str, Any]:
        return await _async_handle_export_doctor_report(hass, call)

    async def async_set_profile_visibility(call: ServiceCall) -> None:
        await _async_handle_set_profile_visibility(hass, call)

    async def async_get_dashboard_prefs(call: ServiceCall) -> dict[str, Any]:
        return await _async_handle_get_dashboard_prefs(hass, call)

    async def async_save_dashboard_prefs(call: ServiceCall) -> None:
        await _async_handle_save_dashboard_prefs(hass, call)

    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_CYCLE_START,
        async_add,
        schema=vol.Schema({**common_profile_field, vol.Required(SERVICE_FIELD_DATE): cv.string}),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_REMOVE_CYCLE_START,
        async_remove,
        schema=vol.Schema({**common_profile_field, vol.Required(SERVICE_FIELD_DATE): cv.string}),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_CYCLE_HISTORY,
        async_set_history,
        schema=vol.Schema({**common_profile_field, vol.Required(SERVICE_FIELD_DATES): [cv.string]}),
    )

    _import_history_register_kwargs: dict[str, Any] = {
        "schema": vol.Schema(
            {
                **common_profile_field,
                vol.Required(SERVICE_FIELD_DATES): [cv.string],
                vol.Optional(SERVICE_FIELD_DATE_FORMAT, default=DEFAULT_IMPORT_DATE_FORMAT): vol.In(
                    IMPORT_DATE_FORMATS
                ),
            }
        ),
    }
    if SupportsResponse is not None:
        _import_history_register_kwargs["supports_response"] = SupportsResponse.OPTIONAL
    hass.services.async_register(
        DOMAIN, SERVICE_IMPORT_CYCLE_HISTORY, async_import_cycle_history, **_import_history_register_kwargs
    )

    _import_symptoms_register_kwargs: dict[str, Any] = {
        "schema": vol.Schema(
            {
                **common_profile_field,
                vol.Required(SERVICE_FIELD_ENTRIES): [dict],
                vol.Optional(SERVICE_FIELD_DATE_FORMAT, default=DEFAULT_IMPORT_DATE_FORMAT): vol.In(
                    IMPORT_DATE_FORMATS
                ),
            }
        ),
    }
    if SupportsResponse is not None:
        _import_symptoms_register_kwargs["supports_response"] = SupportsResponse.OPTIONAL
    hass.services.async_register(
        DOMAIN, SERVICE_IMPORT_SYMPTOM_HISTORY, async_import_symptom_history, **_import_symptoms_register_kwargs
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_PERIOD_DURATION,
        async_set_period_duration,
        schema=vol.Schema(
            {
                **common_profile_field,
                vol.Required(SERVICE_FIELD_DAYS): vol.All(vol.Coerce(int), vol.Range(min=1, max=14)),
            }
        ),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_ERASE_ALL_HISTORY,
        async_erase_all_history,
        schema=vol.Schema(
            {
                **common_profile_field,
                vol.Required(SERVICE_FIELD_ENTITY_ID): cv.entity_id,
                vol.Required(SERVICE_FIELD_ERASE_ALL): vol.Equal(True),
            }
        ),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_EXPORT_HISTORY,
        async_export_history,
        schema=vol.Schema(
            {
                **common_profile_field,
                vol.Optional(SERVICE_FIELD_FORMAT, default="csv"): vol.In(["csv", "txt"]),
                vol.Optional(SERVICE_FIELD_FILENAME): cv.string,
            }
        ),
    )

    _full_backup_register_kwargs: dict[str, Any] = {
        # No common_profile_field here on purpose - unlike export_history,
        # this service always covers every loaded profile, not one target.
        "schema": vol.Schema({vol.Optional(SERVICE_FIELD_FILENAME): cv.string}),
    }
    if SupportsResponse is not None:
        _full_backup_register_kwargs["supports_response"] = SupportsResponse.OPTIONAL
    hass.services.async_register(
        DOMAIN, SERVICE_EXPORT_FULL_BACKUP, async_export_full_backup, **_full_backup_register_kwargs
    )

    _import_backup_register_kwargs: dict[str, Any] = {
        # No common_profile_field here either - the backup file itself
        # determines which profiles are touched, not a target selector.
        "schema": vol.Schema(
            {
                vol.Required(SERVICE_FIELD_FILENAME): cv.string,
                vol.Optional(SERVICE_FIELD_MODE, default=DEFAULT_IMPORT_FULL_BACKUP_MODE): vol.In(
                    IMPORT_FULL_BACKUP_MODES
                ),
                vol.Required(SERVICE_FIELD_CONFIRM): vol.Equal(True),
            }
        ),
    }
    if SupportsResponse is not None:
        _import_backup_register_kwargs["supports_response"] = SupportsResponse.OPTIONAL
    hass.services.async_register(
        DOMAIN, SERVICE_IMPORT_FULL_BACKUP, async_import_full_backup, **_import_backup_register_kwargs
    )

    _repair_storage_register_kwargs: dict[str, Any] = {
        # No fields at all - like export_full_backup, this always covers
        # every currently loaded profile rather than one target.
        "schema": vol.Schema({}),
    }
    if SupportsResponse is not None:
        _repair_storage_register_kwargs["supports_response"] = SupportsResponse.OPTIONAL
    hass.services.async_register(
        DOMAIN, SERVICE_REPAIR_STORAGE, async_repair_storage, **_repair_storage_register_kwargs
    )

    _household_summary_register_kwargs: dict[str, Any] = {
        # No fields at all - same reasoning as repair_storage above: always
        # covers every currently loaded profile, never a single target.
        "schema": vol.Schema({}),
    }
    if SupportsResponse is not None:
        _household_summary_register_kwargs["supports_response"] = SupportsResponse.OPTIONAL
    hass.services.async_register(
        DOMAIN, SERVICE_GET_HOUSEHOLD_SUMMARY, async_get_household_summary, **_household_summary_register_kwargs
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_REFRESH_CYCLE_MODEL,
        async_refresh_cycle_model,
        schema=vol.Schema(common_profile_field),
    )

    async def async_send_test_notification(call: ServiceCall) -> None:
        await _async_handle_send_test_notification(hass, call)

    hass.services.async_register(
        DOMAIN,
        SERVICE_SEND_TEST_NOTIFICATION,
        async_send_test_notification,
        schema=vol.Schema(common_profile_field),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_LOG_PRODUCT_USAGE,
        async_log_product_usage,
        schema=vol.Schema(
            {
                **common_profile_field,
                vol.Required(SERVICE_FIELD_PRODUCT): cv.string,
                vol.Optional(SERVICE_FIELD_ACTION, default="used"): vol.In(VALID_PRODUCT_USAGE_ACTIONS),
                vol.Optional(SERVICE_FIELD_QUANTITY, default=1): vol.All(vol.Coerce(int), vol.Range(min=1, max=50)),
                vol.Optional(SERVICE_FIELD_DATE): cv.string,
                vol.Optional(SERVICE_FIELD_AREA_ID): cv.string,
            }
        ),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_REIMPORT_BASAL_TEMP_STATS,
        async_reimport_basal_temp_statistics,
        schema=vol.Schema(common_profile_field),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_MANAGE_HOUSEHOLD_INVENTORY,
        async_manage_household_inventory,
        schema=vol.Schema(
            {
                **common_profile_field,
                vol.Required(SERVICE_FIELD_INVENTORY_ACTION): vol.In(
                    ["set", "add", "consume", "set_thresholds", "add_to_shopping_list", "reset", "set_area_tracking"]
                ),
                vol.Optional(SERVICE_FIELD_PRODUCT): vol.In(HOUSEHOLD_PRODUCTS),
                vol.Optional(SERVICE_FIELD_QUANTITY, default=1): vol.All(vol.Coerce(int), vol.Range(min=0, max=5000)),
                vol.Optional(SERVICE_FIELD_WARNING_THRESHOLD): vol.All(vol.Coerce(int), vol.Range(min=0, max=5000)),
                vol.Optional(SERVICE_FIELD_CRITICAL_THRESHOLD): vol.All(vol.Coerce(int), vol.Range(min=0, max=5000)),
                vol.Optional(SERVICE_FIELD_MEMBER): cv.string,
                vol.Optional(_SERVICE_FIELD_UNDERWEAR_TOTAL_OWNED): vol.All(vol.Coerce(int), vol.Range(min=1, max=5000)),
                vol.Optional(SERVICE_FIELD_AREA_ID): cv.string,
                vol.Optional(SERVICE_FIELD_ENABLED): cv.boolean,
            }
        ),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_SYMPTOM,
        async_add_symptom,
        schema=vol.Schema({**common_profile_field, vol.Required(SERVICE_FIELD_DATE): cv.string, vol.Required(SERVICE_FIELD_SYMPTOM_DATA): dict}),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_REMOVE_SYMPTOM,
        async_remove_symptom,
        schema=vol.Schema({**common_profile_field, vol.Required(SERVICE_FIELD_DATE): cv.string}),
    )

    _register_kwargs: dict[str, Any] = {
        "schema": vol.Schema({**common_profile_field, vol.Required(SERVICE_FIELD_DATE): cv.string}),
    }
    if SupportsResponse is not None:
        _register_kwargs["supports_response"] = SupportsResponse.OPTIONAL
    hass.services.async_register(DOMAIN, SERVICE_GET_SYMPTOM, async_get_symptom, **_register_kwargs)

    _full_history_register_kwargs: dict[str, Any] = {
        "schema": vol.Schema({**common_profile_field, vol.Optional(SERVICE_FIELD_DAYS, default=180): vol.Coerce(int)}),
    }
    if SupportsResponse is not None:
        _full_history_register_kwargs["supports_response"] = SupportsResponse.OPTIONAL
    hass.services.async_register(DOMAIN, SERVICE_GET_FULL_HISTORY, async_get_full_history, **_full_history_register_kwargs)

    _cycle_predictions_register_kwargs: dict[str, Any] = {
        "schema": vol.Schema({
            **common_profile_field,
            vol.Optional(SERVICE_FIELD_DAYS_BACK, default=365): vol.All(vol.Coerce(int), vol.Range(min=1, max=1825)),
            vol.Optional(SERVICE_FIELD_FUTURE_CYCLES, default=3): vol.All(vol.Coerce(int), vol.Range(min=0, max=24)),
        }),
    }
    if SupportsResponse is not None:
        _cycle_predictions_register_kwargs["supports_response"] = SupportsResponse.OPTIONAL
    hass.services.async_register(DOMAIN, SERVICE_GET_CYCLE_PREDICTIONS, async_get_cycle_predictions, **_cycle_predictions_register_kwargs)

    async def async_compare_current_cycle(call: ServiceCall) -> dict[str, Any]:
        return await _async_handle_compare_current_cycle(hass, call)

    _compare_current_cycle_register_kwargs: dict[str, Any] = {
        "schema": vol.Schema({**common_profile_field}),
    }
    if SupportsResponse is not None:
        _compare_current_cycle_register_kwargs["supports_response"] = SupportsResponse.OPTIONAL
    hass.services.async_register(
        DOMAIN, SERVICE_COMPARE_CURRENT_CYCLE, async_compare_current_cycle, **_compare_current_cycle_register_kwargs
    )

    async def async_confirm_contraception_renewal(call: ServiceCall) -> None:
        await _async_handle_confirm_contraception_renewal(hass, call)

    hass.services.async_register(
        DOMAIN,
        SERVICE_CONFIRM_CONTRACEPTION_RENEWAL,
        async_confirm_contraception_renewal,
        schema=vol.Schema({**common_profile_field, vol.Optional(SERVICE_FIELD_DATE): cv.string}),
    )

    async def async_create_periods_from_bleeding(call: ServiceCall) -> dict[str, Any]:
        return await _async_handle_create_periods_from_bleeding(hass, call)

    _create_periods_register_kwargs: dict[str, Any] = {"schema": vol.Schema({**common_profile_field})}
    if SupportsResponse is not None:
        _create_periods_register_kwargs["supports_response"] = SupportsResponse.OPTIONAL
    hass.services.async_register(
        DOMAIN, SERVICE_CREATE_PERIODS_FROM_BLEEDING, async_create_periods_from_bleeding, **_create_periods_register_kwargs
    )

    async def async_get_last_cycle_summary(call: ServiceCall) -> dict[str, Any]:
        return await _async_handle_get_last_cycle_summary(hass, call)

    _last_cycle_summary_register_kwargs: dict[str, Any] = {"schema": vol.Schema({**common_profile_field})}
    if SupportsResponse is not None:
        _last_cycle_summary_register_kwargs["supports_response"] = SupportsResponse.OPTIONAL
    hass.services.async_register(
        DOMAIN, SERVICE_GET_LAST_CYCLE_SUMMARY, async_get_last_cycle_summary, **_last_cycle_summary_register_kwargs
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_PREGNANCY_MODE,
        async_set_pregnancy_mode,
        schema=vol.Schema({**common_profile_field, vol.Required(SERVICE_FIELD_IS_PREGNANT): cv.boolean, vol.Optional(SERVICE_FIELD_PREGNANCY_START_DATE): cv.string}),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_UPDATE_PREGNANCY_DATE,
        async_update_pregnancy_date,
        schema=vol.Schema({**common_profile_field, vol.Required(SERVICE_FIELD_PREGNANCY_START_DATE): cv.string}),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_MENARCHE_MODE,
        async_set_menarche_mode,
        schema=vol.Schema({
            **common_profile_field,
            vol.Required("is_menarche"): cv.boolean,
            vol.Optional(SERVICE_FIELD_ESTIMATED_MENARCHE_DATE): cv.string,
            vol.Optional(SERVICE_FIELD_FAMILY_MENARCHE_AGE): vol.All(vol.Coerce(int), vol.Range(min=DEFAULT_MENARCHE_AGE_MIN, max=DEFAULT_MENARCHE_AGE_MAX)),
        }),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_UPDATE_MENARCHE_DATE,
        async_update_menarche_date,
        schema=vol.Schema({**common_profile_field, vol.Required(SERVICE_FIELD_DATE): cv.string}),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_LOG_FIRST_PERIOD,
        async_log_first_period,
        schema=vol.Schema({**common_profile_field, vol.Optional(SERVICE_FIELD_DATE): cv.string}),
    )

    _menarche_info_kwargs: dict[str, Any] = {
        "schema": vol.Schema(common_profile_field),
    }
    if SupportsResponse is not None:
        _menarche_info_kwargs["supports_response"] = SupportsResponse.OPTIONAL
    hass.services.async_register(DOMAIN, SERVICE_GET_MENARCHE_INFO, async_get_menarche_info, **_menarche_info_kwargs)

    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_PRE_MENARCHE_SIGN,
        async_add_pre_menarche_sign,
        schema=vol.Schema({
            **common_profile_field,
            vol.Required(SERVICE_FIELD_PRE_MENARCHE_SIGN): vol.In(list(PRE_MENARCHE_SIGN_OPTIONS.keys())),
            vol.Required(SERVICE_FIELD_TANNER_STAGE): cv.string,
        }),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_REMOVE_PRE_MENARCHE_SIGN,
        async_remove_pre_menarche_sign,
        schema=vol.Schema({
            **common_profile_field,
            vol.Required(SERVICE_FIELD_PRE_MENARCHE_SIGN): vol.In(list(PRE_MENARCHE_SIGN_OPTIONS.keys())),
        }),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_MENOPAUSE_MODE,
        async_set_menopause_mode,
        schema=vol.Schema({**common_profile_field, vol.Required(SERVICE_FIELD_IS_MENOPAUSE): cv.boolean, vol.Optional(SERVICE_FIELD_MENOPAUSE_START_DATE): cv.string}),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_UPDATE_MENOPAUSE_DATE,
        async_update_menopause_date,
        schema=vol.Schema({**common_profile_field, vol.Required(SERVICE_FIELD_MENOPAUSE_START_DATE): cv.string}),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_SAVE_TIMER_STATE,
        async_save_timer_state,
        schema=vol.Schema({
            **common_profile_field,
            vol.Required("remaining_seconds"): vol.All(vol.Coerce(int), vol.Range(min=0)),
            vol.Required("total_seconds"): vol.All(vol.Coerce(int), vol.Range(min=0)),
            vol.Optional("selected_product"): cv.string,
            vol.Required("is_running"): cv.boolean,
            vol.Required("saved_at"): vol.All(vol.Coerce(int), vol.Range(min=0)),
        }),
    )

    _export_doctor_report_register_kwargs: dict[str, Any] = {
        "schema": vol.Schema({
            **common_profile_field,
            vol.Optional(SERVICE_FIELD_DAYS_BACK, default=180): vol.All(vol.Coerce(int), vol.Range(min=30, max=730)),
            vol.Optional(SERVICE_FIELD_PATIENT_NAME): cv.string,
            vol.Optional(SERVICE_FIELD_PATIENT_BIRTHDATE): cv.string,
            vol.Optional(SERVICE_FIELD_LANGUAGE, default="de"): vol.In(list(DOCTOR_REPORT_LANGUAGES)),
        })
    }
    if SupportsResponse is not None:
        _export_doctor_report_register_kwargs["supports_response"] = SupportsResponse.OPTIONAL
    hass.services.async_register(
        DOMAIN, SERVICE_EXPORT_DOCTOR_REPORT, async_export_doctor_report, **_export_doctor_report_register_kwargs
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_PROFILE_VISIBILITY,
        async_set_profile_visibility,
        schema=vol.Schema({
            **common_profile_field,
            vol.Required(SERVICE_FIELD_VISIBILITY_LEVEL): vol.In(VISIBILITY_LEVELS),
        }),
    )

    _dashboard_prefs_get_kwargs: dict[str, Any] = {
        "schema": vol.Schema({vol.Optional(SERVICE_FIELD_PROFILE, default="default"): cv.string}),
    }
    if SupportsResponse is not None:
        _dashboard_prefs_get_kwargs["supports_response"] = SupportsResponse.OPTIONAL
    hass.services.async_register(DOMAIN, SERVICE_GET_DASHBOARD_PREFS, async_get_dashboard_prefs, **_dashboard_prefs_get_kwargs)

    hass.services.async_register(
        DOMAIN,
        SERVICE_SAVE_DASHBOARD_PREFS,
        async_save_dashboard_prefs,
        schema=vol.Schema({
            vol.Optional(SERVICE_FIELD_PROFILE, default="default"): cv.string,
            vol.Required(SERVICE_FIELD_PREFS): dict,
        }),
    )


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up integration from YAML (not used, config-entry only)."""
    hass.data.setdefault(DOMAIN, {})
    _register_domain_services(hass)
    # Migrate any config entries still registered under the old domain.
    _async_schedule_old_domain_migration(hass)
    return True


def _async_schedule_old_domain_migration(hass: HomeAssistant) -> None:
    """Detect old menstruation_gauge entries and create repair issues for each.

    Instead of migrating silently in the background, a repair issue is raised
    in *Settings → System → Repairs* so the user can review the sensor mapping
    and confirm the migration by clicking *Fix*.
    """
    from .repairs import async_create_migration_issue

    old_entries = hass.config_entries.async_entries(OLD_DOMAIN)
    if not old_entries:
        return
    for old_entry in old_entries:
        _LOGGER.warning(
            "Detected config entry '%s' under old domain '%s' – "
            "a repair issue has been created. "
            "Please go to Settings → System → Repairs to complete the migration to '%s'.",
            old_entry.title,
            OLD_DOMAIN,
            DOMAIN,
        )
        async_create_migration_issue(hass, old_entry.entry_id, old_entry.title)


async def _async_migrate_old_domain_entry(hass: HomeAssistant, old_entry: ConfigEntry) -> None:
    """Migrate a single menstruation_gauge config entry to menstruation_cycle."""
    from .repairs import async_delete_migration_issue

    try:
        # If a menstruation_cycle entry with the same unique_id already exists,
        # the migration already ran; just clean up the leftover old entry.
        existing = next(
            (
                e
                for e in hass.config_entries.async_entries(DOMAIN)
                if e.unique_id == old_entry.unique_id
            ),
            None,
        )
        if existing is not None:
            _LOGGER.info(
                "Entry '%s' already migrated to '%s'. Removing leftover '%s' entry.",
                old_entry.title,
                DOMAIN,
                OLD_DOMAIN,
            )
            await hass.config_entries.async_remove(old_entry.entry_id)
            async_delete_migration_issue(hass, old_entry.entry_id)
            return

        # Initiate an import flow that creates a new menstruation_cycle entry.
        result = await hass.config_entries.flow.async_init(
            DOMAIN,
            context={"source": ce.SOURCE_IMPORT},
            data={**old_entry.data, "unique_id": old_entry.unique_id},
        )

        result_type = result.get("type", "")
        if result_type in ("create_entry", "abort"):
            _LOGGER.info(
                "Successfully migrated '%s' from '%s' to '%s' (result: %s).",
                old_entry.title,
                OLD_DOMAIN,
                DOMAIN,
                result_type,
            )
        else:
            _LOGGER.warning(
                "Unexpected result '%s' while migrating '%s' from '%s' to '%s'.",
                result_type,
                old_entry.title,
                OLD_DOMAIN,
                DOMAIN,
            )

        # Remove the old entry regardless of result so it does not block HA startup.
        await hass.config_entries.async_remove(old_entry.entry_id)

        # Delete the repair issue now that migration is complete.
        async_delete_migration_issue(hass, old_entry.entry_id)

    except Exception:  # noqa: BLE001
        _LOGGER.exception(
            "Unexpected error while migrating '%s' from '%s' to '%s'.",
            old_entry.title,
            OLD_DOMAIN,
            DOMAIN,
        )


async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Migrate old single-profile entry to profile schema."""
    if entry.version >= 2:
        return True

    old_name = str(entry.data.get(CONF_NAME, DEFAULT_NAME)).strip() or DEFAULT_NAME
    profile = slugify(old_name).strip("_") or "default"
    new_data = {
        CONF_PROFILE: profile,
        CONF_FRIENDLY_NAME: old_name,
        CONF_ICON: "",
    }
    hass.config_entries.async_update_entry(entry, data=new_data, title=old_name, version=2)
    return True


def _sync_profile_label(hass: HomeAssistant, entry: ConfigEntry, friendly_name: str) -> None:
    """Groups all of this profile's entities under one HA label (HA-17 Idee 7,
    "weitere Ideen?" 27.09.2026, "Automatische HA-Labels pro Profil") so they
    can be filtered/managed together under Settings -> Labels, independent of
    any dashboard. Idempotent and cheap - safe to run on every load, same as
    the repair checks below.

    Bugfix 28.09.2026 (Fehlermeldung aus Simons Live-Instanz): LabelRegistry
    hat KEIN async_get_or_create - dieser Aufruf liess async_setup_entry mit
    einem AttributeError fuer JEDES Profil crashen, noch nach dem bereits
    erfolgreichen async_forward_entry_setups(entry, PLATFORMS) weiter oben.
    Echte Registry-API: async_get_label_by_name zum Nachschlagen,
    async_create nur wenn noch keins existiert - selbst nachgebaut.

    Known limitation: looks the label up by name, so renaming a profile
    creates a second label rather than renaming the existing one -
    acceptable for a nice-to-have organizational feature. Upgrade path if
    that becomes annoying in practice: persist the created label_id in
    entry.data and rename that same label directly on future loads instead
    of relooking it up by name.
    """
    label_reg = lr.async_get(hass)
    label_name = f"{_PROFILE_LABEL_PREFIX}{friendly_name}"
    label = label_reg.async_get_label_by_name(label_name)
    if label is None:
        label = label_reg.async_create(label_name, icon=_icon_from_entry(entry) or None)

    entity_reg = er.async_get(hass)
    for entity_entry in er.async_entries_for_config_entry(entity_reg, entry.entry_id):
        if label.label_id not in entity_entry.labels:
            entity_reg.async_update_entity(
                entity_entry.entity_id, labels=entity_entry.labels | {label.label_id}
            )


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up menstruation gauge profile from config entry."""
    hass.data.setdefault(DOMAIN, {})
    await _async_ensure_household_inventory_loaded(hass)

    profile = _profile_from_entry(entry)
    friendly_name = _friendly_name_from_entry(entry)
    icon = _icon_from_entry(entry)

    storage = MenstruationStorage(
        hass,
        key=f"{STORAGE_KEY}.{profile}",
        legacy_key=f"{STORAGE_KEY_LEGACY}.{profile}",
    )
    stored = await storage.async_load()
    stored_stage = str(stored.get(CONF_ONBOARDING_STAGE) or "").strip().lower()
    option_stage = str(entry.options.get(CONF_ONBOARDING_STAGE) or "").strip().lower()
    data_stage = str(entry.data.get(CONF_ONBOARDING_STAGE) or "").strip().lower()
    onboarding_stage = option_stage or data_stage or stored_stage or DEFAULT_ONBOARDING_STAGE
    if onboarding_stage not in ONBOARDING_STAGES:
        onboarding_stage = DEFAULT_ONBOARDING_STAGE

    # Sichtbarkeitsstufe (Feature-Wunsch 02.09.2026) wird bewusst NUR ueber
    # den neuen Service set_profile_visibility gesetzt, nicht ueber den
    # Options-Flow (anders als onboarding_stage oben) - die Person, die das
    # Profil betrifft, soll das direkt aus der Companion-App heraus steuern
    # koennen, ohne dass eine zweite Konfigurationsoberflaeche denselben Wert
    # ueberschreiben kann. Deshalb nur aus dem persistenten Storage gelesen.
    visibility_level = str(stored.get(CONF_VISIBILITY_LEVEL) or "").strip().lower()
    if visibility_level not in VISIBILITY_LEVELS:
        visibility_level = DEFAULT_VISIBILITY_LEVEL

    ics_token: str = stored.get(ICS_TOKEN_KEY) or ""
    ics_token_created_at: str = stored.get(ICS_TOKEN_CREATED_AT_KEY) or ""
    if not ics_token:
        ics_token = secrets.token_urlsafe(32)
    if not ics_token or not ics_token_created_at:
        # Covers two cases with one save: (a) no token existed yet - create
        # one, or (b) a token exists but predates this feature (HA-Idee 6,
        # "weitere Ideen" 15.09.2026) and has no creation timestamp. Either
        # way async_save_ics_token stamps ics_token_created_at to now() -
        # for case (b) that's a deliberate "treat unknown age as just
        # created" backfill, so upgrading doesn't immediately flag every
        # existing install as stale.
        await storage.async_save_ics_token(ics_token)
        ics_token_created_at = dt_util.utcnow().isoformat()

    runtime = MenstruationRuntime(
        storage=storage,
        profile=profile,
        friendly_name=friendly_name,
        icon=icon,
        history=stored[ATTR_HISTORY],
        period_duration_days=stored.get(ATTR_PERIOD_DURATION_DAYS, DEFAULT_PERIOD_DURATION_DAYS),
        symptom_history=stored.get(ATTR_SYMPTOM_HISTORY, []),
        product_usage=stored.get(ATTR_PRODUCT_USAGE, []),
        ics_token=ics_token,
        ics_token_created_at=ics_token_created_at,
        pregnancy_data=stored.get("pregnancy_data", {"is_pregnant": False, "start_date": None}),
        menarche_data=stored.get("menarche_data", {"tracking_active": False, "is_menarche": False, "menarche_date": None, "estimated_date": None, "family_menarche_age": None}),
        pre_menarche_data=stored.get("pre_menarche_data", {"signs": {}, "tanner_stage": None}),
        menopause_data=stored.get("menopause_data", {"is_menopause": False, "start_date": None}),
        noncycle_data=stored.get("noncycle_data", {"has_noncycle": False}),
        onboarding_stage=onboarding_stage,
        visibility_level=visibility_level,
        cycle_length_override=stored.get("cycle_length_override"),
    )

    async def _async_handle_midnight_refresh(_now: datetime) -> None:
        # Each step is independent — a failure in one (e.g. cycle model
        # refresh hitting unexpected data) shouldn't silently skip the
        # others for this profile on this day. Cross-profile isolation is
        # already safe (each profile registers its own callback), this adds
        # per-step isolation within a single profile's routine too.
        try:
            await _async_refresh_cycle_model(hass, {entry.entry_id})
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight cycle model refresh failed for %s", entry.entry_id)
        try:
            await _async_check_contraception_renewal_todo(hass, runtime)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight contraception renewal check failed for %s", entry.entry_id)
        try:
            await _async_check_pill_refill_todo(hass, entry, runtime)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight pill refill check failed for %s", entry.entry_id)
        try:
            # HA-Idee 6 (weitere Ideen, 15.09.2026): re-check daily rather
            # than only on integration load/restart, so the repair issue
            # appears promptly once the token crosses the staleness
            # threshold on a long-running HA instance that's rarely restarted.
            from .repairs import async_check_stale_ics_token

            async_check_stale_ics_token(hass, entry.entry_id, entry.title, runtime.ics_token_created_at)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight stale-ICS-token check failed for %s", entry.entry_id)
        try:
            # HA-3 (M-Cycle_HA-Component-Roadmap.md, "weitere Ideen"
            # 22.09.2026): same daily-recheck reasoning as the ICS-token
            # check directly above - a profile can cross the "enough cycles
            # logged" threshold on any day, not just on integration
            # load/restart.
            from .repairs import async_check_low_prediction_confidence

            _midnight_model = build_cycle_model(
                history=runtime.history,
                period_duration_days=runtime.period_duration_days,
                symptom_history=runtime.symptom_history,
                pregnancy_data=runtime.pregnancy_data,
                menarche_data=runtime.menarche_data,
                pre_menarche_data=runtime.pre_menarche_data,
                menopause_data=runtime.menopause_data,
                noncycle_data=runtime.noncycle_data,
                cycle_length_override=runtime.cycle_length_override,
                nfp_mode=entry.options.get(CONF_NFP_ANALYSIS_MODE, DEFAULT_NFP_ANALYSIS_MODE),
                onboarding_stage=getattr(runtime, "onboarding_stage", None),
                today=dt_util.now().date(),
            )
            async_check_low_prediction_confidence(
                hass, entry.entry_id, entry.title, _midnight_model.prediction_gating
            )
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight low-prediction-confidence check failed for %s", entry.entry_id)
        try:
            # Same daily-recheck reasoning as the checks above.
            from .repairs import async_check_low_wellness_score

            async_check_low_wellness_score(
                hass, entry.entry_id, entry.title, cycle_wellness_score(_midnight_model, dt_util.now().date())
            )
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight low-wellness-score check failed for %s", entry.entry_id)
        try:
            # Same daily-recheck reasoning as the checks above.
            from .repairs import async_check_cycle_pattern_risk

            async_check_cycle_pattern_risk(
                hass, entry.entry_id, entry.title, cycle_pattern_signals(_midnight_model, dt_util.now().date())
            )
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight cycle-pattern-risk check failed for %s", entry.entry_id)
        try:
            # Same daily-recheck reasoning as the checks above - a bleed can cross the threshold on any day.
            from .repairs import async_check_period_prolonged

            async_check_period_prolonged(
                hass, entry.entry_id, entry.title, _midnight_model.current_period, dt_util.now().date()
            )
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight period-prolonged check failed for %s", entry.entry_id)
        try:
            # Same daily-recheck reasoning as the checks above - a checkup becomes overdue on a specific day.
            from .repairs import async_check_checkup_overdue

            async_check_checkup_overdue(
                hass,
                entry.entry_id,
                entry.title,
                runtime.symptom_history,
                dt_util.now().date(),
                int(entry.options.get(CONF_CHECKUP_INTERVAL_MONTHS, DEFAULT_CHECKUP_INTERVAL_MONTHS)),
            )
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight checkup-overdue check failed for %s", entry.entry_id)
        try:
            # Same daily-recheck reasoning as the checks above - days overdue grows by one every day.
            from .repairs import async_check_period_overdue

            async_check_period_overdue(
                hass,
                entry.entry_id,
                entry.title,
                _midnight_model.days_until_next_start,
                _midnight_model.state == STATE_PERIOD,
                bool((_midnight_model.prediction_gating or {}).get("precision_allowed")),
            )
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight period-overdue check failed for %s", entry.entry_id)
        try:
            # "weitere Ideen" 24.09.2026: same daily-recheck reasoning as the
            # checks above - the due date gets closer every day, so this
            # needs to re-evaluate daily rather than only on integration
            # load/restart, same as the ICS-token/prediction-confidence checks.
            from .repairs import async_check_hospital_bag_incomplete

            async_check_hospital_bag_incomplete(
                hass,
                entry.entry_id,
                entry.title,
                bool(runtime.pregnancy_data.get("is_pregnant")),
                _midnight_model.due_date,
                await runtime.storage.async_load_hospital_bag_items(),
                dt_util.now().date(),
            )
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight hospital-bag-incomplete check failed for %s", entry.entry_id)
        try:
            from .repairs import async_check_pregnancy_overdue

            async_check_pregnancy_overdue(
                hass,
                entry.entry_id,
                entry.title,
                bool(runtime.pregnancy_data.get("is_pregnant")),
                _midnight_model.due_date,
                dt_util.now().date(),
            )
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight pregnancy-overdue check failed for %s", entry.entry_id)
        try:
            # "weitere Ideen?" 25.09.2026: re-diagnosed daily, same reasoning
            # as the checks above - new history/symptom data can introduce or
            # resolve a finding on any day, not just on integration
            # load/restart.
            from .repairs import async_check_storage_integrity

            _storage_issues = await _async_diagnose_profile_storage(runtime)
            async_check_storage_integrity(hass, entry.entry_id, entry.title, _storage_issues)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight storage-integrity check failed for %s", entry.entry_id)
        try:
            # Same daily-recheck reasoning as the checks above.
            from .repairs import async_check_profile_inactive

            async_check_profile_inactive(
                hass, entry.entry_id, entry.title, _profile_last_activity_date(runtime), dt_util.now().date()
            )
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight profile-inactive check failed for %s", entry.entry_id)
        try:
            # Wettbewerbs-Recherche ("weitere ideen?" 02.10.2026): daily
            # re-check, same reasoning as the checks above - a new reading
            # can land on the linked sensor any day.
            await _async_import_basal_temp_from_linked_sensor(hass, entry, runtime, dt_util.now().date())
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight basal-temp import failed for %s", entry.entry_id)
        try:
            # HA-Idee 2 ("weitere Ideen?" 27.09.2026): household inventory is
            # shared, not per-profile, so this is a safety net for thresholds
            # changed (or stock aged) without a fresh consumption event to
            # trigger the checks in _async_register_consumption/
            # _async_handle_manage_household_inventory - idempotent, so
            # running it once per loaded profile every midnight is harmless.
            from .repairs import async_check_household_inventory_critical

            await _async_ensure_household_inventory_loaded(hass)
            _household_data = hass.data.get(HOUSEHOLD_INVENTORY_DATA_KEY)
            if isinstance(_household_data, dict):
                async_check_household_inventory_critical(
                    hass, _household_inventory_critical_products(_household_data)
                )
                _async_check_household_supply(hass, _household_data)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight household-inventory-critical check failed")

    runtime.unregister_midnight_listener = async_track_time_change(
        hass,
        _async_handle_midnight_refresh,
        hour=0,
        minute=0,
        second=5,
    )

    _register_notification_timer(hass, entry, runtime)
    _register_basal_temp_listener(hass, entry, runtime)

    async def _async_on_mobile_action(event: Any) -> None:
        await _async_handle_mobile_action(hass, entry, runtime, event)

    entry.async_on_unload(hass.bus.async_listen(EVENT_MOBILE_APP_NOTIFICATION_ACTION, _async_on_mobile_action))

    _rearm_snoozes(hass, entry, runtime)

    hass.data[DOMAIN][entry.entry_id] = runtime

    # Register a lightweight options update listener that re-syncs the dashboard
    # panel without a full reload. Stored on the runtime so it can be cleanly
    # unsubscribed in async_unload_entry.
    runtime.options_update_unsub = entry.add_update_listener(_async_options_update_listener)

    await _async_update_household_inventory_state(hass)
    await _async_load_timer_state(hass, profile)

    # Re-register services if they were removed when the last entry was unloaded.
    # Normally services are registered once in async_setup(); this handles the
    # edge case where all entries were removed (services cleaned up) and a new
    # entry is being added in the same HA session.
    if not hass.services.has_service(DOMAIN, SERVICE_ADD_CYCLE_START):
        _register_domain_services(hass)

    await _async_register_http_handlers(hass)
    _async_schedule_lovelace_resource_registration(hass)
    try:
        await _async_sync_dashboard_sidebar_panel(hass)
    except Exception as err:  # noqa: BLE001
        _LOGGER.warning("Dashboard sidebar panel sync failed (non-fatal): %s", err)

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Check whether this profile's entities still use the pre-"menstruation_"-
    # prefix ID scheme (from before device grouping + searchable entity IDs were
    # added) and raise a repair issue offering to rename them if so. Cheap
    # registry scan, safe to run on every load.
    from .repairs import async_check_entity_naming, async_check_stale_ics_token

    async_check_entity_naming(hass, entry.entry_id, entry.title, friendly_name)
    async_check_stale_ics_token(hass, entry.entry_id, entry.title, ics_token_created_at)

    # HA-17 Idee 7 ("weitere Ideen?" 27.09.2026, Simon: "Automatische
    # HA-Labels pro Profil") - same "cheap, safe to run on every load"
    # reasoning as the checks above and below.
    _sync_profile_label(hass, entry, friendly_name)

    # HA-3 (M-Cycle_HA-Component-Roadmap.md, "weitere Ideen" 22.09.2026):
    # same "cheap, safe to run on every load" reasoning as the two checks
    # directly above.
    from .repairs import async_check_low_prediction_confidence

    _setup_model = build_cycle_model(
        history=runtime.history,
        period_duration_days=runtime.period_duration_days,
        symptom_history=runtime.symptom_history,
        pregnancy_data=runtime.pregnancy_data,
        menarche_data=runtime.menarche_data,
        pre_menarche_data=runtime.pre_menarche_data,
        menopause_data=runtime.menopause_data,
        noncycle_data=runtime.noncycle_data,
        cycle_length_override=runtime.cycle_length_override,
        nfp_mode=entry.options.get(CONF_NFP_ANALYSIS_MODE, DEFAULT_NFP_ANALYSIS_MODE),
        onboarding_stage=getattr(runtime, "onboarding_stage", None),
        today=dt_util.now().date(),
    )
    async_check_low_prediction_confidence(hass, entry.entry_id, entry.title, _setup_model.prediction_gating)

    # Same "cheap, safe to run on every load" reasoning as the checks above.
    from .repairs import async_check_low_wellness_score

    async_check_low_wellness_score(
        hass, entry.entry_id, entry.title, cycle_wellness_score(_setup_model, dt_util.now().date())
    )

    # Same "cheap, safe to run on every load" reasoning as the checks above.
    from .repairs import async_check_cycle_pattern_risk

    async_check_cycle_pattern_risk(
        hass, entry.entry_id, entry.title, cycle_pattern_signals(_setup_model, dt_util.now().date())
    )

    # Same "cheap, safe to run on every load" reasoning as the checks above.
    from .repairs import async_check_period_prolonged

    async_check_period_prolonged(hass, entry.entry_id, entry.title, _setup_model.current_period, dt_util.now().date())

    # Same "cheap, safe to run on every load" reasoning as the checks above.
    from .repairs import async_check_checkup_overdue

    async_check_checkup_overdue(
        hass,
        entry.entry_id,
        entry.title,
        runtime.symptom_history,
        dt_util.now().date(),
        int(entry.options.get(CONF_CHECKUP_INTERVAL_MONTHS, DEFAULT_CHECKUP_INTERVAL_MONTHS)),
    )

    # Same "cheap, safe to run on every load" reasoning as the checks above.
    from .repairs import async_check_period_overdue

    async_check_period_overdue(
        hass,
        entry.entry_id,
        entry.title,
        _setup_model.days_until_next_start,
        _setup_model.state == STATE_PERIOD,
        bool((_setup_model.prediction_gating or {}).get("precision_allowed")),
    )

    # "weitere Ideen" 24.09.2026: same "cheap, safe to run on every load"
    # reasoning as the checks above.
    from .repairs import async_check_hospital_bag_incomplete

    async_check_hospital_bag_incomplete(
        hass,
        entry.entry_id,
        entry.title,
        bool(runtime.pregnancy_data.get("is_pregnant")),
        _setup_model.due_date,
        await runtime.storage.async_load_hospital_bag_items(),
        dt_util.now().date(),
    )

    from .repairs import async_check_pregnancy_overdue

    async_check_pregnancy_overdue(
        hass,
        entry.entry_id,
        entry.title,
        bool(runtime.pregnancy_data.get("is_pregnant")),
        _setup_model.due_date,
        dt_util.now().date(),
    )

    # "weitere Ideen?" 25.09.2026: same "cheap, safe to run on every load"
    # reasoning as the checks above - reuses the exact detection logic the
    # repair_storage service already exposes on demand (see
    # _async_diagnose_profile_storage), so this can never diverge from what
    # that service would report.
    from .repairs import async_check_storage_integrity

    _setup_storage_issues = await _async_diagnose_profile_storage(runtime)
    async_check_storage_integrity(hass, entry.entry_id, entry.title, _setup_storage_issues)

    # Same "cheap, safe to run on every load" reasoning as the checks above.
    from .repairs import async_check_profile_inactive

    async_check_profile_inactive(
        hass, entry.entry_id, entry.title, _profile_last_activity_date(runtime), dt_util.now().date()
    )

    # Wettbewerbs-Recherche ("weitere ideen?" 02.10.2026): also run once on
    # load, same reasoning as the checks above - picks up today's reading
    # right away instead of waiting for the next midnight refresh.
    await _async_import_basal_temp_from_linked_sensor(hass, entry, runtime, dt_util.now().date())

    # HA-Idee 2 ("weitere Ideen?" 27.09.2026): same safety net as the
    # midnight refresh above, also run once on load so a critical stock
    # level found while the integration was unloaded is surfaced right away
    # rather than waiting for the next consumption event or midnight.
    from .repairs import async_check_household_inventory_critical

    await _async_ensure_household_inventory_loaded(hass)
    _setup_household_data = hass.data.get(HOUSEHOLD_INVENTORY_DATA_KEY)
    if isinstance(_setup_household_data, dict):
        async_check_household_inventory_critical(
            hass, _household_inventory_critical_products(_setup_household_data)
        )
        _async_check_household_supply(hass, _setup_household_data)

    return True


def _register_notification_timer(hass: HomeAssistant, entry: ConfigEntry, runtime: MenstruationRuntime) -> None:
    """(Re-)register the daily notification trigger at CONF_NOTIFY_TIME.

    Notifications used to run inside the midnight refresh (00:00:05) and so
    arrived at night; this gives them their own, user-configurable time.
    Safe to call again after an options change - drops the previous listener first.
    """
    if runtime.unregister_notify_listener:
        runtime.unregister_notify_listener()
    if runtime.unregister_log_listener:
        runtime.unregister_log_listener()
        runtime.unregister_log_listener = None
    if runtime.unregister_pill_listener:
        runtime.unregister_pill_listener()
        runtime.unregister_pill_listener = None
    raw_time = str(entry.options.get(CONF_NOTIFY_TIME, DEFAULT_NOTIFY_TIME) or DEFAULT_NOTIFY_TIME)
    try:
        parsed = datetime.strptime(raw_time[:8], "%H:%M:%S")
    except ValueError:
        parsed = datetime.strptime(DEFAULT_NOTIFY_TIME, "%H:%M:%S")

    async def _async_handle_notification_time(_now: datetime) -> None:
        try:
            await _async_check_and_send_notifications(hass, entry, runtime)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Scheduled notification check failed for %s", entry.entry_id)

    runtime.unregister_notify_listener = async_track_time_change(
        hass, _async_handle_notification_time, hour=parsed.hour, minute=parsed.minute, second=0
    )

    if entry.options.get(CONF_NOTIFY_LOG_REMINDER_ENABLED, DEFAULT_NOTIFY_LOG_REMINDER_ENABLED):
        raw_log_time = str(
            entry.options.get(CONF_NOTIFY_LOG_REMINDER_TIME, DEFAULT_NOTIFY_LOG_REMINDER_TIME)
            or DEFAULT_NOTIFY_LOG_REMINDER_TIME
        )
        try:
            log_parsed = datetime.strptime(raw_log_time[:8], "%H:%M:%S")
        except ValueError:
            log_parsed = datetime.strptime(DEFAULT_NOTIFY_LOG_REMINDER_TIME, "%H:%M:%S")

        async def _async_handle_log_reminder_time(_now: datetime) -> None:
            try:
                await _async_send_log_reminder(hass, entry, runtime)
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Scheduled log reminder failed for %s", entry.entry_id)

        runtime.unregister_log_listener = async_track_time_change(
            hass, _async_handle_log_reminder_time, hour=log_parsed.hour, minute=log_parsed.minute, second=0
        )

    if entry.options.get(CONF_NOTIFY_PILL_ENABLED, DEFAULT_NOTIFY_PILL_ENABLED):
        raw_pill_time = str(entry.options.get(CONF_NOTIFY_PILL_TIME, DEFAULT_NOTIFY_PILL_TIME) or DEFAULT_NOTIFY_PILL_TIME)
        try:
            pill_parsed = datetime.strptime(raw_pill_time[:8], "%H:%M:%S")
        except ValueError:
            pill_parsed = datetime.strptime(DEFAULT_NOTIFY_PILL_TIME, "%H:%M:%S")

        async def _async_handle_pill_reminder_time(_now: datetime) -> None:
            try:
                await _async_send_pill_reminder(hass, entry, runtime)
                await _async_send_rhythm_reminder(hass, entry, runtime)
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Scheduled pill reminder failed for %s", entry.entry_id)

        pill_unsubs = [
            async_track_time_change(
                hass, _async_handle_pill_reminder_time, hour=pill_parsed.hour, minute=pill_parsed.minute, second=0
            )
        ]
        followup_hours = max(
            0,
            min(
                NOTIFY_PILL_FOLLOWUP_HOURS_MAX,
                int(entry.options.get(CONF_NOTIFY_PILL_FOLLOWUP_HOURS, DEFAULT_NOTIFY_PILL_FOLLOWUP_HOURS)),
            ),
        )
        followup_parsed = pill_parsed + timedelta(hours=followup_hours)
        # ponytail: a follow-up that would land after midnight is skipped, the reminder is per-day
        if followup_hours and followup_parsed.date() == pill_parsed.date():
            pill_unsubs.append(
                async_track_time_change(
                    hass,
                    _async_handle_pill_reminder_time,
                    hour=followup_parsed.hour,
                    minute=followup_parsed.minute,
                    second=0,
                )
            )

        def _unsub_pill_listeners() -> None:
            for unsub in pill_unsubs:
                unsub()

        runtime.unregister_pill_listener = _unsub_pill_listeners


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    runtime: MenstruationRuntime | None = hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    if runtime:
        if runtime.unregister_midnight_listener:
            runtime.unregister_midnight_listener()
        if runtime.unregister_notify_listener:
            runtime.unregister_notify_listener()
        if runtime.unregister_log_listener:
            runtime.unregister_log_listener()
        if runtime.unregister_pill_listener:
            runtime.unregister_pill_listener()
        if runtime.unregister_basal_temp_listener:
            runtime.unregister_basal_temp_listener()
        if runtime.options_update_unsub:
            runtime.options_update_unsub()
    await _async_update_household_inventory_state(hass)

    from .repairs import (
        async_delete_entity_naming_issue,
        async_delete_notify_target_issue,
        async_delete_stale_ics_token_issue,
    )

    async_delete_entity_naming_issue(hass, entry.entry_id)
    async_delete_notify_target_issue(hass, entry.entry_id)
    async_delete_stale_ics_token_issue(hass, entry.entry_id)

    if not hass.data.get(DOMAIN):
        for service in (
            SERVICE_ADD_CYCLE_START,
            SERVICE_REMOVE_CYCLE_START,
            SERVICE_SET_CYCLE_HISTORY,
            SERVICE_IMPORT_CYCLE_HISTORY,
            SERVICE_IMPORT_SYMPTOM_HISTORY,
            SERVICE_SET_PERIOD_DURATION,
            SERVICE_ERASE_ALL_HISTORY,
            SERVICE_EXPORT_HISTORY,
            SERVICE_EXPORT_FULL_BACKUP,
            SERVICE_IMPORT_FULL_BACKUP,
            SERVICE_REPAIR_STORAGE,
            SERVICE_REFRESH_CYCLE_MODEL,
            SERVICE_SEND_TEST_NOTIFICATION,
            SERVICE_LOG_PRODUCT_USAGE,
            SERVICE_MANAGE_HOUSEHOLD_INVENTORY,
            SERVICE_ADD_SYMPTOM,
            SERVICE_REMOVE_SYMPTOM,
            SERVICE_GET_SYMPTOM,
            SERVICE_GET_FULL_HISTORY,
            SERVICE_SET_PREGNANCY_MODE,
            SERVICE_UPDATE_PREGNANCY_DATE,
            SERVICE_SET_MENARCHE_MODE,
            SERVICE_UPDATE_MENARCHE_DATE,
            SERVICE_LOG_FIRST_PERIOD,
            SERVICE_GET_MENARCHE_INFO,
            SERVICE_ADD_PRE_MENARCHE_SIGN,
            SERVICE_REMOVE_PRE_MENARCHE_SIGN,
            SERVICE_SET_MENOPAUSE_MODE,
            SERVICE_UPDATE_MENOPAUSE_DATE,
            SERVICE_SAVE_TIMER_STATE,
            SERVICE_COMPARE_CURRENT_CYCLE,
            SERVICE_GET_LAST_CYCLE_SUMMARY,
            SERVICE_CONFIRM_CONTRACEPTION_RENEWAL,
            SERVICE_CREATE_PERIODS_FROM_BLEEDING,
            SERVICE_EXPORT_DOCTOR_REPORT,
            SERVICE_GET_CYCLE_PREDICTIONS,
            SERVICE_GET_DASHBOARD_PREFS,
            SERVICE_GET_HOUSEHOLD_SUMMARY,
            SERVICE_SAVE_DASHBOARD_PREFS,
            SERVICE_SET_PROFILE_VISIBILITY,
            SERVICE_REIMPORT_BASAL_TEMP_STATS,
        ):
            if hass.services.has_service(DOMAIN, service):
                hass.services.async_remove(DOMAIN, service)

    await _async_sync_dashboard_sidebar_panel(hass)
    return unload_ok


async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload config entry."""
    await async_unload_entry(hass, entry)
    await async_setup_entry(hass, entry)


async def _async_options_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options updates: sync dashboard panel non-fatally without a full reload."""
    _updated_runtime = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if _updated_runtime is not None:
        _register_notification_timer(hass, entry, _updated_runtime)
        _register_basal_temp_listener(hass, entry, _updated_runtime)
        try:
            await _async_import_basal_temp_from_linked_sensor(hass, entry, _updated_runtime, dt_util.now().date())
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Options update: basal-temp import failed for %s", entry.entry_id)
    try:
        await _async_sync_dashboard_sidebar_panel(hass)
    except Exception as err:  # noqa: BLE001
        _LOGGER.warning("Options update: dashboard sync failed (non-fatal): %s", err)

    # HA-Idee (weitere Ideen, 22.09.2026, "Kalender pro Person einschalten/
    # ausschalten koennen"): CONF_CALENDAR_ENABLED (see const.py) is read
    # directly from entry.options at the point of use in calendar.py, same
    # as CONF_DASHBOARD_ENABLED above - no runtime field to keep in sync.
    # But calendar.py's MenstruationCycleCalendar only recomputes its cached
    # events/availability when SIGNAL_HISTORY_UPDATED fires (see its
    # _handle_history_updated) - without a nudge here, toggling the option
    # would silently do nothing until the next unrelated history/symptom
    # change. Deliberately just the dispatch (not the heavier
    # _async_refresh_cycle_model, which also force-polls every sensor entity
    # - unnecessary for a calendar-only toggle and outside this option's
    # scope).
    try:
        async_dispatcher_send(hass, SIGNAL_HISTORY_UPDATED)
    except Exception as err:  # noqa: BLE001
        _LOGGER.warning("Options update: calendar/sensor refresh signal failed (non-fatal): %s", err)


async def _async_load_timer_state(hass: HomeAssistant, profile: str) -> None:
    """Load persisted timer state and expose it as a virtual HA state for the frontend.

    Always sets a state — even a fresh default "idle" one when nothing has been
    saved yet — so that `menstruation_cycle_timer.{profile}` exists as soon as the
    integration loads, rather than only appearing after the timer has been used at
    least once. Without this, any card/consumer that assumes the entity exists
    (e.g. the countdown-timer card) would find nothing for a profile that's never
    touched the timer.
    """
    store = Store(hass, STORAGE_VERSION, f"{STORAGE_KEY}.timer_state.{profile}")
    timer_state = await store.async_load()
    if not isinstance(timer_state, dict):
        timer_state = {
            "remaining_seconds": 0,
            "total_seconds": 0,
            "selected_product": None,
            "is_running": False,
            "saved_at": 0,
        }
    hass.states.async_set(
        f"menstruation_cycle_timer.{profile}",
        "active" if timer_state.get("is_running") else "idle",
        timer_state,
    )


async def _async_handle_save_timer_state(hass: HomeAssistant, call: ServiceCall) -> None:
    """Persist countdown timer state so it survives page reloads and device switches."""
    runtime = _runtime_for_call(hass, call)
    profile = runtime.profile

    remaining_seconds = max(0, int(call.data.get("remaining_seconds", 0)))
    total_seconds = max(0, int(call.data.get("total_seconds", 0)))
    raw_product = call.data.get("selected_product")
    selected_product = str(raw_product).strip() if raw_product else None
    is_running = bool(call.data.get("is_running", False))
    saved_at = max(0, int(call.data.get("saved_at", 0)))

    timer_state: dict[str, Any] = {
        "remaining_seconds": remaining_seconds,
        "total_seconds": total_seconds,
        "selected_product": selected_product,
        "is_running": is_running,
        "saved_at": saved_at,
    }

    store = Store(hass, STORAGE_VERSION, f"{STORAGE_KEY}.timer_state.{profile}")
    await store.async_save(timer_state)

    hass.states.async_set(
        f"menstruation_cycle_timer.{profile}",
        "active" if is_running else "idle",
        timer_state,
    )


async def _async_handle_export_doctor_report(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """Generate an HTML doctor report from the cycle history and symptom data.

    The file goes to the export folder; the response carries the same HTML so a card can open it in the
    browser right away (the folder is not served over HTTP).
    """
    runtime = _runtime_for_call(hass, call)
    days_back = max(30, min(730, int(call.data.get(SERVICE_FIELD_DAYS_BACK, 180))))
    patient_name = call.data.get(SERVICE_FIELD_PATIENT_NAME)
    patient_birthdate = call.data.get(SERVICE_FIELD_PATIENT_BIRTHDATE)
    language = str(call.data.get(SERVICE_FIELD_LANGUAGE, "de")).strip().lower() or "de"

    if patient_name is not None:
        patient_name = str(patient_name).strip() or None
    if patient_birthdate is not None:
        patient_birthdate = _normalize_date_or_raise(str(patient_birthdate).strip())

    from .model import compute_contraception_status

    today = dt_util.now().date()
    stats = compute_statistics(runtime.history, runtime.symptom_history, days_back=days_back, today=today, period_duration_days=runtime.period_duration_days)
    contraception_status = compute_contraception_status(runtime.symptom_history, today=today, renewed=_renewed(runtime))
    html_content = generate_doctor_report_html(
        stats=stats,
        history=runtime.history,
        symptom_history=runtime.symptom_history,
        profile=runtime.profile,
        patient_name=patient_name,
        patient_birthdate=patient_birthdate,
        language=language,
        current_contraception_method=contraception_status.get("current_method"),
        contraception_timeline=compute_contraception_timeline(runtime.symptom_history, _renewed(runtime)),
    )

    stem = _sanitize_export_filename(f"doctor_report_{runtime.profile}_{dt_util.now().strftime('%Y%m%d_%H%M%S')}")
    target_dir = Path(hass.config.path(EXPORT_DIR_NAME))
    target_path = target_dir / f"{stem}.html"

    def _write_file() -> None:
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path.write_text(html_content, encoding="utf-8")

    await hass.async_add_executor_job(_write_file)
    _LOGGER.info(
        "Exported doctor report for profile '%s' to %s",
        runtime.profile,
        target_path,
    )

    if not runtime.noncycle_data.get("doctor_report_exported"):
        runtime.noncycle_data["doctor_report_exported"] = True
        await _async_save_and_notify(hass, runtime)

    return {"filename": target_path.name, "path": str(target_path), "html": html_content}


def _smart_period_history_dates(
    runtime: MenstruationRuntime,
    date_iso: str,
    *,
    allow_new_period: bool = True,
) -> list[str]:
    """Resolve which history dates should be recorded for a smart period continuation."""
    target_date = date.fromisoformat(date_iso)
    model = build_cycle_model(
        history=runtime.history,
        period_duration_days=runtime.period_duration_days,
        symptom_history=runtime.symptom_history,
        pregnancy_data=runtime.pregnancy_data,
        menarche_data=runtime.menarche_data,
        pre_menarche_data=runtime.pre_menarche_data,
        menopause_data=runtime.menopause_data,
        noncycle_data=runtime.noncycle_data,
        today=target_date,
    )
    current_period = model.current_period
    if not isinstance(current_period, dict) or not current_period.get("is_active"):
        return [date_iso] if allow_new_period else []

    start_iso = current_period.get("start")
    if not isinstance(start_iso, str) or date_iso < start_iso:
        return [date_iso] if allow_new_period else []

    confirmed_days = [
        item
        for item in current_period.get("confirmed_days", [])
        if isinstance(item, str) and item <= date_iso
    ]
    last_confirmed_iso = confirmed_days[-1] if confirmed_days else None

    if last_confirmed_iso is None:
        return [date_iso] if allow_new_period else []
    if last_confirmed_iso >= date_iso:
        return [] if date_iso in runtime.history else [date_iso]

    fill_start = date.fromisoformat(last_confirmed_iso)
    fill_days: list[str] = []
    day_cursor = fill_start
    while day_cursor.isoformat() < date_iso:
        day_cursor = day_cursor.fromordinal(day_cursor.toordinal() + 1)
        fill_days.append(day_cursor.isoformat())
    return fill_days


def _bleeding_may_start_period(runtime: MenstruationRuntime, date_iso: str) -> bool:
    """True if logged bleeding on date_iso may start a new period: not pregnant, no period day shortly before it."""
    if runtime.pregnancy_data.get("is_pregnant"):
        return False
    window_start = (date.fromisoformat(date_iso) - timedelta(days=NEW_PERIOD_MIN_GAP_DAYS)).isoformat()
    return not any(window_start <= item < date_iso for item in runtime.history)


def _log_bleeding_in_history(runtime: MenstruationRuntime, date_iso: str) -> list[str]:
    """Record logged bleeding on date_iso as period day(s); returns the dates actually added."""
    added: list[str] = []
    for history_date in _smart_period_history_dates(
        runtime, date_iso, allow_new_period=_bleeding_may_start_period(runtime, date_iso)
    ):
        if history_date not in runtime.history:
            runtime.history.append(history_date)
            added.append(history_date)
    return added


BLEEDING_REPLAY_DAYS = 120


def _bleeding_history_additions(runtime: MenstruationRuntime, today: date) -> list[str]:
    """Period days that logged bleeding of the last BLEEDING_REPLAY_DAYS would add today.

    Replays the bleeding days in order on a throwaway copy of the history with the same
    rule as add_symptom (new period only without a period day in the 14 days before),
    so intermenstrual bleeding is not counted. Does not touch the runtime.
    """
    start = (today - timedelta(days=BLEEDING_REPLAY_DAYS)).isoformat()
    days = sorted(
        {
            str(item.get("date"))
            for item in runtime.symptom_history
            if isinstance(item, dict)
            and start <= str(item.get("date", "")) <= today.isoformat()
            and str(item.get("bleeding_strength", "")).strip().lower() not in {"", "none", "keine"}
        }
    )
    probe = copy.copy(runtime)
    probe.history = list(runtime.history)
    original = set(runtime.history)
    for day in days:
        if day not in probe.history:
            _log_bleeding_in_history(probe, day)
    return sorted(set(probe.history) - original)


async def _async_handle_add(hass: HomeAssistant, call: ServiceCall) -> None:
    runtime = _runtime_for_call(hass, call)
    date_iso = _normalize_date_or_raise(call.data[SERVICE_FIELD_DATE])
    for history_date in _smart_period_history_dates(runtime, date_iso):
        if history_date not in runtime.history:
            runtime.history.append(history_date)
    await _async_save_and_notify(hass, runtime)

    # Described in logbook.py; skipped for private profiles like EVENT_STATE_CHANGED.
    if runtime.visibility_level != VISIBILITY_LEVEL_PRIVATE:
        hass.bus.async_fire(
            EVENT_CYCLE_START_LOGGED,
            {
                "entry_id": _entry_id_for_runtime(hass, runtime),
                "profile": runtime.profile,
                "friendly_name": runtime.friendly_name,
                "date": date_iso,
            },
        )


async def _async_handle_remove(hass: HomeAssistant, call: ServiceCall) -> None:
    runtime = _runtime_for_call(hass, call)
    date_iso = _normalize_date_or_raise(call.data[SERVICE_FIELD_DATE])
    runtime.history = [item for item in runtime.history if item != date_iso]
    await _async_save_and_notify(hass, runtime)


async def _async_handle_set_history(hass: HomeAssistant, call: ServiceCall) -> None:
    runtime = _runtime_for_call(hass, call)
    dates = [_normalize_date_or_raise(raw) for raw in call.data[SERVICE_FIELD_DATES]]
    runtime.history = dates
    await _async_save_and_notify(hass, runtime)


def _parse_import_date(raw: str, date_format: str) -> str | None:
    """Best-effort parse of one date string for import_cycle_history
    (HA-Idee 7, "weitere Ideen" 15.09.2026). Returns an ISO date string, or
    None if it couldn't be parsed under the requested date_format.

    Unlike set_cycle_history's _normalize_date_or_raise (strict, raises on
    the first bad value, meant for machine-generated input), this is
    intentionally lenient and never raises per-value - a CSV export from
    another app is likely to have at least one stray blank line or header
    row, and aborting the whole import over one bad line would defeat the
    point. Slash-separated dates (03/04/2026) are genuinely ambiguous
    between day-first and month-first conventions, so 'auto' deliberately
    does NOT guess at those - only the caller explicitly choosing 'dmy' or
    'mdy' enables them, to avoid silently swapping day/month.
    """
    raw = str(raw).strip()
    if not raw:
        return None
    try:
        return date.fromisoformat(raw).isoformat()
    except ValueError:
        pass
    try:
        return datetime.strptime(raw, "%d.%m.%Y").date().isoformat()
    except ValueError:
        pass
    if date_format == "dmy":
        try:
            return datetime.strptime(raw, "%d/%m/%Y").date().isoformat()
        except ValueError:
            return None
    if date_format == "mdy":
        try:
            return datetime.strptime(raw, "%m/%d/%Y").date().isoformat()
        except ValueError:
            return None
    return None


async def _async_handle_import_cycle_history(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """Additively import cycle-start dates from another app's export
    (HA-Idee 7, "weitere Ideen" 15.09.2026) - existing history is kept, not
    replaced (unlike set_cycle_history), and a handful of common date
    formats are tolerated instead of requiring clean ISO strings."""
    runtime = _runtime_for_call(hass, call)
    date_format = str(call.data.get(SERVICE_FIELD_DATE_FORMAT, DEFAULT_IMPORT_DATE_FORMAT))
    if date_format not in IMPORT_DATE_FORMATS:
        date_format = DEFAULT_IMPORT_DATE_FORMAT

    existing = set(runtime.history)
    imported: list[str] = []
    already_present: list[str] = []
    skipped_invalid: list[str] = []

    for raw in call.data[SERVICE_FIELD_DATES]:
        parsed = _parse_import_date(raw, date_format)
        if parsed is None:
            skipped_invalid.append(str(raw))
        elif parsed in existing:
            already_present.append(parsed)
        else:
            imported.append(parsed)
            existing.add(parsed)

    if imported:
        runtime.history = normalize_history(sorted(existing))
        await _async_save_and_notify(hass, runtime)

    # HA-Idee 4 (weitere Ideen, 15.09.2026, dritte Runde): flag newly
    # imported dates that end up implausibly close to a neighbouring history
    # entry (e.g. a date-format mixup, or a duplicate entry a few days off)
    # - reported back as non-blocking warnings rather than rejected, since
    # this import is explicitly additive and the caller may know something
    # this integration doesn't (e.g. genuine spotting logged separately).
    imported_set = set(imported)
    warnings = [
        f"{gap['from']} and {gap['to']} are only {gap['gap_days']} day(s) apart "
        f"(shorter than the {CYCLE_LENGTH_OVERRIDE_MIN}-day minimum plausible cycle length)"
        for gap in find_implausible_cycle_gaps(sorted(existing))
        if gap["from"] in imported_set or gap["to"] in imported_set
    ]

    return {
        "imported": sorted(imported),
        "already_present": sorted(already_present),
        "skipped_invalid": skipped_invalid,
        "warnings": warnings,
        "total_history_count": len(runtime.history),
    }


async def _async_handle_import_symptom_history(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    runtime = _runtime_for_call(hass, call)
    date_format = str(call.data.get(SERVICE_FIELD_DATE_FORMAT, DEFAULT_IMPORT_DATE_FORMAT))
    if date_format not in IMPORT_DATE_FORMATS:
        date_format = DEFAULT_IMPORT_DATE_FORMAT
    profile_fields = {
        k: call.data[k] for k in (SERVICE_FIELD_PROFILE, SERVICE_FIELD_ENTITY_ID, SERVICE_FIELD_ENTRY_ID) if k in call.data
    }

    imported: list[str] = []
    already_present: list[str] = []
    skipped_invalid: list[str] = []

    for raw in call.data[SERVICE_FIELD_ENTRIES]:
        parsed = _parse_import_date(raw.get("date", ""), date_format)
        if parsed is None:
            skipped_invalid.append(str(raw.get("date", raw)))
            continue
        existing = next((e for e in runtime.symptom_history if e.get("date") == parsed), None)
        new_fields = {
            k: v for k, v in raw.items()
            if k != "date" and (existing is None or existing.get(k) in (None, "", []))
        }
        if not new_fields:
            already_present.append(parsed)
            continue
        try:
            # ponytail: SimpleNamespace stands in for a ServiceCall (the handler only reads .data) -
            # swap for a real ServiceCall if the handler ever needs context/hass from it.
            await _async_handle_add_symptom(
                hass,
                SimpleNamespace(data={**profile_fields, SERVICE_FIELD_DATE: parsed, SERVICE_FIELD_SYMPTOM_DATA: new_fields}),
                save=False,
            )
        except HomeAssistantError as err:
            skipped_invalid.append(f"{parsed}: {err}")
        else:
            imported.append(parsed)

    if imported:
        await _async_save_and_notify(hass, runtime)

    return {
        "imported": sorted(imported),
        "already_present": sorted(already_present),
        "skipped_invalid": skipped_invalid,
        "total_symptom_days": len(runtime.symptom_history),
    }


async def _async_handle_set_period_duration(hass: HomeAssistant, call: ServiceCall) -> None:
    runtime = _runtime_for_call(hass, call)
    runtime.period_duration_days = int(call.data[SERVICE_FIELD_DAYS])
    await _async_save_and_notify(hass, runtime)


async def _async_handle_set_profile_visibility(hass: HomeAssistant, call: ServiceCall) -> None:
    """Set how much of this profile's sensitive data appears in its sensor
    attributes (Feature-Wunsch 02.09.2026, "abgestufte Eltern-Sichtbarkeit").

    Bewusst wie set_period_duration ein einfacher, direkter Setter ohne
    weitere Bedingungen - jede Person, die den Service aufrufen kann, darf
    das fuer jedes konfigurierte Profil aendern (siehe const.py-Kommentar an
    CONF_VISIBILITY_LEVEL: diese Integration unterscheidet nicht zwischen
    aufrufenden Geraeten/Personen). Die Absicht ist, dass die App dies nur
    auf dem eigenen Geraet der jeweiligen Person fuer ihr eigenes Profil
    aufruft, technisch durchsetzbar ist das serverseitig aber nicht.
    """
    runtime = _runtime_for_call(hass, call)
    level = str(call.data[SERVICE_FIELD_VISIBILITY_LEVEL]).strip().lower()
    if level not in VISIBILITY_LEVELS:
        raise HomeAssistantError(
            f"Unknown visibility level '{level}'. Expected one of: {', '.join(VISIBILITY_LEVELS)}"
        )
    runtime.visibility_level = level
    await _async_save_and_notify(hass, runtime)


async def _async_handle_erase_all_history(hass: HomeAssistant, call: ServiceCall) -> None:
    entity_id = str(call.data.get(SERVICE_FIELD_ENTITY_ID, "")).strip()
    if not entity_id:
        raise HomeAssistantError("Refusing to erase history. Provide entity_id explicitly for safety.")
    runtime = _runtime_for_call(hass, call)
    erase_all = call.data.get(SERVICE_FIELD_ERASE_ALL)
    if erase_all is not True:
        raise HomeAssistantError("Refusing to erase history. Set erase_all: true to confirm destructive action.")
    runtime.history = []
    await _async_save_and_notify(hass, runtime)


def _sanitize_export_filename(raw: str) -> str:
    candidate = "".join(ch if ch.isalnum() or ch in ("-", "_", ".") else "_" for ch in str(raw))
    return candidate.strip("._") or "menstruation_history"


async def _async_handle_export_history(hass: HomeAssistant, call: ServiceCall) -> None:
    runtime = _runtime_for_call(hass, call)
    export_format = str(call.data.get(SERVICE_FIELD_FORMAT, "csv")).lower()
    if export_format not in {"csv", "txt"}:
        raise HomeAssistantError("Invalid format. Use 'csv' or 'txt'.")

    stem = call.data.get(SERVICE_FIELD_FILENAME)
    if stem:
        stem = _sanitize_export_filename(str(stem))
    else:
        stamp = dt_util.now().strftime("%Y%m%d_%H%M%S")
        stem = f"menstruation_history_{runtime.profile}_{stamp}"

    extension = ".csv" if export_format == "csv" else ".txt"
    target_dir = Path(hass.config.path(EXPORT_DIR_NAME))
    target_path = target_dir / f"{stem}{extension}"

    history = normalize_history(runtime.history)
    if export_format == "csv":
        content = "date\n" + "\n".join(history) + ("\n" if history else "")
    else:
        content = "\n".join(history) + ("\n" if history else "")

    def _write_file() -> None:
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path.write_text(content, encoding="utf-8")

    await hass.async_add_executor_job(_write_file)
    _LOGGER.info("Exported menstruation history for profile '%s' to %s", runtime.profile, target_path)


async def _async_diagnose_profile_storage(runtime: MenstruationRuntime) -> list[str]:
    """Compare a single profile's raw vs. normalized storage and flag
    semantic inconsistencies.

    Extracted from _async_handle_repair_storage (23.09.2026, "weitere Ideen
    die nicht auf der Roadmap stehen?") on 25.09.2026 (HA-Idee 4, "weitere
    Ideen?") so the exact same detection logic can also drive a repair issue
    (async_check_storage_integrity below), not just the on-demand
    repair_storage service - one shared source of truth instead of two
    copies that could drift apart.

    Two categories of findings:
    1. Normalization diffs: async_load_raw() (unchanged as stored) compared
       against async_load() (normalized/defaulted). A difference means
       normalization either discarded/reset an invalid value or defaulted a
       missing field - exactly the kind of silent change that caused the
       visibility_level bug (15.09.2026) to actually lose data, only
       reported here rather than acted on.
    2. Semantic inconsistencies: e.g. is_pregnant=True without a start_date,
       or pregnancy and menopause both active at once.
    """
    issues: list[str] = []
    raw = await runtime.storage.async_load_raw()
    normalized = await runtime.storage.async_load()

    if raw:
        raw_history = raw.get("history")
        if isinstance(raw_history, list):
            dropped = len(raw_history) - len(normalized["history"])
            if dropped > 0:
                issues.append(
                    f"{dropped} history entr(y/ies) dropped as unparsable/duplicate dates"
                )

        raw_symptoms = raw.get("symptom_history")
        if isinstance(raw_symptoms, list) and len(raw_symptoms) != len(normalized["symptom_history"]):
            issues.append(
                f"symptom_history: {len(raw_symptoms)} stored vs "
                f"{len(normalized['symptom_history'])} valid after normalization"
            )

        raw_usage = raw.get("product_usage")
        if isinstance(raw_usage, list) and len(raw_usage) != len(normalized["product_usage"]):
            issues.append(
                f"product_usage: {len(raw_usage)} stored vs "
                f"{len(normalized['product_usage'])} valid after normalization"
            )

        raw_stage = raw.get("onboarding_stage")
        if raw_stage is not None and raw_stage != normalized["onboarding_stage"]:
            issues.append(
                f"onboarding_stage '{raw_stage}' is invalid, reset to "
                f"'{normalized['onboarding_stage']}'"
            )

        raw_visibility = raw.get("visibility_level")
        if raw_visibility is not None and raw_visibility != normalized["visibility_level"]:
            issues.append(
                f"visibility_level '{raw_visibility}' is invalid, reset to "
                f"'{normalized['visibility_level']}'"
            )

        raw_override = raw.get("cycle_length_override")
        if raw_override is not None and normalized["cycle_length_override"] is None:
            issues.append(f"cycle_length_override '{raw_override}' out of range, discarded")

    pregnancy_data = normalized["pregnancy_data"]
    if pregnancy_data.get("is_pregnant") and not pregnancy_data.get("start_date"):
        issues.append("pregnancy_data: is_pregnant is true but start_date is missing")

    menarche_data = normalized["menarche_data"]
    if menarche_data.get("is_menarche") and not menarche_data.get("menarche_date"):
        issues.append("menarche_data: is_menarche is true but menarche_date is missing")

    menopause_data = normalized["menopause_data"]
    if menopause_data.get("is_menopause") and not menopause_data.get("start_date"):
        issues.append("menopause_data: is_menopause is true but start_date is missing")

    if pregnancy_data.get("is_pregnant") and menopause_data.get("is_menopause"):
        issues.append("pregnancy_data and menopause_data are both active at the same time")

    if bool(normalized.get("ics_token")) != bool(normalized.get("ics_token_created_at")):
        issues.append("ics_token and ics_token_created_at disagree on whether a token exists")

    bag_items = normalized.get("hospital_bag_items")
    if bag_items:
        uids = [item["uid"] for item in bag_items]
        if len(uids) != len(set(uids)):
            issues.append("hospital_bag_items: duplicate uid values")

    missing = _bleeding_history_additions(runtime, dt_util.now().date())
    if missing:
        issues.append(
            f"bleeding without a period: {len(missing)} day(s) of logged bleeding are not in the period history "
            f"(first: {missing[0]}); service create_periods_from_bleeding adds them"
        )

    close = _close_period_starts(runtime.history, dt_util.now().date())
    if close:
        first = close[0]
        issues.append(
            f"period starts too close: {len(close)} period start(s) less than {NEW_PERIOD_MIN_GAP_DAYS + 1} days after "
            f"the previous one (first: {first['to']}, {first['gap_days']} days after {first['from']}); if that was a "
            f"spotting or intermenstrual bleeding, remove its days with service remove_cycle_start"
        )

    return issues


CLOSE_PERIOD_STARTS_LOOKBACK_DAYS = 365


def _close_period_starts(history: list[str], today: date) -> list[dict[str, Any]]:
    """Period starts of the last year that follow the previous one within NEW_PERIOD_MIN_GAP_DAYS.

    The days of one period are grouped first; older entries are left alone so a long-ago slip does not nag forever.
    """
    since = (today - timedelta(days=CLOSE_PERIOD_STARTS_LOOKBACK_DAYS)).isoformat()
    return [
        gap
        for gap in find_implausible_cycle_gaps(
            grouped_cycle_starts(sorted(set(history))), min_gap_days=NEW_PERIOD_MIN_GAP_DAYS + 1
        )
        if gap["to"] >= since
    ]


async def _async_handle_repair_storage(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """Diagnose stored-data inconsistencies across every loaded profile.

    Neue Idee (23.09.2026, "weitere Ideen die nicht auf der Roadmap
    stehen?"). Reines Lese-/Report-Werkzeug - veraendert nichts an
    hass.data oder im Storage. Per-profile detection now lives in
    _async_diagnose_profile_storage above (25.09.2026), shared with the
    storage-integrity repair issue (see repairs.py::async_check_storage_
    integrity) so both surfaces always agree.
    """
    domain_data: dict[str, MenstruationRuntime] = hass.data.get(DOMAIN, {})
    if not domain_data:
        raise HomeAssistantError("No menstruation_cycle profiles are currently loaded.")

    profiles: dict[str, Any] = {}
    total_issues = 0

    for entry_id, runtime in domain_data.items():
        issues = await _async_diagnose_profile_storage(runtime)
        profiles[runtime.profile] = {
            "entry_id": entry_id,
            "friendly_name": runtime.friendly_name,
            "issues": issues,
        }
        total_issues += len(issues)

    return {
        "checked_at": dt_util.utcnow().isoformat(),
        "profile_count": len(profiles),
        "total_issues": total_issues,
        "profiles": profiles,
    }


async def _async_handle_get_household_summary(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """One-glance overview across every currently loaded profile (HA-Idee 4,
    "weitere Ideen?" 27.09.2026) - e.g. "2 of 3 profiles currently in their
    period" without a client having to call get_cycle_predictions once per
    profile and merge the results itself.

    Respects each profile's own visibility_level the same way the sensor's
    own extra_state_attributes do (see sensor.py::_filter_attributes_for_
    visibility): a profile set to "private" contributes only to the total
    profile_count, with its own entry collapsed to STATE_PRIVATE and no
    state/days_until_next_start - it is deliberately not excluded outright,
    so callers can still see that a private profile exists without learning
    anything about its actual cycle state.
    """
    domain_data: dict[str, MenstruationRuntime] = hass.data.get(DOMAIN, {})
    if not domain_data:
        raise HomeAssistantError("No menstruation_cycle profiles are currently loaded.")

    today = dt_util.now().date()
    profiles: list[dict[str, Any]] = []
    state_counts: dict[str, int] = {STATE_PERIOD: 0, STATE_FERTILE: 0, STATE_PMS: 0, STATE_NEUTRAL: 0}

    for entry_id, runtime in domain_data.items():
        is_private = getattr(runtime, "visibility_level", None) == VISIBILITY_LEVEL_PRIVATE
        profile_entry: dict[str, Any] = {
            "profile": runtime.profile,
            "friendly_name": runtime.friendly_name,
        }
        # profile_picture: linked person entity's picture, shown at every visibility level (identity, not cycle data).
        config_entry = hass.config_entries.async_get_entry(entry_id)
        linked_person_entity_id = (
            str(config_entry.options.get(CONF_LINKED_PERSON_ENTITY_ID) or "") or None
            if config_entry is not None
            else None
        )
        if linked_person_entity_id:
            person_state = hass.states.get(linked_person_entity_id)
            if person_state is not None:
                profile_entry["profile_picture"] = person_state.attributes.get("entity_picture") or None
        if is_private:
            profile_entry["state"] = STATE_PRIVATE
            profiles.append(profile_entry)
            continue

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
            nfp_mode=DEFAULT_NFP_ANALYSIS_MODE,
            onboarding_stage=getattr(runtime, "onboarding_stage", None),
        )
        profile_entry["state"] = model.state
        profile_entry["days_until_next_start"] = model.days_until_next_start
        profile_entry["avg_cycle_length"] = model.avg_cycle_length
        # cycle_day is deliberately NOT in sensor.py's
        # _VISIBILITY_STATUS_ONLY_KEYS - only included here for a profile
        # explicitly set to "full", the same cutoff the main sensor's own
        # attributes already draw (Nachtrag 28.09.2026, Simon: "Zyklustage
        # einbauen (Tag 4/28)" fuer die neue Dashboard-Uebersicht).
        if getattr(runtime, "visibility_level", None) == VISIBILITY_LEVEL_FULL and model.grouped_starts:
            start_d = date.fromisoformat(model.grouped_starts[-1])
            profile_entry["cycle_day"] = (today - start_d).days + 1
        # weeks_pregnant: same "full" cutoff as cycle_day above - sensor.py's
        # _VISIBILITY_STATUS_ONLY_KEYS doesn't carry it either (Nachfrage
        # 28.09.2026, "Icons in der Familienuebersicht verwenden"): the
        # frontend's pregnancy icon needs a week number to pick the right
        # month illustration, otherwise it falls back to month 1 for every
        # pregnant profile.
        if getattr(runtime, "visibility_level", None) == VISIBILITY_LEVEL_FULL and model.state == STATE_PREGNANT:
            profile_entry["weeks_pregnant"] = model.weeks_pregnant
        # forecast fields for the household timeline: full visibility only, trimmed to _TIMELINE_HORIZON_DAYS.
        if getattr(runtime, "visibility_level", None) == VISIBILITY_LEVEL_FULL:
            profile_entry["period_duration_days"] = model.period_duration_days
            horizon = today + timedelta(days=_TIMELINE_HORIZON_DAYS)
            profile_entry["predicted_cycle_starts"] = [
                d for d in model.predicted_cycle_starts
                if date.fromisoformat(d) <= horizon
            ]
            if model.fertile_window_start:
                profile_entry["fertile_window_start"] = model.fertile_window_start
            if model.fertile_window_end:
                profile_entry["fertile_window_end"] = model.fertile_window_end
            # Wunsch 02.10.2026 ("weitere Ideen?", Idee 9): same wellness_score
            # the main sensor already exposes (HA-Idee 6, 27.09.2026), reused
            # here so the household overview can show it too - same "full"
            # visibility cutoff as the other fields in this block, score only
            # (not the regularity/pain/history sub-components - this is a
            # glance-level bubble, not the per-profile insights widget).
            wellness = cycle_wellness_score(model, today)
            if wellness:
                profile_entry["wellness_score"] = wellness["score"]
        if model.state in state_counts:
            state_counts[model.state] += 1
        profiles.append(profile_entry)

    # avg pairwise gap between profiles' next predicted starts; None if fewer than 2 have a value.
    next_start_offsets = [
        p["days_until_next_start"]
        for p in profiles
        if p.get("days_until_next_start") is not None
    ]
    household_synchrony_days: float | None = None
    if len(next_start_offsets) >= 2:
        pairwise_diffs = [
            abs(a - b)
            for i, a in enumerate(next_start_offsets)
            for b in next_start_offsets[i + 1:]
        ]
        household_synchrony_days = round(sum(pairwise_diffs) / len(pairwise_diffs), 1)

    return {
        "checked_at": dt_util.utcnow().isoformat(),
        "profile_count": len(profiles),
        "profiles": profiles,
        "currently_in_period": state_counts[STATE_PERIOD],
        "currently_fertile": state_counts[STATE_FERTILE],
        "currently_pms": state_counts[STATE_PMS],
        "household_synchrony_days": household_synchrony_days,
    }


async def _async_handle_export_full_backup(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """Export the complete stored data for EVERY configured profile into one
    JSON file (HA-Idee 4, "weitere Ideen" 15.09.2026).

    Unlike export_history (one profile's cycle-start dates only, CSV/TXT),
    this covers everything storage.py persists per profile - history,
    symptoms, product usage, pregnancy/menarche/menopause/postpartum data,
    onboarding stage, visibility level, cycle length override - across ALL
    profiles at once, for an actual disaster-recovery backup. The ICS
    calendar-feed token is deliberately left out: it's a live bearer
    credential (see repairs.py::async_check_stale_ics_token), not tracking
    data, and a backup file is far more likely to end up copied somewhere
    less protected than HA's own storage.

    See import_full_backup for the restore side (merge/overwrite modes,
    restricted to already-configured profiles).

    The output carries an explicit "backup_version" (HA-Idee 4, "weitere
    Ideen" 15.09.2026, second round) so a future change to this JSON
    structure can be detected and handled deliberately by import_full_backup
    - rather than only adding a version marker once older, unversioned
    backup files are already out there and ambiguous to interpret.
    """
    return await _async_write_full_backup_snapshot(hass, call.data.get(SERVICE_FIELD_FILENAME))


async def _async_write_full_backup_snapshot(hass: HomeAssistant, stem: str | None = None) -> dict[str, Any]:
    """Build and write the full-backup JSON snapshot to disk.

    Split out of _async_handle_export_full_backup (HA-Idee, "weitere neue
    Ideen", 29.09.2026) so backup.py's async_pre_backup hook can write the
    exact same snapshot right before every native HA backup runs, without
    duplicating this logic or needing to fabricate a ServiceCall.
    """
    domain_data: dict[str, MenstruationRuntime] = hass.data.get(DOMAIN, {})
    if not domain_data:
        raise HomeAssistantError("No menstruation_cycle profiles are currently loaded.")

    profiles: dict[str, Any] = {}
    for entry_id, runtime in domain_data.items():
        stored = await runtime.storage.async_load()
        stored.pop(ICS_TOKEN_KEY, None)
        stored.pop(ICS_TOKEN_CREATED_AT_KEY, None)
        profiles[runtime.profile] = {
            "entry_id": entry_id,
            "friendly_name": runtime.friendly_name,
            **stored,
        }

    # Wunsch 01.10.2026 (Idee 2, "weitere Verbesserungen?"): dashboard
    # widget/category prefs live in their own store (see
    # _async_ensure_dashboard_prefs_loaded), keyed by "<user_id>:<profile>" -
    # not part of any runtime.storage above. Included here, filtered to the
    # profiles in this backup, so export/import_full_backup also carries
    # them instead of leaving them out of disaster-recovery entirely.
    dashboard_prefs_data = await _async_ensure_dashboard_prefs_loaded(hass)
    dashboard_prefs = {
        key: value
        for key, value in dashboard_prefs_data.items()
        if key.partition(":")[2] in profiles
    }

    backup = {
        "backup_version": BACKUP_FORMAT_VERSION,
        "exported_at": dt_util.utcnow().isoformat(),
        "integration": DOMAIN,
        "profiles": profiles,
        "dashboard_prefs": dashboard_prefs,
    }

    if stem:
        stem = _sanitize_export_filename(str(stem))
    else:
        stamp = dt_util.now().strftime("%Y%m%d_%H%M%S")
        stem = f"menstruation_full_backup_{stamp}"

    target_dir = Path(hass.config.path(EXPORT_DIR_NAME))
    target_path = target_dir / f"{stem}.json"
    content = json.dumps(backup, indent=2, ensure_ascii=False)

    def _write_file() -> None:
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path.write_text(content, encoding="utf-8")

    await hass.async_add_executor_job(_write_file)
    _LOGGER.info("Exported full backup of %d profile(s) to %s", len(profiles), target_path)

    return {"file": str(target_path), "profile_count": len(profiles)}


def _apply_backup_to_runtime(
    runtime: "MenstruationRuntime", backup_profile: dict[str, Any], mode: str
) -> list[dict[str, Any]]:
    """Apply one profile's backed-up data onto its currently-loaded runtime,
    mutating runtime in place (HA-Idee 6, "weitere Ideen" 15.09.2026).

    Returns the list of implausible-gap dicts (HA-Idee 4, "weitere Ideen"
    15.09.2026, dritte Runde) found among the history dates the backup
    actually contributed - empty in "overwrite" mode, since there the
    backup's history fully replaces the local one wholesale (a deliberate
    rollback to a trusted prior state, not a merge that could introduce a
    NEW contradiction between two independent sources) rather than being
    merged with a second, independent source that could disagree with it.

    mode="overwrite": every restorable field is replaced wholesale with the
    backup's value - a full rollback to the backup's state.

    mode="merge" (default): only FILLS GAPS, never clobbers anything already
    present locally. History is unioned (adding old dates never loses data).
    symptom_history restores entries only for dates not already logged
    locally. Life-stage dicts (pregnancy/menarche/pre_menarche/menopause/
    noncycle) are restored only if not currently active/tracking locally.
    product_usage, cycle_length_override and the hospital-bag checklist are
    restored only if currently empty/unset. Settings that aren't "data" (onboarding_stage,
    visibility_level, period_duration_days) are deliberately left untouched
    in merge mode - only overwrite mode touches those, so merge mode's
    promise stays simple: "fills in missing data, never touches your
    current settings or overwrites anything you already have."

    ics_token/ics_token_created_at are never touched either way - the backup
    never contains them (see _async_handle_export_full_backup) and rotation
    stays independent of any restore.
    """
    if mode == "overwrite":
        runtime.history = list(backup_profile.get("history", runtime.history))
        runtime.symptom_history = list(backup_profile.get("symptom_history", runtime.symptom_history))
        runtime.product_usage = list(backup_profile.get("product_usage", runtime.product_usage))
        runtime.pregnancy_data = dict(backup_profile.get("pregnancy_data", runtime.pregnancy_data))
        runtime.menarche_data = dict(backup_profile.get("menarche_data", runtime.menarche_data))
        runtime.pre_menarche_data = dict(backup_profile.get("pre_menarche_data", runtime.pre_menarche_data))
        runtime.menopause_data = dict(backup_profile.get("menopause_data", runtime.menopause_data))
        runtime.noncycle_data = dict(backup_profile.get("noncycle_data", runtime.noncycle_data))
        runtime.cycle_length_override = backup_profile.get("cycle_length_override", runtime.cycle_length_override)
        runtime.onboarding_stage = str(backup_profile.get("onboarding_stage") or runtime.onboarding_stage)
        runtime.visibility_level = str(backup_profile.get("visibility_level") or runtime.visibility_level)
        runtime.period_duration_days = int(
            backup_profile.get("period_duration_days", runtime.period_duration_days)
        )
        return []

    # mode == "merge"
    backup_history = backup_profile.get("history") or []
    runtime.history = sorted(set(runtime.history) | set(backup_history))
    backup_history_set = set(backup_history)
    implausible_gaps = [
        gap
        for gap in find_implausible_cycle_gaps(runtime.history)
        if gap["from"] in backup_history_set or gap["to"] in backup_history_set
    ]

    local_dates = {e.get("date") for e in runtime.symptom_history if isinstance(e, dict)}
    for entry in backup_profile.get("symptom_history") or []:
        if isinstance(entry, dict) and entry.get("date") not in local_dates:
            runtime.symptom_history.append(entry)

    if not runtime.product_usage:
        runtime.product_usage = list(backup_profile.get("product_usage") or [])

    if not runtime.pregnancy_data.get("is_pregnant") and backup_profile.get("pregnancy_data"):
        runtime.pregnancy_data = dict(backup_profile["pregnancy_data"])
    if not runtime.menarche_data.get("tracking_active") and backup_profile.get("menarche_data"):
        runtime.menarche_data = dict(backup_profile["menarche_data"])
    if not runtime.menopause_data.get("is_menopause") and backup_profile.get("menopause_data"):
        runtime.menopause_data = dict(backup_profile["menopause_data"])
    if not runtime.noncycle_data.get("is_postpartum") and backup_profile.get("noncycle_data", {}).get(
        "is_postpartum"
    ):
        runtime.noncycle_data = dict(backup_profile["noncycle_data"])
    if backup_profile.get("pre_menarche_data") and not any((runtime.pre_menarche_data or {}).get("signs") or {}):
        runtime.pre_menarche_data = dict(backup_profile["pre_menarche_data"])

    if runtime.cycle_length_override is None and backup_profile.get("cycle_length_override") is not None:
        runtime.cycle_length_override = backup_profile["cycle_length_override"]

    return implausible_gaps


async def _async_handle_import_full_backup(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """Restore profile data from a JSON file previously written by
    export_full_backup (HA-Idee 6, "weitere Ideen" 15.09.2026).

    Deliberately restricted in scope compared to the export: only restores
    data into profiles that are ALREADY configured (matched by profile slug
    among currently loaded runtimes) - this service never creates a new
    config entry, since that can only happen through the config flow.
    A profile present in the backup but not currently configured is skipped
    and reported back, not silently dropped without a trace.
    """
    if call.data.get(SERVICE_FIELD_CONFIRM) is not True:
        raise HomeAssistantError("Refusing to import backup. Set confirm: true to confirm this write operation.")

    mode = str(call.data.get(SERVICE_FIELD_MODE, DEFAULT_IMPORT_FULL_BACKUP_MODE))
    if mode not in IMPORT_FULL_BACKUP_MODES:
        raise HomeAssistantError(f"Unknown mode '{mode}'. Expected one of: {', '.join(IMPORT_FULL_BACKUP_MODES)}")

    filename = str(call.data[SERVICE_FIELD_FILENAME])
    stem = _sanitize_export_filename(Path(filename).stem)
    target_dir = Path(hass.config.path(EXPORT_DIR_NAME))
    target_path = (target_dir / f"{stem}.json").resolve()
    if target_dir.resolve() not in target_path.parents:
        raise HomeAssistantError("Invalid filename.")

    def _read_file() -> str:
        return target_path.read_text(encoding="utf-8")

    try:
        raw_content = await hass.async_add_executor_job(_read_file)
    except OSError as err:
        raise HomeAssistantError(f"Could not read backup file '{target_path.name}': {err}") from err

    try:
        backup = json.loads(raw_content)
    except json.JSONDecodeError as err:
        raise HomeAssistantError(f"Backup file '{target_path.name}' is not valid JSON: {err}") from err

    if not isinstance(backup, dict) or backup.get("integration") != DOMAIN or not isinstance(
        backup.get("profiles"), dict
    ):
        raise HomeAssistantError(
            f"'{target_path.name}' doesn't look like a menstruation_cycle export_full_backup file."
        )

    # HA-Idee 4 (weitere Ideen, 15.09.2026, zweite Runde): a backup written
    # before BACKUP_FORMAT_VERSION existed has no "backup_version" key at
    # all - that's still today's (version 1) structure, so treat a missing
    # key as 1 rather than rejecting every pre-existing backup file.
    # A version newer than this integration understands is rejected
    # outright rather than guessed at, since silently misinterpreting a
    # later structure could corrupt data instead of just failing loudly.
    backup_version = backup.get("backup_version", 1)
    if not isinstance(backup_version, int) or backup_version > BACKUP_FORMAT_VERSION:
        raise HomeAssistantError(
            f"'{target_path.name}' has backup_version={backup_version!r}, but this integration only "
            f"understands up to version {BACKUP_FORMAT_VERSION}. Update the integration before importing "
            "this backup."
        )

    domain_data: dict[str, MenstruationRuntime] = hass.data.get(DOMAIN, {})
    runtimes_by_profile = {rt.profile: rt for rt in domain_data.values()}

    restored: list[str] = []
    skipped_not_configured: list[str] = []
    # HA-Idee 4 (weitere Ideen, 15.09.2026, dritte Runde): per-profile,
    # non-blocking warnings about implausibly close cycle-start dates the
    # merge introduced - see _apply_backup_to_runtime. Only ever populated in
    # "merge" mode; kept out of the response entirely (not just empty) for
    # "overwrite" mode, where the concept doesn't apply.
    warnings: dict[str, list[str]] = {}

    for profile_slug, backup_profile in backup["profiles"].items():
        runtime = runtimes_by_profile.get(profile_slug)
        if runtime is None or not isinstance(backup_profile, dict):
            skipped_not_configured.append(profile_slug)
            continue
        implausible_gaps = _apply_backup_to_runtime(runtime, backup_profile, mode)
        await _async_save_and_notify(hass, runtime)
        # The hospital-bag checklist lives only in storage, not on the runtime. Merge keeps an existing list.
        bag_items = backup_profile.get("hospital_bag_items")
        if isinstance(bag_items, list) and (
            mode == "overwrite" or not await runtime.storage.async_load_hospital_bag_items()
        ):
            await runtime.storage.async_save_hospital_bag_items(bag_items)
        restored.append(profile_slug)
        if implausible_gaps:
            warnings[profile_slug] = [
                f"{gap['from']} and {gap['to']} are only {gap['gap_days']} day(s) apart "
                f"(shorter than the {CYCLE_LENGTH_OVERRIDE_MIN}-day minimum plausible cycle length)"
                for gap in implausible_gaps
            ]

    # Wunsch 01.10.2026 (Idee 2, "weitere Verbesserungen?"): same
    # already-configured restriction as the profile restore loop above -
    # only overwrite dashboard prefs for profiles actually restored this
    # round, never for a profile_slug that was skipped as not configured.
    dashboard_prefs_restored = 0
    backup_dashboard_prefs = backup.get("dashboard_prefs")
    if isinstance(backup_dashboard_prefs, dict) and restored:
        restored_set = set(restored)
        dashboard_prefs_data = await _async_ensure_dashboard_prefs_loaded(hass)
        for key, value in backup_dashboard_prefs.items():
            if not isinstance(key, str) or not isinstance(value, dict):
                continue
            if key.partition(":")[2] not in restored_set:
                continue
            dashboard_prefs_data[key] = value
            dashboard_prefs_restored += 1
        if dashboard_prefs_restored:
            store = Store(hass, STORAGE_VERSION, DASHBOARD_PREFS_STORE_KEY)
            await store.async_save(dashboard_prefs_data)

    _LOGGER.info(
        "Imported full backup '%s' (mode=%s): restored %d profile(s), skipped %d not-configured, "
        "%d dashboard prefs entry(ies) restored.",
        target_path.name,
        mode,
        len(restored),
        len(skipped_not_configured),
        dashboard_prefs_restored,
    )

    result: dict[str, Any] = {
        "mode": mode,
        "backup_version": backup_version,
        "restored": restored,
        "skipped_not_configured": skipped_not_configured,
        "dashboard_prefs_restored": dashboard_prefs_restored,
    }
    if mode == "merge":
        result["warnings"] = warnings
    return result


async def _async_handle_send_test_notification(hass: HomeAssistant, call: ServiceCall) -> None:
    """Send a harmless test message to the notify target of one profile (or all). Ignores the notification master switch."""
    strings = _notify_strings(hass.config.language)
    for entry_id in _target_entry_ids_for_call(hass, call):
        entry = hass.config_entries.async_get_entry(entry_id)
        runtime = hass.data.get(DOMAIN, {}).get(entry_id)
        if entry is None or runtime is None:
            continue
        # no action buttons on purpose: a test must never be able to log anything
        await _async_send_notification(
            hass, entry, strings["test_title"], strings["test_message"].format(name=runtime.friendly_name)
        )


async def _async_handle_refresh_cycle_model(hass: HomeAssistant, call: ServiceCall) -> None:
    await _async_refresh_cycle_model(hass, _target_entry_ids_for_call(hass, call))


async def _async_handle_reimport_basal_temp_statistics(hass: HomeAssistant, call: ServiceCall) -> None:
    """Force a fresh basal-temp long-term-statistics backfill.

    The normal backfill (in sensor.py, on first entity load) only ever runs
    once per profile, guarded by a persisted flag — by design, so it doesn't
    re-scan history on every restart. But if an earlier attempt ran under a
    stale/buggy version of the integration and silently found nothing (or hit
    a recorder API mismatch), that flag gets set to True anyway, permanently
    blocking any retry even after the underlying bug is fixed. This service
    clears the flag and re-runs the backfill on demand, without needing a full
    integration reload.
    """
    runtime = _runtime_for_call(hass, call)

    entry_id: str | None = None
    for candidate_entry_id, candidate_runtime in hass.data.get(DOMAIN, {}).items():
        if candidate_runtime is runtime:
            entry_id = candidate_entry_id
            break
    if entry_id is None:
        raise HomeAssistantError("Could not resolve config entry for this profile.")

    entry = hass.config_entries.async_get_entry(entry_id)
    if entry is None:
        raise HomeAssistantError("Config entry no longer exists.")

    entity_registry = er.async_get(hass)
    basal_temp_entity_id: str | None = None
    for entity_entry in er.async_entries_for_config_entry(entity_registry, entry_id):
        if entity_entry.unique_id.endswith("_basal_temp"):
            basal_temp_entity_id = entity_entry.entity_id
            break
    if basal_temp_entity_id is None:
        raise HomeAssistantError(
            "No basal-temperature sensor entity found for this profile. "
            "It should be created automatically when the integration loads."
        )

    runtime.noncycle_data["basal_temp_stats_backfilled"] = False

    from .sensor import _async_backfill_basal_temp_statistics

    await _async_backfill_basal_temp_statistics(hass, entry, basal_temp_entity_id)
    _LOGGER.info("Re-ran basal_temp statistics backfill for '%s' on demand.", basal_temp_entity_id)


async def _async_handle_log_product_usage(hass: HomeAssistant, call: ServiceCall) -> None:
    """Log product usage for the selected profile/entity."""
    runtime = _runtime_for_call(hass, call)
    product = str(call.data.get(SERVICE_FIELD_PRODUCT, "")).strip().lower()
    action = str(call.data.get(SERVICE_FIELD_ACTION, "used")).strip().lower() or "used"
    quantity = int(call.data.get(SERVICE_FIELD_QUANTITY, 1))
    raw_date = call.data.get(SERVICE_FIELD_DATE)
    date_iso = _normalize_date_or_raise(raw_date) if raw_date else dt_util.now().date().isoformat()

    if product not in VALID_PRODUCT_USAGE_PRODUCTS:
        valid_products = ", ".join(sorted(VALID_PRODUCT_USAGE_PRODUCTS))
        raise HomeAssistantError(f"Unsupported product '{product}'. Use one of: {valid_products}")

    if action not in VALID_PRODUCT_USAGE_ACTIONS:
        valid_actions = ", ".join(sorted(VALID_PRODUCT_USAGE_ACTIONS))
        raise HomeAssistantError(f"Unsupported action '{action}'. Use one of: {valid_actions}")

    runtime.product_usage.append(
        {
            "date": date_iso,
            "product": product,
            "quantity": max(1, quantity),
            "action": action,
        }
    )
    area_id = str(call.data.get(SERVICE_FIELD_AREA_ID, "")).strip() or None
    if action == "used":
        await _async_register_consumption(
            hass, product, max(1, quantity), runtime.friendly_name, source="log_product_usage", area_id=area_id
        )
    await _async_save_and_notify(hass, runtime)


async def _async_handle_manage_household_inventory(hass: HomeAssistant, call: ServiceCall) -> None:
    await _async_ensure_household_inventory_loaded(hass)
    household_data = hass.data.get(HOUSEHOLD_INVENTORY_DATA_KEY)
    if not isinstance(household_data, dict):
        raise HomeAssistantError("Household inventory storage is unavailable.")

    action = str(call.data.get(SERVICE_FIELD_INVENTORY_ACTION, "")).strip().lower()
    product = str(call.data.get(SERVICE_FIELD_PRODUCT, "")).strip().lower()
    quantity = int(call.data.get(SERVICE_FIELD_QUANTITY, 1))
    member = str(call.data.get(SERVICE_FIELD_MEMBER, "")).strip() or "manual"
    area_id = str(call.data.get(SERVICE_FIELD_AREA_ID, "")).strip() or None

    if action == "set_area_tracking":
        household_data["track_by_area"] = bool(call.data.get(SERVICE_FIELD_ENABLED, False))
        await _async_save_household_inventory(hass)
        return

    if action != "reset" and product not in HOUSEHOLD_PRODUCTS:
        raise HomeAssistantError(f"Unsupported product '{product}'.")

    # Optional threshold values sent from the card config so the backend stays in
    # sync with whatever the user configured in the Lovelace card editor.
    threshold_warning = call.data.get(SERVICE_FIELD_WARNING_THRESHOLD)
    threshold_critical = call.data.get(SERVICE_FIELD_CRITICAL_THRESHOLD)
    underwear_total_owned = call.data.get(_SERVICE_FIELD_UNDERWEAR_TOTAL_OWNED)
    if underwear_total_owned is not None:
        settings = _underwear_settings(household_data)
        settings["total_owned"] = max(1, int(underwear_total_owned))
        settings["washing_threshold"] = min(settings["washing_threshold"], settings["total_owned"])
        household_data["underwear_settings"] = settings
        household_data["inventory"]["underwear"] = min(
            max(0, int(household_data["inventory"].get("underwear", 0))),
            settings["total_owned"],
        )

    if action == "set":
        if product == "cup":
            household_data["inventory"][product] = 1
        elif product == "underwear":
            settings = _underwear_settings(household_data)
            household_data["inventory"][product] = min(settings["total_owned"], max(0, quantity))
        else:
            household_data["inventory"][product] = max(0, quantity)
        _apply_optional_thresholds(household_data, product, threshold_warning, threshold_critical)
    elif action == "add":
        current = max(0, int(household_data["inventory"].get(product, 0)))
        if product == "cup":
            household_data["inventory"][product] = 1
        elif product == "underwear":
            household_data["inventory"][product] = max(0, current - max(0, quantity))
        else:
            household_data["inventory"][product] = current + max(0, quantity)
        _apply_optional_thresholds(household_data, product, threshold_warning, threshold_critical)
    elif action == "consume":
        _apply_optional_thresholds(household_data, product, threshold_warning, threshold_critical)
        # HA-6: the shopping-list/underwear-washing todo checks now happen
        # inside _async_register_consumption itself (see comment there), so
        # they're no longer duplicated here.
        await _async_register_consumption(
            hass, product, max(1, quantity), member, source="inventory_service", area_id=area_id
        )
        return
    elif action == "set_thresholds":
        if product == "cup":
            raise HomeAssistantError("Cup thresholds are not supported.")
        warning = call.data.get(SERVICE_FIELD_WARNING_THRESHOLD)
        critical = call.data.get(SERVICE_FIELD_CRITICAL_THRESHOLD)
        if warning is None and critical is None:
            raise HomeAssistantError("Provide warning_threshold and/or critical_threshold.")
        current_thresholds = household_data["thresholds"].setdefault(product, {"warning": 10, "critical": 5})
        next_warning = current_thresholds.get("warning", 10) if warning is None else max(0, int(warning))
        next_critical = current_thresholds.get("critical", 5) if critical is None else max(0, int(critical))
        if next_warning < next_critical:
            raise HomeAssistantError("warning_threshold must be greater than or equal to critical_threshold.")
        household_data["thresholds"][product] = {"warning": next_warning, "critical": next_critical}
        if product == "underwear":
            settings = _underwear_settings(household_data)
            settings["washing_threshold"] = min(settings["total_owned"], max(0, int(next_warning)))
            household_data["underwear_settings"] = settings
    elif action == "add_to_shopping_list":
        if product not in HOUSEHOLD_PRODUCTS:
            raise HomeAssistantError("Provide a valid product for add_to_shopping_list.")
        if product == "cup":
            raise HomeAssistantError("Cup is reusable and cannot be added to the shopping list.")
        qty = max(1, int(quantity or 1))
        names = _todo_strings(hass.config.language)["products"]
        display_name = names.get(product) or product.replace("_", " ").title()
        item_name = f"{display_name} x{qty}" if qty > 1 else display_name
        duplicate_contains = _todo_variants(lambda t: t["products"][product]) if product == "underwear" else None
        await _async_add_todo_item_if_missing(hass, item_name, duplicate_contains=duplicate_contains)
        return
    elif action == "reset":
        hass.data[HOUSEHOLD_INVENTORY_DATA_KEY] = _default_household_inventory_data()
    else:
        raise HomeAssistantError(
            "Unsupported inventory_action. Use one of: set, add, consume, set_thresholds, "
            "add_to_shopping_list, reset, set_area_tracking."
        )

    await _async_save_household_inventory(hass)

    # After reducing or explicitly setting stock, check whether the shopping list
    # needs an entry (consume already handled above).
    if action == "set":
        await _async_check_and_update_todo_list(hass, household_data, product)
    if action in {"set", "add", "set_thresholds"} and product == "underwear":
        await _async_check_underwear_washing_todo(hass, household_data)
    if action in {"set", "add", "set_thresholds"}:
        from .repairs import async_check_household_inventory_critical

        async_check_household_inventory_critical(hass, _household_inventory_critical_products(household_data))
        _async_check_household_supply(hass, household_data)


async def _async_handle_add_symptom(hass: HomeAssistant, call: ServiceCall, *, save: bool = True) -> None:
    """Add or update symptom data for a date. save=False lets a bulk caller (import_symptom_history) save once at the end."""
    runtime = _runtime_for_call(hass, call)
    date_iso = _normalize_date_or_raise(call.data[SERVICE_FIELD_DATE])
    symptom_data = call.data.get(SERVICE_FIELD_SYMPTOM_DATA, {})

    if not isinstance(symptom_data, dict):
        raise HomeAssistantError("Symptom data must be a dictionary.")

    existing = None
    for entry in runtime.symptom_history:
        if entry.get("date") == date_iso:
            existing = entry
            break

    # Free-text fields (SYMPTOM_MOOD/SYMPTOM_NOTE, 03.09.2026) added to the
    # valid-fields set alongside SYMPTOM_BASAL_TEMP - both are, like
    # basal_temp, exceptions to the "value must be one of SYMPTOM_OPTIONS"
    # rule below, just for a different reason (open text instead of a
    # number). See const.py for why these two were missing entirely before.
    free_text_fields = {SYMPTOM_MOOD, SYMPTOM_NOTE}
    free_text_max_lengths = {SYMPTOM_MOOD: SYMPTOM_MOOD_MAX_LENGTH, SYMPTOM_NOTE: SYMPTOM_NOTE_MAX_LENGTH}
    valid_fields = set(SYMPTOM_OPTIONS.keys()) | {SYMPTOM_BASAL_TEMP} | free_text_fields

    # HA-Idee 1 (weitere Ideen, 15.09.2026): basal_temp used to be hard-coded
    # Celsius-only, rejecting any Fahrenheit reading outright (see the old
    # comment below this used to carry: "convert it to Celsius first"). This
    # profile-level preference (options flow, see config_flow.py) lets a
    # person log readings in whichever unit they actually think in;
    # storage/statistics/the basal-temperature sensor stay Celsius either
    # way, only the interpretation of THIS incoming value changes.
    entry_for_unit = hass.config_entries.async_get_entry(_entry_id_for_runtime(hass, runtime))
    temperature_unit = str(
        (entry_for_unit.options.get(CONF_TEMPERATURE_UNIT) if entry_for_unit else None) or DEFAULT_TEMPERATURE_UNIT
    )
    basal_temp_celsius: float | None = None

    for key, value in symptom_data.items():
        if key not in valid_fields:
            raise HomeAssistantError(
                f"Unknown symptom field '{key}'. Valid fields: {', '.join(sorted(valid_fields))}"
            )
        if key == SYMPTOM_BASAL_TEMP:
            try:
                temp_value = float(value)
            except (TypeError, ValueError):
                raise HomeAssistantError(f"Symptom field '{SYMPTOM_BASAL_TEMP}' must be a number, got '{value}'.")
            if temperature_unit == TEMPERATURE_UNIT_FAHRENHEIT:
                # Plausibility check in °F first (86–113°F ≈ 30–45°C), so a
                # typo (e.g. 986 instead of 98.6) or an accidental Celsius
                # reading is caught with a message in the unit the person
                # actually configured, instead of a confusing Celsius range.
                if not 86.0 <= temp_value <= 113.0:
                    raise HomeAssistantError(
                        f"Symptom field '{SYMPTOM_BASAL_TEMP}' must be between 86 and 113 (°F), got {temp_value}. "
                        "This profile is configured for Fahrenheit input (see integration options)."
                    )
                basal_temp_celsius = (temp_value - 32.0) * 5.0 / 9.0
            else:
                # Plausibility check, not just a type check — catches typos (e.g.
                # 365 instead of 36.5) and Celsius/Fahrenheit unit confusion
                # (e.g. entering 98.6°F into this Celsius-only field), which
                # would otherwise silently pass as "a valid number" and corrupt
                # NFP coverline detection without any error. Range is generous
                # (30-45°C) to never reject a genuine reading, including fever.
                if not 30.0 <= temp_value <= 45.0:
                    raise HomeAssistantError(
                        f"Symptom field '{SYMPTOM_BASAL_TEMP}' must be between 30 and 45 (°C), got {temp_value}. "
                        "If you're entering a Fahrenheit reading, switch this profile's temperature input unit "
                        "to Fahrenheit in the integration options instead."
                    )
                basal_temp_celsius = temp_value
        elif key in free_text_fields:
            if not isinstance(value, str):
                raise HomeAssistantError(f"Symptom field '{key}' must be text, got '{value}'.")
            max_length = free_text_max_lengths[key]
            if len(value) > max_length:
                raise HomeAssistantError(
                    f"Symptom field '{key}' is too long ({len(value)} characters, max {max_length})."
                )
        else:
            allowed = SYMPTOM_OPTIONS[key]
            values_to_check = value if isinstance(value, list) else [value]
            for item in values_to_check:
                if item not in allowed:
                    raise HomeAssistantError(
                        f"Invalid value '{item}' for symptom field '{key}'. Allowed: {', '.join(allowed)}"
                    )

    next_symptom_data = dict(symptom_data)
    if basal_temp_celsius is not None:
        # Always store the Celsius-converted value (rounded to match the
        # precision already used elsewhere, e.g. statistics.py's summaries),
        # regardless of which unit the incoming value was interpreted in.
        next_symptom_data[SYMPTOM_BASAL_TEMP] = round(basal_temp_celsius, 2)
    if SYMPTOM_CLOTS in next_symptom_data and next_symptom_data.get(SYMPTOM_CLOTS) != "yes":
        next_symptom_data.pop(SYMPTOM_CLOT_SIZE, None)

    if SYMPTOM_CLOT_SIZE in next_symptom_data:
        clots_value = next_symptom_data.get(SYMPTOM_CLOTS)
        if clots_value is None and existing is not None:
            clots_value = existing.get(SYMPTOM_CLOTS)
        if clots_value != "yes":
            raise HomeAssistantError(f"Symptom field '{SYMPTOM_CLOT_SIZE}' can only be set when '{SYMPTOM_CLOTS}' is 'yes'.")

    was_pill = existing is not None and existing.get(SYMPTOM_CONTRACEPTION_METHOD) == CONTRACEPTION_METHOD_PILL
    was_unprotected = existing is not None and _is_unprotected(existing.get(SYMPTOM_INTERCOURSE))
    if existing:
        merged = dict(existing)
        merged.update(next_symptom_data)
        if merged.get(SYMPTOM_CLOTS) != "yes":
            merged.pop(SYMPTOM_CLOT_SIZE, None)
        merged["date"] = date_iso
        existing.clear()
        existing.update(merged)
    else:
        new_entry = dict(next_symptom_data)
        if new_entry.get(SYMPTOM_CLOTS) != "yes":
            new_entry.pop(SYMPTOM_CLOT_SIZE, None)
        new_entry["date"] = date_iso
        runtime.symptom_history.append(new_entry)

    runtime.symptom_history.sort(key=lambda x: x.get("date", ""))

    bleeding_strength = str(next_symptom_data.get("bleeding_strength", "")).strip().lower()
    if bleeding_strength in {"none", "keine"}:
        runtime.history = [item for item in runtime.history if item != date_iso]
    elif "bleeding_strength" in next_symptom_data:
        _log_bleeding_in_history(runtime, date_iso)

    if save and entry_for_unit is not None and not was_unprotected and _is_unprotected(next_symptom_data.get(SYMPTOM_INTERCOURSE)):
        await _async_send_unprotected_hint(hass, entry_for_unit, runtime, date_iso)

    if save:
        await _async_save_and_notify(hass, runtime)
        # Described in logbook.py; skipped for private profiles like EVENT_CYCLE_START_LOGGED.
        if (
            next_symptom_data.get(SYMPTOM_CONTRACEPTION_METHOD) == CONTRACEPTION_METHOD_PILL
            and not was_pill
            and runtime.visibility_level != VISIBILITY_LEVEL_PRIVATE
        ):
            hass.bus.async_fire(
                EVENT_PILL_TAKEN,
                {
                    "entry_id": _entry_id_for_runtime(hass, runtime),
                    "profile": runtime.profile,
                    "friendly_name": runtime.friendly_name,
                    "date": date_iso,
                },
            )


async def _async_handle_remove_symptom(hass: HomeAssistant, call: ServiceCall) -> None:
    """Remove symptom data for a date."""
    runtime = _runtime_for_call(hass, call)
    date_iso = _normalize_date_or_raise(call.data[SERVICE_FIELD_DATE])

    runtime.symptom_history = [entry for entry in runtime.symptom_history if entry.get("date") != date_iso]
    await _async_save_and_notify(hass, runtime)


async def _async_handle_get_symptom(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """Get symptom data for a date."""
    runtime = _runtime_for_call(hass, call)
    date_iso = _normalize_date_or_raise(call.data[SERVICE_FIELD_DATE])

    for entry in runtime.symptom_history:
        if entry.get("date") == date_iso:
            _LOGGER.info("Symptom data for %s: %s", date_iso, entry)
            return dict(entry)

    _LOGGER.info("No symptom data found for %s", date_iso)
    return {"date": date_iso, "found": False}


async def _async_handle_get_full_history(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """Return the complete, uncompacted symptom_history and product_usage for a
    profile, bounded to the last N days.

    This exists because the main sensor's exposed attributes go through a
    size-based compaction/shedding pipeline (sensor.py's
    _build_compact_sensor_attributes): symptom_history first gets capped to the
    most recent ~30 entries, and if the profile's overall attribute payload is
    still too large after that, it can be dropped from the sensor entirely —
    not just capped. That's a deliberate tradeoff to keep the sensor's own
    state/attributes within Home Assistant's practical size limits, but it
    means dashboard widgets that need a genuinely full history (charts,
    heatmaps, trend lines covering more than the last handful of tracked
    days) can't rely on the sensor's attributes for that.

    A service response is not persisted into the state machine the way entity
    attributes are, so it isn't subject to the same size pressure — reading
    straight from the full in-memory runtime.symptom_history/product_usage
    here always returns everything within the requested window, regardless of
    how large the profile's overall tracking history has grown.
    """
    runtime = _runtime_for_call(hass, call)
    raw_days = call.data.get(SERVICE_FIELD_DAYS, 180)
    try:
        days = max(1, min(730, int(raw_days)))
    except (TypeError, ValueError):
        days = 180
    cutoff = (dt_util.now().date() - timedelta(days=days)).isoformat()

    symptom_history = [
        dict(entry)
        for entry in (runtime.symptom_history or [])
        if isinstance(entry, dict) and str(entry.get("date", "")) >= cutoff
    ]
    product_usage = [
        dict(entry)
        for entry in (runtime.product_usage or [])
        if isinstance(entry, dict) and str(entry.get("date", "")) >= cutoff
    ]
    return {
        "symptom_history": symptom_history,
        "product_usage": product_usage,
        "days": days,
    }


async def _async_handle_get_cycle_predictions(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """Per-cycle fertile window / ovulation estimates for past AND future
    cycles — not just the current one.

    The main sensor's fertile_window_start/end and ovulation_day attributes
    only ever describe the *current* cycle. The calendar card already
    computes this same estimate for every cycle it displays (past and
    projected future ones), using a client-side JS formula — but that
    calculation was never exposed anywhere an external client could query it
    directly. This service ports that same formula server-side
    (model.build_cycle_predictions) so an external app doesn't have to
    reimplement it just to get the same predictions the calendar already
    shows.
    """
    runtime = _runtime_for_call(hass, call)
    raw_days_back = call.data.get(SERVICE_FIELD_DAYS_BACK, 365)
    raw_future_cycles = call.data.get(SERVICE_FIELD_FUTURE_CYCLES, 3)
    try:
        days_back = max(1, min(1825, int(raw_days_back)))
    except (TypeError, ValueError):
        days_back = 365
    try:
        future_cycles = max(0, min(24, int(raw_future_cycles)))
    except (TypeError, ValueError):
        future_cycles = 3

    today = dt_util.now().date()
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
        nfp_mode=DEFAULT_NFP_ANALYSIS_MODE,
        onboarding_stage=getattr(runtime, "onboarding_stage", None),
    )

    cycles = build_cycle_predictions(
        history=runtime.history,
        avg_cycle_length=model.avg_cycle_length,
        future_cycles=future_cycles,
        days_back=days_back,
        today=dt_util.now().date(),
    )
    return {"cycles": cycles, "days_back": days_back, "future_cycles": future_cycles}


async def _async_handle_compare_current_cycle(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """Compare the current, still-ongoing cycle against the recent average
    (HA-Idee 6, "weitere Ideen?" 25.09.2026).

    Reuses build_cycle_model()'s avg_cycle_length (last up to 7 completed
    cycles, DEFAULT_CYCLE_LENGTH fallback) rather than recomputing an
    average independently - the same value the sensor and predictions
    already show, so this can never quietly diverge from what's displayed
    elsewhere. The "recent completed cycles" window used for the pain-days
    comparison mirrors model.py::_recent_cycle_lengths's own windowing/
    plausibility filter (10 < diff < 80 days) so both numbers describe the
    same set of cycles. Read-only, changes nothing.
    """
    runtime = _runtime_for_call(hass, call)
    starts = grouped_cycle_starts(runtime.history)
    if not starts:
        raise HomeAssistantError("No cycle history recorded for this profile yet.")

    today = dt_util.now().date()
    current_start = date.fromisoformat(starts[-1])
    elapsed_days = (today - current_start).days

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
        nfp_mode=DEFAULT_NFP_ANALYSIS_MODE,
        onboarding_stage=getattr(runtime, "onboarding_stage", None),
    )
    avg_cycle_length = model.avg_cycle_length

    recent_starts = starts[-max(2, 7):]
    recent_pairs: list[tuple[str, str]] = []
    for idx in range(1, len(recent_starts)):
        try:
            diff = (date.fromisoformat(recent_starts[idx]) - date.fromisoformat(recent_starts[idx - 1])).days
        except ValueError:
            continue
        if 10 < diff < 80:
            recent_pairs.append((recent_starts[idx - 1], recent_starts[idx]))

    pain_counts: list[int] = []
    for start_iso, end_iso in recent_pairs:
        pain_counts.append(
            _count_pain_days(runtime.symptom_history, date.fromisoformat(start_iso), date.fromisoformat(end_iso))
        )
    avg_pain_days = round(sum(pain_counts) / len(pain_counts), 1) if pain_counts else None
    current_pain_days = _count_pain_days(runtime.symptom_history, current_start, today + timedelta(days=1))

    return {
        "cycle_start": starts[-1],
        "current_cycle_day": elapsed_days + 1,
        "average_cycle_length": avg_cycle_length,
        "days_relative_to_average": (elapsed_days - avg_cycle_length) if avg_cycle_length else None,
        "current_pain_days": current_pain_days,
        "average_pain_days_per_cycle": avg_pain_days,
        "cycles_compared": len(recent_pairs),
    }


async def _async_handle_get_last_cycle_summary(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """Summary of the last completed cycle (read-only), see statistics.py::compute_last_cycle_summary."""
    runtime = _runtime_for_call(hass, call)
    summary = compute_last_cycle_summary(runtime.history, runtime.symptom_history, runtime.period_duration_days)
    if summary is None:
        raise HomeAssistantError("At least two cycle starts are needed for a completed cycle.")
    return summary


async def _async_handle_create_periods_from_bleeding(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """Add period days for logged bleeding that never became a period (same rule as add_symptom)."""
    runtime = _runtime_for_call(hass, call)
    added = _bleeding_history_additions(runtime, dt_util.now().date())
    if added:
        runtime.history.extend(added)
        await _async_save_and_notify(hass, runtime)
    return {"added_dates": added, "count": len(added)}


async def _async_handle_confirm_contraception_renewal(hass: HomeAssistant, call: ServiceCall) -> None:
    """Start the renewal period (IUD, implant, injection) or the patch/ring pack from the given day (default today)."""
    from .model import compute_contraception_status

    runtime = _runtime_for_call(hass, call)
    today = dt_util.now().date()
    raw = call.data.get(SERVICE_FIELD_DATE)
    day = date.fromisoformat(_normalize_date_or_raise(str(raw))) if raw else today
    if day > today:
        raise HomeAssistantError("The renewal date cannot be in the future.")
    method = compute_contraception_status(runtime.symptom_history, today=today, renewed=_renewed(runtime))["current_method"]
    if method not in CONTRACEPTION_RENEWAL_MONTHS and method not in CONTRACEPTION_RHYTHM_EVENTS:
        raise HomeAssistantError(
            "The current contraception method has no renewal period. Log an IUD, implant, injection, patch or ring first."
        )
    runtime.noncycle_data[NONCYCLE_CONTRACEPTION_RENEWED] = {"method": method, "date": day.isoformat()}
    await _async_save_and_notify(hass, runtime)


async def _async_handle_set_pregnancy_mode(hass: HomeAssistant, call: ServiceCall) -> None:
    """Set pregnancy mode on or off."""
    runtime = _runtime_for_call(hass, call)
    is_pregnant = bool(call.data.get(SERVICE_FIELD_IS_PREGNANT, False))
    pregnancy_start_date = call.data.get(SERVICE_FIELD_PREGNANCY_START_DATE)
    if pregnancy_start_date:
        pregnancy_start_date = _normalize_date_or_raise(pregnancy_start_date)
    elif is_pregnant and runtime.history:
        pregnancy_start_date = runtime.history[-1]
    else:
        pregnancy_start_date = None
    runtime.pregnancy_data = {"is_pregnant": is_pregnant, "start_date": pregnancy_start_date}
    await _async_save_and_notify(hass, runtime)


async def _async_handle_update_pregnancy_date(hass: HomeAssistant, call: ServiceCall) -> None:
    """Update pregnancy start date."""
    runtime = _runtime_for_call(hass, call)
    date_iso = _normalize_date_or_raise(call.data[SERVICE_FIELD_PREGNANCY_START_DATE])
    runtime.pregnancy_data["start_date"] = date_iso
    await _async_save_and_notify(hass, runtime)


async def _async_handle_set_menarche_mode(hass: HomeAssistant, call: ServiceCall) -> None:
    """Set menarche mode - enable pre-menarche tracking or confirm menarche occurred."""
    runtime = _runtime_for_call(hass, call)
    is_menarche = bool(call.data.get("is_menarche", False))
    estimated_date = call.data.get(SERVICE_FIELD_ESTIMATED_MENARCHE_DATE)
    family_age = call.data.get(SERVICE_FIELD_FAMILY_MENARCHE_AGE)

    if estimated_date:
        estimated_date = _normalize_date_or_raise(estimated_date)

    runtime.menarche_data = {
        "tracking_active": True,
        "is_menarche": is_menarche,
        "menarche_date": runtime.menarche_data.get("menarche_date"),
        "estimated_date": estimated_date,
        "family_menarche_age": int(family_age) if family_age is not None else runtime.menarche_data.get("family_menarche_age"),
    }
    await _async_save_and_notify(hass, runtime)


async def _async_handle_update_menarche_date(hass: HomeAssistant, call: ServiceCall) -> None:
    """Record the actual menarche date (first period)."""
    runtime = _runtime_for_call(hass, call)
    date_iso = _normalize_date_or_raise(call.data[SERVICE_FIELD_DATE])
    runtime.menarche_data["tracking_active"] = True
    runtime.menarche_data["is_menarche"] = True
    runtime.menarche_data["menarche_date"] = date_iso
    await _async_save_and_notify(hass, runtime)


async def _async_handle_log_first_period(hass: HomeAssistant, call: ServiceCall) -> None:
    """Log the first period: atomically records menarche date and adds cycle start."""
    runtime = _runtime_for_call(hass, call)
    raw_date = call.data.get(SERVICE_FIELD_DATE)
    date_iso = _normalize_date_or_raise(raw_date) if raw_date else dt_util.now().date().isoformat()

    # Record menarche transition
    runtime.menarche_data["tracking_active"] = True
    runtime.menarche_data["is_menarche"] = True
    runtime.menarche_data["menarche_date"] = date_iso

    # Add cycle start
    for history_date in _smart_period_history_dates(runtime, date_iso):
        if history_date not in runtime.history:
            runtime.history.append(history_date)

    await _async_save_and_notify(hass, runtime)


async def _async_handle_get_menarche_info(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """Get menarche and pre-menarche information."""
    runtime = _runtime_for_call(hass, call)
    _LOGGER.info("Menarche info for profile '%s': %s", runtime.profile, runtime.menarche_data)
    return {
        "menarche_data": dict(runtime.menarche_data),
        "pre_menarche_data": dict(runtime.pre_menarche_data),
    }


async def _async_handle_add_pre_menarche_sign(hass: HomeAssistant, call: ServiceCall) -> None:
    """Add or update a pre-menarche body sign, tracking when it was first observed."""
    runtime = _runtime_for_call(hass, call)
    sign = str(call.data[SERVICE_FIELD_PRE_MENARCHE_SIGN])
    stage = str(call.data[SERVICE_FIELD_TANNER_STAGE])

    if sign not in PRE_MENARCHE_SIGN_OPTIONS:
        raise HomeAssistantError(f"Unknown pre-menarche sign '{sign}'.")
    allowed_stages = PRE_MENARCHE_SIGN_OPTIONS[sign]
    if stage not in allowed_stages:
        raise HomeAssistantError(
            f"Invalid value '{stage}' for sign '{sign}'. Allowed: {', '.join(allowed_stages)}"
        )

    if not isinstance(runtime.pre_menarche_data.get("signs"), dict):
        runtime.pre_menarche_data["signs"] = {}

    today_iso = dt_util.now().date().isoformat()
    existing = runtime.pre_menarche_data["signs"].get(sign)
    # Preserve the original first-observed date across repeated/updated logs of the
    # same sign (e.g. moving from stage 2 to stage 3), so the dashboard's dynamic
    # estimate is anchored to onset, not to the most recent edit.
    first_observed = today_iso
    if isinstance(existing, dict) and existing.get("logged_at"):
        first_observed = str(existing["logged_at"])

    runtime.pre_menarche_data["signs"][sign] = {
        "stage": stage,
        "logged_at": first_observed,
        "updated_at": today_iso,
    }
    await _async_save_and_notify(hass, runtime)


async def _async_handle_remove_pre_menarche_sign(hass: HomeAssistant, call: ServiceCall) -> None:
    """Remove a pre-menarche body sign."""
    runtime = _runtime_for_call(hass, call)
    sign = str(call.data[SERVICE_FIELD_PRE_MENARCHE_SIGN])

    if isinstance(runtime.pre_menarche_data.get("signs"), dict):
        runtime.pre_menarche_data["signs"].pop(sign, None)
    await _async_save_and_notify(hass, runtime)


async def _async_handle_set_menopause_mode(hass: HomeAssistant, call: ServiceCall) -> None:
    """Set menopause mode on or off."""
    runtime = _runtime_for_call(hass, call)
    is_menopause = bool(call.data.get(SERVICE_FIELD_IS_MENOPAUSE, False))
    menopause_start_date = call.data.get(SERVICE_FIELD_MENOPAUSE_START_DATE)
    if menopause_start_date:
        menopause_start_date = _normalize_date_or_raise(menopause_start_date)
    else:
        menopause_start_date = runtime.menopause_data.get("start_date")
    runtime.menopause_data = {"is_menopause": is_menopause, "start_date": menopause_start_date}
    await _async_save_and_notify(hass, runtime)


async def _async_handle_update_menopause_date(hass: HomeAssistant, call: ServiceCall) -> None:
    """Update menopause start date."""
    runtime = _runtime_for_call(hass, call)
    date_iso = _normalize_date_or_raise(call.data[SERVICE_FIELD_MENOPAUSE_START_DATE])
    runtime.menopause_data["start_date"] = date_iso
    await _async_save_and_notify(hass, runtime)


async def _maybe_await(result: Any) -> Any:
    """Await coroutine-like values, return plain values unchanged."""
    if inspect.isawaitable(result):
        return await result
    return result


async def _async_register_http_handlers(hass: HomeAssistant) -> None:
    """Register HTTP routes to serve card JS files from www/ directory."""
    if hass.data.get(_HTTP_ROUTES_REGISTERED_KEY):
        return

    async def _serve_card_file(request):  # type: ignore[no-untyped-def]
        from aiohttp.web import HTTPBadRequest, HTTPNotFound, Response

        filename = request.match_info["filename"]
        if "/" in filename or "\\" in filename or filename.startswith("."):
            raise HTTPBadRequest()

        file_path = WWW_DIR / filename
        if not file_path.is_file():
            _LOGGER.debug("Card file not found: %s", file_path)
            raise HTTPNotFound()

        content = await hass.async_add_executor_job(file_path.read_bytes)
        return Response(
            body=content,
            content_type="application/javascript",
            headers={"Cache-Control": "public, max-age=3600, s-maxage=3600"},
        )

    async def _serve_asset_file(request):  # type: ignore[no-untyped-def]
        from aiohttp.web import HTTPBadRequest, HTTPNotFound, Response

        subfolder = request.match_info["subfolder"]
        filename = request.match_info["filename"]
        if subfolder not in _ALLOWED_ASSET_SUBFOLDERS:
            raise HTTPBadRequest()
        if "/" in filename or "\\" in filename or filename.startswith(".") or not filename.endswith(".svg"):
            raise HTTPBadRequest()

        file_path = ASSETS_DIR / subfolder / filename
        if not file_path.is_file():
            _LOGGER.debug("Asset file not found: %s", file_path)
            raise HTTPNotFound()

        content = await hass.async_add_executor_job(file_path.read_bytes)
        return Response(
            body=content,
            content_type="image/svg+xml",
            headers={"Cache-Control": "public, max-age=86400, s-maxage=86400"},
        )

    async def _serve_translation_file(request):  # type: ignore[no-untyped-def]
        from aiohttp.web import HTTPBadRequest, HTTPNotFound, Response

        filename = request.match_info["filename"]
        if "/" in filename or "\\" in filename or filename.startswith(".") or not filename.endswith(".json"):
            raise HTTPBadRequest()

        file_path = WWW_DIR / "translations" / filename
        if not file_path.is_file():
            _LOGGER.debug("Translation file not found: %s", file_path)
            raise HTTPNotFound()

        content = await hass.async_add_executor_job(file_path.read_bytes)
        return Response(
            body=content,
            content_type="application/json",
            charset="utf-8",
            headers={
                # Bugfix 28.09.2026 (Simon: Uebersetzungen fehlten in der
                # Haushalts-Uebersicht, roh Schluessel/State-Strings statt
                # deutschem Text): "immutable" + 24h max-age liess den
                # Browser eine Antwort blind wiederverwenden, OHNE je erneut
                # nachzufragen - und die versionierende ?v=-Query auf dieser
                # URL (buildUrls() in menstruation-i18n.js) haengt an
                # RESOURCE_VERSION/manifest.json, das absichtlich nicht bei
                # jeder Runde hochgezaehlt wird (siehe Cache-Bust-Tradeoff-
                # Hinweise in der Roadmap) - jede Aenderung an
                # translations/*.json blieb dadurch unter derselben URL
                # haengen, bis die 24h abliefen oder der Browser-Cache
                # manuell geleert wurde. "no-cache" erzwingt stattdessen bei
                # JEDER Anfrage eine Revalidierung (kleine JSON-Datei, die
                # Mehrkosten sind vernachlaessigbar) - Uebersetzungsaenderu-
                # ngen sind damit sofort sichtbar, unabhaengig vom Manifest.
                "Cache-Control": "no-cache",
            },
        )

    async def _serve_ics_feed(request):  # type: ignore[no-untyped-def]
        from aiohttp.web import HTTPNotFound, Response

        token = request.match_info.get("token", "")
        if not token:
            raise HTTPNotFound()

        # Find the runtime whose token matches
        domain_data: dict[str, MenstruationRuntime] = hass.data.get(DOMAIN, {})
        matched_runtime: MenstruationRuntime | None = None
        matched_entry_id: str | None = None
        for entry_id, rt in domain_data.items():
            if isinstance(rt, MenstruationRuntime) and rt.ics_token == token:
                matched_runtime = rt
                matched_entry_id = entry_id
                break

        if matched_runtime is None or matched_entry_id is None:
            raise HTTPNotFound()

        # Parse optional horizon_months query parameter
        try:
            from .const import ICS_HORIZON_MONTHS_MAX
            raw_months = request.rel_url.query.get("months", "")
            horizon_months = int(raw_months) if raw_months.isdigit() else ICS_HORIZON_MONTHS_DEFAULT
            horizon_months = max(1, min(ICS_HORIZON_MONTHS_MAX, horizon_months))
        except Exception:
            horizon_months = ICS_HORIZON_MONTHS_DEFAULT

        # Build cycle model to get forecasts
        from .model import build_cycle_model, next_checkup_due
        cycle_model = await hass.async_add_executor_job(
            build_cycle_model,
            matched_runtime.history,
            matched_runtime.period_duration_days,
            matched_runtime.symptom_history,
            matched_runtime.pregnancy_data,
            matched_runtime.menarche_data,
            matched_runtime.pre_menarche_data,
            matched_runtime.menopause_data,
            matched_runtime.noncycle_data,
            dt_util.now().date(),
            matched_runtime.cycle_length_override,
        )

        # HA-Idee 2 ("weitere Ideen fuer Features?" 28.09.2026): reuses the
        # existing period-reminder lead-days setting for the ICS feed's own
        # VALARM, rather than adding a second, separate config option - the
        # same number of days already means "how long before the period
        # should I be reminded" for the HA-native notify_service path.
        matched_entry = hass.config_entries.async_get_entry(matched_entry_id)
        period_alarm_days_before = (
            int(
                matched_entry.options.get(
                    CONF_NOTIFY_PERIOD_LEAD_DAYS, DEFAULT_NOTIFY_PERIOD_LEAD_DAYS
                )
            )
            if matched_entry is not None
            else DEFAULT_NOTIFY_PERIOD_LEAD_DAYS
        )

        # Routine checkup due date; the ICS feed is a token-guarded capability URL, so no visibility gating (see ical.py).
        checkup_due = next_checkup_due(
            matched_runtime.symptom_history,
            int(
                matched_entry.options.get(CONF_CHECKUP_INTERVAL_MONTHS, DEFAULT_CHECKUP_INTERVAL_MONTHS)
                if matched_entry is not None
                else DEFAULT_CHECKUP_INTERVAL_MONTHS
            ),
        )

        ics_bytes = await hass.async_add_executor_job(
            generate_ics,
            matched_entry_id,
            cycle_model.period_forecast,
            cycle_model.fertility_forecast,
            cycle_model.avg_cycle_length,
            horizon_months,
            hass.config.language,
            period_alarm_days_before,
            checkup_due,
            dt_util.now().date(),
            collect_extra_events(
                matched_entry.options if matched_entry is not None else {},
                matched_runtime,
                cycle_model.due_date,
                hass.config.language,
                dt_util.now().date(),
            ),
        )

        return Response(
            body=ics_bytes,
            content_type="text/calendar",
            charset="utf-8",
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
        )

    try:
        hass.http.app.router.add_get(f"/{DOMAIN}/translations/{{filename}}", _serve_translation_file)
        hass.http.app.router.add_get(f"/{DOMAIN}/assets/{{subfolder}}/{{filename}}", _serve_asset_file)
        hass.http.app.router.add_get(f"/{DOMAIN}/ics/{{token}}.ics", _serve_ics_feed)
        hass.http.app.router.add_get(f"/{DOMAIN}/{{filename}}", _serve_card_file)
        hass.data[_HTTP_ROUTES_REGISTERED_KEY] = True
        for _resource_url, _static_url, filename in LOVELACE_RESOURCES:
            _LOGGER.info("Registered HTTP route: /%s/%s", DOMAIN, filename)
        _LOGGER.info("Registered HTTP route: /%s/assets/{subfolder}/{filename}", DOMAIN)
        _LOGGER.info("Registered HTTP route: /%s/translations/{filename}", DOMAIN)
        _LOGGER.info("Registered HTTP route: /%s/ics/{token}.ics", DOMAIN)
    except Exception as err:
        _LOGGER.warning("Failed to register HTTP routes for card files: %s", err)


def _is_dashboard_enabled_for_entry(entry: ConfigEntry) -> bool:
    """Return whether sidebar dashboard should be shown for this entry.

    Checks the new ``dashboard_enabled`` key first, then falls back to the
    legacy ``show_cycle_dashboard`` key for backward compatibility.
    """
    if CONF_DASHBOARD_ENABLED in entry.options:
        return bool(entry.options[CONF_DASHBOARD_ENABLED])
    return bool(entry.options.get(CONF_SHOW_CYCLE_DASHBOARD, DEFAULT_DASHBOARD_ENABLED))


async def _async_sync_dashboard_sidebar_panel(hass: HomeAssistant) -> None:
    """Register or remove the optional dashboard sidebar panel."""
    loaded_entry_ids = set(hass.data.get(DOMAIN, {}).keys())
    loaded_entries = [
        entry
        for entry in hass.config_entries.async_entries(DOMAIN)
        if entry.entry_id in loaded_entry_ids
    ]
    should_show_panel = any(_is_dashboard_enabled_for_entry(entry) for entry in loaded_entries)
    is_registered = bool(hass.data.get(_DASHBOARD_PANEL_REGISTERED_KEY))

    try:
        from homeassistant.components import frontend as frontend_component  # noqa: PLC0415
    except ImportError:
        _LOGGER.debug("Frontend component unavailable; skipping sidebar panel sync")
        return

    if should_show_panel and not is_registered:
        try:
            frontend_component.async_register_built_in_panel(
                hass,
                component_name="custom",
                sidebar_title=_DASHBOARD_PANEL_TITLE,
                sidebar_icon=_DASHBOARD_PANEL_ICON,
                frontend_url_path=_DASHBOARD_PANEL_URL_PATH,
                config={
                    "_panel_custom": {
                        "name": "menstruation-cycle-dashboard-panel",
                        "module_url": _build_card_resource_url("menstruation-cycle-dashboard-panel.js"),
                        "trust_external_script": True,
                        "embed_iframe": False,
                    },
                },
                require_admin=False,
            )
            hass.data[_DASHBOARD_PANEL_REGISTERED_KEY] = True
            _LOGGER.debug("Registered Cycle Dashboard sidebar panel")
        except Exception as err:
            _LOGGER.warning("Failed to register Cycle Dashboard sidebar panel: %s", err)
        return

    if not should_show_panel and is_registered:
        try:
            frontend_component.async_remove_panel(_DASHBOARD_PANEL_URL_PATH)
            _LOGGER.debug("Removed Cycle Dashboard sidebar panel")
        except Exception as err:
            _LOGGER.warning("Failed to remove Cycle Dashboard sidebar panel: %s", err)
        finally:
            hass.data[_DASHBOARD_PANEL_REGISTERED_KEY] = False


def _async_schedule_lovelace_resource_registration(hass: HomeAssistant) -> None:
    """Register Lovelace resources once the Lovelace component is ready."""
    if hass.data.get(_LOVELACE_RESOURCES_SCHEDULED_KEY):
        return

    hass.data[_LOVELACE_RESOURCES_SCHEDULED_KEY] = True

    async def _async_when_lovelace_ready(_hass: HomeAssistant, _component: str) -> None:
        await _async_ensure_lovelace_resource(_hass)

    try:
        from homeassistant.setup import async_when_setup_or_start
    except ImportError:
        hass.async_create_task(_async_ensure_lovelace_resource(hass))
        return

    async_when_setup_or_start(hass, "lovelace", _async_when_lovelace_ready)


def _normalize_resource_url(url: str | None) -> str | None:
    """Normalize a resource URL for duplicate detection."""
    if not url:
        return None
    return url.split("?", 1)[0]


def _extract_resource_version(url: str | None) -> str | None:
    """Extract the resource version value from a URL query string."""
    if not url:
        return None

    try:
        version_values = parse_qs(urlsplit(url).query).get("v")
    except Exception:
        return None

    if not version_values:
        return None
    return version_values[-1]


def _build_lovelace_resource_payloads(resource_url: str) -> list[dict[str, str]]:
    """Build payloads for supported Lovelace resource schemas."""
    payloads: list[dict[str, str]] = []
    seen_type_keys: set[str] = set()

    try:
        from homeassistant.components.lovelace.const import CONF_RESOURCE_TYPE_WS

        seen_type_keys.add(CONF_RESOURCE_TYPE_WS)
        payloads.append({"url": resource_url, CONF_RESOURCE_TYPE_WS: CARD_RESOURCE_TYPE})
    except Exception:
        _LOGGER.debug("Lovelace resource type key unavailable; using fallback payload keys")

    for type_key in ("res_type", CONF_TYPE):
        if type_key in seen_type_keys:
            continue
        seen_type_keys.add(type_key)
        payloads.append({"url": resource_url, type_key: CARD_RESOURCE_TYPE})

    return payloads


async def _async_get_lovelace_resource_collection(hass: HomeAssistant) -> tuple[Any | None, str | None]:
    """Return a Lovelace resource collection and its mode if available."""
    try:
        from homeassistant.components.lovelace.resources import async_get_resource_collection
    except ImportError:
        # newer Home Assistant versions no longer have this helper; the LOVELACE_DATA lookup below replaces it
        _LOGGER.debug("Lovelace resource collection helper not available; using LOVELACE_DATA")
        async_get_resource_collection = None

    if async_get_resource_collection is not None:
        try:
            collection = await _maybe_await(async_get_resource_collection(hass))
        except Exception as err:
            _LOGGER.debug("Legacy Lovelace resource helper failed: %s", err)
        else:
            if collection is not None:
                return collection, None

    try:
        from homeassistant.components.lovelace.const import LOVELACE_DATA, MODE_STORAGE
    except Exception as err:
        _LOGGER.debug("Unable to import Lovelace constants: %s", err)
        LOVELACE_DATA = None  # type: ignore[assignment]
        MODE_STORAGE = "storage"  # type: ignore[assignment]

    lovelace_data = hass.data.get(LOVELACE_DATA) if LOVELACE_DATA is not None else None
    resource_mode = getattr(lovelace_data, "resource_mode", None)
    collection = getattr(lovelace_data, "resources", None)
    if collection is not None:
        return collection, resource_mode

    if resource_mode not in (None, MODE_STORAGE):
        return None, resource_mode

    if "lovelace" not in hass.config.components:
        return None, resource_mode

    try:
        from homeassistant.components.lovelace.dashboard import LovelaceStorage
        from homeassistant.components.lovelace.resources import ResourceStorageCollection

        collection = ResourceStorageCollection(hass, LovelaceStorage(hass, None))
        await collection.async_load()
        return collection, MODE_STORAGE
    except Exception as err:
        _LOGGER.warning("Failed to create Lovelace resource storage collection: %s", err)
        return None, resource_mode


async def _async_ensure_lovelace_resource(hass: HomeAssistant) -> None:
    """Auto-register Lovelace JS resources for storage dashboards."""
    if hass.data.get(_LOVELACE_RESOURCES_ENSURED_KEY):
        return
    # Set guard early to prevent concurrent calls from all passing the initial check.
    hass.data[_LOVELACE_RESOURCES_ENSURED_KEY] = True

    collection, resource_mode = await _async_get_lovelace_resource_collection(hass)
    if collection is None:
        if "lovelace" not in hass.config.components:
            _LOGGER.warning("Lovelace component is unavailable; cannot auto-register card resources")
        elif resource_mode and resource_mode != "storage":
            _LOGGER.warning(
                "Lovelace resources use %s mode; automatic resource registration requires storage mode",
                resource_mode,
            )
        else:
            _LOGGER.warning("Lovelace resource collection is unavailable; card resources were not registered")
        return

    if not hasattr(collection, "async_create_item"):
        _LOGGER.warning(
            "Lovelace resource collection does not support automatic creation%s",
            f" in {resource_mode} mode" if resource_mode else "",
        )
        return

    try:
        items = await _maybe_await(collection.async_items())
        existing_urls = {
            _normalize_resource_url(item.get("url"))
            for item in items or []
            if isinstance(item, dict) and item.get("url")
        }
        existing_exact_urls = {
            str(item.get("url"))
            for item in items or []
            if isinstance(item, dict) and item.get("url")
        }

        added_count = 0
        updated_count = 0
        failed_urls: list[str] = []
        for resource_url, _static_url, filename in LOVELACE_RESOURCES:
            normalized_resource_url = _normalize_resource_url(resource_url)

            if resource_url in existing_exact_urls:
                _LOGGER.debug("Lovelace resource already registered: %s", resource_url)
                continue

            # A resource with the same base path but a DIFFERENT (older) version exists.
            # Update it in place instead of skipping (which would leave the stale version
            # active until cleanup deletes it, and re-adding a fresh copy would create a
            # duplicate entry if the deletion and re-add ever land in different runs).
            stale_item = None
            if normalized_resource_url is not None:
                for item in items or []:
                    if not isinstance(item, dict) or not item.get("url"):
                        continue
                    if _normalize_resource_url(item.get("url")) == normalized_resource_url:
                        stale_item = item
                        break

            if stale_item is not None and hasattr(collection, "async_update_item"):
                try:
                    item_id = stale_item.get("id")
                    await _maybe_await(collection.async_update_item(item_id, {"url": resource_url}))
                    updated_count += 1
                    existing_urls.add(normalized_resource_url)
                    existing_exact_urls.add(resource_url)
                    _LOGGER.info("Updated Lovelace resource to new version: %s", resource_url)
                    continue
                except Exception as err:
                    _LOGGER.debug("Failed to update stale Lovelace resource %s: %s", resource_url, err)
                    # fall through to normal create/cleanup handling below

            create_errors: list[str] = []
            created = False
            for payload in _build_lovelace_resource_payloads(resource_url):
                try:
                    await _maybe_await(collection.async_create_item(payload))
                    added_count += 1
                    if normalized_resource_url is not None:
                        existing_urls.add(normalized_resource_url)
                    existing_exact_urls.add(resource_url)
                    _LOGGER.info("Registered Lovelace resource automatically: %s", resource_url)
                    created = True
                    break
                except Exception as err:
                    create_errors.append(f"{payload!r} -> {err}")

                latest_items = await _maybe_await(collection.async_items())
                existing_urls = {
                    _normalize_resource_url(item.get("url"))
                    for item in latest_items or []
                    if isinstance(item, dict) and item.get("url")
                }
                existing_exact_urls = {
                    str(item.get("url"))
                    for item in latest_items or []
                    if isinstance(item, dict) and item.get("url")
                }
                if resource_url in existing_exact_urls or (
                    normalized_resource_url is not None and normalized_resource_url in existing_urls
                ):
                    _LOGGER.debug(
                        "Lovelace resource detected after create error; skipping fallback payloads: %s",
                        resource_url,
                    )
                    created = True
                    break

            if not created:
                failed_urls.append(resource_url)
                _LOGGER.error(
                    "Failed to auto-register Lovelace resource %s (%s). Attempts: %s",
                    resource_url,
                    filename,
                    " | ".join(create_errors),
                )

        if failed_urls:
            _LOGGER.warning(
                "Lovelace resource registration incomplete; %s resources still missing",
                len(failed_urls),
            )
            return

        await _async_cleanup_old_lovelace_resources(hass, RESOURCE_VERSION)
        _LOGGER.info(
            "Lovelace resource registration complete; %s new resources added, %s updated",
            added_count,
            updated_count,
        )
    except Exception as err:
        _LOGGER.exception("Auto-registration of Lovelace resources failed: %s", err)


async def _async_cleanup_old_lovelace_resources(hass: HomeAssistant, current_version: str) -> None:
    """Remove outdated Lovelace resource entries from previous integration versions."""
    collection, _resource_mode = await _async_get_lovelace_resource_collection(hass)
    if collection is None or not hasattr(collection, "async_items") or not hasattr(collection, "async_delete_item"):
        return

    try:
        items = await _maybe_await(collection.async_items())
    except Exception as err:
        _LOGGER.debug("Lovelace resource cleanup skipped: %s", err)
        return

    if not items:
        return

    current_base_urls = {_normalize_resource_url(resource_url) for resource_url, _static_url, _filename in LOVELACE_RESOURCES}
    removed_count = 0

    for item in items:
        if not isinstance(item, dict) or not item.get("url"):
            continue

        item_url = str(item["url"])
        if _normalize_resource_url(item_url) not in current_base_urls:
            continue

        item_version = _extract_resource_version(item_url)
        if item_version is None or item_version == current_version:
            continue

        item_id = item.get("id")
        try:
            if item_id is None:
                await _maybe_await(collection.async_delete_item(item))
            else:
                await _maybe_await(collection.async_delete_item(item_id))
            removed_count += 1
            _LOGGER.info("Removed outdated Lovelace resource: %s", item_url)
        except Exception as err:
            _LOGGER.debug("Could not remove outdated Lovelace resource %s: %s", item_url, err)

    if removed_count:
        _LOGGER.info("Lovelace resource cleanup complete; removed %s outdated resource entries", removed_count)
