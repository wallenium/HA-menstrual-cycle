"""What an ordinary (non-administrator) user can see through the ways the frontend and automations really read: websocket, states, calendar, events.

README 'Who can see what': at 'Status only' and 'Private' less and less; the websocket commands for the calendar feed are for administrators only."""
import json
from datetime import timedelta

import pytest
from homeassistant.util import dt as dt_util

from test_notifications import FERTILE_SOON, _profile
from test_real_ha import DOMAIN

SECRET = "SECRETCANARY"
IDENTITY = {"profile", "entry_id", "visibility_level", "is_primary_profile_sensor", "onboarding_stage", "onboarding_stage_effective",
            "learning_phase", "prediction_gating", "history_count", "predicted_starts_preview", "friendly_name"}
STATUS_ONLY = IDENTITY | {"avg_cycle_length", "cycle_phase", "cycle_phase_tip", "days_until_next_start", "next_predicted_start", "period_duration_days",
                          "period_duration_default_days", "period_duration_learned_avg_days", "period_forecast", "predicted_cycle_starts"}


async def _user_token(hass, name, admin):
    user = await hass.auth.async_create_user(name, group_ids=["system-admin" if admin else "system-users"])
    refresh = await hass.auth.async_create_refresh_token(user, "https://example.com")
    return hass.auth.async_create_access_token(refresh)


async def _setup(hass):
    entry, _, _ = await _profile(hass, starts_ago=FERTILE_SOON["starts_ago"],
                                 symptoms=[(3, {"note": SECRET, "pain": ["cramps"], "mood": "tired"})])
    await hass.auth.async_create_user("boss", group_ids=["system-admin"])
    return entry


async def _level(hass, entry, level):
    await hass.services.async_call(DOMAIN, "set_profile_visibility", {"entry_id": entry.entry_id, "level": level}, blocking=True)
    await hass.async_block_till_done()


async def _states(ws, _ids=iter(range(100, 1000))):
    await ws.send_json({"id": next(_ids), "type": "get_states"})
    reply = await ws.receive_json()
    assert reply["success"], reply
    return {s["entity_id"]: s for s in reply["result"] if "anna" in s["entity_id"]}


@pytest.mark.parametrize("level, allowed", [("status_only", STATUS_ONLY), ("private", IDENTITY)])
async def test_states_read_over_the_websocket_hold_only_what_the_level_allows(hass, hass_ws_client, level, allowed):
    entry = await _setup(hass)
    ws = await hass_ws_client(hass, await _user_token(hass, "kid", admin=False))
    full = await _states(ws)
    assert "cramps" in json.dumps(full["sensor.menstruation_anna"]["attributes"]), "positive control: the log is visible at 'Full'"
    await _level(hass, entry, level)
    states = await _states(ws)
    assert set(states["sensor.menstruation_anna"]["attributes"]) <= allowed, set(states["sensor.menstruation_anna"]["attributes"]) - allowed
    assert SECRET not in json.dumps(states) and "cramps" not in json.dumps(states)
    for entity_id in ("sensor.menstruation_anna_products_today", "sensor.menstruation_anna_basal_temp", "sensor.menstruation_anna_next_ovulation",
                      "sensor.menstruation_anna_cycle_length", "todo.menstruation_anna_hospital_bag"):
        assert states[entity_id]["state"] == "unavailable", (level, entity_id)
    if level == "private":
        assert states["sensor.menstruation_anna"]["state"] == "private"
        assert states["image.menstruation_anna_cycle_phase"]["state"] == "unavailable"


async def test_the_calendar_shows_less_and_less(hass):
    entry = await _setup(hass)
    start = dt_util.now()
    seen = {}
    for level in ("full", "status_only", "private"):
        await _level(hass, entry, level)
        out = await hass.services.async_call("calendar", "get_events", {"entity_id": "calendar.menstruation_anna_cycle", "start_date_time": start.isoformat(),
                                                                         "end_date_time": (start + timedelta(days=120)).isoformat()}, blocking=True, return_response=True)
        seen[level] = {e["summary"] for e in out["calendar.menstruation_anna_cycle"]["events"]}
    assert any("Period" in s for s in seen["full"]) and any("Fertile" in s for s in seen["full"]), seen
    assert seen["status_only"] and all("Period" in s for s in seen["status_only"]), seen["status_only"]
    assert seen["private"] == set(), seen["private"]


@pytest.mark.parametrize("level, pill_event, period_event", [("full", True, True), ("status_only", False, True), ("private", False, False)])
async def test_events_for_automations_follow_the_level(hass, level, pill_event, period_event):
    """Pill, LH and ovulation events say something about health: 'Full' only. The period start is shown at 'Status only' too, not when private."""
    entry = await _setup(hass)
    await _level(hass, entry, level)
    seen = {"pill": [], "period": []}
    hass.bus.async_listen(f"{DOMAIN}_pill_taken", lambda event: seen["pill"].append(event))
    hass.bus.async_listen(f"{DOMAIN}_cycle_start_logged", lambda event: seen["period"].append(event))
    await hass.services.async_call(DOMAIN, "add_symptom", {"entry_id": entry.entry_id, "date": dt_util.now().date().isoformat(),
                                                           "symptom_data": {"contraception_method": "pill"}}, blocking=True)
    await hass.services.async_call(DOMAIN, "add_cycle_start", {"entry_id": entry.entry_id, "date": (dt_util.now().date() + timedelta(days=1)).isoformat()}, blocking=True)
    await hass.async_block_till_done()
    assert (bool(seen["pill"]), bool(seen["period"])) == (pill_event, period_event), {k: [e.event_type for e in v] for k, v in seen.items()}


@pytest.mark.parametrize("command", ["ics_url", "rotate_ics_token", "rotate_ics_partner_token"])
async def test_the_feed_commands_of_the_websocket_are_for_administrators_only(hass, hass_ws_client, command):
    await _setup(hass)
    kid = await hass_ws_client(hass, await _user_token(hass, "kid", admin=False))
    await kid.send_json({"id": 1, "type": f"{DOMAIN}/{command}", "profile": "anna"})
    reply = await kid.receive_json()
    assert not reply["success"] and reply["error"]["code"] == "unauthorized", reply
    boss = await hass_ws_client(hass, await _user_token(hass, "chief", admin=True))
    await boss.send_json({"id": 1, "type": f"{DOMAIN}/{command}", "profile": "anna"})
    assert (await boss.receive_json())["success"]


async def test_the_feed_url_is_not_in_any_state_or_event(hass, hass_ws_client):
    entry = await _setup(hass)
    hass.config_entries.async_update_entry(entry, options={**entry.options, "ics_feed_enabled": True})
    await hass.async_block_till_done()
    token = hass.data[DOMAIN][entry.entry_id].ics_token
    ws = await hass_ws_client(hass, await _user_token(hass, "kid", admin=False))
    states = await _states(ws)
    assert token and token not in json.dumps(states) and "/ics/" not in json.dumps(states)
