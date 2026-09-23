"""Menstruation gauge integration."""

from __future__ import annotations

import inspect
import json
import logging
import secrets
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlsplit

import voluptuous as vol

from homeassistant import config_entries as ce
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_TYPE, Platform, UnitOfTime
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError

try:
    from homeassistant.core import SupportsResponse
except ImportError:
    SupportsResponse = None  # type: ignore[assignment,misc]
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util
from homeassistant.util import slugify

from .const import (
    ATTR_HISTORY,
    ATTR_PERIOD_DURATION_DAYS,
    ATTR_PRODUCT_USAGE,
    ATTR_SYMPTOM_HISTORY,
    ATTR_VISIBILITY_LEVEL,
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
    NOTIFY_LEAD_DAYS_MAX,
    CONF_NFP_ANALYSIS_MODE,
    DEFAULT_NOTIFICATIONS_ENABLED,
    DEFAULT_NOTIFY_PERIOD_ENABLED,
    DEFAULT_NOTIFY_PERIOD_LEAD_DAYS,
    DEFAULT_NOTIFY_FERTILE_ENABLED,
    DEFAULT_NOTIFY_FERTILE_LEAD_DAYS,
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
    SERVICE_LOG_FIRST_PERIOD,
    SERVICE_LOG_PRODUCT_USAGE,
    SERVICE_REIMPORT_BASAL_TEMP_STATS,
    SERVICE_MANAGE_HOUSEHOLD_INVENTORY,
    SERVICE_FIELD_CRITICAL_THRESHOLD,
    SERVICE_REFRESH_CYCLE_MODEL,
    SERVICE_FIELD_INVENTORY_ACTION,
    SERVICE_FIELD_MEMBER,
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
    SERVICE_SAVE_TIMER_STATE,
    SERVICE_EXPORT_DOCTOR_REPORT,
    SERVICE_FIELD_DAYS_BACK,
    SERVICE_FIELD_FUTURE_CYCLES,
    SERVICE_FIELD_PATIENT_NAME,
    SERVICE_FIELD_PATIENT_BIRTHDATE,
    SERVICE_FIELD_LANGUAGE,
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
    SERVICE_FIELD_DATE_FORMAT,
    IMPORT_DATE_FORMATS,
    DEFAULT_IMPORT_DATE_FORMAT,
    CYCLE_LENGTH_OVERRIDE_MIN,
)
from .ical import generate_ics
from .model import (
    build_cycle_model,
    build_cycle_predictions,
    find_implausible_cycle_gaps,
    grouped_cycle_starts,
    normalize_history,
)
from .statistics import compute_statistics, generate_doctor_report_html
from .storage import MenstruationStorage

PLATFORMS: list[Platform] = [Platform.SENSOR, Platform.CALENDAR, Platform.TODO]
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
_ALLOWED_ASSET_SUBFOLDERS: frozenset[str] = frozenset({"pregnancy", "period", "state", "brands", "buttons"})
_HTTP_ROUTES_REGISTERED_KEY = f"{DOMAIN}_http_routes_registered"
_LOVELACE_RESOURCES_ENSURED_KEY = f"{DOMAIN}_lovelace_resources_ensured"
_LOVELACE_RESOURCES_SCHEDULED_KEY = f"{DOMAIN}_lovelace_resources_scheduled"
_DASHBOARD_PANEL_REGISTERED_KEY = f"{DOMAIN}_dashboard_panel_registered"
_DASHBOARD_PANEL_URL_PATH = "cycle-dashboard"
_DASHBOARD_PANEL_TITLE = "Cycle Dashboard"
_DASHBOARD_PANEL_ICON = "mdi:view-dashboard-outline"

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
_UNDERWEAR_WASH_TODO_ITEM = "Underwear washing needed"
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
        normalized_log.append(
            {
                "product": product,
                "quantity": quantity,
                "member": str(entry.get("member", "")).strip() or "unknown",
                "timestamp": timestamp,
                "source": str(entry.get("source", "")).strip() or "manual",
            }
        )

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
    }


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
        },
    )


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


async def _async_register_consumption(
    hass: HomeAssistant,
    product: str,
    quantity: int,
    member: str,
    *,
    source: str,
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

    display_name = _SHOPPING_PRODUCT_NAMES.get(product)
    if not display_name:
        return

    inventory = household_data.get("inventory", {})
    quantity = max(0, int(inventory.get(product, 0)))
    thresholds = household_data.get("thresholds", {})
    threshold = thresholds.get(product, {})
    warning = max(0, int(threshold.get("warning", 10) if isinstance(threshold, dict) else 10))

    if quantity > warning:
        return

    added = await _async_add_todo_item_if_missing(hass, display_name)
    if added:
        _LOGGER.info(
            "Added '%s' to shopping list (stock: %d, warning threshold: %d).",
            display_name, quantity, warning,
        )


async def _async_add_todo_item_if_missing(
    hass: HomeAssistant,
    item: str,
    *,
    duplicate_contains: str | None = None,
) -> bool:
    """Add an item to todo.shopping_list unless an equivalent item already exists."""
    normalized_item = item.strip().lower()
    if not normalized_item:
        return False

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
                if summary == normalized_item:
                    already_listed = True
                    break
                if duplicate_contains and duplicate_contains.strip().lower() in summary:
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
    await _async_add_todo_item_if_missing(hass, _UNDERWEAR_WASH_TODO_ITEM)


# Small, self-contained translation table for the two notification types,
# matching the pattern used in ical.py for the same reason: these are sent to
# the person directly (unlike todo-list items, which follow this integration's
# existing English-only convention), so they're worth localizing properly.
_NOTIFY_STRINGS: dict[str, dict[str, str]] = {
    "en": {
        "period_title": "Period reminder",
        "period_message": "{name}: period is predicted to start on {date}.",
        "fertile_title": "Fertile window reminder",
        "fertile_message": "{name}: the fertile window starts on {date}.",
    },
    "de": {
        "period_title": "Perioden-Erinnerung",
        "period_message": "{name}: Die Periode wird voraussichtlich am {date} beginnen.",
        "fertile_title": "Erinnerung: fruchtbares Fenster",
        "fertile_message": "{name}: Das fruchtbare Fenster beginnt am {date}.",
    },
    "fr": {
        "period_title": "Rappel de règles",
        "period_message": "{name} : les règles devraient commencer le {date}.",
        "fertile_title": "Rappel : fenêtre de fertilité",
        "fertile_message": "{name} : la fenêtre de fertilité commence le {date}.",
    },
    "es": {
        "period_title": "Recordatorio de menstruación",
        "period_message": "{name}: se prevé que la menstruación comience el {date}.",
        "fertile_title": "Recordatorio: ventana fértil",
        "fertile_message": "{name}: la ventana fértil comienza el {date}.",
    },
    "sv": {
        "period_title": "Mens-påminnelse",
        "period_message": "{name}: mensen väntas börja den {date}.",
        "fertile_title": "Påminnelse: fertilt fönster",
        "fertile_message": "{name}: det fertila fönstret börjar den {date}.",
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
    if not period_notify_enabled and not fertile_notify_enabled:
        return
    period_lead_days = max(
        0, min(NOTIFY_LEAD_DAYS_MAX, int(entry.options.get(CONF_NOTIFY_PERIOD_LEAD_DAYS, DEFAULT_NOTIFY_PERIOD_LEAD_DAYS)))
    )
    fertile_lead_days = max(
        0, min(NOTIFY_LEAD_DAYS_MAX, int(entry.options.get(CONF_NOTIFY_FERTILE_LEAD_DAYS, DEFAULT_NOTIFY_FERTILE_LEAD_DAYS)))
    )

    from .model import build_cycle_model

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

    strings = _notify_strings(hass.config.language)
    raw_service = str(entry.options.get(CONF_NOTIFY_SERVICE, "") or "").strip()
    if raw_service:
        if "." in raw_service:
            notify_domain, notify_service = raw_service.split(".", 1)
        else:
            notify_domain, notify_service = "notify", raw_service
    else:
        notify_domain, notify_service = "persistent_notification", "create"

    async def _send(title: str, message: str) -> None:
        try:
            if notify_domain == "persistent_notification":
                await hass.services.async_call(
                    "persistent_notification",
                    "create",
                    {"title": title, "message": message, "notification_id": f"menstruation_cycle_{entry.entry_id}_{title}"},
                )
            else:
                await hass.services.async_call(notify_domain, notify_service, {"title": title, "message": message})
        except Exception as ex:  # noqa: BLE001 — a bad/misconfigured notify target
            # shouldn't ever crash the midnight refresh cycle for everyone else.
            _LOGGER.warning("Could not send notification via %s.%s: %s", notify_domain, notify_service, ex)

    period_start = (model.period_forecast or {}).get("predicted_start")
    fertile_start = (model.fertility_forecast or {}).get("fertile_window_start")
    notified_something = False

    if period_start and period_notify_enabled:
        period_target_iso = (today + timedelta(days=period_lead_days)).isoformat()
        if period_start == period_target_iso and runtime.noncycle_data.get("notified_period_start") != period_start:
            await _send(
                strings["period_title"],
                strings["period_message"].format(name=runtime.friendly_name, date=period_start),
            )
            runtime.noncycle_data["notified_period_start"] = period_start
            notified_something = True

    if fertile_start and fertile_notify_enabled:
        fertile_target_iso = (today + timedelta(days=fertile_lead_days)).isoformat()
        if fertile_start == fertile_target_iso and runtime.noncycle_data.get("notified_fertile_start") != fertile_start:
            await _send(
                strings["fertile_title"],
                strings["fertile_message"].format(name=runtime.friendly_name, date=fertile_start),
            )
            runtime.noncycle_data["notified_fertile_start"] = fertile_start
            notified_something = True

    if notified_something:
        await _async_save_and_notify(hass, runtime)


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

    status = compute_contraception_status(runtime.symptom_history, today=dt_util.now().date())
    if not status.get("renewal_reminder_due"):
        return
    method = status.get("current_method")
    due_date = status.get("renewal_due_date")
    if not method or not due_date:
        return

    # Item text intentionally single-language (English), matching the existing
    # convention for todo-list items in this integration (e.g. the underwear
    # washing reminder) — todo-list items aren't currently localized.
    item_text = f"{runtime.friendly_name}: contraception method ({method}) may need renewal soon ({due_date})"
    await _async_add_todo_item_if_missing(hass, item_text, duplicate_contains=f"{runtime.friendly_name}: contraception method ({method})")


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

        pain_days = 0
        for entry in runtime.symptom_history or []:
            if not isinstance(entry, dict):
                continue
            try:
                entry_date = date.fromisoformat(str(entry.get("date")))
            except (TypeError, ValueError):
                continue
            if not (start_d <= entry_date < next_d):
                continue
            pain_value = entry.get("pain")
            has_pain = bool(pain_value) if isinstance(pain_value, list) else pain_value not in (None, "")
            if has_pain:
                pain_days += 1
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

    async def async_export_doctor_report(call: ServiceCall) -> None:
        await _async_handle_export_doctor_report(hass, call)

    async def async_set_profile_visibility(call: ServiceCall) -> None:
        await _async_handle_set_profile_visibility(hass, call)

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

    hass.services.async_register(
        DOMAIN,
        SERVICE_REFRESH_CYCLE_MODEL,
        async_refresh_cycle_model,
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
                    ["set", "add", "consume", "set_thresholds", "add_to_shopping_list", "reset"]
                ),
                vol.Optional(SERVICE_FIELD_PRODUCT): vol.In(HOUSEHOLD_PRODUCTS),
                vol.Optional(SERVICE_FIELD_QUANTITY, default=1): vol.All(vol.Coerce(int), vol.Range(min=0, max=5000)),
                vol.Optional(SERVICE_FIELD_WARNING_THRESHOLD): vol.All(vol.Coerce(int), vol.Range(min=0, max=5000)),
                vol.Optional(SERVICE_FIELD_CRITICAL_THRESHOLD): vol.All(vol.Coerce(int), vol.Range(min=0, max=5000)),
                vol.Optional(SERVICE_FIELD_MEMBER): cv.string,
                vol.Optional(_SERVICE_FIELD_UNDERWEAR_TOTAL_OWNED): vol.All(vol.Coerce(int), vol.Range(min=1, max=5000)),
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

    hass.services.async_register(
        DOMAIN,
        SERVICE_EXPORT_DOCTOR_REPORT,
        async_export_doctor_report,
        schema=vol.Schema({
            **common_profile_field,
            vol.Optional(SERVICE_FIELD_DAYS_BACK, default=180): vol.All(vol.Coerce(int), vol.Range(min=30, max=730)),
            vol.Optional(SERVICE_FIELD_PATIENT_NAME): cv.string,
            vol.Optional(SERVICE_FIELD_PATIENT_BIRTHDATE): cv.string,
            vol.Optional(SERVICE_FIELD_LANGUAGE, default="de"): vol.In(["de", "en"]),
        }),
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
            await _async_check_and_send_notifications(hass, entry, runtime)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight notification check failed for %s", entry.entry_id)
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
            )
            async_check_low_prediction_confidence(
                hass, entry.entry_id, entry.title, _midnight_model.prediction_gating
            )
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Midnight low-prediction-confidence check failed for %s", entry.entry_id)

    runtime.unregister_midnight_listener = async_track_time_change(
        hass,
        _async_handle_midnight_refresh,
        hour=0,
        minute=0,
        second=5,
    )

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
    )
    async_check_low_prediction_confidence(hass, entry.entry_id, entry.title, _setup_model.prediction_gating)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    runtime: MenstruationRuntime | None = hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    if runtime:
        if runtime.unregister_midnight_listener:
            runtime.unregister_midnight_listener()
        if runtime.options_update_unsub:
            runtime.options_update_unsub()
    await _async_update_household_inventory_state(hass)

    from .repairs import async_delete_entity_naming_issue, async_delete_stale_ics_token_issue

    async_delete_entity_naming_issue(hass, entry.entry_id)
    async_delete_stale_ics_token_issue(hass, entry.entry_id)

    if not hass.data.get(DOMAIN):
        for service in (
            SERVICE_ADD_CYCLE_START,
            SERVICE_REMOVE_CYCLE_START,
            SERVICE_SET_CYCLE_HISTORY,
            SERVICE_IMPORT_CYCLE_HISTORY,
            SERVICE_SET_PERIOD_DURATION,
            SERVICE_ERASE_ALL_HISTORY,
            SERVICE_EXPORT_HISTORY,
            SERVICE_EXPORT_FULL_BACKUP,
            SERVICE_IMPORT_FULL_BACKUP,
            SERVICE_REPAIR_STORAGE,
            SERVICE_REFRESH_CYCLE_MODEL,
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


async def _async_handle_export_doctor_report(hass: HomeAssistant, call: ServiceCall) -> None:
    """Generate an HTML doctor report from the cycle history and symptom data."""
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
    contraception_status = compute_contraception_status(runtime.symptom_history, today=today)
    html_content = generate_doctor_report_html(
        stats=stats,
        history=runtime.history,
        symptom_history=runtime.symptom_history,
        profile=runtime.profile,
        patient_name=patient_name,
        patient_birthdate=patient_birthdate,
        language=language,
        current_contraception_method=contraception_status.get("current_method"),
    )

    stem = _sanitize_export_filename(f"doctor_report_{runtime.profile}_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
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


async def _async_handle_add(hass: HomeAssistant, call: ServiceCall) -> None:
    runtime = _runtime_for_call(hass, call)
    date_iso = _normalize_date_or_raise(call.data[SERVICE_FIELD_DATE])
    for history_date in _smart_period_history_dates(runtime, date_iso):
        if history_date not in runtime.history:
            runtime.history.append(history_date)
    await _async_save_and_notify(hass, runtime)


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
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
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


async def _async_handle_repair_storage(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """Diagnose stored-data inconsistencies across every loaded profile.

    Neue Idee (23.09.2026, "weitere Ideen die nicht auf der Roadmap
    stehen?"). Reines Lese-/Report-Werkzeug - veraendert nichts an
    hass.data oder im Storage.

    Zwei Kategorien von Befunden:
    1. Normalisierungs-Diffs: async_load_raw() (unveraendert wie gespeichert)
       wird gegen async_load() (normalisiert/defaulted) verglichen. Weicht
       etwas ab, hat die Normalisierung entweder ungueltige Werte verworfen/
       zurueckgesetzt oder ein fehlendes Feld defaultet - genau die Art von
       stiller Aenderung, die beim visibility_level-Bug (15.09.2026) real zu
       Datenverlust gefuehrt hat, hier aber nur berichtet statt zu greifen.
    2. Semantische Inkonsistenzen: z. B. is_pregnant=True ohne start_date,
       oder gleichzeitig aktive Schwangerschaft und Menopause.
    """
    domain_data: dict[str, MenstruationRuntime] = hass.data.get(DOMAIN, {})
    if not domain_data:
        raise HomeAssistantError("No menstruation_cycle profiles are currently loaded.")

    profiles: dict[str, Any] = {}
    total_issues = 0

    for entry_id, runtime in domain_data.items():
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

    backup = {
        "backup_version": BACKUP_FORMAT_VERSION,
        "exported_at": dt_util.utcnow().isoformat(),
        "integration": DOMAIN,
        "profiles": profiles,
    }

    stem = call.data.get(SERVICE_FIELD_FILENAME)
    if stem:
        stem = _sanitize_export_filename(str(stem))
    else:
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
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
    product_usage and cycle_length_override are restored only if currently
    empty/unset. Settings that aren't "data" (onboarding_stage,
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
        restored.append(profile_slug)
        if implausible_gaps:
            warnings[profile_slug] = [
                f"{gap['from']} and {gap['to']} are only {gap['gap_days']} day(s) apart "
                f"(shorter than the {CYCLE_LENGTH_OVERRIDE_MIN}-day minimum plausible cycle length)"
                for gap in implausible_gaps
            ]

    _LOGGER.info(
        "Imported full backup '%s' (mode=%s): restored %d profile(s), skipped %d not-configured.",
        target_path.name,
        mode,
        len(restored),
        len(skipped_not_configured),
    )

    result: dict[str, Any] = {
        "mode": mode,
        "backup_version": backup_version,
        "restored": restored,
        "skipped_not_configured": skipped_not_configured,
    }
    if mode == "merge":
        result["warnings"] = warnings
    return result


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
    if action == "used":
        await _async_register_consumption(hass, product, max(1, quantity), runtime.friendly_name, source="log_product_usage")
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
        await _async_register_consumption(hass, product, max(1, quantity), member, source="inventory_service")
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
        display_name = _SHOPPING_PRODUCT_NAMES.get(product) or product.replace("_", " ").title()
        item_name = f"{display_name} x{qty}" if qty > 1 else display_name
        duplicate_contains = display_name if product == "underwear" else None
        await _async_add_todo_item_if_missing(hass, item_name, duplicate_contains=duplicate_contains)
        return
    elif action == "reset":
        hass.data[HOUSEHOLD_INVENTORY_DATA_KEY] = _default_household_inventory_data()
    else:
        raise HomeAssistantError(
            "Unsupported inventory_action. Use one of: set, add, consume, set_thresholds, add_to_shopping_list, reset."
        )

    await _async_save_household_inventory(hass)

    # After reducing or explicitly setting stock, check whether the shopping list
    # needs an entry (consume already handled above).
    if action == "set":
        await _async_check_and_update_todo_list(hass, household_data, product)
    if action in {"set", "add", "set_thresholds"} and product == "underwear":
        await _async_check_underwear_washing_todo(hass, household_data)


async def _async_handle_add_symptom(hass: HomeAssistant, call: ServiceCall) -> None:
    """Add or update symptom data for a date."""
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
        for history_date in _smart_period_history_dates(runtime, date_iso, allow_new_period=False):
            if history_date not in runtime.history:
                runtime.history.append(history_date)

    await _async_save_and_notify(hass, runtime)


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
    )
    return {"cycles": cycles, "days_back": days_back, "future_cycles": future_cycles}


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
                "Cache-Control": "public, max-age=86400, immutable",
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
        from .model import build_cycle_model
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
            None,
            matched_runtime.cycle_length_override,
        )

        ics_bytes = await hass.async_add_executor_job(
            generate_ics,
            matched_entry_id,
            cycle_model.period_forecast,
            cycle_model.fertility_forecast,
            cycle_model.avg_cycle_length,
            horizon_months,
            hass.config.language,
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
        pass

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
    except Exception:
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
