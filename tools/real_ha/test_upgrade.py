"""Existing data from older installs must survive an upgrade; run with tools/real_ha/run.sh.

The 'old' data is built from what the loaders still accept (single-profile entry v1, the menstruation_gauge.* store keys,
unnormalized values), not copied from real 1.9.1 files; add a real file here if one ever turns up."""
import json

from homeassistant.config_entries import ConfigEntryState
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

DOMAIN = "menstruation_cycle"
OLD_HISTORY = {
    "history": ["2026-06-06", "2026-07-04", "2026-08-04T10:30:00Z", "garbage", "2026-07-04", "2026-08-31"],
    "period_duration_days": 99,
    "visibility_level": "nonsense",
    "symptom_history": [{"date": "2026-08-02", "pain": ["cramps"], "mood": "tired"}, {"date": "broken"}],
    "product_usage": [{"date": "2026-08-02", "product": "tampon", "quantity": "2"}],
}


def _store(key, data):
    return {"version": 1, "minor_version": 1, "key": key, "data": data}


async def _setup(hass, entry):
    assert await async_setup_component(hass, "homeassistant", {})
    assert await async_setup_component(hass, "persistent_notification", {})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED


async def test_single_profile_entry_from_before_profiles_is_migrated(hass, hass_storage):
    hass_storage["menstruation_cycle.history.anna"] = _store("menstruation_cycle.history.anna", OLD_HISTORY)
    entry = MockConfigEntry(domain=DOMAIN, version=1, title="Anna", data={"name": "Anna"})
    await _setup(hass, entry)
    assert entry.version == 2
    assert entry.data["profile"] == "anna" and entry.data["friendly_name"] == "Anna"
    assert hass.states.get("sensor.menstruation_anna") is not None


async def test_legacy_gauge_store_is_read_cleaned_and_continued(hass, hass_storage):
    hass_storage["menstruation_gauge.history.anna"] = _store("menstruation_gauge.history.anna", OLD_HISTORY)
    hass_storage["menstruation_cycle.history.timer_state.anna"] = _store(
        "menstruation_cycle.history.timer_state.anna",
        {"remaining_seconds": 600, "total_seconds": 900, "selected_product": "tampon", "is_running": True, "saved_at": 1},
    )
    entry = MockConfigEntry(domain=DOMAIN, version=2, title="Anna", data={"profile": "anna", "friendly_name": "Anna", "icon": ""})
    await _setup(hass, entry)

    runtime = hass.data[DOMAIN][entry.entry_id]
    assert runtime.history == ["2026-06-06", "2026-07-04", "2026-08-04", "2026-08-31"]  # sorted, deduplicated, datetime values and garbage handled
    assert runtime.visibility_level == "full"  # unknown value falls back
    assert hass.states.get("menstruation_cycle_timer.anna").state == "active"  # timer state survives

    await hass.services.async_call(DOMAIN, "add_cycle_start", {"entry_id": entry.entry_id, "date": "2026-09-28"}, blocking=True)
    saved = hass_storage["menstruation_cycle.history.anna"]["data"]
    assert saved["history"][-1] == "2026-09-28" and "2026-06-06" in saved["history"]  # written to the new key, old data carried along
    assert saved["period_duration_days"] == 14  # 99 clamped, not dropped
    assert "cramps" in json.dumps(saved["symptom_history"]) and saved["product_usage"][0]["product"] == "tampon"


async def test_repair_storage_has_nothing_to_complain_about_after_upgrade(hass, hass_storage):
    hass_storage["menstruation_gauge.history.anna"] = _store("menstruation_gauge.history.anna", OLD_HISTORY)
    entry = MockConfigEntry(domain=DOMAIN, version=2, title="Anna", data={"profile": "anna", "friendly_name": "Anna", "icon": ""})
    await _setup(hass, entry)
    result = await hass.services.async_call(DOMAIN, "repair_storage", {}, blocking=True, return_response=True)
    print(result)
    assert result
