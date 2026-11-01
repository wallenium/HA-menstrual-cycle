"""Full backup round trip in a real Home Assistant; run with tools/real_ha/run.sh.

A profile gets data of every kind the backup claims to cover, export_full_backup writes the file, the data is wiped, and
import_full_backup has to bring back exactly what was there. The wipe is checked too: a field that survives a wipe proves nothing."""
import json
from pathlib import Path

from test_real_ha import DOMAIN, _add_profile, _call
from test_services_smoke import _seeded_profile

NOT_IN_BACKUP = ("ics_token", "ics_token_created_at")  # a live credential; deliberately left out, see the integration
RICH = {
    "pregnancy_data": {"is_pregnant": True, "start_date": "2026-07-01", "test_result": "positive"},
    "menarche_data": {"tracking_active": True, "is_menarche": False, "menarche_date": None, "estimated_date": "2026-12-01", "family_menarche_age": 12},
    "pre_menarche_data": {"signs": {"breast_development": "2026-05-01"}, "tanner_stage": "stage_2"},
    "menopause_data": {"is_menopause": True, "start_date": "2024-06-01"},
    "noncycle_data": {"has_noncycle": True, "is_postpartum": True, "postpartum_start": "2026-08-15", "basal_temp_stats_backfilled": True},
}
EMPTY = {
    "pregnancy_data": {"is_pregnant": False, "start_date": None},
    "menarche_data": {"tracking_active": False, "is_menarche": False, "menarche_date": None, "estimated_date": None, "family_menarche_age": None},
    "pre_menarche_data": {"signs": {}, "tanner_stage": None},
    "menopause_data": {"is_menopause": False, "start_date": None},
    "noncycle_data": {"has_noncycle": False},
}
BAG = [{"uid": "bag-1", "summary": "Slippers", "status": "completed"}, {"uid": "bag-2", "summary": "Charger", "status": "needs_action"}]
TIMER = {"remaining_seconds": 4200, "total_seconds": 25200, "selected_product": "pad", "is_running": True, "saved_at": 1760000000000}
PREFS = {"widgetOrder": ["kpi_strip", "calendar"], "widgetVisibility": {"kpi_strip": True, "calendar": False}}


async def _stored(runtime):
    data = await runtime.storage.async_load()
    return {k: v for k, v in data.items() if k not in NOT_IN_BACKUP}


def _timer_store(hass, runtime):
    from homeassistant.helpers.storage import Store

    from custom_components.menstruation_cycle.const import STORAGE_KEY, STORAGE_VERSION

    return Store(hass, STORAGE_VERSION, f"{STORAGE_KEY}.timer_state.{runtime.profile}")


async def _timer(hass, runtime):
    return await _timer_store(hass, runtime).async_load()


def _inventory(hass):
    import copy

    from custom_components.menstruation_cycle import HOUSEHOLD_INVENTORY_DATA_KEY

    return copy.deepcopy(hass.data.get(HOUSEHOLD_INVENTORY_DATA_KEY))


async def _fill(hass, entry):
    runtime = hass.data[DOMAIN][entry.entry_id]
    for day in ("2026-03-14", "2026-04-11", "2026-05-09"):
        await _call(hass, "add_cycle_start", {"entry_id": entry.entry_id, "date": day})
    await _call(hass, "add_symptom", {"entry_id": entry.entry_id, "date": "2026-09-01", "symptom_data": {"mood": "happy", "pain": ["cramps", "headache"], "note": "RTCANARY"}})
    await _call(hass, "add_symptom", {"entry_id": entry.entry_id, "date": "2026-09-02", "symptom_data": {"basal_temp": 36.55}})
    await _call(hass, "log_product_usage", {"entry_id": entry.entry_id, "product": "pad", "action": "used", "quantity": 2, "date": "2026-09-03"})
    await _call(hass, "set_period_duration", {"entry_id": entry.entry_id, "days": 7})
    for key, value in RICH.items():
        setattr(runtime, key, json.loads(json.dumps(value)))
    runtime.cycle_length_override = 31
    runtime.onboarding_stage = "early_menarche"
    runtime.visibility_level = "status_only"
    from custom_components.menstruation_cycle import _async_save_and_notify

    await _async_save_and_notify(hass, runtime)
    await runtime.storage.async_save_hospital_bag_items(json.loads(json.dumps(BAG)))
    await _call(hass, "save_dashboard_prefs", {"profile": "anna", "prefs": PREFS})
    await _call(hass, "save_timer_state", {"entry_id": entry.entry_id, **TIMER})
    await _call(hass, "manage_household_inventory", {"inventory_action": "add", "product": "tampon", "quantity": 12})
    await _call(hass, "manage_household_inventory", {"inventory_action": "add", "product": "pad", "quantity": 9})
    return runtime


async def _wipe(hass, runtime):
    from custom_components.menstruation_cycle import _async_save_and_notify
    from custom_components.menstruation_cycle.const import DEFAULT_ONBOARDING_STAGE, DEFAULT_VISIBILITY_LEVEL

    runtime.history, runtime.symptom_history, runtime.product_usage = [], [], []
    for key, value in EMPTY.items():
        setattr(runtime, key, json.loads(json.dumps(value)))
    runtime.cycle_length_override = None
    runtime.period_duration_days = 5
    runtime.onboarding_stage, runtime.visibility_level = DEFAULT_ONBOARDING_STAGE, DEFAULT_VISIBILITY_LEVEL
    await _async_save_and_notify(hass, runtime)
    await runtime.storage.async_save_hospital_bag_items([{"uid": "other", "summary": "Other", "status": "needs_action"}])
    await _call(hass, "save_dashboard_prefs", {"profile": "anna", "prefs": {"widgetOrder": []}})
    await _call(hass, "save_timer_state", {"entry_id": _entry_id(hass, runtime), "remaining_seconds": 0, "total_seconds": 0, "is_running": False, "saved_at": 0})
    await _call(hass, "manage_household_inventory", {"inventory_action": "add", "product": "tampon", "quantity": 100})


def _entry_id(hass, runtime):
    return next(k for k, v in hass.data[DOMAIN].items() if v is runtime)


async def _reset_to_never_used(hass, runtime):
    """What a profile and an installation look like before anything was saved: no timer file, default inventory."""
    from custom_components.menstruation_cycle import _async_save_household_inventory, _default_household_inventory_data
    from custom_components.menstruation_cycle import HOUSEHOLD_INVENTORY_DATA_KEY

    await _timer_store(hass, runtime).async_remove()
    hass.data[HOUSEHOLD_INVENTORY_DATA_KEY] = _default_household_inventory_data()
    await _async_save_household_inventory(hass)


async def _prefs(hass):
    return (await _call(hass, "get_dashboard_prefs", {"profile": "anna"}, True))["prefs"]


async def test_full_backup_round_trip_overwrite(hass):
    entry = await _seeded_profile(hass)
    runtime = await _fill(hass, entry)
    before = await _stored(runtime)
    prefs_before = await _prefs(hass)
    timer_before, inventory_before = await _timer(hass, runtime), _inventory(hass)
    assert timer_before == TIMER and inventory_before["inventory"]["tampon"] >= 12 and inventory_before["consumption_log"]
    # the test data has to reach every kind of field, otherwise a restore that drops one would go unnoticed
    for key in ("history", "symptom_history", "product_usage", "pregnancy_data", "menarche_data", "pre_menarche_data", "menopause_data",
                "noncycle_data", "cycle_length_override", "onboarding_stage", "visibility_level", "period_duration_days", "hospital_bag_items"):
        assert before[key] not in (None, [], {}, EMPTY.get(key)), f"test data for {key} is empty: {before[key]!r}"
    assert prefs_before == PREFS

    out = await _call(hass, "export_full_backup", {"filename": "roundtrip"}, True)
    assert out["profile_count"] == 1
    file = Path(out["file"])
    text = file.read_text(encoding="utf-8")
    assert "ics_token" not in text, "the calendar-feed token must not be in a backup file"

    await _wipe(hass, runtime)
    wiped = await _stored(runtime)
    different = {k for k in before if before[k] != wiped[k]}
    assert different == set(before), f"the wipe left these untouched, so they prove nothing: {set(before) - different}"
    assert await _prefs(hass) != prefs_before
    assert await _timer(hass, runtime) != timer_before and _inventory(hass) != inventory_before

    res = await _call(hass, "import_full_backup", {"filename": "roundtrip", "mode": "overwrite", "confirm": True}, True)
    assert res["restored"] == ["anna"] and res["skipped_not_configured"] == [] and res["household_inventory_restored"] is True, res
    assert await _timer(hass, runtime) == timer_before
    assert _inventory(hass) == inventory_before
    assert hass.states.get("menstruation_cycle_timer.anna").attributes["remaining_seconds"] == 4200
    after = await _stored(runtime)
    assert after == before, {k: (before[k], after[k]) for k in before if before[k] != after[k]}
    assert await _prefs(hass) == prefs_before

    # what is in memory is what is in storage, and it survives a reload
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert await _stored(hass.data[DOMAIN][entry.entry_id]) == before
    assert await _timer(hass, runtime) == timer_before


async def test_merge_into_an_empty_profile_restores_data_but_not_settings(hass):
    entry = await _seeded_profile(hass)
    runtime = await _fill(hass, entry)
    before = await _stored(runtime)
    timer_before, inventory_before = await _timer(hass, runtime), _inventory(hass)
    await _call(hass, "export_full_backup", {"filename": "merge"}, True)
    await _wipe(hass, runtime)
    await _reset_to_never_used(hass, runtime)
    await runtime.storage.async_save_hospital_bag_items([])  # a merge keeps a list that already has items, so only an empty one is refilled

    res = await _call(hass, "import_full_backup", {"filename": "merge", "mode": "merge", "confirm": True}, True)
    assert res["restored"] == ["anna"] and res["household_inventory_restored"] is True
    assert await _timer(hass, runtime) == timer_before and _inventory(hass) == inventory_before
    after = await _stored(runtime)
    data_keys = ("history", "symptom_history", "product_usage", "pregnancy_data", "menarche_data", "pre_menarche_data", "menopause_data",
                 "cycle_length_override", "hospital_bag_items")
    assert {k: after[k] for k in data_keys} == {k: before[k] for k in data_keys}, {k: (before[k], after[k]) for k in data_keys if before[k] != after[k]}
    assert after["noncycle_data"]["is_postpartum"] == before["noncycle_data"]["is_postpartum"]
    # documented: a merge never touches settings
    for key in ("onboarding_stage", "visibility_level", "period_duration_days"):
        assert after[key] != before[key], f"merge changed the setting {key}"


async def test_merge_never_overwrites_what_is_already_there(hass):
    entry = await _seeded_profile(hass)
    runtime = await _fill(hass, entry)
    await _call(hass, "export_full_backup", {"filename": "keep"}, True)
    await _call(hass, "save_timer_state", {"entry_id": entry.entry_id, "remaining_seconds": 5, "total_seconds": 10, "is_running": False, "saved_at": 1})
    await _call(hass, "manage_household_inventory", {"inventory_action": "add", "product": "liner", "quantity": 3})
    inventory_now = _inventory(hass)
    await _call(hass, "add_symptom", {"entry_id": entry.entry_id, "date": "2026-09-01", "symptom_data": {"mood": "tired"}})
    await _call(hass, "add_cycle_start", {"entry_id": entry.entry_id, "date": "2026-06-06"})
    mood_now = next(e for e in runtime.symptom_history if e["date"] == "2026-09-01")["mood"]
    assert mood_now == "tired"

    res = await _call(hass, "import_full_backup", {"filename": "keep", "mode": "merge", "confirm": True}, True)
    assert res["household_inventory_restored"] is False
    assert (await _timer(hass, runtime))["remaining_seconds"] == 5, "a merge replaced the timer that was already saved"
    assert _inventory(hass) == inventory_now, "a merge replaced an inventory that was already in use"
    on_that_day = [e for e in runtime.symptom_history if e["date"] == "2026-09-01"]
    assert len(on_that_day) == 1 and on_that_day[0]["mood"] == "tired", on_that_day
    assert "2026-06-06" in runtime.history and "2026-03-14" in runtime.history


async def test_import_of_a_second_profile_leaves_the_first_alone(hass):
    anna = await _seeded_profile(hass)
    runtime = await _fill(hass, anna)
    await _call(hass, "export_full_backup", {"filename": "two"}, True)
    bea = await _add_profile(hass, "Bea")
    bea_runtime = hass.data[DOMAIN][bea.entry_id]
    assert bea_runtime.history == []
    await _wipe(hass, runtime)

    res = await _call(hass, "import_full_backup", {"filename": "two", "mode": "overwrite", "confirm": True}, True)
    assert res["restored"] == ["anna"], res  # bea was not in the file
    assert bea_runtime.history == [] and bea_runtime.symptom_history == []
    assert runtime.history and runtime.symptom_history


async def test_a_backup_from_before_timer_and_inventory_existed_still_imports(hass):
    entry = await _seeded_profile(hass)
    runtime = await _fill(hass, entry)
    out = await _call(hass, "export_full_backup", {"filename": "old"}, True)
    backup = json.loads(Path(out["file"]).read_text(encoding="utf-8"))
    backup.pop("household_inventory", None)
    for profile in backup["profiles"].values():
        profile.pop("timer_state", None)
    Path(out["file"]).write_text(json.dumps(backup), encoding="utf-8")
    inventory_now, timer_now = _inventory(hass), await _timer(hass, runtime)

    res = await _call(hass, "import_full_backup", {"filename": "old", "mode": "overwrite", "confirm": True}, True)
    assert res["restored"] == ["anna"] and res["household_inventory_restored"] is False
    assert _inventory(hass) == inventory_now and await _timer(hass, runtime) == timer_now


async def test_a_damaged_timer_in_a_backup_is_ignored(hass):
    entry = await _seeded_profile(hass)
    runtime = await _fill(hass, entry)
    out = await _call(hass, "export_full_backup", {"filename": "damaged"}, True)
    backup = json.loads(Path(out["file"]).read_text(encoding="utf-8"))
    backup["profiles"]["anna"]["timer_state"] = {"remaining_seconds": "soon"}
    backup["household_inventory"] = "not a dict"
    Path(out["file"]).write_text(json.dumps(backup), encoding="utf-8")
    timer_now = await _timer(hass, runtime)

    res = await _call(hass, "import_full_backup", {"filename": "damaged", "mode": "overwrite", "confirm": True}, True)
    assert res["restored"] == ["anna"] and res["household_inventory_restored"] is False
    assert await _timer(hass, runtime) == timer_now
