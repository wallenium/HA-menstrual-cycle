"""Repair handlers for menstruation_cycle integration."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.components.repairs import RepairsFlow
from homeassistant.core import HomeAssistant
from homeassistant.helpers.issue_registry import (
    IssueSeverity,
    async_create_issue,
    async_delete_issue,
)

_LOGGER = logging.getLogger(__name__)

DOMAIN = "menstruation_cycle"
OLD_DOMAIN = "menstruation_gauge"


def async_create_migration_issue(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
) -> None:
    """Create a repair issue to notify the user that a migration is available.

    The issue is fixable: clicking *Fix* in Settings → System → Repairs will
    trigger :class:`MigrationRepairFlow` which runs the actual migration.
    """
    _LOGGER.info(
        "Creating repair issue for migration of config entry '%s' (%s → %s).",
        entry_title,
        OLD_DOMAIN,
        DOMAIN,
    )

    async_create_issue(
        hass,
        DOMAIN,
        f"migrate_config_entry_{entry_id}",
        issue_domain=DOMAIN,
        is_fixable=True,
        severity=IssueSeverity.WARNING,
        translation_key="migrate_config_entry",
        translation_placeholders={
            "entry_title": entry_title,
            "old_domain": OLD_DOMAIN,
            "new_domain": DOMAIN,
        },
        learn_more_url="https://github.com/wallenium/HA-menstrual-cycle/wiki/Migration",
    )


def async_delete_migration_issue(
    hass: HomeAssistant,
    entry_id: str,
) -> None:
    """Delete the migration repair issue after a successful migration."""
    _LOGGER.debug(
        "Deleting repair issue for migrated config entry '%s'.",
        entry_id,
    )
    async_delete_issue(
        hass,
        DOMAIN,
        f"migrate_config_entry_{entry_id}",
    )


async def async_create_fix_flow(
    hass: HomeAssistant,
    issue_id: str,
    data: dict[str, str | int | float | None] | None,
) -> RepairsFlow:
    """Create a repair fix flow for a fixable migration issue.

    Home Assistant calls this function when the user clicks *Fix* in the
    Repairs UI.  The returned :class:`MigrationRepairFlow` guides the user
    through a confirmation step and then performs the config-entry migration.
    """
    return MigrationRepairFlow(issue_id)


class MigrationRepairFlow(RepairsFlow):
    """Repair flow to migrate a *menstruation_gauge* config entry to *menstruation_cycle*.

    Steps
    -----
    1. ``init``   – immediately delegates to ``confirm``.
    2. ``confirm`` – shows a confirmation form; on submit it runs the migration.
    """

    def __init__(self, issue_id: str) -> None:
        """Initialise the repair flow.

        Parameters
        ----------
        issue_id:
            The issue identifier as passed by HA, e.g.
            ``"migrate_config_entry_<entry_id>"``.
        """
        self._issue_id = issue_id
        prefix = "migrate_config_entry_"
        self._entry_id: str = (
            issue_id[len(prefix) :] if issue_id.startswith(prefix) else issue_id
        )

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Entry point – forward directly to the confirmation step."""
        return await self.async_step_confirm()

    async def async_step_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Show a confirmation form and run the migration on submit.

        Returning :meth:`async_create_entry` signals to HA that the issue has
        been resolved; HA will automatically close the repair issue.
        """
        if user_input is not None:
            await self._async_run_migration()
            return self.async_create_entry(title="", data={})

        return self.async_show_form(step_id="confirm", data_schema=vol.Schema({}))

    async def _async_run_migration(self) -> None:
        """Locate the old-domain entry and perform the migration."""
        from . import _async_migrate_old_domain_entry

        old_entries = self.hass.config_entries.async_entries(OLD_DOMAIN)
        matching = [e for e in old_entries if e.entry_id == self._entry_id]

        if not matching:
            _LOGGER.warning(
                "Repair flow: could not find '%s' config entry '%s' – migration skipped.",
                OLD_DOMAIN,
                self._entry_id,
            )
            return

        _LOGGER.info(
            "Repair flow: starting migration of '%s' (%s → %s).",
            matching[0].title,
            OLD_DOMAIN,
            DOMAIN,
        )
        await _async_migrate_old_domain_entry(self.hass, matching[0])
