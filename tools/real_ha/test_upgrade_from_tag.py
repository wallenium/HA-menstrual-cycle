"""Upgrade from a released version: the old code creates the data, the current code must read it unchanged.

Two runs of this file, driven by upgrade_from_tag.sh: MCYCLE_PHASE=old (MCYCLE_COMPONENT_DIR = the old release) writes
MCYCLE_DUMP, MCYCLE_PHASE=new (current code) loads it into a fresh Home Assistant."""
import json
import logging
import os
from pathlib import Path

import pytest
from homeassistant.config_entries import ConfigEntryState
from homeassistant.helpers import entity_registry as er
from homeassistant.loader import async_get_integration
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry, RegistryEntryWithDefaults, mock_registry

DOMAIN = "menstruation_cycle"
PHASE = os.environ.get("MCYCLE_PHASE")
DUMP = Path(os.environ.get("MCYCLE_DUMP", "upgrade_dump.json"))
pytestmark = pytest.mark.skipif(PHASE not in ("old", "new"), reason="run through upgrade_from_tag.sh")
# what must come out of the upgrade exactly as it went in (other attributes may be added or reworded by newer versions)
SAME = ("history", "symptom_history", "grouped_starts", "period_duration_days", "avg_cycle_length", "next_predicted_start",
        "ovulation_day", "fertile_window_start", "fertile_window_end", "visibility_level")


def _call(hass, service, data, response=False):
    return hass.services.async_call(DOMAIN, service, data, blocking=True, return_response=response)


async def _env(hass):
    assert await async_setup_component(hass, "homeassistant", {})
    assert await async_setup_component(hass, "persistent_notification", {})


async def _facts(hass, entry):
    states = {s.entity_id: {"state": s.state, "attributes": dict(s.attributes)} for s in hass.states.async_all()}
    return {
        "states": states,
        "history": await _call(hass, "get_full_history", {"entry_id": entry.entry_id, "days": 3650}, True),
        "prefs": await _call(hass, "get_dashboard_prefs", {"profile": "anna"}, True),
        "household": await _call(hass, "get_household_summary", {}, True),
    }


@pytest.mark.skipif(PHASE != "old", reason="old phase")
async def test_old_release_creates_data(hass, hass_storage):
    await _env(hass)
    entry = MockConfigEntry(domain=DOMAIN, version=2, title="Anna", data={"profile": "anna", "friendly_name": "Anna", "icon": ""})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED
    e = {"entry_id": entry.entry_id}
    for day in ("2026-05-09", "2026-06-06", "2026-07-04", "2026-08-01", "2026-08-29", "2026-09-26", "2026-10-24"):
        await _call(hass, "add_cycle_start", {**e, "date": day})
    await _call(hass, "set_period_duration", {**e, "days": 6})
    await _call(hass, "add_symptom", {**e, "date": "2026-10-25", "symptom_data": {"pain": ["cramps"], "mood": "tired", "bleeding_strength": "medium", "basal_temp": 36.4}})
    await _call(hass, "add_symptom", {**e, "date": "2026-10-26", "symptom_data": {"contraception_method": "pill", "note": "kept"}})
    await _call(hass, "log_product_usage", {**e, "product": "tampon", "action": "used", "quantity": 2, "date": "2026-10-25"})
    await _call(hass, "manage_household_inventory", {"inventory_action": "add", "product": "tampon", "quantity": 12})
    await _call(hass, "save_timer_state", {**e, "remaining_seconds": 600, "total_seconds": 900, "selected_product": "tampon", "is_running": True, "saved_at": 1})
    await _call(hass, "save_dashboard_prefs", {"profile": "anna", "prefs": {"widgetOrder": ["kpi_strip"], "widgetVisibility": {"kpi_strip": True}}})
    await _call(hass, "set_profile_visibility", {**e, "level": "status_only"})
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    dump = {
        "version": (await async_get_integration(hass, DOMAIN)).version.string,
        "entry": {"entry_id": entry.entry_id, "version": entry.version, "title": entry.title, "data": dict(entry.data), "options": dict(entry.options)},
        "storage": {k: v for k, v in hass_storage.items() if "menstruation" in k},
        "registry": [{"entity_id": r.entity_id, "unique_id": r.unique_id, "platform": r.platform, "domain": r.domain}
                     for r in registry.entities.values() if r.platform == DOMAIN],
        "facts": await _facts(hass, entry),
    }
    assert "menstruation_cycle.history.anna" in dump["storage"], list(dump["storage"])
    DUMP.write_text(json.dumps(dump, default=str))


@pytest.mark.skipif(PHASE != "new", reason="new phase")
async def test_current_release_reads_it(hass, hass_storage, caplog):
    caplog.set_level(logging.WARNING)
    dump = json.loads(DUMP.read_text())
    assert (await async_get_integration(hass, DOMAIN)).version.string != dump["version"], "both phases ran the same code"
    await _env(hass)
    hass_storage.update(dump["storage"])
    old = dump["entry"]
    entry = MockConfigEntry(domain=DOMAIN, entry_id=old["entry_id"], version=old["version"], title=old["title"], data=old["data"], options=old["options"])
    entry.add_to_hass(hass)
    mock_registry(hass, {
        r["entity_id"]: RegistryEntryWithDefaults(entity_id=r["entity_id"], unique_id=r["unique_id"], platform=DOMAIN, config_entry_id=entry.entry_id)
        for r in dump["registry"]
    })
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED
    assert [r.getMessage() for r in caplog.records if r.levelno >= logging.WARNING and r.name.startswith(f"custom_components.{DOMAIN}")] == []

    new = await _facts(hass, entry)
    before = dump["facts"]
    # every entity of the old release is still there, under the same id
    assert {i for i in before["states"] if i.split(".")[0] in {r["domain"] for r in dump["registry"]}} <= set(new["states"])
    mismatches = []
    for entity_id, old_state in before["states"].items():
        if entity_id not in new["states"]:
            continue
        now = new["states"][entity_id]
        if now["state"] != old_state["state"] and not entity_id.startswith("image."):  # an image's state is its update time
            mismatches.append(f"{entity_id}: state {old_state['state']!r} -> {now['state']!r}")
        for key in SAME:
            if key in old_state["attributes"] and now["attributes"].get(key) != old_state["attributes"][key]:
                mismatches.append(f"{entity_id}.{key}: {old_state['attributes'][key]!r} -> {now['attributes'].get(key)!r}")
    assert mismatches == []
    assert new["history"] == before["history"]
    assert new["prefs"] == before["prefs"]
    assert new["household"]["profiles"] == before["household"]["profiles"]
    timer = new["states"]["menstruation_cycle_timer.anna"]
    assert timer["state"] == "active" and timer["attributes"]["remaining_seconds"] == 600

    # and it keeps working: a new entry is saved next to the old ones
    await _call(hass, "add_cycle_start", {"entry_id": entry.entry_id, "date": "2026-11-20"})
    saved = hass_storage["menstruation_cycle.history.anna"]["data"]
    assert saved["history"][-1] == "2026-11-20" and "2026-05-09" in saved["history"]
    result = await _call(hass, "repair_storage", {}, True)
    assert result["total_issues"] == 0, result
