"""Repair handlers for menstruation_cycle integration."""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
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

from .const import (
    CHECKUP_APPOINTMENT_TYPES,
    CHECKUP_OVERDUE_DAYS,
    CYCLE_PATTERN_IRREGULARITY_THRESHOLD_DAYS,
    CYCLE_PATTERN_PAIN_DAYS_THRESHOLD,
    HOSPITAL_BAG_REMINDER_DAYS_BEFORE_DUE,
    ICS_TOKEN_STALE_DAYS,
    PERIOD_OVERDUE_DAYS,
    PERIOD_PROLONGED_DAYS,
    PROFILE_INACTIVITY_REMINDER_DAYS,
    SYMPTOM_APPOINTMENTS,
    WELLNESS_SCORE_LOW_THRESHOLD,
    menstruation_object_ids_for_profile,
)

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


def async_create_low_prediction_confidence_issue(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    valid_cycles: int,
    min_valid_cycles: int,
) -> None:
    """Create a repair issue flagging that this profile's predictions are
    still in the low-confidence learning phase (HA-3, M-Cycle_HA-Component-
    Roadmap.md, "Repair-Issue bei niedriger Vorhersage-Konfidenz").

    Purely informational (not fixable) - there is no action to apply here,
    only "log more cycles over time", the same explanation the companion
    App's own learningPhaseBanner already gives on its side. This makes that
    same "still learning" state - so far only visible in the App or in the
    ATTR_PREDICTION_GATING sensor attribute - show up in HA's own Repairs UI
    too, for anyone who only interacts with this integration through Home
    Assistant itself.
    """
    async_create_issue(
        hass,
        DOMAIN,
        f"low_prediction_confidence_{entry_id}",
        issue_domain=DOMAIN,
        is_fixable=False,
        severity=IssueSeverity.WARNING,
        translation_key="low_prediction_confidence",
        translation_placeholders={
            "entry_title": entry_title,
            "valid_cycles": str(valid_cycles),
            "min_valid_cycles": str(min_valid_cycles),
        },
    )


def async_delete_low_prediction_confidence_issue(hass: HomeAssistant, entry_id: str) -> None:
    """Delete the low-prediction-confidence repair issue (once enough cycles
    have been logged, or if the profile/entry is being removed)."""
    async_delete_issue(hass, DOMAIN, f"low_prediction_confidence_{entry_id}")


def async_check_low_prediction_confidence(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    prediction_gating: dict[str, Any] | None,
) -> None:
    """Raise (or clear) the low-prediction-confidence issue based on a
    freshly computed CycleModel.prediction_gating (see
    model.py::_build_prediction_gating).

    Safe to call repeatedly - create/delete are both idempotent no-ops when
    the issue's state already matches, same as async_check_stale_ics_token
    above.

    A missing/empty "thresholds" sub-dict means this profile is currently in
    a life-stage mode where _build_prediction_gating never even ran
    (pregnancy/pre-menarche/postpartum/menopause - those set
    prediction_gating={"precision_allowed": False, ...} directly, with a
    "reason" key instead of "thresholds", see model.py). "Log more cycles"
    would be misleading advice there, so that's treated as nothing to flag,
    not as a stuck low-confidence state.
    """
    gating = prediction_gating or {}
    thresholds = gating.get("thresholds") or {}
    min_valid_cycles = thresholds.get("min_valid_cycles")

    if gating.get("precision_allowed") or min_valid_cycles is None:
        async_delete_low_prediction_confidence_issue(hass, entry_id)
        return

    valid_cycles = int(gating.get("valid_cycles") or 0)
    async_create_low_prediction_confidence_issue(
        hass, entry_id, entry_title, valid_cycles, int(min_valid_cycles)
    )


def async_create_hospital_bag_incomplete_issue(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    due_date: str,
    days_until_due: int,
    remaining_items: int,
) -> None:
    """Create a repair issue flagging that the hospital-bag checklist
    (todo.py, "Klinik-Tasche/Geburtsplan-Checkliste", 23.09.2026) still has
    unchecked items as the due date approaches ("weitere Ideen", 24.09.2026).

    Purely informational (not fixable), same reasoning as
    async_create_low_prediction_confidence_issue above - there is no action
    to *apply* here, only "go check items off the todo list yourself", so
    this just surfaces that nudge in HA's own Repairs UI rather than relying
    on the user to remember to open the list unprompted.
    """
    async_create_issue(
        hass,
        DOMAIN,
        f"hospital_bag_incomplete_{entry_id}",
        issue_domain=DOMAIN,
        is_fixable=False,
        severity=IssueSeverity.WARNING,
        translation_key="hospital_bag_incomplete",
        translation_placeholders={
            "entry_title": entry_title,
            "due_date": due_date,
            "days_until_due": str(days_until_due),
            "remaining_items": str(remaining_items),
        },
    )


def async_delete_hospital_bag_incomplete_issue(hass: HomeAssistant, entry_id: str) -> None:
    """Delete the hospital-bag-incomplete repair issue (once the list is
    fully checked off, the pregnancy ends, or the profile/entry is being
    removed)."""
    async_delete_issue(hass, DOMAIN, f"hospital_bag_incomplete_{entry_id}")


def async_check_hospital_bag_incomplete(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    is_pregnant: bool,
    due_date: str | None,
    hospital_bag_items: list[dict[str, Any]] | None,
) -> None:
    """Raise (or clear) the hospital-bag-incomplete issue based on the
    pregnancy's due date and the checklist's current completion state.

    Safe to call repeatedly - idempotent create/delete, same pattern as the
    other checks in this module. Deliberately does nothing (clears the
    issue) outside of an active pregnancy, before the reminder window (more
    than HOSPITAL_BAG_REMINDER_DAYS_BEFORE_DUE days out), without a known
    due date yet, or once every item is checked off - only the narrow
    "getting close and still not done" window raises it. Uses date.today()
    (local time), matching model.py's own due-date/pregnancy-week
    calculations, not a UTC "now" - the same distinction that mattered for
    the timezone bug class fixed elsewhere in this integration.
    """
    if not is_pregnant or not due_date:
        async_delete_hospital_bag_incomplete_issue(hass, entry_id)
        return

    try:
        due = date.fromisoformat(due_date)
    except ValueError:
        async_delete_hospital_bag_incomplete_issue(hass, entry_id)
        return

    days_until_due = (due - date.today()).days
    if days_until_due > HOSPITAL_BAG_REMINDER_DAYS_BEFORE_DUE:
        async_delete_hospital_bag_incomplete_issue(hass, entry_id)
        return

    remaining_items = sum(
        1 for item in (hospital_bag_items or []) if item.get("status") != "completed"
    )
    if remaining_items == 0:
        async_delete_hospital_bag_incomplete_issue(hass, entry_id)
        return

    async_create_hospital_bag_incomplete_issue(
        hass, entry_id, entry_title, due_date, max(days_until_due, 0), remaining_items
    )


def async_create_storage_integrity_issue(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    issue_count: int,
    first_issue: str,
) -> None:
    """Create a repair issue flagging that repair_storage found stored-data
    inconsistencies for this profile ("weitere Ideen?", 25.09.2026).

    Purely informational (not fixable), same reasoning as the low-
    prediction-confidence and hospital-bag issues above - there is no
    automatic action to *apply* here (the underlying findings range from
    "harmless, already self-corrected by normalization" to "call
    export_full_backup and look closer yourself"), so this only surfaces
    the nudge in HA's own Repairs UI instead of relying on someone to run
    the repair_storage service unprompted.
    """
    async_create_issue(
        hass,
        DOMAIN,
        f"storage_integrity_{entry_id}",
        issue_domain=DOMAIN,
        is_fixable=False,
        severity=IssueSeverity.WARNING,
        translation_key="storage_integrity",
        translation_placeholders={
            "entry_title": entry_title,
            "issue_count": str(issue_count),
            "first_issue": first_issue,
        },
    )


def async_delete_storage_integrity_issue(hass: HomeAssistant, entry_id: str) -> None:
    """Delete the storage-integrity repair issue (once repair_storage no
    longer finds anything for this profile, or the entry is being
    removed)."""
    async_delete_issue(hass, DOMAIN, f"storage_integrity_{entry_id}")


def async_check_storage_integrity(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    issues: list[str],
) -> None:
    """Raise (or clear) the storage-integrity issue based on findings
    already computed by __init__.py::_async_diagnose_profile_storage - the
    same detection logic the repair_storage service exposes on demand, now
    also driving this issue so a finding doesn't require someone to think
    to call that service. Safe to call repeatedly - idempotent create/
    delete, same pattern as the other checks in this module.
    """
    if not issues:
        async_delete_storage_integrity_issue(hass, entry_id)
        return
    async_create_storage_integrity_issue(hass, entry_id, entry_title, len(issues), issues[0])


def async_create_low_wellness_score_issue(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    score: int,
) -> None:
    """Create a repair issue flagging a sustained low cycle wellness score."""
    async_create_issue(
        hass,
        DOMAIN,
        f"low_wellness_score_{entry_id}",
        issue_domain=DOMAIN,
        is_fixable=False,
        severity=IssueSeverity.WARNING,
        translation_key="low_wellness_score",
        translation_placeholders={
            "entry_title": entry_title,
            "score": str(score),
        },
    )


def async_delete_low_wellness_score_issue(hass: HomeAssistant, entry_id: str) -> None:
    """Delete the low-wellness-score repair issue."""
    async_delete_issue(hass, DOMAIN, f"low_wellness_score_{entry_id}")


def async_check_low_wellness_score(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    wellness_score: dict[str, Any] | None,
) -> None:
    """Raise (or clear) the low-wellness-score issue based on model.py::cycle_wellness_score.

    Checks the current score, not a tracked streak - same approach as the other
    informational issues in this module (e.g. async_check_low_prediction_confidence),
    so a score hovering near the threshold may toggle the issue day to day.
    """
    score = wellness_score.get("score") if isinstance(wellness_score, dict) else None
    if score is None or score >= WELLNESS_SCORE_LOW_THRESHOLD:
        async_delete_low_wellness_score_issue(hass, entry_id)
        return
    async_create_low_wellness_score_issue(hass, entry_id, entry_title, score)


def async_create_cycle_pattern_risk_issue(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    cycle_std_days: float,
    avg_pain_days_per_cycle: float,
) -> None:
    """Create a repair issue flagging irregular cycles and/or frequent pain
    days in the logged data - patterns sometimes associated with PCOS/
    endometriosis. Purely informational, not a diagnosis - see
    model.py::cycle_pattern_signals and its translation string."""
    async_create_issue(
        hass,
        DOMAIN,
        f"cycle_pattern_risk_{entry_id}",
        issue_domain=DOMAIN,
        is_fixable=False,
        severity=IssueSeverity.WARNING,
        translation_key="cycle_pattern_risk",
        translation_placeholders={
            "entry_title": entry_title,
            "cycle_std_days": str(cycle_std_days),
            "avg_pain_days_per_cycle": str(avg_pain_days_per_cycle),
        },
    )


def async_delete_cycle_pattern_risk_issue(hass: HomeAssistant, entry_id: str) -> None:
    """Delete the cycle-pattern-risk repair issue."""
    async_delete_issue(hass, DOMAIN, f"cycle_pattern_risk_{entry_id}")


def async_check_cycle_pattern_risk(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    pattern_signals: dict[str, Any] | None,
) -> None:
    """Raise (or clear) the cycle-pattern-risk issue based on model.py::cycle_pattern_signals.

    Checks the current signals, not a tracked streak - same approach as the other
    informational issues in this module.
    """
    cycle_std_days = pattern_signals.get("cycle_std_days") if isinstance(pattern_signals, dict) else None
    avg_pain_days_per_cycle = pattern_signals.get("avg_pain_days_per_cycle") if isinstance(pattern_signals, dict) else None
    irregular_cycles = cycle_std_days is not None and cycle_std_days > CYCLE_PATTERN_IRREGULARITY_THRESHOLD_DAYS
    frequent_pain = avg_pain_days_per_cycle is not None and avg_pain_days_per_cycle > CYCLE_PATTERN_PAIN_DAYS_THRESHOLD
    if not irregular_cycles and not frequent_pain:
        async_delete_cycle_pattern_risk_issue(hass, entry_id)
        return
    async_create_cycle_pattern_risk_issue(hass, entry_id, entry_title, cycle_std_days, avg_pain_days_per_cycle)


def async_create_period_overdue_issue(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    days_overdue: int,
) -> None:
    """Create a repair issue flagging a period well past its predicted start."""
    async_create_issue(
        hass,
        DOMAIN,
        f"period_overdue_{entry_id}",
        issue_domain=DOMAIN,
        is_fixable=False,
        severity=IssueSeverity.WARNING,
        translation_key="period_overdue",
        translation_placeholders={
            "entry_title": entry_title,
            "days_overdue": str(days_overdue),
        },
    )


def async_delete_period_overdue_issue(hass: HomeAssistant, entry_id: str) -> None:
    """Delete the period-overdue repair issue."""
    async_delete_issue(hass, DOMAIN, f"period_overdue_{entry_id}")


def async_check_period_overdue(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    days_until_next_start: int | None,
    period_active: bool,
    precision_allowed: bool,
) -> None:
    """Raise (or clear) the period-overdue issue from CycleModel.days_until_next_start.

    days_until_next_start goes negative once the predicted start has passed and
    no new cycle start was logged. Skipped while the prediction is still
    low-confidence (learning phase), where a late period is not a meaningful
    signal; life stages without a predicted start (pregnancy, postpartum,
    menopause, ...) have days_until_next_start None and clear the issue.
    """
    if (
        days_until_next_start is None
        or period_active
        or not precision_allowed
        or days_until_next_start > -PERIOD_OVERDUE_DAYS
    ):
        async_delete_period_overdue_issue(hass, entry_id)
        return
    async_create_period_overdue_issue(hass, entry_id, entry_title, -days_until_next_start)


def async_create_period_prolonged_issue(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    days: int,
) -> None:
    """Create a repair issue flagging an unusually long ongoing bleed."""
    async_create_issue(
        hass,
        DOMAIN,
        f"period_prolonged_{entry_id}",
        issue_domain=DOMAIN,
        is_fixable=False,
        severity=IssueSeverity.WARNING,
        translation_key="period_prolonged",
        translation_placeholders={
            "entry_title": entry_title,
            "days": str(days),
        },
    )


def async_delete_period_prolonged_issue(hass: HomeAssistant, entry_id: str) -> None:
    """Delete the period-prolonged repair issue."""
    async_delete_issue(hass, DOMAIN, f"period_prolonged_{entry_id}")


def async_check_period_prolonged(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    current_period: dict[str, Any] | None,
    today: date,
) -> None:
    """Raise (or clear) the period-prolonged issue from CycleModel.current_period.

    Flags a bleed that is still ongoing (last logged day is today or yesterday)
    and has lasted at least PERIOD_PROLONGED_DAYS consecutive days AND longer
    than the profile's own configured/learned period duration, so a profile
    whose normal period is long isn't flagged for behaving normally. Clears
    itself once the bleeding stops or no period data exists (pregnancy,
    postpartum, ... have current_period None).
    """
    if not isinstance(current_period, dict):
        async_delete_period_prolonged_issue(hass, entry_id)
        return
    length = int(current_period.get("length") or 0)
    effective_duration = int(current_period.get("effective_duration") or 0)
    try:
        last_day = date.fromisoformat(str(current_period.get("last_confirmed_day")))
    except ValueError:
        async_delete_period_prolonged_issue(hass, entry_id)
        return
    ongoing = (today - last_day).days <= 1
    if not ongoing or length < PERIOD_PROLONGED_DAYS or length <= effective_duration:
        async_delete_period_prolonged_issue(hass, entry_id)
        return
    async_create_period_prolonged_issue(hass, entry_id, entry_title, length)


def async_create_checkup_overdue_issue(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    last_date: str,
    months: int,
) -> None:
    """Create a repair issue hinting that the last logged checkup is long ago."""
    async_create_issue(
        hass,
        DOMAIN,
        f"checkup_overdue_{entry_id}",
        issue_domain=DOMAIN,
        is_fixable=False,
        severity=IssueSeverity.WARNING,
        translation_key="checkup_overdue",
        translation_placeholders={
            "entry_title": entry_title,
            "last_date": last_date,
            "months": str(months),
        },
    )


def async_delete_checkup_overdue_issue(hass: HomeAssistant, entry_id: str) -> None:
    """Delete the checkup-overdue repair issue."""
    async_delete_issue(hass, DOMAIN, f"checkup_overdue_{entry_id}")


def async_check_checkup_overdue(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    symptom_history: list[dict[str, Any]],
    today: date,
) -> None:
    """Raise (or clear) the checkup-overdue issue from the logged appointments.

    Only profiles that logged at least one gynecologist/pap-smear appointment are
    considered, so nobody who never tracks appointments gets nagged.
    """
    last_iso: str | None = None
    for entry in symptom_history:
        if not isinstance(entry, dict) or not entry.get("date"):
            continue
        value = entry.get(SYMPTOM_APPOINTMENTS)
        if CHECKUP_APPOINTMENT_TYPES.intersection(value if isinstance(value, list) else [value]):
            last_iso = max(last_iso or "", str(entry["date"]))
    try:
        days = (today - date.fromisoformat(last_iso)).days if last_iso else 0
    except ValueError:
        days = 0
    if days < CHECKUP_OVERDUE_DAYS:
        async_delete_checkup_overdue_issue(hass, entry_id)
        return
    async_create_checkup_overdue_issue(hass, entry_id, entry_title, last_iso, days // 30)


_HOUSEHOLD_INVENTORY_CRITICAL_ISSUE_ID = "household_inventory_critical"


def async_create_household_inventory_critical_issue(hass: HomeAssistant, product_names: list[str]) -> None:
    """Create a repair issue when a purchasable household product has
    reached its CRITICAL stock threshold (HA-Idee 2, "weitere Ideen?",
    27.09.2026).

    The existing warning threshold already adds the product to HA's native
    shopping list (see __init__.py::_async_check_and_update_todo_list) -
    that happens quietly, though, and is easy to miss if the shopping list
    isn't checked regularly. This escalates once stock is critically low
    (by definition at/below the warning threshold too, since critical <=
    warning is enforced where thresholds are set) into HA's own Repairs UI,
    which is more likely to be noticed. Not per-profile like the other
    issues in this module - household inventory is shared across all
    profiles (HOUSEHOLD_INVENTORY_DATA_KEY), so this uses a single, fixed
    issue_id instead of one per entry_id.
    """
    async_create_issue(
        hass,
        DOMAIN,
        _HOUSEHOLD_INVENTORY_CRITICAL_ISSUE_ID,
        issue_domain=DOMAIN,
        is_fixable=False,
        severity=IssueSeverity.WARNING,
        translation_key="household_inventory_critical",
        translation_placeholders={
            "products_list": ", ".join(product_names),
        },
    )


def async_delete_household_inventory_critical_issue(hass: HomeAssistant) -> None:
    """Delete the household-inventory-critical issue once no purchasable
    product is at/below its critical threshold any more."""
    async_delete_issue(hass, DOMAIN, _HOUSEHOLD_INVENTORY_CRITICAL_ISSUE_ID)


def async_check_household_inventory_critical(hass: HomeAssistant, product_names: list[str]) -> None:
    """Raise (or clear) the household-inventory-critical issue. Safe to call
    repeatedly (e.g. once per loaded profile on every consumption event) -
    idempotent create/delete, same pattern as the other checks in this
    module."""
    if not product_names:
        async_delete_household_inventory_critical_issue(hass)
        return
    async_create_household_inventory_critical_issue(hass, product_names)


def async_create_profile_inactive_issue(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    days_inactive: int,
) -> None:
    """Create a repair issue flagging a profile with no new history/symptom entry in a while."""
    async_create_issue(
        hass,
        DOMAIN,
        f"profile_inactive_{entry_id}",
        issue_domain=DOMAIN,
        is_fixable=False,
        severity=IssueSeverity.WARNING,
        translation_key="profile_inactive",
        translation_placeholders={
            "entry_title": entry_title,
            "days_inactive": str(days_inactive),
        },
    )


def async_delete_profile_inactive_issue(hass: HomeAssistant, entry_id: str) -> None:
    """Delete the profile-inactive repair issue."""
    async_delete_issue(hass, DOMAIN, f"profile_inactive_{entry_id}")


def async_check_profile_inactive(
    hass: HomeAssistant,
    entry_id: str,
    entry_title: str,
    last_activity_date: str | None,
    today: date,
) -> None:
    """Raise (or clear) the profile-inactive issue.

    Caller only passes last_activity_date for profiles in a life stage where
    regular logging is expected (normal cycling/menopause) - a None here means
    either no history yet (new profile, not "inactive") or a life stage (e.g.
    pregnancy) where this check doesn't apply, see __init__.py call sites.
    """
    if not last_activity_date:
        async_delete_profile_inactive_issue(hass, entry_id)
        return
    try:
        last_activity = date.fromisoformat(last_activity_date)
    except ValueError:
        async_delete_profile_inactive_issue(hass, entry_id)
        return
    days_inactive = (today - last_activity).days
    if days_inactive < PROFILE_INACTIVITY_REMINDER_DAYS:
        async_delete_profile_inactive_issue(hass, entry_id)
        return
    async_create_profile_inactive_issue(hass, entry_id, entry_title, days_inactive)


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
