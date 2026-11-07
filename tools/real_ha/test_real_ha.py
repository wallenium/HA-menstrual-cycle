"""Tests against a real Home Assistant core (pytest-homeassistant-custom-component); run with tools/real_ha/run.sh."""
import json
import logging
from datetime import timedelta
from pathlib import Path

import pytest
from homeassistant.config_entries import ConfigEntryState
from homeassistant.helpers import issue_registry as ir
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

DOMAIN = "menstruation_cycle"


async def _add_profile(hass, name="Anna"):
    assert await async_setup_component(hass, "homeassistant", {})  # always loaded in a real instance
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] == "form", result
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"profile": name.lower(), "friendly_name": name}
    )
    await hass.async_block_till_done()
    assert result["type"] == "create_entry", result
    return hass.config_entries.async_entries(DOMAIN)[-1]


async def _call(hass, service, data, response=False):
    return await hass.services.async_call(DOMAIN, service, data, blocking=True, return_response=response)


async def test_profile_loads_without_errors(hass, caplog):
    caplog.set_level(logging.WARNING)
    entry = await _add_profile(hass)
    assert entry.state is ConfigEntryState.LOADED
    domains = sorted({s.entity_id.split(".")[0] for s in hass.states.async_all() if "anna" in s.entity_id})
    assert {"sensor", "calendar", "image", "event"} <= set(domains), domains
    assert [r.getMessage() for r in caplog.records if r.levelno >= logging.ERROR] == []


async def test_entity_ids_match_the_readme(hass):
    await _add_profile(hass)
    assert hass.states.get("sensor.menstruation_anna") is not None
    assert hass.states.get("event.menstruation_anna_cycle_events") is not None
    for entity_id in ("calendar.menstruation_anna_cycle", "image.menstruation_anna_cycle_phase", "todo.menstruation_anna_hospital_bag",
                      "sensor.menstruation_anna_products_today", "sensor.menstruation_anna_basal_temp",
                      "sensor.menstruation_anna_next_ovulation", "sensor.menstruation_anna_cycle_length"):
        assert hass.states.get(entity_id) is not None, entity_id


async def test_log_and_read_back(hass):
    entry = await _add_profile(hass)
    await _call(hass, "add_cycle_start", {"entry_id": entry.entry_id, "date": "2026-08-01"})
    await _call(hass, "add_cycle_start", {"entry_id": entry.entry_id, "date": "2026-08-29"})
    await _call(hass, "add_symptom", {"entry_id": entry.entry_id, "date": "2026-08-30", "symptom_data": {"mood": "ok", "pain": ["cramps"]}})
    history = await _call(hass, "get_full_history", {"entry_id": entry.entry_id}, response=True)
    text = json.dumps(history)
    assert "cramps" in text and "2026-08-30" in text
    await _call(hass, "remove_symptom", {"entry_id": entry.entry_id, "date": "2026-08-30"})
    assert "cramps" not in json.dumps(await _call(hass, "get_full_history", {"entry_id": entry.entry_id}, response=True))


async def test_pain_intensity_is_validated_stored_and_clearable(hass):
    from homeassistant.exceptions import HomeAssistantError

    entry = await _add_profile(hass)
    day = {"entry_id": entry.entry_id, "date": "2026-08-30"}
    for bad in (11, -1, 3.5, "4", True):
        with pytest.raises(HomeAssistantError):
            await _call(hass, "add_symptom", {**day, "symptom_data": {"pain_intensity": bad}})

    async def stored():
        history = await _call(hass, "get_full_history", {"entry_id": entry.entry_id}, response=True)
        return [e for e in history["symptom_history"] if e["date"] == "2026-08-30"]

    assert await stored() == []  # nothing was written by the rejected calls
    await _call(hass, "add_symptom", {**day, "symptom_data": {"pain_intensity": 7, "pain": ["cramps"]}})
    assert (await stored())[0]["pain_intensity"] == 7
    await _call(hass, "add_symptom", {**day, "symptom_data": {"pain_intensity": 0}})
    assert (await stored())[0]["pain_intensity"] == 0
    await _call(hass, "add_symptom", {**day, "symptom_data": {"pain_intensity": None}})  # what the panel's undo sends
    entry_after = (await stored())[0]
    assert "pain_intensity" not in entry_after and entry_after["pain"] == ["cramps"]


async def test_pill_fires_the_event_entity(hass):
    entry = await _add_profile(hass)
    event_state = next(s for s in hass.states.async_all() if s.entity_id.startswith("event."))
    assert event_state.state in ("unknown", "unavailable") or event_state.state
    before = hass.states.get(event_state.entity_id).state
    await _call(hass, "add_symptom", {"entry_id": entry.entry_id, "date": dt_util.now().date().isoformat(),
                                      "symptom_data": {"contraception_method": "pill"}})
    await hass.async_block_till_done()
    state = hass.states.get(event_state.entity_id)
    assert state.attributes.get("event_type") == "pill_taken", state
    assert state.state != before


async def test_temporary_visibility_comes_back(hass):
    entry = await _add_profile(hass)
    await _call(hass, "set_profile_visibility", {"entry_id": entry.entry_id, "level": "private", "revert_after_minutes": 1})
    runtime = hass.data[DOMAIN][entry.entry_id]
    assert runtime.visibility_level == "private"
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(minutes=2))
    await hass.async_block_till_done()
    assert runtime.visibility_level == "full"
    event_state = next(s for s in hass.states.async_all() if s.entity_id.startswith("event."))
    assert event_state.state != "unavailable"


async def test_removing_a_profile_asks_and_backup_answer_writes_a_file(hass, hass_client, tmp_path, hass_admin_user):
    assert await async_setup_component(hass, "repairs", {})
    entry = await _add_profile(hass)
    await _call(hass, "add_cycle_start", {"entry_id": entry.entry_id, "date": "2026-08-01"})
    await hass.async_block_till_done()
    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    issue = ir.async_get(hass).async_get_issue(DOMAIN, "leftover_data_anna")
    assert issue is not None and issue.is_fixable

    client = await hass_client()
    resp = await client.post("/api/repairs/issues/fix", json={"handler": DOMAIN, "issue_id": "leftover_data_anna"})
    assert resp.status == 200, await resp.text()
    flow = await resp.json()
    assert flow["step_id"] == "confirm"
    options = flow["data_schema"][0]["selector"]["select"]["options"]
    assert [o["value"] if isinstance(o, dict) else o for o in options] == ["backup_delete_all", "delete_all", "keep_history", "keep"], options
    resp = await client.post(f"/api/repairs/issues/fix/{flow['flow_id']}", json={"action": "backup_delete_all"})
    assert resp.status == 200, await resp.text()
    assert (await resp.json())["type"] == "create_entry"
    assert ir.async_get(hass).async_get_issue(DOMAIN, "leftover_data_anna") is None
    exports = list(Path(hass.config.path("menstruation_cycle_exports")).glob("menstruation_removed_profile_anna_*.json"))
    assert len(exports) == 1
    assert "2026-08-01" in exports[0].read_text()


async def _answer(hass, hass_client, issue_id, action):
    client = await hass_client()
    flow = await (await client.post("/api/repairs/issues/fix", json={"handler": DOMAIN, "issue_id": issue_id})).json()
    resp = await client.post(f"/api/repairs/issues/fix/{flow['flow_id']}", json={"action": action})
    assert resp.status == 200, await resp.text()


@pytest.mark.parametrize("action,history_stays,store_stays", [("delete_all", False, False), ("keep_history", True, True), ("keep", True, True)])
async def test_each_answer_deletes_only_what_it_says(hass, hass_client, hass_admin_user, hass_storage, action, history_stays, store_stays):
    assert await async_setup_component(hass, "repairs", {})
    entry = await _add_profile(hass)
    await _call(hass, "add_cycle_start", {"entry_id": entry.entry_id, "date": "2026-08-01"})
    await _call(hass, "add_symptom", {"entry_id": entry.entry_id, "date": "2026-08-02", "symptom_data": {"mood": "ok"}})
    await hass.async_block_till_done()
    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    await hass.async_block_till_done()
    assert "menstruation_cycle.history.anna" in hass_storage, "profile data is in .storage"
    await _answer(hass, hass_client, "leftover_data_anna", action)
    assert ir.async_get(hass).async_get_issue(DOMAIN, "leftover_data_anna") is None
    await hass.async_block_till_done()
    stored = hass_storage.get("menstruation_cycle.history.anna")
    if not store_stays:
        assert stored is None
    else:
        data = stored["data"]
        assert "2026-08-01" in json.dumps(data)
        assert ("mood" in json.dumps(data)) == (action == "keep"), "keep_history drops symptoms, keep keeps everything"


async def test_creating_the_profile_again_withdraws_the_question(hass):
    entry = await _add_profile(hass)
    await _call(hass, "add_cycle_start", {"entry_id": entry.entry_id, "date": "2026-08-01"})
    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert ir.async_get(hass).async_get_issue(DOMAIN, "leftover_data_anna") is not None
    again = await _add_profile(hass)
    assert ir.async_get(hass).async_get_issue(DOMAIN, "leftover_data_anna") is None
    history = await _call(hass, "get_full_history", {"entry_id": again.entry_id}, response=True)
    assert history is not None


async def test_open_repair_issues_after_setup_are_only_expected_ones(hass):
    await _add_profile(hass)
    open_ids = sorted(i.issue_id for i in ir.async_get(hass).issues.values() if i.domain == DOMAIN)
    print("OPEN ISSUES:", open_ids)
    assert not any(i.startswith("rename_entities") for i in open_ids), open_ids
