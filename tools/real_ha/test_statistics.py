"""Long-term statistics reach a real recorder; run with tools/real_ha/run.sh.

The other tests run without a recorder (the integration then skips quietly); here the plugin's recorder_mock is loaded."""
import logging

from homeassistant.components.recorder import get_instance
from homeassistant.components.recorder.statistics import get_last_statistics, list_statistic_ids
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.components.recorder.common import async_wait_recording_done

from test_real_ha import DOMAIN, _add_profile


async def _ids(hass):
    return {row["statistic_id"] for row in await get_instance(hass).async_add_executor_job(list_statistic_ids, hass)}


async def test_cycle_statistics_are_written(hass, recorder_mock, caplog):
    caplog.set_level(logging.WARNING)
    assert await async_setup_component(hass, "recorder", {})
    entry = await _add_profile(hass)
    for day in ("2026-07-04", "2026-08-01", "2026-08-29", "2026-09-26"):  # three cycles of 28 days
        await hass.services.async_call(DOMAIN, "add_cycle_start", {"entry_id": entry.entry_id, "date": day}, blocking=True)
    await hass.services.async_call(DOMAIN, "add_symptom", {"entry_id": entry.entry_id, "date": "2026-08-03", "symptom_data": {"pain": ["cramps"]}}, blocking=True)
    await hass.async_block_till_done()
    await async_wait_recording_done(hass)

    assert {f"{DOMAIN}:anna_cycle_length", f"{DOMAIN}:anna_pain_days"} <= await _ids(hass)
    last = await get_instance(hass).async_add_executor_job(
        get_last_statistics, hass, 3, f"{DOMAIN}:anna_cycle_length", True, {"mean"})
    assert [round(p["mean"]) for p in last[f"{DOMAIN}:anna_cycle_length"]] == [28, 28, 28]
    assert [r.getMessage() for r in caplog.records if r.levelno >= logging.WARNING and r.name.startswith(f"custom_components.{DOMAIN}")] == []


async def test_basal_temperature_backfill_can_be_repeated(hass, recorder_mock):
    assert await async_setup_component(hass, "recorder", {})
    entry = await _add_profile(hass)
    for day, temp in (("2026-10-01", 36.3), ("2026-10-02", 36.4), ("2026-10-03", 36.5)):
        await hass.services.async_call(DOMAIN, "add_symptom", {"entry_id": entry.entry_id, "date": day, "symptom_data": {"basal_temp": temp}}, blocking=True)
    await hass.services.async_call(DOMAIN, "reimport_basal_temp_statistics", {"entry_id": entry.entry_id}, blocking=True)
    await hass.async_block_till_done()
    await async_wait_recording_done(hass)
    assert "sensor.menstruation_anna_basal_temp" in await _ids(hass)
