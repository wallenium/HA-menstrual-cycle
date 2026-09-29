"""Home Assistant Logbook integration hooks (HA-Idee, "weitere neue Ideen" /
"koennen wir das logbuch noch fuer weiteres nutzen?", 29.09.2026).

Auto-discovered exactly like backup.py: any loaded integration with a
logbook.py exposing a module-level async_describe_events(hass,
async_describe_event) gets it called once by core homeassistant/components/
logbook/__init__.py::async_setup (async_process_integration_platforms), no
registration needed anywhere else in this integration. Pattern verified
against the real, current core source (raw.githubusercontent.com/
home-assistant/core/dev/.../components/logbook/__init__.py) and against two
real, unmangled example platforms (automation/logbook.py, script/logbook.py)
before writing this - same Round-40 label_registry lesson as backup.py.

Describes three menstruation_cycle events:
- EVENT_PRODUCT_CONSUMED (household-product usage). sensor.household_
  product_stock also carries a unit_of_measurement attribute (see
  _async_update_household_inventory_state) so HA's logbook "continuous
  domain" filter suppresses that sensor's automatic raw-number state-change
  entries - this description becomes the sole logbook representation of a
  consumption event, not an addition to it.
- EVENT_STATE_CHANGED (a profile's cycle status actually transitioned, e.g.
  neutral -> period). Fired since Round 38 for automations, but never had a
  logbook description before this - it was invisible in the logbook.
- EVENT_CYCLE_START_LOGGED (an add_cycle_start service call), independent of
  EVENT_STATE_CHANGED - the sensor's own state transition runs later, on its
  next async_update(), and a backfilled/past date may not transition the
  live state at all.

visibility_level: private already skips firing all three events at the
source (sensor.py / __init__.py) - nothing to filter here.

Messages are localized via hass.config.language (the instance-wide default
language), same mechanism and same 5 languages (de/en/es/fr/sv) as
__init__.py's _notify_strings/_NOTIFY_STRINGS for push notifications - the
logbook has no per-viewer language of its own to hook into, so this is the
same instance-level granularity HA's own translation system uses elsewhere
in this integration.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from homeassistant.components.logbook import (
    LOGBOOK_ENTRY_CONTEXT_ID,
    LOGBOOK_ENTRY_ENTITY_ID,
    LOGBOOK_ENTRY_MESSAGE,
    LOGBOOK_ENTRY_NAME,
    LazyEventPartialState,
)
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, EVENT_CYCLE_START_LOGGED, EVENT_PRODUCT_CONSUMED, EVENT_STATE_CHANGED

_HOUSEHOLD_INVENTORY_STATE_ENTITY_ID = "sensor.household_product_stock"

_LOGBOOK_STRINGS: dict[str, dict[str, Any]] = {
    "en": {
        "consumed": "used {quantity}x {product}",
        "consumed_in_area": "used {quantity}x {product} in {area}",
        "state_changed": "cycle status changed to {state}",
        "cycle_start_logged": "logged period start on {date}",
        "products": {
            "tampon": "tampons", "pad": "pads", "liner": "liners",
            "underwear": "underwear", "cup": "the menstrual cup",
        },
        "states": {
            "period": "period", "fertile": "fertile window", "pms": "PMS",
            "neutral": "neutral phase", "pregnant": "pregnancy",
            "pre_menarche": "pre-menarche tracking", "menarche": "menarche",
            "menopause": "menopause", "postpartum": "postpartum",
        },
    },
    "de": {
        "consumed": "hat {quantity}x {product} verwendet",
        "consumed_in_area": "hat {quantity}x {product} in {area} verwendet",
        "state_changed": "Zyklusstatus wechselte zu {state}",
        "cycle_start_logged": "Periodenbeginn für {date} erfasst",
        "products": {
            "tampon": "Tampons", "pad": "Pads", "liner": "Slipeinlagen",
            "underwear": "Unterwäsche", "cup": "die Menstruationstasse",
        },
        "states": {
            "period": "Periode", "fertile": "fruchtbares Fenster", "pms": "PMS",
            "neutral": "neutrale Phase", "pregnant": "Schwangerschaft",
            "pre_menarche": "Vor-Menarche-Verfolgung", "menarche": "Menarche",
            "menopause": "Wechseljahre", "postpartum": "Wochenbett",
        },
    },
    "es": {
        "consumed": "usó {quantity}x {product}",
        "consumed_in_area": "usó {quantity}x {product} en {area}",
        "state_changed": "el estado del ciclo cambió a {state}",
        "cycle_start_logged": "registró el inicio del período el {date}",
        "products": {
            "tampon": "tampones", "pad": "compresas", "liner": "protectores diarios",
            "underwear": "ropa interior", "cup": "la copa menstrual",
        },
        "states": {
            "period": "menstruación", "fertile": "ventana fértil", "pms": "SPM",
            "neutral": "fase neutral", "pregnant": "embarazo",
            "pre_menarche": "seguimiento pre-menarquia", "menarche": "menarquia",
            "menopause": "menopausia", "postpartum": "posparto",
        },
    },
    "fr": {
        "consumed": "a utilisé {quantity}x {product}",
        "consumed_in_area": "a utilisé {quantity}x {product} dans {area}",
        "state_changed": "le statut du cycle est passé à {state}",
        "cycle_start_logged": "a enregistré le début des règles le {date}",
        "products": {
            "tampon": "tampons", "pad": "serviettes", "liner": "protège-slips",
            "underwear": "sous-vêtements", "cup": "la coupe menstruelle",
        },
        "states": {
            "period": "règles", "fertile": "fenêtre de fertilité", "pms": "SPM",
            "neutral": "phase neutre", "pregnant": "grossesse",
            "pre_menarche": "suivi pré-ménarche", "menarche": "ménarche",
            "menopause": "ménopause", "postpartum": "post-partum",
        },
    },
    "sv": {
        "consumed": "använde {quantity}x {product}",
        "consumed_in_area": "använde {quantity}x {product} i {area}",
        "state_changed": "cykelstatus ändrades till {state}",
        "cycle_start_logged": "loggade mensstart den {date}",
        "products": {
            "tampon": "tamponger", "pad": "bindor", "liner": "trosskydd",
            "underwear": "underkläder", "cup": "menskoppen",
        },
        "states": {
            "period": "mens", "fertile": "fertilt fönster", "pms": "PMS",
            "neutral": "neutral fas", "pregnant": "graviditet",
            "pre_menarche": "spårning innan mensdebut", "menarche": "mensdebut",
            "menopause": "klimakteriet", "postpartum": "eftervård",
        },
    },
}


def _logbook_strings(lang: str | None) -> dict[str, Any]:
    key = str(lang or "en").strip().lower()[:2]
    return _LOGBOOK_STRINGS.get(key, _LOGBOOK_STRINGS["en"])


@callback
def async_describe_events(
    hass: HomeAssistant,
    async_describe_event: Callable[
        [str, str, Callable[[LazyEventPartialState], dict[str, Any]]], None
    ],
) -> None:
    """Describe menstruation_cycle logbook events."""

    @callback
    def async_describe_product_consumed(event: LazyEventPartialState) -> dict[str, Any]:
        """Describe a household-product consumption event."""
        data = event.data
        strings = _logbook_strings(hass.config.language)
        product = str(data.get("product", ""))
        quantity = data.get("quantity", 1)
        display_name = strings["products"].get(product, product.replace("_", " ") or "an item")
        area_name = data.get("area_name")
        if area_name:
            message = strings["consumed_in_area"].format(quantity=quantity, product=display_name, area=area_name)
        else:
            message = strings["consumed"].format(quantity=quantity, product=display_name)

        return {
            LOGBOOK_ENTRY_NAME: data.get("member") or "unknown",
            LOGBOOK_ENTRY_MESSAGE: message,
            LOGBOOK_ENTRY_ENTITY_ID: _HOUSEHOLD_INVENTORY_STATE_ENTITY_ID,
            LOGBOOK_ENTRY_CONTEXT_ID: event.context_id,
        }

    @callback
    def async_describe_state_changed(event: LazyEventPartialState) -> dict[str, Any]:
        """Describe a profile's cycle status transition."""
        data = event.data
        strings = _logbook_strings(hass.config.language)
        new_state = str(data.get("new_state", ""))
        label = strings["states"].get(new_state, new_state.replace("_", " ") or "an unknown state")

        return {
            LOGBOOK_ENTRY_NAME: data.get("friendly_name") or "unknown",
            LOGBOOK_ENTRY_MESSAGE: strings["state_changed"].format(state=label),
            LOGBOOK_ENTRY_ENTITY_ID: data.get("entity_id"),
            LOGBOOK_ENTRY_CONTEXT_ID: event.context_id,
        }

    @callback
    def async_describe_cycle_start_logged(event: LazyEventPartialState) -> dict[str, Any]:
        """Describe an add_cycle_start service call."""
        data = event.data
        strings = _logbook_strings(hass.config.language)

        return {
            LOGBOOK_ENTRY_NAME: data.get("friendly_name") or "unknown",
            LOGBOOK_ENTRY_MESSAGE: strings["cycle_start_logged"].format(date=data.get("date", "?")),
            LOGBOOK_ENTRY_CONTEXT_ID: event.context_id,
        }

    async_describe_event(DOMAIN, EVENT_PRODUCT_CONSUMED, async_describe_product_consumed)
    async_describe_event(DOMAIN, EVENT_STATE_CHANGED, async_describe_state_changed)
    async_describe_event(DOMAIN, EVENT_CYCLE_START_LOGGED, async_describe_cycle_start_logged)
