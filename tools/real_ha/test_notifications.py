"""Scheduled notifications with the real clock in a real Home Assistant: fire the configured time, look at what the notify services get.

Run with tools/real_ha/run.sh. The clock is frozen (13:00 local on 15 Oct 2026) so "today", the fired times and the cycle forecast
cannot drift apart. Covers: own target vs partner target, what the partner never gets, visibility levels, the master switch,
the configured times, no duplicates on a second run, the pill reminder."""
from datetime import timedelta

import pytest
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed, async_mock_service

from test_real_ha import DOMAIN, _add_profile

OWN, PARTNER = "mobile_app_anna", "mobile_app_partner"
SECRET = "SECRETCANARY"  # a note on a logged day; must never reach the partner
HEALTH_WORDS = ("cramps", "pain", "mood", "tired", "pill", "badge", "recap", "temperature", SECRET.lower())


@pytest.fixture(autouse=True)
def _frozen(freezer):
    freezer.move_to("2026-10-15 20:00:00+00:00")


def _at(hh_mm, day=0):
    """A local clock time of today (+ day), as the datetime Home Assistant's timers are fired with."""
    hour, minute = (int(x) for x in hh_mm.split(":")[:2])
    return (dt_util.now() + timedelta(days=day)).replace(hour=hour, minute=minute, second=0, microsecond=0)


async def _fire(hass, hh_mm, day=0):
    async_fire_time_changed(hass, _at(hh_mm, day))
    await hass.async_block_till_done()


async def _profile(hass, *, starts_ago, options=None, level="full", symptoms=()):
    """A profile whose cycle starts were `starts_ago` days ago, notifications on, both notify services mocked."""
    assert await async_setup_component(hass, "persistent_notification", {})
    own = async_mock_service(hass, "notify", OWN)
    partner = async_mock_service(hass, "notify", PARTNER)
    entry = await _add_profile(hass)
    today = dt_util.now().date()
    for days in starts_ago:
        await hass.services.async_call(DOMAIN, "add_cycle_start", {"entry_id": entry.entry_id, "date": (today - timedelta(days=days)).isoformat()}, blocking=True)
    for days, data in symptoms:
        await hass.services.async_call(DOMAIN, "add_symptom", {"entry_id": entry.entry_id, "date": (today - timedelta(days=days)).isoformat(), "symptom_data": data}, blocking=True)
    if level != "full":
        await hass.services.async_call(DOMAIN, "set_profile_visibility", {"entry_id": entry.entry_id, "level": level}, blocking=True)
    await _options(hass, entry, notifications_enabled=True, notify_service=f"notify.{OWN}", notify_partner_service=f"notify.{PARTNER}", **(options or {}))
    return entry, own, partner


async def _options(hass, entry, **changes):
    hass.config_entries.async_update_entry(entry, options={**entry.options, **changes})
    await hass.async_block_till_done()


def _titles(calls):
    return [c.data["title"] for c in calls]


def _texts(calls):
    return [f"{c.data['title']} | {c.data['message']}" for c in calls]


# 28-day cycles, the last start 27 days ago: the next period is predicted for tomorrow (default lead 1 day)
PERIOD_TOMORROW = dict(starts_ago=(83, 55, 27), symptoms=[(30, {"pain": ["cramps"], "mood": "tired", "note": SECRET})])
# six 28-day cycles, the last start 6 days ago: fertile window from day 9 (in 2 days), ovulation estimate in 7 days
FERTILE_SOON = dict(starts_ago=tuple(6 + 28 * k for k in range(5, -1, -1)))
FERTILE_OPTIONS = dict(notify_fertile_enabled=True, notify_fertile_lead_days=2, notify_ovulation_enabled=True, notify_ovulation_lead_days=7)


async def test_period_reminder_goes_to_profile_and_partner_without_health_detail(hass):
    _, own, partner = await _profile(hass, options={"notify_fertile_enabled": False}, **PERIOD_TOMORROW)
    await _fire(hass, "08:00", day=1)
    period = [c for c in own if c.data["title"] == "Period reminder"]
    assert len(period) == 1 and "actions" in period[0].data["data"], _texts(own)  # the profile's own phone gets the action button
    assert _titles(partner) == ["Period reminder"], _texts(partner)
    assert set(partner[0].data) == {"title", "message"}, "the partner payload carries more than title and message"
    text = _texts(partner)[0].lower()
    assert (dt_util.now().date() + timedelta(days=1)).isoformat() in text, text
    assert not [w for w in HEALTH_WORDS if w in text], text


async def test_badges_go_to_the_profile_only(hass):
    _, own, partner = await _profile(hass, options={"notify_fertile_enabled": False}, **PERIOD_TOMORROW)
    await _fire(hass, "08:00", day=1)
    assert "New badge unlocked" in _titles(own) and "New badge unlocked" not in _titles(partner)


async def test_no_second_message_when_the_time_fires_again(hass):
    _, own, partner = await _profile(hass, options={"notify_fertile_enabled": False}, **PERIOD_TOMORROW)
    await _fire(hass, "08:00", day=1)
    first = (len(own), len(partner))
    await _fire(hass, "08:00", day=2)
    assert (len(own), len(partner)) == first, "the same reminder was sent twice"


async def test_nothing_before_the_time_and_nothing_when_switched_off(hass):
    entry, own, partner = await _profile(hass, **PERIOD_TOMORROW)
    await _fire(hass, "07:59", day=1)
    assert not own and not partner, "fired before the configured time"
    await _options(hass, entry, notifications_enabled=False)
    await _fire(hass, "08:00", day=1)
    assert not own and not partner, "master switch off, but something was sent"


async def test_the_configured_time_is_used(hass):
    _, own, _ = await _profile(hass, options={"notify_time": "14:00:00"}, **PERIOD_TOMORROW)
    await _fire(hass, "13:59")
    assert not own, "sent before the configured time"
    await _fire(hass, "14:00")
    assert "Period reminder" in _titles(own)


async def test_each_message_kind_can_be_switched_off(hass):
    _, own, partner = await _profile(hass, options={"notify_period_enabled": False, "notify_fertile_enabled": False}, **PERIOD_TOMORROW)
    await _fire(hass, "08:00", day=1)
    assert "Period reminder" not in _titles(own) + _titles(partner)


@pytest.mark.parametrize("level, partner_gets", [("full", {"fertile", "ovulation"}), ("status_only", set()), ("private", set())])
async def test_partner_gets_fertile_and_ovulation_dates_only_at_full(hass, level, partner_gets):
    _, own, partner = await _profile(hass, level=level, options=FERTILE_OPTIONS, **FERTILE_SOON)
    await _fire(hass, "08:00", day=1)
    got = _texts(partner)
    assert {k for k in ("fertile", "ovulation") if any(k in t.lower() for t in got)} == partner_gets, got
    assert not [t for t in got if any(w in t.lower() for w in HEALTH_WORDS)], got


@pytest.mark.parametrize("level, partner_gets_period", [("full", True), ("status_only", True), ("private", False)])
async def test_partner_gets_the_period_date_except_when_private(hass, level, partner_gets_period):
    _, own, partner = await _profile(hass, level=level, **PERIOD_TOMORROW)
    await _fire(hass, "08:00", day=1)
    assert ("Period reminder" in _titles(partner)) is partner_gets_period, _texts(partner)


def _pill_days(upto):
    return [(d, {"contraception_method": "pill"}) for d in range(upto, 0, -1)]  # logged every day up to yesterday, not today


async def test_pill_reminder_comes_at_the_pill_time_and_stops_once_taken(hass):
    entry, own, partner = await _profile(hass, options={"notify_pill_enabled": True, "notify_pill_time": "09:00:00", "notify_period_enabled": False,
                                                        "notify_fertile_enabled": False},
                                         starts_ago=(83, 55, 27), symptoms=_pill_days(10))
    await _fire(hass, "08:59", day=1)
    assert "Pill reminder" not in _titles(own) and not partner, _texts(own)
    await _fire(hass, "09:00", day=1)
    pill = [c for c in own if "ill" in c.data["title"]]
    assert len(pill) == 1 and not partner, _texts(own)
    assert [a["action"] for a in pill[0].data["data"]["actions"]], "no action buttons"
    own.clear()
    await hass.services.async_call(DOMAIN, "add_symptom", {"entry_id": entry.entry_id, "date": dt_util.now().date().isoformat(), "symptom_data": {"contraception_method": "pill"}}, blocking=True)
    await _fire(hass, "09:00", day=2)
    assert not [c for c in own if "ill" in c.data["title"]], "reminded although today's pill is logged"


async def test_private_profile_still_reminds_its_own_target(hass):
    """Documents the current behaviour: 'Private' silences the partner target (README), not the profile's own phone."""
    _, own, partner = await _profile(hass, level="private", **PERIOD_TOMORROW)
    await _fire(hass, "08:00", day=1)
    assert "Period reminder" in _titles(own) and not partner
