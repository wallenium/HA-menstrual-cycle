"""Event platform: one entity per profile that mirrors the integration's bus events.

pill_taken, lh_positive and ovulation_confirmed are fired on the event bus only at visibility "Full" (and described
in logbook.py). This entity listens to those same bus events, so it shows up as a trigger in the automation editor
(Event > "Cycle events") without knowing event names. It is unavailable below "Full", like the events themselves,
so its mere presence reveals nothing. Tested with stubs (tests/test_entity_platforms.py), not against a real Home
Assistant.
"""

from __future__ import annotations

from homeassistant.components.event import EventEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import (
    DOMAIN,
    EVENT_LH_POSITIVE,
    EVENT_OVULATION_CONFIRMED,
    EVENT_PILL_TAKEN,
    SIGNAL_HISTORY_UPDATED,
    VISIBILITY_LEVEL_FULL,
    history_signal_applies,
    menstruation_object_ids_for_profile,
)
from .sensor import _device_info_for_entry

# bus event -> event_type shown by the entity
EVENT_TYPES: dict[str, str] = {
    EVENT_PILL_TAKEN: "pill_taken",
    EVENT_LH_POSITIVE: "lh_positive",
    EVENT_OVULATION_CONFIRMED: "ovulation_confirmed",
}


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([MenstruationCycleEvents(hass, entry)])


class MenstruationCycleEvents(EventEntity):
    _attr_has_entity_name = True
    _attr_icon = "mdi:bell-ring-outline"
    _attr_event_types = list(EVENT_TYPES.values())

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self._entry = entry
        runtime = hass.data[DOMAIN][entry.entry_id]
        self._attr_name = "Cycle events"
        self._attr_unique_id = f"{entry.entry_id}_cycle_events"
        self._attr_suggested_object_id = menstruation_object_ids_for_profile(runtime.friendly_name)["_cycle_events"]
        # HA 2026.10 no longer reads _attr_suggested_object_id; the entity_id is the supported way to propose the id.
        self.entity_id = f"event.{self._attr_suggested_object_id}"

    @property
    def device_info(self):
        return _device_info_for_entry(self.hass, self._entry)

    @property
    def available(self) -> bool:
        runtime = self.hass.data.get(DOMAIN, {}).get(self._entry.entry_id)
        return runtime is not None and runtime.visibility_level == VISIBILITY_LEVEL_FULL

    async def async_added_to_hass(self) -> None:
        for bus_event in EVENT_TYPES:
            self.async_on_remove(self.hass.bus.async_listen(bus_event, self._handle_bus_event))
        self.async_on_remove(async_dispatcher_connect(self.hass, SIGNAL_HISTORY_UPDATED, self._handle_history_updated))

    @callback
    def _handle_bus_event(self, event) -> None:
        if event.data.get("entry_id") != self._entry.entry_id:
            return
        self._trigger_event(EVENT_TYPES[event.event_type], {"date": event.data.get("date")})
        self.async_write_ha_state()

    async def _handle_history_updated(self, entry_ids=None, sensors_follow=False) -> None:
        if history_signal_applies(self._entry.entry_id, entry_ids):
            self.async_write_ha_state()  # availability follows the visibility level
