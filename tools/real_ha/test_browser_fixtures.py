"""Writes what a real Home Assistant serves (states, registry, service responses) for tools/real_ha/browser_check.py.

Only runs when MCYCLE_FIXTURE_DIR is set (tools/real_ha/browser.sh does that)."""
import json
import os
from pathlib import Path

import pytest
from homeassistant.core import Context
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util

from test_real_ha import DOMAIN, _add_profile

OUT = os.environ.get("MCYCLE_FIXTURE_DIR")
pytestmark = pytest.mark.skipif(not OUT, reason="MCYCLE_FIXTURE_DIR not set")

RESPONSES = {
    "get_full_history": {"days": 365}, "get_cycle_predictions": {"days_back": 365, "future_cycles": 3},
    "get_last_cycle_summary": {}, "compare_current_cycle": {}, "get_menarche_info": {},
    "get_household_summary": {}, "get_dashboard_prefs": {"profile": "anna"},
}


async def _seed(hass, entry):
    call = lambda s, d: hass.services.async_call(DOMAIN, s, {"entry_id": entry.entry_id, **d}, blocking=True)  # noqa: E731
    for day in ("2026-04-11", "2026-05-09", "2026-06-06", "2026-07-04", "2026-08-01", "2026-08-29", "2026-09-26", "2026-10-24"):
        await call("add_cycle_start", {"date": day})
    await call("add_symptom", {"date": dt_util.now().date().isoformat(), "symptom_data": {"pain": ["cramps"], "mood": "canary-mood-7431", "note": "canary-note-7431", "bleeding_strength": "medium", "basal_temp": 36.47}})
    await call("add_symptom", {"date": "2026-10-30", "symptom_data": {"contraception_method": "pill", "mood": "ok"}})
    await call("log_product_usage", {"product": "tampon", "action": "used", "quantity": 2, "date": "2026-10-25"})
    await hass.services.async_call(DOMAIN, "manage_household_inventory", {"inventory_action": "add", "product": "tampon", "quantity": 20}, blocking=True)


async def _dump(hass, entry, name, prefs=None):
    # the browser plays an ordinary user: below "full" the read services refuse, exactly as in a real instance
    await hass.auth.async_create_user("owner", group_ids=["system-admin"])  # the first user created is the owner and always an admin
    viewer = await hass.auth.async_create_user("viewer", group_ids=["system-users"])
    await hass.async_block_till_done()
    if prefs is not None:  # saved through the real service as the viewer, so get_dashboard_prefs below returns it for the same user
        await hass.services.async_call(DOMAIN, "save_dashboard_prefs", {"profile": "anna", "prefs": prefs}, blocking=True,
                                       context=Context(user_id=viewer.id))
    registry = er.async_get(hass)
    fixture = {
        "states": {s.entity_id: {"state": s.state, "attributes": dict(s.attributes)} for s in hass.states.async_all()},
        "ws": {
            "config_entries/get": [{"domain": e.domain, "entry_id": e.entry_id, "title": e.title} for e in hass.config_entries.async_entries()],
            "config/entity_registry/list": [{"entity_id": r.entity_id, "config_entry_id": r.config_entry_id, "platform": r.platform}
                                            for r in registry.entities.values()],
            "repairs/list_issues": {"issues": []},
        },
        "services": {},
    }
    for service, data in RESPONSES.items():
        payload = data if ("profile" in data or service == "get_household_summary") else {"entry_id": entry.entry_id, **data}
        try:
            fixture["services"][service] = await hass.services.async_call(
                DOMAIN, service, payload, blocking=True, return_response=True, context=Context(user_id=viewer.id))
        except HomeAssistantError as err:
            fixture["services"][service] = {"error": str(err)}
    fixture["viewer_is_admin"] = False
    Path(OUT).mkdir(parents=True, exist_ok=True)
    Path(OUT, f"{name}.json").write_text(json.dumps(fixture, default=str, indent=1))


@pytest.mark.parametrize("level", ["full", "status_only", "private"])
async def test_dump(hass, level):
    entry = await _add_profile(hass)
    await _seed(hass, entry)
    if level != "full":
        await hass.services.async_call(DOMAIN, "set_profile_visibility", {"entry_id": entry.entry_id, "level": level}, blocking=True)
    await _dump(hass, entry, level)


@pytest.mark.parametrize("choice", ["on", "off"])
async def test_dump_teen_choice(hass, choice):
    """The Teen-Design switch as the real saved-settings service stores and returns it (browser_check.py teen_choice_check)."""
    entry = await _add_profile(hass)
    await _seed(hass, entry)
    await _dump(hass, entry, f"teen_{choice}", prefs={"teenStyle": choice})
