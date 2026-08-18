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

# Order in which conditional steps are shown, when their corresponding
# enable-toggle was checked on the "init" step. A person with several life
# stages toggled on (unusual, but not blocked) sees each relevant step once,
# in this fixed order — not all possible combinations, just this sequence.
_CONDITIONAL_STEP_ORDER = ["pregnancy", "menarche", "menopause", "postpartum"]


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
    field trips voluptuous_serialize's schema-to-form conversion (surfaces to
    the user as "Not a parsable type"). Omitting `default` entirely when
    there's no current value avoids this — voluptuous's own UNDEFINED
    sentinel serializes fine, an explicit None value doesn't.
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
    """Handle options for menstruation gauge, as a short multi-step wizard.

    Step 1 ("init") collects general settings plus four enable-toggles
    (pregnancy / pre-menarche / menopause / postpartum). Only the steps whose
    toggle was checked are then shown, one at a time, each with just the
    handful of fields relevant to that life stage — instead of showing all
    ~20 fields on one page regardless of which apply. A final step saves
    everything that was collected.

    Home Assistant's data_entry_flow doesn't support a "Back" button natively;
    this first version doesn't add one — getting a field wrong on a later step
    means clicking through again from the start (no data is lost from earlier
    steps within the same attempt, since it's held on `self._data` and only
    written to storage at the very end).
    """

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self._entry = config_entry
        # Accumulates validated values across every step; only written to
        # storage/entry once the last relevant step completes successfully.
        self._data: dict = {}
        self._pending_steps: list[str] = []
        self._runtime = None
        self._current: dict = {}

    async def _async_resolve_current(self) -> None:
        """Resolve current runtime/storage values once, cached for every step."""
        if self._current:
            return

        from .storage import MenstruationStorage

        domain_data = self.hass.data.get(DOMAIN, {})
        runtime = domain_data.get(self._entry.entry_id)
        self._runtime = runtime

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

        self._current = {
            "period_duration": current_period_duration,
            "friendly_name": current_friendly_name,
            "icon": current_icon,
            "pregnancy_data": pregnancy_data,
            "menarche_data": menarche_data,
            "menopause_data": menopause_data,
            "noncycle_data": noncycle_data,
            "cycle_length_override": current_cycle_length_override,
            "onboarding_stage": current_onboarding_stage,
            "num_predictions": self._entry.options.get(CONF_NUM_PREDICTIONS, DEFAULT_NUM_PREDICTIONS),
            "nfp_mode": self._entry.options.get(CONF_NFP_ANALYSIS_MODE, DEFAULT_NFP_ANALYSIS_MODE),
            "birth_date": str(self._entry.data.get(CONF_BIRTH_DATE, "") or ""),
            "pregnancy_high_risk": bool(pregnancy_data.get("high_risk", False)),
            "pregnancy_risk_notes": str(pregnancy_data.get("risk_notes", "") or ""),
            "postpartum_start_date": noncycle_data.get("postpartum_start_date") or None,
            "postpartum_duration_days": int(noncycle_data.get("postpartum_duration_days") or 42),
            "show_dashboard": bool(
                self._entry.options.get(
                    CONF_DASHBOARD_ENABLED,
                    self._entry.options.get(CONF_SHOW_CYCLE_DASHBOARD, DEFAULT_DASHBOARD_ENABLED),
                )
            ),
        }

    async def _async_advance(self) -> FlowResult:
        """Move to the next pending conditional step, or finish if none remain."""
        if self._pending_steps:
            next_step = self._pending_steps.pop(0)
            return await getattr(self, f"async_step_{next_step}")()
        return await self._async_finish()

    # ------------------------------------------------------------------
    # Step 1: general settings + enable-toggles
    # ------------------------------------------------------------------
    async def async_step_init(self, user_input: dict | None = None) -> FlowResult:
        """General settings and the four life-stage enable-toggles."""
        await self._async_resolve_current()
        errors: dict[str, str] = {}

        if user_input is not None:
            birth_date_raw = str(user_input.get(CONF_BIRTH_DATE) or "").strip()
            birth_date_parsed = _parse_date_opt(birth_date_raw)
            if birth_date_parsed is _INVALID_DATE_SENTINEL:
                errors[CONF_BIRTH_DATE] = "invalid_date"
            elif birth_date_parsed and birth_date_parsed > date.today().isoformat():
                errors[CONF_BIRTH_DATE] = "invalid_date"

            if not errors:
                self._data[CONF_FRIENDLY_NAME] = str(user_input.get(CONF_FRIENDLY_NAME, DEFAULT_NAME)).strip() or DEFAULT_NAME
                self._data[CONF_ICON] = str(user_input.get(CONF_ICON, "")).strip()
                self._data[CONF_BIRTH_DATE] = birth_date_parsed
                self._data[CONF_PERIOD_DURATION_DAYS] = max(
                    1, min(14, int(user_input.get(CONF_PERIOD_DURATION_DAYS, DEFAULT_PERIOD_DURATION_DAYS)))
                )

                raw_cycle_override = user_input.get(CONF_CYCLE_LENGTH_OVERRIDE, 0)
                try:
                    cycle_override_int = int(raw_cycle_override)
                    self._data[CONF_CYCLE_LENGTH_OVERRIDE] = (
                        cycle_override_int
                        if CYCLE_LENGTH_OVERRIDE_MIN <= cycle_override_int <= CYCLE_LENGTH_OVERRIDE_MAX
                        else None
                    )
                except (TypeError, ValueError):
                    self._data[CONF_CYCLE_LENGTH_OVERRIDE] = None

                self._data[CONF_NUM_PREDICTIONS] = max(
                    1, min(MAX_NUM_PREDICTIONS, int(user_input.get(CONF_NUM_PREDICTIONS, DEFAULT_NUM_PREDICTIONS)))
                )
                self._data[CONF_NFP_ANALYSIS_MODE] = user_input.get(CONF_NFP_ANALYSIS_MODE, DEFAULT_NFP_ANALYSIS_MODE)

                stage_raw = str(user_input.get(CONF_ONBOARDING_STAGE, self._current["onboarding_stage"])).strip().lower()
                self._data[CONF_ONBOARDING_STAGE] = stage_raw if stage_raw in ONBOARDING_STAGES else DEFAULT_ONBOARDING_STAGE
                self._data[CONF_DASHBOARD_ENABLED] = bool(user_input.get(CONF_DASHBOARD_ENABLED, DEFAULT_DASHBOARD_ENABLED))

                self._data["_pregnancy_enabled"] = bool(user_input.get(CONF_PREGNANCY_ENABLED, False))
                self._data["_pre_menarche_enabled"] = bool(user_input.get(CONF_PRE_MENARCHE_ENABLED, False))
                self._data["_menopause_enabled"] = bool(user_input.get(CONF_MENOPAUSE_ENABLED, False))
                self._data["_postpartum_enabled"] = bool(user_input.get(CONF_POSTPARTUM_ENABLED, False))

                self._pending_steps = [
                    step
                    for step, flag in [
                        ("pregnancy", self._data["_pregnancy_enabled"]),
                        ("menarche", self._data["_pre_menarche_enabled"]),
                        ("menopause", self._data["_menopause_enabled"]),
                        ("postpartum", self._data["_postpartum_enabled"]),
                    ]
                    if flag
                ]
                return await self._async_advance()

        c = self._current
        schema = vol.Schema(
            {
                vol.Required(CONF_FRIENDLY_NAME, default=c["friendly_name"]): str,
                vol.Optional(CONF_ICON, default=c["icon"]): str,
                _optional_date_key(CONF_BIRTH_DATE, c["birth_date"] or None): selector.DateSelector(),
                vol.Required(CONF_PERIOD_DURATION_DAYS, default=c["period_duration"]): vol.All(
                    vol.Coerce(int), vol.Range(min=1, max=14)
                ),
                vol.Optional(CONF_CYCLE_LENGTH_OVERRIDE, default=c["cycle_length_override"]): vol.All(
                    vol.Coerce(int), vol.Range(min=0, max=CYCLE_LENGTH_OVERRIDE_MAX)
                ),
                vol.Optional(CONF_NUM_PREDICTIONS, default=c["num_predictions"]): vol.All(
                    vol.Coerce(int), vol.Range(min=1, max=MAX_NUM_PREDICTIONS)
                ),
                vol.Optional(CONF_NFP_ANALYSIS_MODE, default=c["nfp_mode"]): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=NFP_ANALYSIS_MODES,
                        translation_key="nfp_analysis_mode",
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Optional(CONF_ONBOARDING_STAGE, default=c["onboarding_stage"]): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=ONBOARDING_STAGES,
                        translation_key="onboarding_stage",
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Optional(CONF_DASHBOARD_ENABLED, default=c["show_dashboard"]): bool,
                vol.Optional(
                    CONF_PREGNANCY_ENABLED, default=bool(c["pregnancy_data"].get("is_pregnant", False))
                ): bool,
                vol.Optional(
                    CONF_PRE_MENARCHE_ENABLED, default=bool(c["menarche_data"].get("tracking_active", False))
                ): bool,
                vol.Optional(
                    CONF_MENOPAUSE_ENABLED, default=bool(c["menopause_data"].get("is_menopause", False))
                ): bool,
                vol.Optional(CONF_POSTPARTUM_ENABLED, default=bool(c["noncycle_data"].get("is_postpartum", False))): bool,
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema, errors=errors)

    # ------------------------------------------------------------------
    # Step 2 (conditional): pregnancy
    # ------------------------------------------------------------------
    async def async_step_pregnancy(self, user_input: dict | None = None) -> FlowResult:
        """Pregnancy details — only shown when pregnancy was enabled in step 1."""
        errors: dict[str, str] = {}

        if user_input is not None:
            preg_date_raw = str(user_input.get(CONF_PREGNANCY_START_DATE) or "").strip()
            preg_date_parsed = _parse_date_opt(preg_date_raw)
            if preg_date_parsed is _INVALID_DATE_SENTINEL:
                errors[CONF_PREGNANCY_START_DATE] = "invalid_date"

            if not errors:
                new_preg_start = preg_date_parsed
                if not new_preg_start and self._runtime and self._runtime.history:
                    # Auto-populate from the last logged cycle start if not provided.
                    new_preg_start = sorted(self._runtime.history)[-1]
                self._data["_pregnancy_start"] = new_preg_start
                self._data[CONF_PREGNANCY_HIGH_RISK] = bool(user_input.get(CONF_PREGNANCY_HIGH_RISK, False))
                self._data[CONF_PREGNANCY_RISK_NOTES] = str(user_input.get(CONF_PREGNANCY_RISK_NOTES, "")).strip()
                return await self._async_advance()

        pregnancy_data = self._current["pregnancy_data"]
        schema = vol.Schema(
            {
                _optional_date_key(CONF_PREGNANCY_START_DATE, pregnancy_data.get("start_date")): selector.DateSelector(),
                vol.Optional(
                    CONF_PREGNANCY_HIGH_RISK, default=self._current["pregnancy_high_risk"]
                ): bool,
                vol.Optional(CONF_PREGNANCY_RISK_NOTES, default=self._current["pregnancy_risk_notes"]): str,
            }
        )
        return self.async_show_form(step_id="pregnancy", data_schema=schema, errors=errors)

    # ------------------------------------------------------------------
    # Step 3 (conditional): pre-menarche
    # ------------------------------------------------------------------
    async def async_step_menarche(self, user_input: dict | None = None) -> FlowResult:
        """Pre-menarche details — only shown when pre-menarche was enabled in step 1."""
        errors: dict[str, str] = {}

        if user_input is not None:
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
                self._data[CONF_FAMILY_MENARCHE_AGE] = new_family_menarche_age
                return await self._async_advance()

        menarche_data = self._current["menarche_data"]
        schema = vol.Schema(
            {
                vol.Optional(
                    CONF_FAMILY_MENARCHE_AGE,
                    default=str(menarche_data.get("family_menarche_age") or ""),
                ): str,
            }
        )
        return self.async_show_form(step_id="menarche", data_schema=schema, errors=errors)

    # ------------------------------------------------------------------
    # Step 4 (conditional): menopause
    # ------------------------------------------------------------------
    async def async_step_menopause(self, user_input: dict | None = None) -> FlowResult:
        """Menopause details — only shown when menopause was enabled in step 1."""
        errors: dict[str, str] = {}

        if user_input is not None:
            meno_date_raw = str(user_input.get(CONF_MENOPAUSE_START_DATE) or "").strip()
            meno_date_parsed = _parse_date_opt(meno_date_raw)
            if meno_date_parsed is _INVALID_DATE_SENTINEL:
                errors[CONF_MENOPAUSE_START_DATE] = "invalid_date"

            if not errors:
                self._data["_menopause_start"] = meno_date_parsed
                return await self._async_advance()

        menopause_data = self._current["menopause_data"]
        schema = vol.Schema(
            {
                _optional_date_key(CONF_MENOPAUSE_START_DATE, menopause_data.get("start_date")): selector.DateSelector(),
            }
        )
        return self.async_show_form(step_id="menopause", data_schema=schema, errors=errors)

    # ------------------------------------------------------------------
    # Step 5 (conditional): postpartum
    # ------------------------------------------------------------------
    async def async_step_postpartum(self, user_input: dict | None = None) -> FlowResult:
        """Postpartum details — only shown when postpartum was enabled in step 1."""
        errors: dict[str, str] = {}

        if user_input is not None:
            postpartum_date_raw = str(user_input.get(CONF_POSTPARTUM_START_DATE) or "").strip()
            postpartum_date_parsed = _parse_date_opt(postpartum_date_raw)
            if postpartum_date_parsed is _INVALID_DATE_SENTINEL:
                errors[CONF_POSTPARTUM_START_DATE] = "invalid_date"
            elif postpartum_date_parsed and postpartum_date_parsed > date.today().isoformat():
                errors[CONF_POSTPARTUM_START_DATE] = "invalid_date"

            if not errors:
                self._data["_postpartum_start"] = postpartum_date_parsed
                raw_postpartum_duration = user_input.get(
                    CONF_POSTPARTUM_DURATION_DAYS, self._current["postpartum_duration_days"]
                )
                try:
                    self._data[CONF_POSTPARTUM_DURATION_DAYS] = max(1, min(365, int(raw_postpartum_duration)))
                except (TypeError, ValueError):
                    self._data[CONF_POSTPARTUM_DURATION_DAYS] = 42
                return await self._async_advance()

        schema = vol.Schema(
            {
                _optional_date_key(
                    CONF_POSTPARTUM_START_DATE, self._current["postpartum_start_date"]
                ): selector.DateSelector(),
                vol.Optional(
                    CONF_POSTPARTUM_DURATION_DAYS, default=self._current["postpartum_duration_days"]
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=365)),
            }
        )
        return self.async_show_form(step_id="postpartum", data_schema=schema, errors=errors)

    # ------------------------------------------------------------------
    # Final: combine everything collected and save
    # ------------------------------------------------------------------
    async def _async_finish(self) -> FlowResult:
        """Combine everything collected across steps and persist it."""
        from .storage import MenstruationStorage

        d = self._data
        c = self._current
        runtime = self._runtime

        pregnancy_enabled = d.get("_pregnancy_enabled", False)
        new_preg_start = d.get("_pregnancy_start", c["pregnancy_data"].get("start_date"))
        if new_preg_start and "_pregnancy_start" in d:
            pregnancy_enabled = True
        new_pregnancy_data = {
            "is_pregnant": pregnancy_enabled,
            "start_date": new_preg_start,
            "high_risk": d.get(CONF_PREGNANCY_HIGH_RISK, c["pregnancy_high_risk"]),
            "risk_notes": d.get(CONF_PREGNANCY_RISK_NOTES, c["pregnancy_risk_notes"]),
        }

        new_menarche_data = {
            "tracking_active": d.get("_pre_menarche_enabled", False),
            "is_menarche": c["menarche_data"].get("is_menarche", False),
            "menarche_date": c["menarche_data"].get("menarche_date"),
            # Not manually entered — computed dynamically in sensor.py from
            # birth_date + family_menarche_age (mother's age at menarche).
            "estimated_date": None,
            "family_menarche_age": d.get(CONF_FAMILY_MENARCHE_AGE, c["menarche_data"].get("family_menarche_age")),
        }

        new_menopause_data = {
            "is_menopause": d.get("_menopause_enabled", False),
            "start_date": d.get("_menopause_start", c["menopause_data"].get("start_date")),
        }

        postpartum_enabled = d.get("_postpartum_enabled", False)
        new_postpartum_start = d.get("_postpartum_start", c["postpartum_start_date"])
        if new_postpartum_start and "_postpartum_start" in d:
            postpartum_enabled = True
        new_noncycle_data = {
            **c["noncycle_data"],
            "is_postpartum": postpartum_enabled,
            "postpartum_start_date": new_postpartum_start,
            "postpartum_duration_days": d.get(CONF_POSTPARTUM_DURATION_DAYS, c["postpartum_duration_days"]),
        }

        new_friendly_name = d[CONF_FRIENDLY_NAME]
        new_icon = d[CONF_ICON]
        new_period_duration = d[CONF_PERIOD_DURATION_DAYS]
        new_cycle_length_override = d[CONF_CYCLE_LENGTH_OVERRIDE]
        new_onboarding_stage = d[CONF_ONBOARDING_STAGE]
        birth_date_parsed = d[CONF_BIRTH_DATE]

        if runtime is not None:
            runtime.friendly_name = new_friendly_name
            runtime.icon = new_icon
            runtime.period_duration_days = new_period_duration
            runtime.pregnancy_data = new_pregnancy_data
            runtime.menarche_data = new_menarche_data
            runtime.menopause_data = new_menopause_data
            runtime.noncycle_data = new_noncycle_data
            runtime.cycle_length_override = new_cycle_length_override
            runtime.onboarding_stage = new_onboarding_stage

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
                CONF_NUM_PREDICTIONS: d[CONF_NUM_PREDICTIONS],
                CONF_NFP_ANALYSIS_MODE: d[CONF_NFP_ANALYSIS_MODE],
                CONF_ONBOARDING_STAGE: new_onboarding_stage,
                CONF_DASHBOARD_ENABLED: d[CONF_DASHBOARD_ENABLED],
            },
        )
