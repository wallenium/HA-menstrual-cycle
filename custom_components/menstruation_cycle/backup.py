"""Home Assistant native Backup integration hooks (HA-Idee, "weitere neue
Ideen", 29.09.2026).

Home Assistant auto-discovers this module purely by its name/location - any
loaded integration with a backup.py exposing async_pre_backup/
async_post_backup gets both called around every native backup run (core
homeassistant/components/backup/manager.py::_add_platform_pre_post_handler,
duck-typed via hasattr, no registration needed anywhere else in this
integration). Verified against the real, current core source (raw.
githubusercontent.com/home-assistant/core/dev/.../backup/manager.py) before
writing this, per the Round-40 label_registry lesson - guessing HA core API
shapes from training data caused a production crash there.

A native HA backup already includes the whole config directory - including
this integration's .storage/*.json files - so cycle data is passively
backed up by any ordinary local backup already, with no code here at all.
What this adds on top: a human-readable, versioned export_full_backup-
format JSON snapshot (see __init__.py::_async_write_full_backup_snapshot),
refreshed right before every native backup and included in it for free,
so a restored backup also yields an easy-to-read/import file rather than
only the raw internal storage format.

Fixed filename (overwritten every run, not timestamped) - this is a live
mirror kept fresh for the next backup, not a growing history of manual
exports like export_full_backup's own timestamped files.
"""

from __future__ import annotations

import logging

from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

BACKUP_SNAPSHOT_STEM = "home_assistant_backup_snapshot"


async def async_pre_backup(hass: HomeAssistant) -> None:
    """Refresh the full-backup JSON snapshot right before a backup starts."""
    from . import _async_write_full_backup_snapshot

    try:
        await _async_write_full_backup_snapshot(hass, BACKUP_SNAPSHOT_STEM)
    except Exception:  # noqa: BLE001 - never let this block a native backup
        _LOGGER.warning("Could not refresh menstruation_cycle backup snapshot before backup", exc_info=True)


async def async_post_backup(hass: HomeAssistant) -> None:
    """Nothing to do after a backup - the snapshot is written pre-backup."""
