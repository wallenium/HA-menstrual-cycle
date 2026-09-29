"""Home Assistant Logbook integration hooks (HA-Idee, "weitere neue Ideen",
29.09.2026).

Auto-discovered exactly like backup.py: any loaded integration with a
logbook.py exposing a module-level async_describe_events(hass,
async_describe_event) gets it called once by core homeassistant/components/
logbook/__init__.py::async_setup (async_process_integration_platforms), no
registration needed anywhere else in this integration. Pattern verified
against the real, current core source (raw.githubusercontent.com/
home-assistant/core/dev/.../components/logbook/__init__.py) and against two
real, unmangled example platforms (automation/logbook.py, script/logbook.py)
before writing this - same Round-40 label_registry lesson as backup.py.

Describes EVENT_PRODUCT_CONSUMED (fired by __init__.py::_async_register_
consumption for every household-product usage, regardless of whether it
came from the log_product_usage service or manage_household_inventory's
"consume" action). sensor.household_product_stock also carries a
unit_of_measurement attribute (see _async_update_household_inventory_state)
so HA's logbook "continuous domain" filter suppresses that sensor's
automatic raw-number state-change entries - this description becomes the
sole logbook representation of a consumption event, not an addition to it.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from homeassistant.components.logbook import (
    LOGBOOK_ENTRY_ENTITY_ID,
    LOGBOOK_ENTRY_MESSAGE,
    LOGBOOK_ENTRY_NAME,
    LazyEventPartialState,
)
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, EVENT_PRODUCT_CONSUMED

_PRODUCT_DISPLAY_NAMES = {
    "tampon": "tampons",
    "pad": "pads",
    "liner": "liners",
    "underwear": "underwear",
    "cup": "the menstrual cup",
}

_HOUSEHOLD_INVENTORY_STATE_ENTITY_ID = "sensor.household_product_stock"


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
        product = str(data.get("product", ""))
        quantity = data.get("quantity", 1)
        display_name = _PRODUCT_DISPLAY_NAMES.get(product, product.replace("_", " ") or "an item")
        message = f"used {quantity}x {display_name}"
        area_name = data.get("area_name")
        if area_name:
            message = f"{message} in {area_name}"

        return {
            LOGBOOK_ENTRY_NAME: data.get("member") or "unknown",
            LOGBOOK_ENTRY_MESSAGE: message,
            LOGBOOK_ENTRY_ENTITY_ID: _HOUSEHOLD_INVENTORY_STATE_ENTITY_ID,
        }

    async_describe_event(DOMAIN, EVENT_PRODUCT_CONSUMED, async_describe_product_consumed)
