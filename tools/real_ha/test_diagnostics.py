"""The diagnostics download (Settings > Devices & services > Download diagnostics) must be safe to attach to a GitHub issue."""
import json
import re
from datetime import timedelta

from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_mock_service

from test_real_ha import DOMAIN, _add_profile

NAME = "Zorbulax"
NOTE = "SECRETCANARYNOTE"


async def _download(hass, hass_client):
    assert await async_setup_component(hass, "persistent_notification", {})
    assert await async_setup_component(hass, "diagnostics", {})
    async_mock_service(hass, "notify", "mobile_app_zorbu_phone")
    async_mock_service(hass, "notify", "mobile_app_zorbu_partner")
    entry = await _add_profile(hass, NAME)
    today = dt_util.now().date()
    for days in (84, 56, 28):
        await hass.services.async_call(DOMAIN, "add_cycle_start", {"entry_id": entry.entry_id, "date": (today - timedelta(days=days)).isoformat()}, blocking=True)
    await hass.services.async_call(DOMAIN, "add_symptom", {"entry_id": entry.entry_id, "date": (today - timedelta(days=2)).isoformat(),
                                                           "symptom_data": {"note": NOTE, "pain": ["cramps"], "mood": "tired", "basal_temp": 36.6, "intercourse": "unprotected"}}, blocking=True)
    await hass.services.async_call(DOMAIN, "set_pregnancy_mode", {"entry_id": entry.entry_id, "is_pregnant": True, "pregnancy_start_date": (today - timedelta(days=40)).isoformat()}, blocking=True)
    hass.config_entries.async_update_entry(
        entry, data={**entry.data, "birth_date": "1991-03-17"},
        options={**entry.options, "ics_feed_enabled": True, "notify_service": "notify.mobile_app_zorbu_phone", "notify_partner_service": "notify.mobile_app_zorbu_partner",
                 "linked_person_entity_id": "person.zorbu_secret", "pill_pack_start": (today - timedelta(days=9)).isoformat(), "pregnancy_risk_notes": NOTE})
    await hass.async_block_till_done()
    client = await hass_client()
    response = await client.get(f"/api/diagnostics/config_entry/{entry.entry_id}")
    assert response.status == 200, await response.text()
    return entry, await response.text()


async def test_the_download_holds_structure_but_no_personal_data(hass, hass_client):
    entry, text = await _download(hass, hass_client)
    token = hass.data[DOMAIN][entry.entry_id].ics_token
    leaks = [secret for secret in (NAME, NAME.lower(), NOTE, "cramps", "tired", "36.6", "1991", "zorbu_phone", "zorbu_partner", "zorbu_secret", token, "unprotected")
             if secret in text]
    assert leaks == [], f"in the diagnostics: {leaks}"
    assert re.findall(r"\b20\d\d-\d\d-\d\d\b", text) == [], "a calendar date is in the diagnostics"


async def test_the_download_still_says_enough_to_debug_with(hass, hass_client):
    """Positive control for the test above: not empty, and the settings and counts are there."""
    entry, text = await _download(hass, hass_client)
    data = json.loads(text)["data"]
    assert data["runtime_loaded"] is True and data["manifest_version"]
    assert data["profile"]["history"]["entry_count"] == 3 and data["profile"]["history"]["span_days"] == 56
    assert data["profile"]["symptom_history"]["entry_count"] == 1 and "basal_temp" in data["profile"]["symptom_history"]["fields_used"]
    assert data["profile"]["pregnancy_tracking_active"] is True and data["profile"]["visibility_level"] == "full"
    assert data["entry"]["options"]["ics_feed_enabled"] is True
    assert data["entry"]["options"]["notify_service"] == "**REDACTED**" and data["entry"]["data"]["profile"] == "**REDACTED**"
