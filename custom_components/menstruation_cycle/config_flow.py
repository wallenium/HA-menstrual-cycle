"""Config flow for menstruation gauge."""

from __future__ import annotations

from datetime import date

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.util import slugify

from .const import (
    CONF_BIRTH_DATE,
    CONF_FAMILY_MENARCHE_AGE,
    CONF_FRIENDLY_NAME,
    CONF_ICON,
    CONF_MENOPAUSE_ENABLED,
    CONF_MENOPAUSE_START_DATE,
    CONF_NFP_ANALYSIS_MODE,
    CONF_ONBOARDING_STAGE,
    CONF_NUM_PREDICTIONS,
    CONF_PERIOD_DURATION_DAYS,
    CONF_PRE_MENARCHE_ENABLED,
    CONF_PREGNANCY_ENABLED,
    CONF_PREGNANCY_HIGH_RISK,
    CONF_PREGNANCY_RISK_NOTES,
    CONF_POSTPARTUM_ENABLED,
    CONF_POSTPARTUM_START_DATE,
    CONF_POSTPARTUM_DURATION_DAYS,
    CONF_PREGNANCY_START_DATE,
    CONF_PROFILE,
    CONF_CYCLE_LENGTH_OVERRIDE,
    CONF_SHOW_CYCLE_DASHBOARD,
    CONF_DASHBOARD_ENABLED,
    CYCLE_LENGTH_OVERRIDE_MAX,
    CYCLE_LENGTH_OVERRIDE_MIN,
    DEFAULT_DASHBOARD_ENABLED,
    DEFAULT_NFP_ANALYSIS_MODE,
    DEFAULT_NUM_PREDICTIONS,
    DEFAULT_MENARCHE_AGE_MAX,
    DEFAULT_MENARCHE_AGE_MIN,
    DEFAULT_NAME,
    DEFAULT_ONBOARDING_STAGE,
    DEFAULT_PERIOD_DURATION_DAYS,
    DOMAIN,
    NFP_ANALYSIS_MODES,
    ONBOARDING_STAGES,
    SIGNAL_HISTORY_UPDATED,
    STORAGE_KEY,
    STORAGE_KEY_LEGACY,
    MAX_NUM_PREDICTIONS,
)


_INVALID_DATE_SENTINEL = "__invalid__"


def _parse_date_opt(value: str) -> str | None:
    """Return normalized ISO date string, None if empty, or _INVALID_DATE_SENTINEL if malformed."""
    if not value or not value.strip():
        return None
    try:
        return date.fromisoformat(value.strip()).isoformat()
    except ValueError:
        return _INVALID_DATE_SENTINEL


def _optional_date_key(key: str, current_value: str | None):
    """Build a vol.Optional schema key for a DateSelector field.

    Passing a literal Python None as `default=` for a selector.DateSelector()
    field appears to trip voluptuous_serialize's schema-to-form conversion
    (surfaces to the user as "Not a parsable type", on every date field at
    once, regardless of which one is actually empty). Omitting `default`
    entirely when there's no current value avoids this — voluptuous's own
    UNDEFINED sentinel serializes fine, an explicit None value doesn't.
    """
    if current_value:
        return vol.Optional(key, default=current_value)
    return vol.Optional(key)


class MenstruationGaugeConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for menstruation gauge."""

    VERSION = 2

    @staticmethod
    @config_entries.callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> MenstruationGaugeOptionsFlow:
        """Create the options flow."""
        return MenstruationGaugeOptionsFlow(config_entry)

    async def async_step_user(self, user_input: dict | None = None) -> FlowResult:
        """Handle first step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            profile = slugify(str(user_input[CONF_PROFILE])).strip("_")
            if not profile:
                errors[CONF_PROFILE] = "invalid_profile"
            else:
                await self.async_set_unique_id(profile)
                self._abort_if_unique_id_configured()
                friendly_name = str(user_input[CONF_FRIENDLY_NAME]).strip() or DEFAULT_NAME
                icon = str(user_input.get(CONF_ICON, "")).strip()
                selected_stage = str(user_input.get(CONF_ONBOARDING_STAGE, DEFAULT_ONBOARDING_STAGE)).strip().lower()
                onboarding_stage = selected_stage if selected_stage in ONBOARDING_STAGES else DEFAULT_ONBOARDING_STAGE
                data = {
                    CONF_PROFILE: profile,
                    CONF_FRIENDLY_NAME: friendly_name,
                    CONF_ICON: icon,
                    CONF_ONBOARDING_STAGE: onboarding_stage,
                }
                return self.async_create_entry(
                    title=friendly_name,
                    data=data,
                )

        schema = vol.Schema(
            {
                vol.Required(CONF_PROFILE): str,
                vol.Required(CONF_FRIENDLY_NAME, default=DEFAULT_NAME): str,
                vol.Optional(CONF_ICON, default=""): str,
                vol.Optional(CONF_ONBOARDING_STAGE, default=DEFAULT_ONBOARDING_STAGE): vol.In(ONBOARDING_STAGES),
            }
        )
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    async def async_step_import(self, import_data: dict) -> FlowResult:
        """Handle import from old menstruation_gauge domain.

        This is called automatically when migrating config entries from the old
        ``menstruation_gauge`` domain to ``menstruation_cycle``.
        """
        # Resolve the profile identifier from the imported data.
        # Entries created by config-flow version 2 already have CONF_PROFILE;
        # older version-1 entries stored the display name under CONF_NAME.
        profile = str(import_data.get(CONF_PROFILE, "")).strip()
        if not profile:
            old_name = str(import_data.get("name", DEFAULT_NAME)).strip() or DEFAULT_NAME
            profile = slugify(old_name).strip("_") or "default"

        friendly_name = str(import_data.get(CONF_FRIENDLY_NAME, DEFAULT_NAME)).strip() or DEFAULT_NAME
        icon = str(import_data.get(CONF_ICON, "")).strip()
        import_stage = str(import_data.get(CONF_ONBOARDING_STAGE, DEFAULT_ONBOARDING_STAGE)).strip().lower()
        onboarding_stage = import_stage if import_stage in ONBOARDING_STAGES else DEFAULT_ONBOARDING_STAGE

        # Use the original unique_id when available so that entity IDs are preserved.
        unique_id = str(import_data.get("unique_id", profile)).strip() or profile
        await self.async_set_unique_id(unique_id)
        self._abort_if_unique_id_configured()

        return self.async_create_entry(
            title=friendly_name,
            data={
                CONF_PROFILE: profile,
                CONF_FRIENDLY_NAME: friendly_name,
                CONF_ICON: icon,
                CONF_ONBOARDING_STAGE: onboarding_stage,
            },
        )


class MenstruationGaugeOptionsFlow(config_entries.OptionsFlow):
    """Handle options for menstruation gauge."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self._entry = config_entry

    async def async_step_init(self, user_input: dict | None = None) -> FlowResult:
        """Manage the options."""
        from .storage import MenstruationStorage

        errors: dict[str, str] = {}

        # Resolve current runtime (may be absent during a reload)
        domain_data = self.hass.data.get(DOMAIN, {})
        runtime = domain_data.get(self._entry.entry_id)

        if runtime is not None:
            current_period_duration: int = runtime.period_duration_days
            current_friendly_name: str = runtime.friendly_name
            current_icon: str = runtime.icon
            pregnancy_data: dict = runtime.pregnancy_data
            menarche_data: dict = runtime.menarche_data
            menopause_data: dict = runtime.menopause_data
            noncycle_data: dict = runtime.noncycle_data
            current_cycle_length_override: int = runtime.cycle_length_override or 0
            current_onboarding_stage: str = str(getattr(runtime, "onboarding_stage", DEFAULT_ONBOARDING_STAGE))
        else:
            # Fallback: load from storage when runtime is not yet available
            profile = slugify(str(self._entry.data.get(CONF_PROFILE, ""))).strip("_") or "default"
            storage = MenstruationStorage(
                self.hass,
                key=f"{STORAGE_KEY}.{profile}",
                legacy_key=f"{STORAGE_KEY_LEGACY}.{profile}",
            )
            stored = await storage.async_load()
            current_period_duration = stored.get("period_duration_days", DEFAULT_PERIOD_DURATION_DAYS)
            current_friendly_name = str(self._entry.data.get(CONF_FRIENDLY_NAME, DEFAULT_NAME))
            current_icon = str(self._entry.data.get(CONF_ICON, ""))
            pregnancy_data = stored.get("pregnancy_data", {"is_pregnant": False, "start_date": None})
            menarche_data = stored.get(
                "menarche_data",
                {
                    "tracking_active": False,
                    "is_menarche": False,
                    "menarche_date": None,
                    "estimated_date": None,
                    "family_menarche_age": None,
                },
            )
            menopause_data = stored.get("menopause_data", {"is_menopause": False, "start_date": None})
            noncycle_data = stored.get("noncycle_data") or {
                "has_noncycle": False, "doctor_report_exported": False,
                "is_postpartum": False, "postpartum_start_date": None, "postpartum_duration_days": 42,
            }
            current_cycle_length_override = stored.get("cycle_length_override") or 0
            current_onboarding_stage = str(stored.get(CONF_ONBOARDING_STAGE, DEFAULT_ONBOARDING_STAGE))
        if current_onboarding_stage not in ONBOARDING_STAGES:
            current_onboarding_stage = DEFAULT_ONBOARDING_STAGE
        current_num_predictions = self._entry.options.get(CONF_NUM_PREDICTIONS, DEFAULT_NUM_PREDICTIONS)
        current_nfp_mode = self._entry.options.get(CONF_NFP_ANALYSIS_MODE, DEFAULT_NFP_ANALYSIS_MODE)
        current_birth_date = str(self._entry.data.get(CONF_BIRTH_DATE, "") or "")
        current_pregnancy_high_risk = bool(pregnancy_data.get("high_risk", False))
        current_pregnancy_risk_notes = str(pregnancy_data.get("risk_notes", "") or "")
        current_postpartum_enabled = bool(noncycle_data.get("is_postpartum", False))
        current_postpartum_start_date = noncycle_data.get("postpartum_start_date") or None
        current_postpartum_duration_days = int(noncycle_data.get("postpartum_duration_days") or 42)
        current_show_dashboard = bool(
            self._entry.options.get(
                CONF_DASHBOARD_ENABLED,
                self._entry.options.get(CONF_SHOW_CYCLE_DASHBOARD, DEFAULT_DASHBOARD_ENABLED),
            )
        )

        if user_input is not None:
            # Validate optional date fields
            preg_date_raw = str(user_input.get(CONF_PREGNANCY_START_DATE) or "").strip()
            meno_date_raw = str(user_input.get(CONF_MENOPAUSE_START_DATE) or "").strip()
            birth_date_raw = str(user_input.get(CONF_BIRTH_DATE) or "").strip()
            postpartum_date_raw = str(user_input.get(CONF_POSTPARTUM_START_DATE) or "").strip()

            preg_date_parsed = _parse_date_opt(preg_date_raw)
            meno_date_parsed = _parse_date_opt(meno_date_raw)
            birth_date_parsed = _parse_date_opt(birth_date_raw)
            postpartum_date_parsed = _parse_date_opt(postpartum_date_raw)

            if preg_date_parsed is _INVALID_DATE_SENTINEL:
                errors[CONF_PREGNANCY_START_DATE] = "invalid_date"
            if meno_date_parsed is _INVALID_DATE_SENTINEL:
                errors[CONF_MENOPAUSE_START_DATE] = "invalid_date"
            if birth_date_parsed is _INVALID_DATE_SENTINEL:
                errors[CONF_BIRTH_DATE] = "invalid_date"
            elif birth_date_parsed and birth_date_parsed > date.today().isoformat():
                errors[CONF_BIRTH_DATE] = "invalid_date"
            if postpartum_date_parsed is _INVALID_DATE_SENTINEL:
                errors[CONF_POSTPARTUM_START_DATE] = "invalid_date"
            elif postpartum_date_parsed and postpartum_date_parsed > date.today().isoformat():
                errors[CONF_POSTPARTUM_START_DATE] = "invalid_date"

            # Validate family menarche age
            family_age_raw = str(user_input.get(CONF_FAMILY_MENARCHE_AGE, "")).strip()
            new_family_menarche_age: int | None = None
            if family_age_raw:
                try:
                    new_family_menarche_age = int(family_age_raw)
                    if not (DEFAULT_MENARCHE_AGE_MIN <= new_family_menarche_age <= DEFAULT_MENARCHE_AGE_MAX):
                        errors[CONF_FAMILY_MENARCHE_AGE] = "invalid_menarche_age"
                        new_family_menarche_age = None
                except ValueError:
                    errors[CONF_FAMILY_MENARCHE_AGE] = "invalid_menarche_age"

            if not errors:
                new_friendly_name = str(user_input.get(CONF_FRIENDLY_NAME, DEFAULT_NAME)).strip() or DEFAULT_NAME
                new_icon = str(user_input.get(CONF_ICON, "")).strip()
                new_period_duration = max(1, min(14, int(user_input.get(CONF_PERIOD_DURATION_DAYS, DEFAULT_PERIOD_DURATION_DAYS))))
                pregnancy_enabled = bool(user_input.get(CONF_PREGNANCY_ENABLED, False))
                pre_menarche_enabled = bool(user_input.get(CONF_PRE_MENARCHE_ENABLED, False))
                menopause_enabled = bool(user_input.get(CONF_MENOPAUSE_ENABLED, False))
                new_num_predictions = max(
                    1,
                    min(
                        MAX_NUM_PREDICTIONS,
                        int(user_input.get(CONF_NUM_PREDICTIONS, DEFAULT_NUM_PREDICTIONS)),
                    ),
                )
                stage_raw = str(user_input.get(CONF_ONBOARDING_STAGE, current_onboarding_stage)).strip().lower()
                new_onboarding_stage = stage_raw if stage_raw in ONBOARDING_STAGES else DEFAULT_ONBOARDING_STAGE

                # Parse cycle length override (0 = auto/disabled, 20-38 = override)
                raw_cycle_override = user_input.get(CONF_CYCLE_LENGTH_OVERRIDE, 0)
                try:
                    cycle_override_int = int(raw_cycle_override)
                    new_cycle_length_override: int | None = cycle_override_int if CYCLE_LENGTH_OVERRIDE_MIN <= cycle_override_int <= CYCLE_LENGTH_OVERRIDE_MAX else None
                except (TypeError, ValueError):
                    new_cycle_length_override = None

                # Auto-populate pregnancy start date from last cycle if not provided
                new_preg_start: str | None = preg_date_parsed if preg_date_parsed is not _INVALID_DATE_SENTINEL else None
                if new_preg_start:
                    pregnancy_enabled = True
                if pregnancy_enabled and not new_preg_start and runtime and runtime.history:
                    new_preg_start = sorted(runtime.history)[-1]

                new_pregnancy_data = {
                    "is_pregnant": pregnancy_enabled,
                    "start_date": new_preg_start,
                    "high_risk": bool(user_input.get(CONF_PREGNANCY_HIGH_RISK, False)),
                    "risk_notes": str(user_input.get(CONF_PREGNANCY_RISK_NOTES, "")).strip(),
                }
                new_menarche_data = {
                    "tracking_active": pre_menarche_enabled,
                    "is_menarche": menarche_data.get("is_menarche", False),
                    "menarche_date": menarche_data.get("menarche_date"),
                    # No longer manually entered — computed dynamically in sensor.py
                    # from birth_date + family_menarche_age (mother's age at menarche).
                    "estimated_date": None,
                    "family_menarche_age": new_family_menarche_age,
                }
                new_menopause_data = {
                    "is_menopause": menopause_enabled,
                    "start_date": meno_date_parsed if meno_date_parsed is not _INVALID_DATE_SENTINEL else None,
                }

                postpartum_enabled = bool(user_input.get(CONF_POSTPARTUM_ENABLED, False))
                new_postpartum_start = postpartum_date_parsed if postpartum_date_parsed is not _INVALID_DATE_SENTINEL else None
                if new_postpartum_start:
                    postpartum_enabled = True
                raw_postpartum_duration = user_input.get(CONF_POSTPARTUM_DURATION_DAYS, current_postpartum_duration_days)
                try:
                    new_postpartum_duration = max(1, min(365, int(raw_postpartum_duration)))
                except (TypeError, ValueError):
                    new_postpartum_duration = 42
                new_noncycle_data = {
                    **noncycle_data,
                    "is_postpartum": postpartum_enabled,
                    "postpartum_start_date": new_postpartum_start,
                    "postpartum_duration_days": new_postpartum_duration,
                }

                if runtime is not None:
                    # Update in-memory runtime
                    runtime.friendly_name = new_friendly_name
                    runtime.icon = new_icon
                    runtime.period_duration_days = new_period_duration
                    runtime.pregnancy_data = new_pregnancy_data
                    runtime.menarche_data = new_menarche_data
                    runtime.menopause_data = new_menopause_data
                    runtime.noncycle_data = new_noncycle_data
                    runtime.cycle_length_override = new_cycle_length_override
                    runtime.onboarding_stage = new_onboarding_stage

                    # Persist to storage
                    await runtime.storage.async_save(
                        runtime.history,
                        runtime.period_duration_days,
                        runtime.symptom_history,
                        runtime.product_usage,
                        runtime.pregnancy_data,
                        runtime.menarche_data,
                        runtime.pre_menarche_data,
                        runtime.menopause_data,
                        runtime.noncycle_data,
                        cycle_length_override=new_cycle_length_override,
                        onboarding_stage=new_onboarding_stage,
                    )
                    async_dispatcher_send(self.hass, SIGNAL_HISTORY_UPDATED)
                else:
                    # Runtime unavailable – save directly to storage
                    profile = slugify(str(self._entry.data.get(CONF_PROFILE, ""))).strip("_") or "default"
                    fallback_storage = MenstruationStorage(
                        self.hass,
                        key=f"{STORAGE_KEY}.{profile}",
                        legacy_key=f"{STORAGE_KEY_LEGACY}.{profile}",
                    )
                    stored_full = await fallback_storage.async_load()
                    await fallback_storage.async_save(
                        stored_full["history"],
                        new_period_duration,
                        stored_full.get("symptom_history", []),
                        stored_full.get("product_usage", []),
                        new_pregnancy_data,
                        new_menarche_data,
                        stored_full.get("pre_menarche_data"),
                        new_menopause_data,
                        new_noncycle_data,
                        cycle_length_override=new_cycle_length_override,
                        onboarding_stage=new_onboarding_stage,
                    )

                # Keep entry.data in sync for basic info fields
                self.hass.config_entries.async_update_entry(
                    self._entry,
                    data={
                        **self._entry.data,
                        CONF_FRIENDLY_NAME: new_friendly_name,
                        CONF_ICON: new_icon,
                        CONF_ONBOARDING_STAGE: new_onboarding_stage,
                        CONF_BIRTH_DATE: birth_date_parsed or None,
                    },
                    title=new_friendly_name,
                )

                return self.async_create_entry(
                    title="",
                    data={
                        **self._entry.options,
                        CONF_NUM_PREDICTIONS: new_num_predictions,
                        CONF_NFP_ANALYSIS_MODE: user_input.get(CONF_NFP_ANALYSIS_MODE, DEFAULT_NFP_ANALYSIS_MODE),
                        CONF_ONBOARDING_STAGE: new_onboarding_stage,
                        CONF_DASHBOARD_ENABLED: bool(user_input.get(CONF_DASHBOARD_ENABLED, DEFAULT_DASHBOARD_ENABLED)),
                    },
                )

        # Build schema pre-filled with current values
        schema = vol.Schema(
            {
                vol.Required(CONF_FRIENDLY_NAME, default=current_friendly_name): str,
                vol.Optional(CONF_ICON, default=current_icon): str,
                _optional_date_key(CONF_BIRTH_DATE, current_birth_date or None): selector.DateSelector(),
                vol.Required(
                    CONF_PERIOD_DURATION_DAYS,
                    default=current_period_duration,
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=14)),
                vol.Optional(
                    CONF_PREGNANCY_ENABLED,
                    default=bool(pregnancy_data.get("is_pregnant", False)),
                ): bool,
                _optional_date_key(CONF_PREGNANCY_START_DATE, pregnancy_data.get("start_date")): selector.DateSelector(),
                vol.Optional(
                    CONF_PREGNANCY_HIGH_RISK,
                    default=current_pregnancy_high_risk,
                ): bool,
                vol.Optional(
                    CONF_PREGNANCY_RISK_NOTES,
                    default=current_pregnancy_risk_notes,
                ): str,
                vol.Optional(
                    CONF_PRE_MENARCHE_ENABLED,
                    default=bool(menarche_data.get("tracking_active", False)),
                ): bool,
                vol.Optional(
                    CONF_FAMILY_MENARCHE_AGE,
                    default=str(menarche_data.get("family_menarche_age") or ""),
                ): str,
                vol.Optional(
                    CONF_MENOPAUSE_ENABLED,
                    default=bool(menopause_data.get("is_menopause", False)),
                ): bool,
                _optional_date_key(CONF_MENOPAUSE_START_DATE, menopause_data.get("start_date")): selector.DateSelector(),
                vol.Optional(
                    CONF_POSTPARTUM_ENABLED,
                    default=current_postpartum_enabled,
                ): bool,
                _optional_date_key(CONF_POSTPARTUM_START_DATE, current_postpartum_start_date): selector.DateSelector(),
                vol.Optional(
                    CONF_POSTPARTUM_DURATION_DAYS,
                    default=current_postpartum_duration_days,
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=365)),
                vol.Optional(
                    CONF_CYCLE_LENGTH_OVERRIDE,
                    default=current_cycle_length_override,
                ): vol.All(vol.Coerce(int), vol.Range(min=0, max=CYCLE_LENGTH_OVERRIDE_MAX)),
                vol.Optional(
                    CONF_NUM_PREDICTIONS,
                    default=current_num_predictions,
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=MAX_NUM_PREDICTIONS)),
                vol.Optional(
                    CONF_NFP_ANALYSIS_MODE,
                    default=current_nfp_mode,
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=NFP_ANALYSIS_MODES,
                        translation_key="nfp_analysis_mode",
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Optional(
                    CONF_ONBOARDING_STAGE,
                    default=current_onboarding_stage,
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=ONBOARDING_STAGES,
                        translation_key="onboarding_stage",
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Optional(
                    CONF_DASHBOARD_ENABLED,
                    default=current_show_dashboard,
                ): bool,
            }
        )

        return self.async_show_form(step_id="init", data_schema=schema, errors=errors)
