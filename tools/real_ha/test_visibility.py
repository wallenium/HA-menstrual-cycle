"""The read services must hand data to ordinary users only at visibility 'Full' (README, 'Who can see what'); run with run.sh."""
import pytest
from homeassistant.core import Context
from homeassistant.exceptions import HomeAssistantError

from test_real_ha import DOMAIN
from test_services_smoke import _seeded_profile

READ = {
    "get_symptom": {"date": "2026-08-02"}, "get_full_history": {"days": 180}, "get_cycle_predictions": {},
    "compare_current_cycle": {}, "get_last_cycle_summary": {}, "get_menarche_info": {},
}


@pytest.mark.parametrize("level", ["full", "status_only", "private"])
async def test_read_services_by_role_and_level(hass, level):
    entry = await _seeded_profile(hass)
    if level != "full":
        await hass.services.async_call(DOMAIN, "set_profile_visibility", {"entry_id": entry.entry_id, "level": level}, blocking=True)
    admin = await hass.auth.async_create_user("boss", group_ids=["system-admin"])  # the first user created is the owner
    kid = await hass.auth.async_create_user("kid", group_ids=["system-users"])
    for service, data in READ.items():
        payload = {"entry_id": entry.entry_id, **data}

        async def call(user):
            return await hass.services.async_call(DOMAIN, service, payload, blocking=True, return_response=True, context=Context(user_id=user.id))

        assert await call(admin), f"{service}: administrator got nothing at '{level}'"
        if level == "full":
            assert await call(kid), f"{service}: user got nothing at 'full'"
        else:
            with pytest.raises(HomeAssistantError, match="administrators"):
                await call(kid)
