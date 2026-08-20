"""Diagnostics support for menstruation_cycle.

Provides the data behind Home Assistant's "Download diagnostics" button
(Settings -> Devices & Services -> Menstruation Cycle -> ... menu). This is
meant to help with bug reports without requiring someone to manually dig
through logs or describe their setup from memory.

DELIBERATELY CONSERVATIVE ABOUT WHAT'S INCLUDED: this integration handles
sensitive personal health data (cycle history, symptoms, pregnancy/menopause/
postpartum status, contraception method). A diagnostics dump can end up
attached to a public GitHub issue, so nothing here is a real date, a name, a
free-text note, or any other value that could identify someone or reveal
specifics about their health. Only structural information is included:
- counts (how many symptom entries, how many cycles tracked — not their
  content or dates)
- boolean feature flags (which life-stage mode is active — not its details)
- non-personal settings (prediction count, NFP mode, dashboard toggle, etc.)

If a future contributor is tempted to add a field here "because it's useful
for debugging", the bar is: could this value, on its own or combined with
others already here, identify a person or reveal something about their
health that they didn't already choose to make public? If yes, it doesn't
belong in a diagnostics dump — reproduce the bug with synthetic data instead,
or ask the reporter to paste the specific (redacted) value themselves.
"""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    CONF_DASHBOARD_ENABLED,
    CONF_NFP_ANALYSIS_MODE,
    CONF_NOTIFICATIONS_ENABLED,
    CONF_NUM_PREDICTIONS,
    CONF_ONBOARDING_STAGE,
    DEFAULT_DASHBOARD_ENABLED,
    DEFAULT_NFP_ANALYSIS_MODE,
    DEFAULT_NOTIFICATIONS_ENABLED,
    DEFAULT_NUM_PREDICTIONS,
    DEFAULT_ONBOARDING_STAGE,
    DOMAIN,
)


def _profile_diagnostics(runtime: Any) -> dict[str, Any]:
    """Structural-only summary of one profile's runtime state — counts and
    booleans, never actual dates, names, or content."""
    return {
        # Counts, not content.
        "cycle_starts_tracked": len(runtime.history or []),
        "symptom_entries_tracked": len(runtime.symptom_history or []),
        "product_usage_entries_tracked": len(runtime.product_usage or []),
        "period_duration_days": runtime.period_duration_days,
        "cycle_length_override_set": runtime.cycle_length_override is not None,
        "onboarding_stage": runtime.onboarding_stage,
        # Feature flags only — which mode is active, not its details (no
        # dates, no due date, no menarche estimate, etc.).
        "pregnancy_mode_active": bool((runtime.pregnancy_data or {}).get("is_pregnant")),
        "pregnancy_high_risk_flag_set": bool((runtime.pregnancy_data or {}).get("high_risk")),
        "menarche_tracking_active": bool((runtime.menarche_data or {}).get("tracking_active")),
        "menopause_mode_active": bool((runtime.menopause_data or {}).get("is_menopause")),
        "postpartum_mode_active": bool((runtime.noncycle_data or {}).get("is_postpartum")),
        "basal_temp_stats_backfilled": bool((runtime.noncycle_data or {}).get("basal_temp_stats_backfilled")),
        "doctor_report_exported": bool((runtime.noncycle_data or {}).get("doctor_report_exported")),
    }


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    """Return diagnostics for a single profile's config entry."""
    runtime = hass.data.get(DOMAIN, {}).get(entry.entry_id)

    options = entry.options
    diagnostics: dict[str, Any] = {
        "config_entry": {
            # entry_id/title/unique_id intentionally omitted — the title is
            # typically the person's chosen display name.
            "options": {
                CONF_NUM_PREDICTIONS: options.get(CONF_NUM_PREDICTIONS, DEFAULT_NUM_PREDICTIONS),
                CONF_NFP_ANALYSIS_MODE: options.get(CONF_NFP_ANALYSIS_MODE, DEFAULT_NFP_ANALYSIS_MODE),
                CONF_ONBOARDING_STAGE: options.get(CONF_ONBOARDING_STAGE, DEFAULT_ONBOARDING_STAGE),
                CONF_DASHBOARD_ENABLED: options.get(CONF_DASHBOARD_ENABLED, DEFAULT_DASHBOARD_ENABLED),
                # Whether notifications are turned on, not the notify target
                # itself (which could reveal a specific phone/person).
                CONF_NOTIFICATIONS_ENABLED: options.get(CONF_NOTIFICATIONS_ENABLED, DEFAULT_NOTIFICATIONS_ENABLED),
            },
        },
        "runtime_loaded": runtime is not None,
    }
    if runtime is not None:
        diagnostics["profile"] = _profile_diagnostics(runtime)

    return diagnostics


async def async_get_device_diagnostics(hass: HomeAssistant, entry: ConfigEntry, device) -> dict[str, Any]:  # noqa: ANN001
    """Device-level diagnostics — same content as the config entry, since
    each profile maps to exactly one device."""
    return await async_get_config_entry_diagnostics(hass, entry)
