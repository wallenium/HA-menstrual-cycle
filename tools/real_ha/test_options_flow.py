"""The options page in a real Home Assistant: what is submitted is what is stored; run with tools/real_ha/run.sh.

A guard for reshaping the page (hidden fields, new sections): a hidden or moved field must not lose or change anything else."""
import logging

import pytest
import voluptuous as vol
from homeassistant.config_entries import ConfigEntryState
from homeassistant.data_entry_flow import FlowResultType, section
from homeassistant.helpers import selector

from test_real_ha import DOMAIN, _add_profile

# value to change each field to (the form offers no other way to learn a valid second value); booleans flip, selects take the next option
CHANGE_TO = {
    "friendly_name": "Anna B", "birth_date": "1990-05-05", "period_duration_days": 6, "cycle_length_override": 30, "num_predictions": 5,
    "notify_period_lead_days": 2, "notify_fertile_lead_days": 1, "notify_time": "07:30:00", "notify_log_reminder_time": "21:00:00",
    "notify_ovulation_lead_days": 1, "notify_pill_time": "09:30:00", "notify_pill_followup_hours": 1, "pill_pause_days": 7,
    "pill_pack_start": "2026-10-10", "checkup_interval_months": 6,
}
# not changed here: pickers for entities and icons (no valid value without further setup), life-stage switches (own test below)
SKIP = {"icon", "notify_service", "notify_partner_service", "linked_person_entity_id", "basal_temp_sensor_entity_id",
        "pregnancy_enabled", "pre_menarche_enabled", "menopause_enabled", "postpartum_enabled"}


def _fields(schema, path=()):
    for key, value in schema.schema.items():
        if isinstance(value, section):
            yield from _fields(value.schema, path + (key.schema,))
        else:
            yield path, key, value


def _defaults(schema):
    out = {}
    for key, value in schema.schema.items():
        if isinstance(value, section):
            out[key.schema] = _defaults(value.schema)
        elif getattr(key, "default", vol.UNDEFINED) is not vol.UNDEFINED:
            out[key.schema] = key.default()
        elif (key.description or {}).get("suggested_value") is not None:
            out[key.schema] = key.description["suggested_value"]  # the frontend prefills these
    return out


def _set(data, path, name, value):
    for part in path:
        data = data[part]
    data[name] = value


def _new_value(key, selector_or_type, current):
    if key.schema in CHANGE_TO:
        return CHANGE_TO[key.schema]
    if selector_or_type is bool:
        return not current
    if isinstance(selector_or_type, selector.SelectSelector):
        options = [o["value"] if isinstance(o, dict) else o for o in selector_or_type.config["options"]]
        return next(o for o in options if o != current)
    raise AssertionError(f"no new value for {key.schema}: add it to CHANGE_TO or SKIP")


def _state(hass, entry):
    """Everything the options page can write, wherever it ends up: options, entry data and title, the running profile."""
    runtime = hass.data[DOMAIN][entry.entry_id]
    out = {f"options.{k}": v for k, v in entry.options.items()}
    out.update({f"data.{k}": v for k, v in entry.data.items()})
    out["title"] = entry.title
    for name in ("friendly_name", "period_duration_days", "cycle_length_override", "visibility_level", "onboarding_stage"):
        out[f"runtime.{name}"] = getattr(runtime, name)
    return out


def _belongs(field, key):
    return key == field or key.endswith(f".{field}") or (field == "friendly_name" and key == "title")


async def _submit(hass, entry, change=None):
    """Open the options, submit the form with its own defaults (plus one change), follow further steps; return what was stored."""
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is FlowResultType.FORM and result["step_id"] == "init"
    data = _defaults(result["data_schema"])
    if change:
        for path, key, value in _fields(result["data_schema"]):
            if key.schema == change:
                _set(data, path, change, _new_value(key, value, key.default() if key.default is not vol.UNDEFINED else None))
    result = await hass.config_entries.options.async_configure(result["flow_id"], data)
    while result["type"] is FlowResultType.FORM:
        assert not result.get("errors"), (change, result["errors"])
        result = await hass.config_entries.options.async_configure(result["flow_id"], _defaults(result["data_schema"]))
    assert result["type"] is FlowResultType.CREATE_ENTRY, result
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED
    return _state(hass, entry)


async def test_submitting_the_defaults_is_stable(hass, caplog):
    caplog.set_level(logging.WARNING)
    entry = await _add_profile(hass)
    first = await _submit(hass, entry)
    second = await _submit(hass, entry)
    assert first == second
    assert [r.getMessage() for r in caplog.records if r.levelno >= logging.WARNING and r.name.startswith(f"custom_components.{DOMAIN}")] == []


async def test_changing_one_field_changes_only_that_field(hass):
    entry = await _add_profile(hass)
    await _submit(hass, entry)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    fields = [(path, key) for path, key, _ in _fields(result["data_schema"]) if key.schema not in SKIP]
    hass.config_entries.options.async_abort(result["flow_id"])
    assert len(fields) > 40, "the options page shrank or the field walk broke"

    problems = []
    for path, key in fields:
        before = await _submit(hass, entry)  # back to the baseline
        after = await _submit(hass, entry, change=key.schema)
        changed = {k for k in set(before) | set(after) if before.get(k) != after.get(k)}
        if not changed or not all(_belongs(key.schema, k) for k in changed):
            problems.append(f"{'/'.join(path + (key.schema,))}: changed {sorted(changed) or 'nothing'}")
    assert problems == []


@pytest.mark.parametrize("toggle, check", [
    ("pregnancy_enabled", lambda r: r.pregnancy_data.get("is_pregnant") is True),
    ("pre_menarche_enabled", lambda r: r.menarche_data.get("tracking_active") is True),
    ("menopause_enabled", lambda r: r.menopause_data.get("is_menopause") is True),
    ("postpartum_enabled", lambda r: r.noncycle_data.get("is_postpartum") is True),
])
async def test_life_stage_switch_reaches_the_end_and_takes_effect(hass, toggle, check):
    entry = await _add_profile(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    data = _defaults(result["data_schema"])
    data["life_stages"][toggle] = True
    result = await hass.config_entries.options.async_configure(result["flow_id"], data)
    steps = 0
    while result["type"] is FlowResultType.FORM:
        steps += 1
        assert steps < 5 and not result.get("errors"), result
        result = await hass.config_entries.options.async_configure(result["flow_id"], _defaults(result["data_schema"]))
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert check(hass.data[DOMAIN][entry.entry_id]), f"{toggle} had no effect"


async def test_a_notify_target_can_be_set_and_cleared_again(hass):
    """The pickers must start empty without a default and show a set value, as the frontend does: cleared means the key is left out."""
    entry = await _add_profile(hass)
    for target in ("notify.mobile_app_test", ""):
        result = await hass.config_entries.options.async_init(entry.entry_id)
        data = _defaults(result["data_schema"])
        if target:
            data["notifications"]["notify_service"] = target
        else:
            assert data["notifications"]["notify_service"] == "notify.mobile_app_test"  # shown prefilled
            del data["notifications"]["notify_service"]  # the user cleared the picker
        result = await hass.config_entries.options.async_configure(result["flow_id"], data)
        while result["type"] is FlowResultType.FORM:
            assert not result.get("errors"), result["errors"]
            result = await hass.config_entries.options.async_configure(result["flow_id"], _defaults(result["data_schema"]))
        await hass.async_block_till_done()
        assert (entry.options.get("notify_service") or "") == target
