"""Repair handlers for menstruation_cycle integration."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import voluptuous as vol

from homeassistant.components.repairs import RepairsFlow
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.issue_registry import (
    IssueSeverity,
    async_create_issue,
    async_delete_issue,
)

from .const import ICS_TOKEN_STALE_DAYS, menstruation_object_ids_for_profile

_LOGGER = logging.getLogger(__name__)

DOMAIN = "menstruation_cycle"
OLD_DOMAIN = "menstruation_gauge"


def async_create_entity_naming_issue(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    renames: dict[str, str],
) -> None:
    """Create a repair issue offering to rename entities onto the current
    "menstruation_"-prefixed ID scheme.

    Entity IDs are only ever *suggested* by the integration when an entity is
    first created — Home Assistant never renames an existing entity on its own
    just because the code's suggestion changed later (e.g. after this
    integration started adding a device-grouping-friendly prefix). Profiles
    created before that change keep their old entity IDs (e.g. "sensor.anna")
    forever unless something explicitly renames them — this issue is that
    "something", offered as an opt-in fix rather than a silent rename, since a
    rename changes what dashboards/automations need to reference.
    """
    if not renames:
        return

    renames_list = "\n".join(f"- {old} → {new}" for old, new in renames.items())

    async_create_issue(
        hass,
        DOMAIN,
        f"rename_entities_{entry_id}",
        issue_domain=DOMAIN,
        is_fixable=True,
        severity=IssueSeverity.WARNING,
        translation_key="rename_entities",
        translation_placeholders={
            "entry_title": entry_title,
            "renames_list": renames_list,
        },
        learn_more_url="https://github.com/wallenium/HA-menstrual-cycle/wiki/Migration",
        data={"entry_id": entry_id},
    )


def async_delete_entity_naming_issue(hass: HomeAssistant, entry_id: str) -> None:
    """Delete the entity-naming repair issue after a successful rename (or if
    the entities no longer need it, e.g. the profile was removed)."""
    async_delete_issue(hass, DOMAIN, f"rename_entities_{entry_id}")


def _compute_entity_renames(hass: HomeAssistant, entry_id: str, friendly_name: str) -> dict[str, str]:
    """Scan this profile's registered entities and return {old_entity_id:
    new_entity_id} for any still using the pre-prefix ID scheme."""
    entity_registry = er.async_get(hass)
    suggested = menstruation_object_ids_for_profile(friendly_name)

    renames: dict[str, str] = {}
    for entity_entry in er.async_entries_for_config_entry(entity_registry, entry_id):
        for suffix, object_id in suggested.items():
            if not entity_entry.unique_id.endswith(suffix):
                continue
            target_entity_id = f"{entity_entry.domain}.{object_id}"
            if entity_entry.entity_id != target_entity_id:
                renames[entity_entry.entity_id] = target_entity_id
            break
    return renames


def async_check_entity_naming(hass: HomeAssistant, entry_id: str, entry_title: str, friendly_name: str) -> None:
    """Scan this profile's entities for old-style IDs and raise (or clear) the
    rename repair issue accordingly. Safe to call on every integration load —
    it's a cheap registry read, and only creates/updates the issue when there's
    actually something to rename."""
    renames = _compute_entity_renames(hass, entry_id, friendly_name)
    if renames:
        async_create_entity_naming_issue(hass, entry_id, entry_title, renames)
    else:
        async_delete_entity_naming_issue(hass, entry_id)


async def async_rename_entities(hass: HomeAssistant, renames: dict[str, str]) -> list[str]:
    """Perform the actual entity_id renames. Returns the list of entity_ids
    that could not be renamed (e.g. the target ID was already taken by
    something else), so the calling flow can report partial success honestly
    rather than silently claiming everything worked."""
    entity_registry = er.async_get(hass)
    failed: list[str] = []
    for old_entity_id, new_entity_id in renames.items():
        if entity_registry.async_get(old_entity_id) is None:
            continue  # already renamed or removed since the issue was raised
        if entity_registry.async_get(new_entity_id) is not None:
            _LOGGER.warning(
                "Cannot rename '%s' to '%s' — target entity_id is already in use.",
                old_entity_id,
                new_entity_id,
            )
            failed.append(old_entity_id)
            continue
        try:
            entity_registry.async_update_entity(old_entity_id, new_entity_id=new_entity_id)
            _LOGGER.info("Renamed entity '%s' to '%s'.", old_entity_id, new_entity_id)
        except Exception:  # noqa: BLE001 — defensive, never let one failed
            # rename abort the rest of the batch or crash the repair flow.
            _LOGGER.warning("Failed to rename entity '%s' to '%s'.", old_entity_id, new_entity_id, exc_info=True)
            failed.append(old_entity_id)
    return failed


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
            "old_domain": OLD_DOMAIN,
            "new_domain": DOMAIN,
            "entry_title": entry_title,
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


def async_create_stale_ics_token_issue(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    age_days: int,
) -> None:
    """Create a repair issue flagging an ICS calendar-feed token that hasn't
    been rotated in a long time (HA-Idee 6, "weitere Ideen" 15.09.2026).

    The ICS feed is fetched by external calendar apps via a plain URL
    containing this token as a bearer credential - there is no HA login
    involved, so the URL alone is enough to read a profile's cycle
    predictions. That's fine while the URL only ever lived in the user's own
    calendar app, but unlike a password there's nothing that naturally
    expires it, so an old subscription URL (copied into a shared calendar,
    an old device, a screenshot, ...) keeps working forever unless someone
    explicitly rotates it. This issue is a periodic nudge to do that -
    informational by default, but fixable: clicking *Fix* generates a new
    token immediately (existing calendar subscriptions using the old URL
    stop working and need to be re-added with the fresh one).
    """
    async_create_issue(
        hass,
        DOMAIN,
        f"stale_ics_token_{entry_id}",
        issue_domain=DOMAIN,
        is_fixable=True,
        severity=IssueSeverity.WARNING,
        translation_key="stale_ics_token",
        translation_placeholders={
            "entry_title": entry_title,
            "age_days": str(age_days),
        },
        data={"entry_id": entry_id},
    )


def async_delete_stale_ics_token_issue(hass: HomeAssistant, entry_id: str) -> None:
    """Delete the stale-ICS-token repair issue (after a rotation, or if the
    profile/entry is being removed)."""
    async_delete_issue(hass, DOMAIN, f"stale_ics_token_{entry_id}")


def async_check_stale_ics_token(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    ics_token_created_at: str | None,
) -> None:
    """Raise (or clear) the stale-ICS-token issue based on the token's age.

    Safe to call repeatedly (integration load, and once a day from the
    existing midnight refresh) - it's a cheap timestamp comparison, and
    create/delete are both idempotent no-ops when the issue's state already
    matches. A missing/unparseable timestamp (e.g. a token created before
    this feature existed, or one from async_setup_entry's fallback
    backfill-quietly-with-"now" path) is treated as "not stale yet" rather
    than immediately flagging every existing install on upgrade.
    """
    if not ics_token_created_at:
        async_delete_stale_ics_token_issue(hass, entry_id)
        return

    try:
        created_at = datetime.fromisoformat(ics_token_created_at)
    except ValueError:
        async_delete_stale_ics_token_issue(hass, entry_id)
        return

    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    age_days = (datetime.now(timezone.utc) - created_at).days
    if age_days >= ICS_TOKEN_STALE_DAYS:
        async_create_stale_ics_token_issue(hass, entry_id, entry_title, age_days)
    else:
        async_delete_stale_ics_token_issue(hass, entry_id)


async def async_create_fix_flow(
    hass: HomeAssistant,
    issue_id: str,
    data: dict[str, str | int | float | None] | None,
) -> RepairsFlow:
    """Create a repair fix flow for a fixable issue.

    Home Assistant calls this function when the user clicks *Fix* in the
    Repairs UI. Dispatches to the right flow based on the issue_id prefix,
    since this integration now raises three distinct kinds of fixable issues.
    """
    if issue_id.startswith("rename_entities_"):
        return EntityRenameRepairFlow(issue_id, data or {})
    if issue_id.startswith("stale_ics_token_"):
        return StaleIcsTokenRepairFlow(issue_id, data or {})
    return MigrationRepairFlow(issue_id)


class EntityRenameRepairFlow(RepairsFlow):
    """Repair flow to rename a profile's entities onto the current
    "menstruation_"-prefixed ID scheme.

    Steps
    -----
    1. ``init``    – delegates to ``confirm``.
    2. ``confirm`` – shows the old→new mapping and a confirm button; on submit,
       performs the renames and reports any that couldn't be completed.
    """

    def __init__(self, issue_id: str, data: dict[str, Any]) -> None:
        self._issue_id = issue_id
        self._entry_id: str = str(data.get("entry_id", ""))
        self._renames: dict[str, str] = {}

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        # Recompute fresh rather than trusting a snapshot from when the issue
        # was first raised — entities or the profile itself may have changed
        # since then.
        runtime = self.hass.data.get(DOMAIN, {}).get(self._entry_id)
        if runtime is not None:
            self._renames = _compute_entity_renames(self.hass, self._entry_id, runtime.friendly_name)
        return await self.async_step_confirm()

    async def async_step_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        if not self._renames:
            # Nothing left to rename (already done, or the profile/entities are
            # gone) — just close the issue and finish.
            if self._entry_id:
                async_delete_entity_naming_issue(self.hass, self._entry_id)
            return self.async_create_entry(title="", data={})

        if user_input is not None:
            failed = await async_rename_entities(self.hass, self._renames)
            if self._entry_id and not failed:
                async_delete_entity_naming_issue(self.hass, self._entry_id)
            if failed:
                _LOGGER.warning(
                    "Entity rename repair completed with %d failure(s): %s",
                    len(failed),
                    ", ".join(failed),
                )
            return self.async_create_entry(title="", data={})

        return self.async_show_form(
            step_id="confirm",
            data_schema=vol.Schema({}),
            description_placeholders={
                "renames": "\n".join(f"{old} → {new}" for old, new in self._renames.items())
            },
        )


class StaleIcsTokenRepairFlow(RepairsFlow):
    """Repair flow to rotate a profile's ICS calendar-feed token.

    Steps
    -----
    1. ``init``    – delegates to ``confirm``.
    2. ``confirm`` – warns that existing calendar subscriptions will stop
       working, then rotates the token on submit.
    """

    def __init__(self, issue_id: str, data: dict[str, Any]) -> None:
        self._issue_id = issue_id
        self._entry_id: str = str(data.get("entry_id", ""))

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        return await self.async_step_confirm()

    async def async_step_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        if not self._entry_id:
            return self.async_create_entry(title="", data={})

        if user_input is not None:
            from . import _async_rotate_ics_token

            await _async_rotate_ics_token(self.hass, self._entry_id)
            async_delete_stale_ics_token_issue(self.hass, self._entry_id)
            return self.async_create_entry(title="", data={})

        return self.async_show_form(
            step_id="confirm",
            data_schema=vol.Schema({}),
        )


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
