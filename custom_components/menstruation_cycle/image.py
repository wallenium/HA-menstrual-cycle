"""Image platform for menstruation_cycle.

HA-Idee 6 ("weitere Ideen fuer Features?" 28.09.2026): a native
image.<profile>_cycle_phase entity showing the same status illustration the
Lovelace cards already render via window.ProductIcons - usable on a wall
tablet/Nest Hub dashboard or a plain picture-entity card without needing the
big dashboard-panel JS file at all.

Reuses the exact same state -> SVG mapping as www/menstruation-functions.js
(STATE_ASSET_FILENAMES / PREGNANCY_ASSET_FILENAMES) so this entity never
shows something different from what the JS cards already display for the
same state - keep both in sync if either changes.

Respects CONF_VISIBILITY_LEVEL like calendar.py: the illustration is just a
visual mirror of the same state value the main sensor's own entity state
already exposes at "full"/"status_only" (only the detailed attributes are
filtered at status_only, never the plain state itself) - unavailable
entirely at "private", matching the main sensor's own STATE_PRIVATE
behaviour there.
"""

from __future__ import annotations

import math
from pathlib import Path

from homeassistant.components.image import ImageEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_time_change
from homeassistant.util import dt as dt_util

from .const import (
    DOMAIN,
    SIGNAL_HISTORY_UPDATED,
    STATE_PREGNANT,
    VISIBILITY_LEVEL_PRIVATE,
    menstruation_object_ids_for_profile,
)
from .model import build_cycle_model
from .sensor import _device_info_for_entry

_ASSETS_DIR = Path(__file__).parent / "assets"

# Mirrors www/menstruation-functions.js::STATE_ASSET_FILENAMES exactly.
_STATE_ASSET_FILENAMES: dict[str, str] = {
    "period": "period.svg",
    "fertile": "fertile.svg",
    "ovulation": "ovulation.svg",
    "pms": "pms.svg",
    "pre_menarche": "premenarche.svg",
    "menarche": "premenarche.svg",
    "menopause": "menopause.svg",
    "postpartum": "postpartum.svg",
    "neutral": "neutral.svg",
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the cycle-phase image entity for this profile."""
    async_add_entities([MenstruationCyclePhaseImage(hass, entry)], True)


class MenstruationCyclePhaseImage(ImageEntity):
    """One image entity per profile, showing the current phase illustration."""

    _attr_has_entity_name = True
    _attr_content_type = "image/svg+xml"
    # Skip ImageEntity's own httpx-client setup - async_image() below reads
    # the SVG straight off disk, it never fetches image_url over HTTP.
    _attr_image_url = None

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        ImageEntity.__init__(self, hass)
        self.hass = hass
        self._entry = entry
        runtime = hass.data[DOMAIN][entry.entry_id]
        self._attr_name = "Cycle phase"
        self._attr_unique_id = f"{entry.entry_id}_cycle_phase_image"
        self._attr_suggested_object_id = menstruation_object_ids_for_profile(runtime.friendly_name)[
            "_cycle_phase_image"
        ]
        self._asset_path: Path | None = None

    @property
    def device_info(self):
        return _device_info_for_entry(self.hass, self._entry)

    async def async_added_to_hass(self) -> None:
        """Register update signals and daily refresh."""
        self.async_on_remove(
            async_dispatcher_connect(self.hass, SIGNAL_HISTORY_UPDATED, self._handle_runtime_update)
        )
        self.async_on_remove(
            async_track_time_change(self.hass, self._handle_daily_refresh, hour=0, minute=0, second=10)
        )
        self.async_schedule_update_ha_state(True)

    async def _handle_runtime_update(self) -> None:
        self.async_schedule_update_ha_state(True)

    async def _handle_daily_refresh(self, now) -> None:
        self.async_schedule_update_ha_state(True)

    async def async_update(self) -> None:
        """Recompute which illustration matches the current cycle state."""
        runtime = self.hass.data[DOMAIN][self._entry.entry_id]
        visibility_level = getattr(runtime, "visibility_level", None)
        if visibility_level == VISIBILITY_LEVEL_PRIVATE:
            self._attr_available = False
            self._asset_path = None
            return

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
        )
        new_path = self._resolve_asset_path(model)
        if new_path != self._asset_path:
            self._asset_path = new_path
            self._attr_image_last_updated = dt_util.utcnow()
        self._attr_available = new_path is not None

    def _resolve_asset_path(self, model) -> Path | None:
        """Same resolution logic as menstruation-functions.js's getStatusIcon:
        a plain state-keyed SVG for every state except "pregnant", which
        instead picks a month-specific illustration (weeks -> month via
        ceil(weeks / 4), clamped 1-9 - mirrors weeksToPregnancyMonth())."""
        state = model.state
        if state == STATE_PREGNANT:
            weeks = model.weeks_pregnant or 1
            month = max(1, min(9, math.ceil(weeks / 4)))
            path = _ASSETS_DIR / "pregnancy" / f"preg_{month:02d}.svg"
        else:
            filename = _STATE_ASSET_FILENAMES.get(state, "neutral.svg")
            path = _ASSETS_DIR / "state" / filename
        return path if path.is_file() else None

    async def async_image(self) -> bytes | None:
        """Read the resolved SVG straight off disk - the asset already
        lives inside this integration's own folder, no reason to round-trip
        it through an HTTP fetch of our own asset endpoint."""
        if self._asset_path is None:
            return None
        return await self.hass.async_add_executor_job(self._asset_path.read_bytes)
