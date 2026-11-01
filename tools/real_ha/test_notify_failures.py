"""A missing or failing notify service: a repair issue for the profile, no crash, the partner and the next day unaffected."""
import logging
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import issue_registry as ir
from pytest_homeassistant_custom_component.common import async_mock_service

from test_notifications import OWN, PARTNER, PERIOD_TOMORROW, _fire, _frozen, _profile, _titles  # noqa: F401 - _frozen is the autouse clock fixture
from test_real_ha import DOMAIN

OPTIONS = {"notify_fertile_enabled": False}


def _issue(hass, entry):
    return ir.async_get(hass).async_get_issue(DOMAIN, f"notify_target_unavailable_{entry.entry_id}")


def _own_logger(caplog, level):
    return [r for r in caplog.records if r.levelno >= level and r.name.startswith(f"custom_components.{DOMAIN}")]


async def test_a_missing_own_service_gives_an_issue_and_the_partner_still_gets_the_date(hass, caplog):
    caplog.set_level(logging.WARNING)
    entry, own, partner = await _profile(hass, options=OPTIONS, **PERIOD_TOMORROW)
    hass.services.async_remove("notify", OWN)
    await _fire(hass, "08:00", day=1)
    issue = _issue(hass, entry)
    assert issue is not None and issue.translation_key == "notify_target_unavailable" and issue.translation_placeholders["target"] == f"notify.{OWN}"
    assert "Period reminder" in _titles(partner)
    assert not _own_logger(caplog, logging.ERROR), [r.getMessage() for r in _own_logger(caplog, logging.ERROR)]


async def test_a_failing_own_service_gives_an_issue_that_goes_away_when_it_works_again(hass, caplog):
    caplog.set_level(logging.WARNING)
    entry, own, partner = await _profile(hass, options=OPTIONS, **PERIOD_TOMORROW)

    async def _broken(call):
        raise HomeAssistantError("phone unreachable")

    hass.services.async_register("notify", OWN, _broken)
    await _fire(hass, "08:00", day=1)
    assert _issue(hass, entry) is not None
    assert "Period reminder" in _titles(partner)
    assert not _own_logger(caplog, logging.ERROR)
    # the phone works again: the next message that is delivered clears the issue
    working = async_mock_service(hass, "notify", OWN)
    await hass.services.async_call(DOMAIN, "send_test_notification", {"entry_id": entry.entry_id}, blocking=True)
    assert working, "nothing was sent although the service works"
    assert _issue(hass, entry) is None, "the issue stayed after a successful delivery"


async def test_a_failing_partner_service_does_not_stop_the_own_reminder(hass, caplog):
    caplog.set_level(logging.WARNING)
    entry, own, _ = await _profile(hass, options=OPTIONS, **PERIOD_TOMORROW)

    async def _broken(call):
        raise HomeAssistantError("partner phone unreachable")

    hass.services.async_register("notify", PARTNER, _broken)
    await _fire(hass, "08:00", day=1)
    assert "Period reminder" in _titles(own)
    assert [r.getMessage() for r in _own_logger(caplog, logging.WARNING) if PARTNER in r.getMessage()], "no warning about the partner target"
    assert not _own_logger(caplog, logging.ERROR)
    assert _issue(hass, entry) is None, "a broken partner target must not raise the issue of the profile's own target"
