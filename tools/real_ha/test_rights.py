"""Rights matrix: an ordinary (non-administrator) user calls every service at visibility 'Full'; run with tools/real_ha/run.sh.

README, 'Who can see what': always administrators only are set_profile_visibility, erase_all_history, import_full_backup and
repair_storage; logging and reading stays open to every user. Anything else refused is a bug in the code or in the README."""
import pytest
from homeassistant.core import Context
from homeassistant.exceptions import HomeAssistantError

from test_real_ha import DOMAIN
from test_services_smoke import CALLS, GLOBAL, SERVICES, _seeded_profile

ADMIN_ONLY = {"set_profile_visibility", "erase_all_history", "import_full_backup", "repair_storage"}


@pytest.mark.parametrize("service", SERVICES)
async def test_ordinary_user_calls(hass, service):
    entry = await _seeded_profile(hass)
    await hass.auth.async_create_user("boss", group_ids=["system-admin"])  # the first user created is the owner, so create one before
    kid = await hass.auth.async_create_user("kid", group_ids=["system-users"])
    assert not kid.is_admin
    data = dict(CALLS[service])
    if service not in GLOBAL and "entity_id" not in data:
        data["entry_id"] = entry.entry_id
    if service == "confirm_contraception_renewal":
        await hass.services.async_call(DOMAIN, "add_symptom", {"entry_id": entry.entry_id, "date": "2026-08-20", "symptom_data": {"contraception_method": "injection"}}, blocking=True)
    if service == "import_full_backup":
        await hass.services.async_call(DOMAIN, "export_full_backup", {"filename": "smoke_backup"}, blocking=True)
    call = hass.services.async_call(DOMAIN, service, data, blocking=True, context=Context(user_id=kid.id),
                                    return_response=hass.services.supports_response(DOMAIN, service) != "none")
    if service in ADMIN_ONLY:
        with pytest.raises(HomeAssistantError, match="[Aa]dministrators"):
            await call
    else:
        await call  # raises if the README promises 'every user' but the code refuses
