"""Calendar platform for menstruation_cycle.

HA-Idee 3 ("weitere Ideen", 15.09.2026): until now, cycle predictions (period,
fertile window, ovulation) were only available outside Home Assistant, via
the external ICS subscription URL (ical.py + the /menstruation_cycle/ics/
<token>.ics HTTP view). That's fine for a phone's calendar app, but it means
HA's own Calendar dashboard card and calendar.* automation triggers ("start
when a calendar event begins") have no way to see any of this without a
person first setting up an external subscription and pointing it back at
their own HA instance - awkward, and it leaks the same long-lived bearer
token (see repairs.py::async_check_stale_ics_token) into a second place.

This platform computes the exact same recurring windows (project_range_windows,
also used by ical.py) but exposes them as a native calendar.<profile>_cycle
entity - no token, no external URL, works the same way any other HA calendar
integration does.

HA-Idee 2 (weitere Ideen, 15.09.2026, vierte Runde): CONF_VISIBILITY_LEVEL
("abgestufte Eltern-Sichtbarkeit", see sensor.py::_filter_attributes_for_
visibility) is now honoured here too. This calendar entity is exactly the
kind of "passive/incidental visibility" surface that setting protects
against - a shared HA dashboard (e.g. a wall tablet) showing everyone's
calendars would otherwise display "Period"/"Fertile window" event titles
for a profile whose sensor attributes are already redacted for that same
reason. Mirrors sensor.py's own tiering: VISIBILITY_LEVEL_FULL shows
everything, VISIBILITY_LEVEL_STATUS_ONLY shows period events only (no
fertile-window/ovulation - status_only's sensor attributes keep
ATTR_PERIOD_FORECAST but deliberately drop fertility details, same idea
here), and VISIBILITY_LEVEL_PRIVATE shows no events at all (matching the
main sensor's own STATE_PRIVATE, which hides even the entity state).
Deliberately NOT applied to the external ICS feed (ical.py) - that's a
capability URL guarded by its own bearer token, not a passively-shared
dashboard, so the same "who might glance at it" threat model doesn't apply.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
import logging
from typing import Any

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import (
    CONF_CALENDAR_ENABLED,
    DEFAULT_CALENDAR_ENABLED,
    DOMAIN,
    SIGNAL_HISTORY_UPDATED,
    VISIBILITY_LEVEL_FULL,
    VISIBILITY_LEVEL_PRIVATE,
    VISIBILITY_LEVEL_STATUS_ONLY,
    menstruation_object_ids_for_profile,
)
from .ical import _ics_strings
from .model import build_cycle_model, project_range_windows
from .sensor import _device_info_for_entry

_LOGGER = logging.getLogger(__name__)

# Generous lookback/lookahead so async_get_events() and the cached "next
# event" always have something to show, even for a long or irregular cycle.
# Matches roughly what the ICS feed's default horizon covers going forward.
_LOOKBACK_DAYS = 60
_LOOKAHEAD_DAYS = 400


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the cycle calendar entity for this profile."""
    async_add_entities([MenstruationCycleCalendar(hass, entry)], True)


class MenstruationCycleCalendar(CalendarEntity):
    """One calendar per profile: predicted period / fertile-window /
    ovulation events, recomputed whenever the profile's data changes."""

    _attr_has_entity_name = True
    _attr_icon = "mdi:calendar-heart"

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self._entry = entry
        runtime = hass.data[DOMAIN][entry.entry_id]
        self._attr_name = "Cycle calendar"
        self._attr_unique_id = f"{entry.entry_id}_cycle_calendar"
        self._attr_suggested_object_id = menstruation_object_ids_for_profile(runtime.friendly_name)["_cycle_calendar"]
        self._events: list[CalendarEvent] = []
        # HA-Idee (weitere Ideen, 22.09.2026, "Kalender pro Person
        # einschalten/ausschalten koennen. Aktuell sind sie immer aktiv"):
        # flipped to False in _async_refresh_events when CONF_CALENDAR_ENABLED
        # is off for this profile - shows the entity as clearly "unavailable"
        # in HA rather than just quietly empty (which would look identical to
        # a profile with no upcoming predictions at all).
        self._attr_available = True

    @property
    def device_info(self):
        return _device_info_for_entry(self.hass, self._entry)

    @property
    def event(self) -> CalendarEvent | None:
        """The next upcoming (or currently active) predicted event."""
        now = dt_util.now()
        upcoming = [e for e in self._events if _event_end_as_datetime(e) >= now]
        return upcoming[0] if upcoming else None

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(self.hass, SIGNAL_HISTORY_UPDATED, self._handle_history_updated)
        )
        await self._async_refresh_events()

    async def _handle_history_updated(self) -> None:
        await self._async_refresh_events()
        self.async_write_ha_state()

    async def _async_refresh_events(self) -> None:
        # HA-Idee (weitere Ideen, 22.09.2026, "Kalender pro Person
        # einschalten/ausschalten koennen"): read directly from
        # self._entry.options, same live-without-reload pattern as
        # CONF_DASHBOARD_ENABLED (__init__.py::_is_dashboard_enabled_for_entry)
        # - _async_options_update_listener dispatches SIGNAL_HISTORY_UPDATED
        # after every options save, which is what re-triggers this method via
        # _handle_history_updated below, so a toggle takes effect immediately.
        if not bool(self._entry.options.get(CONF_CALENDAR_ENABLED, DEFAULT_CALENDAR_ENABLED)):
            self._events = []
            self._attr_available = False
            return

        self._attr_available = True
        runtime = self.hass.data[DOMAIN][self._entry.entry_id]

        # Same call as __init__.py's _serve_ics_feed HTTP view - kept in sync
        # deliberately (both need period_forecast/fertility_forecast/
        # avg_cycle_length from the same cycle model).
        cycle_model = await self.hass.async_add_executor_job(
            build_cycle_model,
            runtime.history,
            runtime.period_duration_days,
            runtime.symptom_history,
            runtime.pregnancy_data,
            runtime.menarche_data,
            runtime.pre_menarche_data,
            runtime.menopause_data,
            runtime.noncycle_data,
            None,
            runtime.cycle_length_override,
        )

        today = dt_util.now().date()
        range_start = today - timedelta(days=_LOOKBACK_DAYS)
        range_end = today + timedelta(days=_LOOKAHEAD_DAYS)

        windows = await self.hass.async_add_executor_job(
            project_range_windows,
            cycle_model.period_forecast,
            cycle_model.fertility_forecast,
            range_start.isoformat(),
            range_end.isoformat(),
            cycle_model.avg_cycle_length,
        )
        visibility_level = getattr(runtime, "visibility_level", VISIBILITY_LEVEL_FULL)
        self._events = _build_events(windows, self.hass.config.language, visibility_level)

    async def async_get_events(
        self, hass: HomeAssistant, start_date: datetime, end_date: datetime
    ) -> list[CalendarEvent]:
        """Return cached events overlapping the requested window.

        The cache already spans _LOOKBACK_DAYS/_LOOKAHEAD_DAYS around today,
        far wider than any HA calendar-card view - no need to recompute per
        call, just filter what's already there.
        """
        return [e for e in self._events if _overlaps(e, start_date, end_date)]


def _overlaps(event: CalendarEvent, start_date: datetime, end_date: datetime) -> bool:
    """True if an all-day CalendarEvent (date, not datetime, start/end)
    overlaps the requested [start_date, end_date) window."""
    event_start = event.start if isinstance(event.start, date) and not isinstance(event.start, datetime) else event.start.date()
    event_end = event.end if isinstance(event.end, date) and not isinstance(event.end, datetime) else event.end.date()
    window_start = start_date.date() if isinstance(start_date, datetime) else start_date
    window_end = end_date.date() if isinstance(end_date, datetime) else end_date
    return event_start < window_end and event_end > window_start


def _event_end_as_datetime(event: CalendarEvent) -> datetime:
    """Normalize an all-day event's end (a date) to an end-of-day datetime in
    the local timezone, so it can be compared against dt_util.now()."""
    if isinstance(event.end, datetime):
        return event.end
    return dt_util.start_of_local_day(event.end)


def _build_events(
    windows: dict[str, Any] | None,
    lang: str | None,
    visibility_level: str = VISIBILITY_LEVEL_FULL,
) -> list[CalendarEvent]:
    """Turn project_range_windows()'s output into CalendarEvent objects.

    Reuses ical.py's localized label table (_ics_strings) so a calendar
    entity's event titles match the ICS feed's for the same language,
    instead of maintaining a second, easily-drifting copy.

    visibility_level gates which events are built at all (HA-Idee 2,
    "weitere Ideen" 15.09.2026, vierte Runde - see module docstring):
    VISIBILITY_LEVEL_PRIVATE returns no events whatsoever, and
    VISIBILITY_LEVEL_STATUS_ONLY omits the fertile-window/ovulation events,
    keeping only period predictions - mirroring exactly what sensor.py's
    _filter_attributes_for_visibility already does for this profile's
    sensor attributes, so the two surfaces agree on what "private"/
    "status_only" mean instead of silently disagreeing.
    """
    if not windows or visibility_level == VISIBILITY_LEVEL_PRIVATE:
        return []

    strings = _ics_strings(lang)
    events: list[CalendarEvent] = []

    for window in windows.get("period_windows", []):
        try:
            start = date.fromisoformat(str(window["start"]))
            end = date.fromisoformat(str(window["end"]))
        except (KeyError, TypeError, ValueError):
            continue
        events.append(
            CalendarEvent(
                start=start,
                end=end + timedelta(days=1),  # CalendarEvent.end is exclusive for all-day events
                summary=strings["period"],
                description=strings["source_predicted"],
                uid=f"period-{window['start']}",
            )
        )

    if visibility_level != VISIBILITY_LEVEL_STATUS_ONLY:
        for window in windows.get("fertility_windows", []):
            try:
                f_start = date.fromisoformat(str(window["fertile_start"]))
                f_end = date.fromisoformat(str(window["fertile_end"]))
                ov = date.fromisoformat(str(window["ovulation"]))
            except (KeyError, TypeError, ValueError):
                continue
            events.append(
                CalendarEvent(
                    start=f_start,
                    end=f_end + timedelta(days=1),
                    summary=strings["fertile_window"],
                    uid=f"fertile-{window['fertile_start']}",
                )
            )
            events.append(
                CalendarEvent(
                    start=ov,
                    end=ov + timedelta(days=1),
                    summary=strings["ovulation"],
                    uid=f"ovulation-{window['ovulation']}",
                )
            )

    events.sort(key=lambda e: e.start)
    return events
