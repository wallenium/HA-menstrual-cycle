"""Two profiles in one household: calls reach the right one, private data stays out of the overview, messages and stock do not mix."""
import json
from datetime import timedelta

import pytest
from homeassistant.config_entries import ConfigEntryState
from homeassistant.exceptions import HomeAssistantError
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_mock_service

from test_notifications import _fire, _frozen, _options  # noqa: F401 - _frozen is the autouse clock fixture
from test_real_ha import DOMAIN, _add_profile

CANARY = "BEA-SECRET-NOTE"


async def _call(hass, service, data, response=False):
    return await hass.services.async_call(DOMAIN, service, data, blocking=True, return_response=response)


async def _two(hass):
    assert await async_setup_component(hass, "persistent_notification", {})
    anna = await _add_profile(hass, "Anna")
    bea = await _add_profile(hass, "Bea")
    today = dt_util.now().date()
    for entry, name in ((anna, "anna"), (bea, "bea")):
        for days in (83, 55, 27):
            await _call(hass, "add_cycle_start", {"profile": name, "date": (today - timedelta(days=days)).isoformat()})
    await _call(hass, "add_symptom", {"profile": "bea", "date": (today - timedelta(days=3)).isoformat(), "symptom_data": {"note": CANARY, "mood": "tired"}})
    await _call(hass, "set_profile_visibility", {"profile": "bea", "level": "private"})
    return anna, bea


async def test_a_call_without_a_profile_is_refused_and_changes_nothing(hass):
    anna, bea = await _two(hass)
    before = {e.entry_id: list(hass.data[DOMAIN][e.entry_id].history) for e in (anna, bea)}
    with pytest.raises(HomeAssistantError, match="Multiple profiles"):
        await _call(hass, "add_cycle_start", {"date": "2026-09-01"})
    assert {e.entry_id: list(hass.data[DOMAIN][e.entry_id].history) for e in (anna, bea)} == before


async def test_each_way_of_naming_a_profile_reaches_only_that_profile(hass):
    anna, bea = await _two(hass)
    history = lambda e: hass.data[DOMAIN][e.entry_id].history  # noqa: E731
    await _call(hass, "add_cycle_start", {"profile": "bea", "date": "2026-10-20"})
    await _call(hass, "add_cycle_start", {"entity_id": "sensor.menstruation_anna", "date": "2026-10-21"})
    await _call(hass, "add_cycle_start", {"entry_id": bea.entry_id, "date": "2026-10-29"})
    await _call(hass, "add_cycle_start", {"entity_id": "sensor.menstruation_bea", "date": "2026-12-05"})
    assert "2026-12-05" in history(bea) and "2026-12-05" not in history(anna)
    assert "2026-10-21" in history(anna) and "2026-10-20" not in history(anna) and "2026-10-29" not in history(anna)
    assert "2026-10-20" in history(bea) and "2026-10-29" in history(bea) and "2026-10-21" not in history(bea)


async def test_the_overview_shows_nothing_of_a_private_profile(hass):
    await _two(hass)
    summary = await _call(hass, "get_household_summary", {}, response=True)
    bea = next(p for p in summary["profiles"] if p["profile"] == "bea")
    assert set(bea) <= {"profile", "friendly_name", "state"} and bea["state"] == "private", bea
    anna = next(p for p in summary["profiles"] if p["profile"] == "anna")
    assert anna["days_until_next_start"] is not None
    assert CANARY not in json.dumps(summary)


async def test_reminders_and_partner_messages_stay_with_their_own_profile(hass):
    anna, bea = await _two(hass)
    anna_own, anna_partner = async_mock_service(hass, "notify", "anna_phone"), async_mock_service(hass, "notify", "anna_partner")
    bea_own, bea_partner = async_mock_service(hass, "notify", "bea_phone"), async_mock_service(hass, "notify", "bea_partner")
    common = {"notifications_enabled": True, "notify_fertile_enabled": False}
    await _options(hass, anna, notify_service="notify.anna_phone", notify_partner_service="notify.anna_partner", **common)
    await _options(hass, bea, notify_service="notify.bea_phone", notify_partner_service="notify.bea_partner", **common)
    await _fire(hass, "08:00", day=1)
    texts = lambda calls: [c.data["message"] for c in calls]  # noqa: E731
    assert any("Anna" in t for t in texts(anna_own)) and not any("Bea" in t for t in texts(anna_own + anna_partner))
    assert any("Bea" in t for t in texts(bea_own)) and not any("Anna" in t for t in texts(bea_own + bea_partner))
    assert anna_partner and not bea_partner, "the partner of the private profile got a message"
    assert CANARY not in json.dumps([c.data for c in anna_own + anna_partner + bea_own + bea_partner], default=str)


async def test_stock_is_shared_and_used_up_by_both(hass):
    await _two(hass)
    await _call(hass, "manage_household_inventory", {"inventory_action": "set", "product": "tampon", "quantity": 10})
    await _call(hass, "log_product_usage", {"profile": "anna", "product": "tampon", "action": "used", "quantity": 3, "date": "2026-10-30"})
    await _call(hass, "log_product_usage", {"profile": "bea", "product": "tampon", "action": "used", "quantity": 2, "date": "2026-10-30"})
    stock = hass.data[f"{DOMAIN}_household_inventory"]["inventory"]["tampon"]
    assert stock == 5, f"10 - 3 - 2 expected, stock is {stock}"
    assert CANARY not in json.dumps(hass.data[f"{DOMAIN}_household_inventory"], default=str)


async def test_removing_one_profile_leaves_the_other_working(hass):
    anna, bea = await _two(hass)
    assert await hass.config_entries.async_remove(anna.entry_id)
    await hass.async_block_till_done()
    assert bea.state is ConfigEntryState.LOADED
    assert hass.services.has_service(DOMAIN, "add_cycle_start")
    await _call(hass, "add_cycle_start", {"date": "2026-10-20"})  # one profile left: no name needed any more
    assert "2026-10-20" in hass.data[DOMAIN][bea.entry_id].history
