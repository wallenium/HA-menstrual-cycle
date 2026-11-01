"""What has to survive a restart of Home Assistant: temporary visibility, snoozed reminders, the countdown timer, the notification buttons.

A restart is an unload and set-up of the profile that reads everything back from the storage. The clock is frozen as in test_notifications.py."""
from datetime import timedelta

from homeassistant.config_entries import ConfigEntryState
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from test_notifications import _frozen, _pill_days, _profile, _titles  # noqa: F401 - _frozen is the autouse clock fixture
from test_real_ha import DOMAIN


async def _restart(hass, entry):
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED


async def _later(hass, freezer, **delta):
    freezer.tick(timedelta(**delta))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()


def _level(hass, entry):
    return hass.data[DOMAIN][entry.entry_id].visibility_level


async def _set_level(hass, entry, level, **extra):
    await hass.services.async_call(DOMAIN, "set_profile_visibility", {"entry_id": entry.entry_id, "level": level, **extra}, blocking=True)


async def test_temporary_visibility_is_put_back_after_a_restart(hass, freezer):
    entry, _, _ = await _profile(hass, starts_ago=(27,))
    await _set_level(hass, entry, "private", revert_after_minutes=60)
    await _later(hass, freezer, minutes=20)
    await _restart(hass, entry)
    assert _level(hass, entry) == "private"
    await _later(hass, freezer, minutes=30)
    assert _level(hass, entry) == "private", "put back too early"
    await _later(hass, freezer, minutes=15)
    assert _level(hass, entry) == "full", "not put back after the restart"
    await _restart(hass, entry)
    assert _level(hass, entry) == "full", "the old level came back after another restart"


async def test_temporary_visibility_that_ran_out_while_home_assistant_was_off(hass, freezer):
    entry, _, _ = await _profile(hass, starts_ago=(27,))
    await _set_level(hass, entry, "status_only", revert_after_minutes=30)
    assert await hass.config_entries.async_unload(entry.entry_id)
    freezer.tick(timedelta(hours=5))
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    await _later(hass, freezer, seconds=2)
    assert _level(hass, entry) == "full"


async def test_a_second_temporary_change_restores_the_original_level(hass, freezer):
    entry, _, _ = await _profile(hass, starts_ago=(27,))
    await _set_level(hass, entry, "status_only", revert_after_minutes=60)
    await _set_level(hass, entry, "private", revert_after_minutes=60)
    await _later(hass, freezer, minutes=61)
    assert _level(hass, entry) == "full"


async def test_an_explicit_change_cancels_the_pending_revert_even_across_a_restart(hass, freezer):
    entry, _, _ = await _profile(hass, starts_ago=(27,))
    await _set_level(hass, entry, "private", revert_after_minutes=60)
    await _set_level(hass, entry, "status_only")
    await _restart(hass, entry)
    await _later(hass, freezer, minutes=120)
    assert _level(hass, entry) == "status_only"


async def test_snoozed_pill_reminder_comes_back_after_a_restart(hass, freezer):
    entry, own, _ = await _profile(hass, options={"notify_pill_enabled": True, "notify_pill_time": "09:00:00", "notify_period_enabled": False,
                                                  "notify_fertile_enabled": False},
                                   starts_ago=(83, 55, 27), symptoms=_pill_days(10))
    hass.bus.async_fire("mobile_app_notification_action", {"action": f"MCYCLE_PILL_SNOOZE_{entry.entry_id}"})
    await hass.async_block_till_done()
    assert not own, "snoozing sent something"
    await _later(hass, freezer, minutes=20)
    await _restart(hass, entry)
    await _later(hass, freezer, minutes=30)
    assert not [t for t in _titles(own) if "ill" in t], "came back too early"
    await _later(hass, freezer, minutes=15)
    assert len([t for t in _titles(own) if "ill" in t]) == 1, _titles(own)
    await _later(hass, freezer, hours=3)
    assert len([t for t in _titles(own) if "ill" in t]) == 1, "snooze fired twice"


async def test_countdown_timer_state_survives_a_restart(hass):
    entry, _, _ = await _profile(hass, starts_ago=(27,))
    await hass.services.async_call(DOMAIN, "save_timer_state", {"entry_id": entry.entry_id, "remaining_seconds": 600, "total_seconds": 900,
                                                                "selected_product": "tampon", "is_running": True, "saved_at": 1}, blocking=True)
    hass.states.async_remove("menstruation_cycle_timer.anna")
    await _restart(hass, entry)
    state = hass.states.get("menstruation_cycle_timer.anna")
    assert state.state == "active" and state.attributes["remaining_seconds"] == 600 and state.attributes["selected_product"] == "tampon"


async def test_notification_buttons_log_what_they_say(hass):
    entry, own, _ = await _profile(hass, starts_ago=(83, 55, 27), symptoms=_pill_days(5))
    today = dt_util.now().date().isoformat()
    hass.bus.async_fire("mobile_app_notification_action", {"action": f"MCYCLE_PERIOD_STARTED_{entry.entry_id}"})
    hass.bus.async_fire("mobile_app_notification_action", {"action": f"MCYCLE_PILL_TAKEN_{entry.entry_id}"})
    hass.bus.async_fire("mobile_app_notification_action", {"action": "MCYCLE_PERIOD_STARTED_someone_else"})  # another profile's button
    await hass.async_block_till_done()
    runtime = hass.data[DOMAIN][entry.entry_id]
    assert runtime.history[-1] == today
    assert any(e["date"] == today and e.get("contraception_method") == "pill" for e in runtime.symptom_history)
    assert len([d for d in runtime.history if d == today]) == 1
