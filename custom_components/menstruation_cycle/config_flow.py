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
    CONF_LINKED_PERSON_ENTITY_ID,
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
    CONF_NOTIFICATIONS_ENABLED,
    CONF_NOTIFY_SERVICE,
    CONF_NOTIFY_PERIOD_ENABLED,
    CONF_NOTIFY_PERIOD_LEAD_DAYS,
    CONF_NOTIFY_FERTILE_ENABLED,
    CONF_NOTIFY_FERTILE_LEAD_DAYS,
    CONF_VISIBILITY_LEVEL,
    CONF_TEMPERATURE_UNIT,
    TEMPERATURE_UNITS,
    DEFAULT_TEMPERATURE_UNIT,
    CYCLE_LENGTH_OVERRIDE_MAX,
    CYCLE_LENGTH_OVERRIDE_MIN,
    DEFAULT_DASHBOARD_ENABLED,
    DEFAULT_NOTIFICATIONS_ENABLED,
    DEFAULT_NOTIFY_PERIOD_ENABLED,
    DEFAULT_NOTIFY_PERIOD_LEAD_DAYS,
    DEFAULT_NOTIFY_FERTILE_ENABLED,
    DEFAULT_NOTIFY_FERTILE_LEAD_DAYS,
    NOTIFY_LEAD_DAYS_MAX,
    DEFAULT_NFP_ANALYSIS_MODE,
    DEFAULT_NUM_PREDICTIONS,
    DEFAULT_MENARCHE_AGE_MAX,
    DEFAULT_MENARCHE_AGE_MIN,
    DEFAULT_NAME,
    DEFAULT_ONBOARDING_STAGE,
    DEFAULT_PERIOD_DURATION_DAYS,
    DEFAULT_VISIBILITY_LEVEL,
    DOMAIN,
    NFP_ANALYSIS_MODES,
    ONBOARDING_STAGES,
    SIGNAL_HISTORY_UPDATED,
    STORAGE_KEY,
    STORAGE_KEY_LEGACY,
    MAX_NUM_PREDICTIONS,
    VISIBILITY_LEVELS,
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

    async def async_step_reconfigure(self, user_input: dict | None = None) -> FlowResult:
        """Handle Home Assistant's native "Reconfigure" entry-point.

        HA-Idee 5 (weitere Ideen, 15.09.2026): gives quick access to a
        profile's identity (display name, icon, onboarding stage) straight
        from the integration entry's own context menu, without opening the
        full multi-step options wizard for what's usually a one-field edit
        (e.g. a typo'd display name). Deliberately does NOT expose
        CONF_PROFILE here - that slug is baked into every entity's
        unique_id (see repairs.py::_compute_entity_renames), so changing it
        here would silently orphan every existing entity rather than
        renaming anything, exactly like in async_step_user above. Every
        other cycle-tracking setting (notifications, visibility, life
        stages, ...) stays in the options flow, which this intentionally
        does not duplicate.
        """
        entry = self._get_reconfigure_entry()
        errors: dict[str, str] = {}

        current_friendly_name = str(entry.data.get(CONF_FRIENDLY_NAME, DEFAULT_NAME))
        current_icon = str(entry.data.get(CONF_ICON, ""))
        current_stage = str(
            entry.options.get(CONF_ONBOARDING_STAGE) or entry.data.get(CONF_ONBOARDING_STAGE) or DEFAULT_ONBOARDING_STAGE
        ).strip().lower()
        if current_stage not in ONBOARDING_STAGES:
            current_stage = DEFAULT_ONBOARDING_STAGE

        if user_input is not None:
            friendly_name = str(user_input.get(CONF_FRIENDLY_NAME, DEFAULT_NAME)).strip() or DEFAULT_NAME
            icon = str(user_input.get(CONF_ICON, "")).strip()
            stage_raw = str(user_input.get(CONF_ONBOARDING_STAGE, current_stage)).strip().lower()
            onboarding_stage = stage_raw if stage_raw in ONBOARDING_STAGES else DEFAULT_ONBOARDING_STAGE

            return self.async_update_reload_and_abort(
                entry,
                data={
                    **entry.data,
                    CONF_FRIENDLY_NAME: friendly_name,
                    CONF_ICON: icon,
                    CONF_ONBOARDING_STAGE: onboarding_stage,
                },
                title=friendly_name,
            )

        schema = vol.Schema(
            {
                vol.Required(CONF_FRIENDLY_NAME, default=current_friendly_name): str,
                vol.Optional(CONF_ICON, default=current_icon): str,
                vol.Optional(CONF_ONBOARDING_STAGE, default=current_stage): vol.In(ONBOARDING_STAGES),
            }
        )
        return self.async_show_form(step_id="reconfigure", data_schema=schema, errors=errors)


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
            current_visibility_level: str = str(
                getattr(runtime, "visibility_level", DEFAULT_VISIBILITY_LEVEL) or DEFAULT_VISIBILITY_LEVEL
            )
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
            current_visibility_level = str(stored.get(CONF_VISIBILITY_LEVEL) or DEFAULT_VISIBILITY_LEVEL)

        if current_onboarding_stage not in ONBOARDING_STAGES:
            current_onboarding_stage = DEFAULT_ONBOARDING_STAGE
        if current_visibility_level not in VISIBILITY_LEVELS:
            current_visibility_level = DEFAULT_VISIBILITY_LEVEL

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
            "visibility_level": current_visibility_level,
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
            "notifications_enabled": bool(
                self._entry.options.get(CONF_NOTIFICATIONS_ENABLED, DEFAULT_NOTIFICATIONS_ENABLED)
            ),
            "notify_service": str(self._entry.options.get(CONF_NOTIFY_SERVICE, "") or ""),
            "linked_person_entity_id": str(self._entry.options.get(CONF_LINKED_PERSON_ENTITY_ID, "") or ""),
            # HA-9: per-event notification granularity, see const.py.
            "notify_period_enabled": bool(
                self._entry.options.get(CONF_NOTIFY_PERIOD_ENABLED, DEFAULT_NOTIFY_PERIOD_ENABLED)
            ),
            "notify_period_lead_days": int(
                self._entry.options.get(CONF_NOTIFY_PERIOD_LEAD_DAYS, DEFAULT_NOTIFY_PERIOD_LEAD_DAYS)
            ),
            "notify_fertile_enabled": bool(
                self._entry.options.get(CONF_NOTIFY_FERTILE_ENABLED, DEFAULT_NOTIFY_FERTILE_ENABLED)
            ),
            "notify_fertile_lead_days": int(
                self._entry.options.get(CONF_NOTIFY_FERTILE_LEAD_DAYS, DEFAULT_NOTIFY_FERTILE_LEAD_DAYS)
            ),
            # HA-Idee 1 (weitere Ideen, 15.09.2026): siehe const.py::
            # CONF_TEMPERATURE_UNIT - wie CONF_NOTIFY_SERVICE nur in
            # entry.options gespeichert, kein Runtime-/Storage-Wert noetig.
            "temperature_unit": str(
                self._entry.options.get(CONF_TEMPERATURE_UNIT, DEFAULT_TEMPERATURE_UNIT) or DEFAULT_TEMPERATURE_UNIT
            ),
        }
        if self._current["temperature_unit"] not in TEMPERATURE_UNITS:
            self._current["temperature_unit"] = DEFAULT_TEMPERATURE_UNIT

    async def _async_advance(self) -> FlowResult:
        """Move to the next pending conditional step, or to the final review
        step (HA-1, M-Cycle_HA-Component-Roadmap.md) once none remain -
        _async_finish now only runs once that step is explicitly confirmed."""
        if self._pending_steps:
            next_step = self._pending_steps.pop(0)
            return await getattr(self, f"async_step_{next_step}")()
        return await self.async_step_confirm()

    # ------------------------------------------------------------------
    # Final step: review everything collected, confirm or bail out
    # ------------------------------------------------------------------
    async def async_step_confirm(self, user_input: dict | None = None) -> FlowResult:
        """HA-1 (M-Cycle_HA-Component-Roadmap.md, 15.09.2026): the options
        flow has no "back" button between its conditional steps (see the
        module comment on _CONDITIONAL_STEP_ORDER) - a typo caught only after
        the last step used to mean restarting the entire wizard. This final
        step shows everything collected across every visited step and only
        calls _async_finish once the person explicitly submits it; closing
        the dialog here (HA's native "X") aborts without saving anything,
        exactly like at any other step.
        """
        if user_input is not None:
            return await self._async_finish()

        return self.async_show_form(
            step_id="confirm",
            data_schema=vol.Schema({}),
            description_placeholders={"summary": self._build_confirm_summary()},
        )

    def _build_confirm_summary(self) -> str:
        """Render the values collected so far as a markdown bullet list for
        the review step above. English-only regardless of the active HA
        language - localizing dynamically generated content like this would
        need its own translation table kept in sync with strings.json, which
        felt like scope creep for what is meant to be a quick sanity check
        before saving, not a fully localized summary. Never raises: every
        lookup goes through .get() with a safe fallback, since a step the
        person never visited (e.g. pregnancy details, when pregnancy mode
        wasn't enabled) simply won't have contributed its keys to self._data.
        """
        d = self._data
        lines: list[str] = [
            f"- Name: {d.get(CONF_FRIENDLY_NAME, '')}",
        ]
        if d.get(CONF_BIRTH_DATE):
            lines.append(f"- Birth date: {d.get(CONF_BIRTH_DATE)}")
        lines.append(f"- Period duration: {d.get(CONF_PERIOD_DURATION_DAYS, '?')} day(s)")
        override = d.get(CONF_CYCLE_LENGTH_OVERRIDE)
        lines.append(f"- Cycle length override: {override if override else 'auto'}")
        lines.append(f"- Future predictions: {d.get(CONF_NUM_PREDICTIONS, '?')} cycle(s)")
        lines.append(f"- NFP analysis mode: {d.get(CONF_NFP_ANALYSIS_MODE, '?')}")
        lines.append(f"- Onboarding stage: {d.get(CONF_ONBOARDING_STAGE, '?')}")
        lines.append(f"- Visibility level: {d.get(CONF_VISIBILITY_LEVEL, '?')}")
        lines.append(f"- Basal temperature input unit: {d.get(CONF_TEMPERATURE_UNIT, DEFAULT_TEMPERATURE_UNIT)}")
        lines.append(f"- Cycle Dashboard in sidebar: {'yes' if d.get(CONF_DASHBOARD_ENABLED) else 'no'}")

        if d.get(CONF_NOTIFICATIONS_ENABLED):
            lines.append("- Notifications: enabled")
            period_bit = (
                f"on, {d.get(CONF_NOTIFY_PERIOD_LEAD_DAYS, DEFAULT_NOTIFY_PERIOD_LEAD_DAYS)} day(s) ahead"
                if d.get(CONF_NOTIFY_PERIOD_ENABLED, DEFAULT_NOTIFY_PERIOD_ENABLED)
                else "off"
            )
            fertile_bit = (
                f"on, {d.get(CONF_NOTIFY_FERTILE_LEAD_DAYS, DEFAULT_NOTIFY_FERTILE_LEAD_DAYS)} day(s) ahead"
                if d.get(CONF_NOTIFY_FERTILE_ENABLED, DEFAULT_NOTIFY_FERTILE_ENABLED)
                else "off"
            )
            lines.append(f"  - Period reminder: {period_bit}")
            lines.append(f"  - Fertile window reminder: {fertile_bit}")
            if d.get(CONF_NOTIFY_SERVICE):
                lines.append(f"  - Target: {d.get(CONF_NOTIFY_SERVICE)}")
        else:
            lines.append("- Notifications: disabled")

        if d.get(CONF_LINKED_PERSON_ENTITY_ID):
            lines.append(f"- Linked person: {d.get(CONF_LINKED_PERSON_ENTITY_ID)}")

        life_stages = [
            label
            for key, label in (
                ("_pregnancy_enabled", "pregnancy"),
                ("_pre_menarche_enabled", "pre-menarche"),
                ("_menopause_enabled", "menopause"),
                ("_postpartum_enabled", "postpartum"),
            )
            if d.get(key)
        ]
        lines.append(f"- Life stages enabled: {', '.join(life_stages) if life_stages else 'none'}")

        return "\n".join(lines)

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
                visibility_raw = str(
                    user_input.get(CONF_VISIBILITY_LEVEL, self._current["visibility_level"])
                ).strip().lower()
                self._data[CONF_VISIBILITY_LEVEL] = (
                    visibility_raw if visibility_raw in VISIBILITY_LEVELS else DEFAULT_VISIBILITY_LEVEL
                )
                self._data[CONF_DASHBOARD_ENABLED] = bool(user_input.get(CONF_DASHBOARD_ENABLED, DEFAULT_DASHBOARD_ENABLED))
                self._data[CONF_NOTIFICATIONS_ENABLED] = bool(user_input.get(CONF_NOTIFICATIONS_ENABLED, DEFAULT_NOTIFICATIONS_ENABLED))
                self._data[CONF_NOTIFY_SERVICE] = str(user_input.get(CONF_NOTIFY_SERVICE, "")).strip()
                self._data[CONF_LINKED_PERSON_ENTITY_ID] = str(
                    user_input.get(CONF_LINKED_PERSON_ENTITY_ID, "")
                ).strip()
                self._data[CONF_NOTIFY_PERIOD_ENABLED] = bool(
                    user_input.get(CONF_NOTIFY_PERIOD_ENABLED, DEFAULT_NOTIFY_PERIOD_ENABLED)
                )
                self._data[CONF_NOTIFY_PERIOD_LEAD_DAYS] = max(
                    0, min(NOTIFY_LEAD_DAYS_MAX, int(user_input.get(CONF_NOTIFY_PERIOD_LEAD_DAYS, DEFAULT_NOTIFY_PERIOD_LEAD_DAYS)))
                )
                self._data[CONF_NOTIFY_FERTILE_ENABLED] = bool(
                    user_input.get(CONF_NOTIFY_FERTILE_ENABLED, DEFAULT_NOTIFY_FERTILE_ENABLED)
                )
                self._data[CONF_NOTIFY_FERTILE_LEAD_DAYS] = max(
                    0, min(NOTIFY_LEAD_DAYS_MAX, int(user_input.get(CONF_NOTIFY_FERTILE_LEAD_DAYS, DEFAULT_NOTIFY_FERTILE_LEAD_DAYS)))
                )
                temperature_unit_raw = str(
                    user_input.get(CONF_TEMPERATURE_UNIT, self._current["temperature_unit"])
                ).strip().lower()
                self._data[CONF_TEMPERATURE_UNIT] = (
                    temperature_unit_raw if temperature_unit_raw in TEMPERATURE_UNITS else DEFAULT_TEMPERATURE_UNIT
                )

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
        # EntitySelector(domain="notify") erwartet eine volle Entity-ID
        # ("notify.xxx") als Default - ein zuvor als reiner Servicename ohne
        # Domain gespeicherter Wert (z. B. "mobile_app_pixel", siehe HA-2)
        # wuerde sonst nicht vorausgewaehlt. __init__.py akzeptiert weiterhin
        # beide Formen beim Senden, hier normalisieren wir nur fuer die
        # Vorbelegung des Formularfelds.
        notify_service_default = c["notify_service"]
        if notify_service_default and "." not in notify_service_default:
            notify_service_default = f"notify.{notify_service_default}"
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
                # HA-1 (M-Cycle_HA-Component-Roadmap.md): war bislang nur ueber
                # den Service set_profile_visibility aenderbar, nicht im
                # Options-Flow selbst - inkonsistent zu jeder anderen
                # Einstellung. _async_finish/_async_resolve_current reichen den
                # Wert wie gehabt explizit durch, damit ein Speichern dieses
                # Formulars die Stufe nie unbeabsichtigt zuruecksetzt.
                vol.Optional(CONF_VISIBILITY_LEVEL, default=c["visibility_level"]): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=VISIBILITY_LEVELS,
                        translation_key="visibility_level",
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Optional(CONF_DASHBOARD_ENABLED, default=c["show_dashboard"]): bool,
                vol.Optional(CONF_NOTIFICATIONS_ENABLED, default=c["notifications_enabled"]): bool,
                # HA-2 (M-Cycle_HA-Component-Roadmap.md): war ein reines
                # Freitextfeld - ein Tippfehler im Servicenamen scheiterte damit
                # still. EntitySelector(domain="notify") liefert eine
                # "notify.xxx"-Entity-ID, die das bestehende Splitting in
                # __init__.py::_async_check_and_send_notifications (Split auf
                # den ersten ".") unveraendert weiterverarbeitet.
                vol.Optional(
                    CONF_NOTIFY_SERVICE, default=notify_service_default
                ): selector.EntitySelector(selector.EntitySelectorConfig(domain="notify")),
                vol.Optional(
                    CONF_LINKED_PERSON_ENTITY_ID, default=c["linked_person_entity_id"]
                ): selector.EntitySelector(selector.EntitySelectorConfig(domain="person")),
                # HA-9 (M-Cycle_HA-Component-Roadmap.md): per-event granularity
                # instead of one global on/off switch. CONF_NOTIFICATIONS_ENABLED
                # above remains the master switch for both.
                vol.Optional(
                    CONF_NOTIFY_PERIOD_ENABLED, default=c["notify_period_enabled"]
                ): bool,
                vol.Optional(
                    CONF_NOTIFY_PERIOD_LEAD_DAYS, default=c["notify_period_lead_days"]
                ): vol.All(vol.Coerce(int), vol.Range(min=0, max=NOTIFY_LEAD_DAYS_MAX)),
                vol.Optional(
                    CONF_NOTIFY_FERTILE_ENABLED, default=c["notify_fertile_enabled"]
                ): bool,
                vol.Optional(
                    CONF_NOTIFY_FERTILE_LEAD_DAYS, default=c["notify_fertile_lead_days"]
                ): vol.All(vol.Coerce(int), vol.Range(min=0, max=NOTIFY_LEAD_DAYS_MAX)),
                # HA-Idee 1 (weitere Ideen, 15.09.2026): steuert nur, in
                # welcher Einheit ein basal_temp-Wert beim Service
                # log_symptoms/add_symptom interpretiert wird - Speicherung
                # bleibt durchgaengig Celsius, siehe Kommentar an
                # const.py::CONF_TEMPERATURE_UNIT.
                vol.Optional(CONF_TEMPERATURE_UNIT, default=c["temperature_unit"]): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=TEMPERATURE_UNITS,
                        translation_key="temperature_unit",
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
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
        # HA-1 (M-Cycle_HA-Component-Roadmap.md): jetzt auch aus dem
        # Options-Flow selbst waehlbar, nicht mehr nur ueber den Service
        # set_profile_visibility.
        new_visibility_level = d[CONF_VISIBILITY_LEVEL]
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
            runtime.visibility_level = new_visibility_level

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
                # HA-1: seit 15.09.2026 auch im Options-Flow selbst waehlbar
                # (vorher nur ueber den Service set_profile_visibility, siehe
                # Kommentar an CONF_VISIBILITY_LEVEL in const.py). runtime.
                # visibility_level wurde oben bereits auf new_visibility_level
                # gesetzt - explizit mitschicken, sonst wuerde jedes Speichern
                # dieses Formulars die Stufe unbeabsichtigt auf den Default
                # zuruecksetzen (storage.async_save faellt sonst auf
                # DEFAULT_VISIBILITY_LEVEL zurueck, wenn nichts uebergeben
                # wird).
                visibility_level=new_visibility_level,
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
                # HA-1: gleicher Grund wie im runtime-Zweig oben - der im
                # Options-Flow gewaehlte Wert wird hier direkt mitgeschickt.
                visibility_level=new_visibility_level,
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
                CONF_NOTIFICATIONS_ENABLED: d[CONF_NOTIFICATIONS_ENABLED],
                CONF_NOTIFY_SERVICE: d[CONF_NOTIFY_SERVICE],
                CONF_LINKED_PERSON_ENTITY_ID: d[CONF_LINKED_PERSON_ENTITY_ID],
                CONF_NOTIFY_PERIOD_ENABLED: d[CONF_NOTIFY_PERIOD_ENABLED],
                CONF_NOTIFY_PERIOD_LEAD_DAYS: d[CONF_NOTIFY_PERIOD_LEAD_DAYS],
                CONF_NOTIFY_FERTILE_ENABLED: d[CONF_NOTIFY_FERTILE_ENABLED],
                CONF_NOTIFY_FERTILE_LEAD_DAYS: d[CONF_NOTIFY_FERTILE_LEAD_DAYS],
                CONF_TEMPERATURE_UNIT: d[CONF_TEMPERATURE_UNIT],
            },
        )
