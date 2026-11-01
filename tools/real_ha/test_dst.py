"""Time zones and the clock change: the daily reminder comes once per day and the sensors move on at midnight, also on the days with 23 or 25 hours.

Sweeps a whole local day in 10-minute steps with the clock moved along, as a real instance would live it."""
import logging
from datetime import datetime, timedelta, timezone

import pytest
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from test_notifications import _profile, _titles
from test_real_ha import DOMAIN

# local midnight (UTC instant) of: the day the clock goes back (25 h), a normal day, the day it goes forward (23 h)
DAYS = {"clock back, Berlin": ("Europe/Berlin", datetime(2026, 10, 24, 22, 0, tzinfo=timezone.utc), 25),
        "normal day, Berlin": ("Europe/Berlin", datetime(2026, 11, 10, 23, 0, tzinfo=timezone.utc), 24),
        "clock forward, Berlin": ("Europe/Berlin", datetime(2027, 3, 27, 23, 0, tzinfo=timezone.utc), 23),
        "far east, Auckland": ("Pacific/Auckland", datetime(2026, 11, 9, 11, 0, tzinfo=timezone.utc), 24),
        "far west, Honolulu": ("Pacific/Honolulu", datetime(2026, 11, 10, 10, 0, tzinfo=timezone.utc), 24)}


@pytest.fixture(autouse=True)
def _no_default_freeze():
    """test_notifications.py's autouse clock fixture is not imported here: each test moves the clock itself."""


async def _sweep(hass, freezer, start, hours):
    for step in range(hours * 6 + 1):
        now = start + timedelta(minutes=10 * step)
        freezer.move_to(now)
        async_fire_time_changed(hass, now)
        await hass.async_block_till_done()


@pytest.mark.parametrize("notify_time", ["08:00:00", "02:30:00", "03:00:00"])
@pytest.mark.parametrize("day", list(DAYS))
async def test_the_period_reminder_comes_exactly_once_on_every_day(hass, freezer, caplog, day, notify_time):
    zone, midnight, hours = DAYS[day]
    caplog.set_level(logging.WARNING)
    await hass.config.async_set_time_zone(zone)
    freezer.move_to(midnight + timedelta(minutes=1))
    # the next period is due the day after this local day (default lead: 1 day)
    _, own, partner = await _profile(hass, options={"notify_fertile_enabled": False, "notify_time": notify_time},
                                     starts_ago=(83, 55, 27))
    own.clear()
    partner.clear()
    await _sweep(hass, freezer, midnight, hours)
    # Known limit: 02:30 does not exist on the day the clock goes forward and Home Assistant's timer skips that day, so that
    # one reminder is missing (and, with a one-day lead, not made up later). Everything else: exactly once.
    expected = (0, 1) if (day, notify_time) == ("clock forward, Berlin", "02:30:00") else (1,)
    assert _titles(partner).count("Period reminder") in expected and _titles(own).count("Period reminder") in expected, (_titles(own), _titles(partner))
    assert [r.getMessage() for r in caplog.records if r.levelno >= logging.WARNING and r.name.startswith(f"custom_components.{DOMAIN}")] == []


@pytest.mark.parametrize("day", list(DAYS))
async def test_the_sensor_moves_on_at_midnight(hass, freezer, day):
    zone, midnight, hours = DAYS[day]
    await hass.config.async_set_time_zone(zone)
    freezer.move_to(midnight - timedelta(minutes=30))  # still the day before
    await _profile(hass, starts_ago=(83, 55, 27 + 1))  # the next period is 28 days after the last start
    before = hass.states.get("sensor.menstruation_anna").attributes["days_until_next_start"]
    await _sweep(hass, freezer, midnight - timedelta(minutes=30), 1)  # across local midnight
    after = hass.states.get("sensor.menstruation_anna").attributes["days_until_next_start"]
    assert (before, after) == (before, before - 1), f"{before} -> {after}"
