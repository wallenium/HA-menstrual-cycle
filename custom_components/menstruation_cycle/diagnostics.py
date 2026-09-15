"""Diagnostics support for menstruation_cycle.

HA-Idee 1 ("weitere Ideen", 15.09.2026): until now this integration had no
diagnostics.py at all, so Settings -> Devices & Services -> this entry's
"Download diagnostics" button either doesn't appear or downloads nothing
useful - anyone reporting a bug had to manually dig through HA's storage
files instead of using HA's own built-in, redacted diagnostics export.

Cycle-tracking data is unusually sensitive (menstrual/fertility/pregnancy
health data), so this deliberately does NOT dump raw history, symptom
entries, or free-text notes/mood the way a typical integration's diagnostics
export would - only structure, counts, and non-identifying settings. A bug
report should be useful without becoming a second, less-protected copy of
someone's health data sitting in a GitHub issue. In particular: exact period
dates are excluded even from the summary (only count + earliest/latest date
of the range, not every date), since a full list of dates over time reveals
cycle regularity - itself sensitive.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN

# Config-entry data/options keys that identify the person or device rather
# than describing a setting - redacted rather than excluded outright so the
# key's presence/shape is still visible (useful for debugging "is this field
# even populated"), just not its value. Everything else in entry.data/
# entry.options (booleans, numbers, mode selects like temperature_unit or
# nfp_analysis_mode) stays visible - those are genuinely useful for
# diagnosing a bug and aren't personally identifying on their own.
_REDACT_ENTRY_KEYS = {
    "profile",
    "friendly_name",
    "icon",
    "birth_date",
    "notify_service",
    "linked_person_entity_id",
    "ics_token",
}


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    """Return diagnostics for one profile's config entry."""
    runtime = hass.data.get(DOMAIN, {}).get(entry.entry_id)

    diagnostics: dict[str, Any] = {
        "manifest_version": _load_manifest_version_safe(),
        "entry": {
            "data": async_redact_data(dict(entry.data), _REDACT_ENTRY_KEYS),
            "options": async_redact_data(dict(entry.options), _REDACT_ENTRY_KEYS),
        },
        "runtime_loaded": runtime is not None,
    }

    if runtime is None:
        return diagnostics

    history = list(runtime.history or [])
    symptom_history = list(runtime.symptom_history or [])
    product_usage = list(runtime.product_usage or [])

    diagnostics["profile"] = {
        "onboarding_stage": runtime.onboarding_stage,
        "visibility_level": runtime.visibility_level,
        "period_duration_days": runtime.period_duration_days,
        "cycle_length_override": runtime.cycle_length_override,
        "history": {
            "entry_count": len(history),
            "earliest": min(history) if history else None,
            "latest": max(history) if history else None,
        },
        "symptom_history": {
            "entry_count": len(symptom_history),
            # Which FIELDS were ever logged, not their values - useful to spot
            # e.g. "a field type nobody actually uses" without exposing what
            # anyone actually logged.
            "fields_used": sorted({key for e in symptom_history for key in e.keys() if key != "date"}),
        },
        "product_usage": {"entry_count": len(product_usage)},
        "pregnancy_tracking_active": bool(runtime.pregnancy_data.get("is_pregnant")),
        "menarche_tracking_active": bool(runtime.menarche_data.get("tracking_active")),
        "menopause_tracking_active": bool(runtime.menopause_data.get("is_menopause")),
        "postpartum_tracking_active": bool(runtime.noncycle_data.get("is_postpartum")),
        # Age, not the token or its exact timestamp - enough to tell whether
        # repairs.py::async_check_stale_ics_token *should* have fired.
        "ics_token_age_days": _ics_token_age_days(getattr(runtime, "ics_token_created_at", "")),
    }
    return diagnostics


def _load_manifest_version_safe() -> str:
    """Reuse __init__.py's manifest-version loader (also used for Lovelace
    resource cache-busting) so diagnostics always report the same version
    string as everything else, without a second copy of the file-reading
    logic. Defensive: diagnostics must never fail just because the manifest
    couldn't be read for some reason."""
    try:
        from . import _load_manifest_version

        return _load_manifest_version()
    except Exception:  # noqa: BLE001
        return "unknown"


def _ics_token_age_days(ics_token_created_at: str) -> int | None:
    """Age in days of the ICS token's creation/rotation timestamp, or None
    if missing/unparseable. Mirrors repairs.py::async_check_stale_ics_token's
    own parsing, kept deliberately simple/duplicated rather than imported -
    diagnostics should never break because a repairs.py internal changed."""
    if not ics_token_created_at:
        return None
    try:
        created_at = datetime.fromisoformat(ics_token_created_at)
    except ValueError:
        return None
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - created_at).days
