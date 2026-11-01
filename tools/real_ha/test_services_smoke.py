"""Calls every service of services.yaml once in a real Home Assistant core; run with tools/real_ha/run.sh.

A new service without an entry in CALLS fails test_every_service_has_a_call, so the list cannot rot."""
import logging
from pathlib import Path

import pytest
import yaml
from homeassistant.setup import async_setup_component

from test_real_ha import DOMAIN, _add_profile

SERVICES = sorted(yaml.safe_load((Path(__file__).resolve().parents[2] / "custom_components" / DOMAIN / "services.yaml").read_text()))

# Minimal valid data for each service (entry_id is added by the test where the service takes one).
CALLS = {
    "add_cycle_start": {"date": "2026-09-20"},
    "remove_cycle_start": {"date": "2026-08-01"},
    "set_cycle_history": {"dates": ["2026-06-06", "2026-07-04", "2026-08-01", "2026-08-29"]},
    "import_cycle_history": {"dates": ["2026-05-09", "06.06.2026"], "date_format": "auto"},
    "import_symptom_history": {"entries": [{"date": "2026-08-02", "pain": ["cramps"], "mood": "tired"}, {"date": "03.08.2026", "basal_temp": 36.4}]},
    "set_period_duration": {"days": 5},
    "erase_all_history": {"entity_id": "sensor.menstruation_anna", "erase_all": True},
    "export_history": {"format": "csv", "filename": "smoke_history"},
    "export_full_backup": {"filename": "smoke_backup"},
    "import_full_backup": {"filename": "smoke_backup", "mode": "merge", "confirm": True},
    "refresh_cycle_model": {},
    "send_test_notification": {},
    "log_product_usage": {"product": "tampon", "action": "used", "quantity": 1, "date": "2026-08-02"},
    "reimport_basal_temp_statistics": {},
    "manage_household_inventory": {"inventory_action": "add", "product": "tampon", "quantity": 5},
    "add_symptom": {"date": "2026-08-30", "symptom_data": {"mood": "ok", "pain": ["cramps"], "discharge": "clear", "smell": "normal"}},
    "remove_symptom": {"date": "2026-08-02"},
    "get_symptom": {"date": "2026-08-02"},
    "get_full_history": {"days": 180},
    "get_cycle_predictions": {"days_back": 365, "future_cycles": 3},
    "compare_current_cycle": {},
    "get_last_cycle_summary": {},
    "confirm_contraception_renewal": {"date": "2026-09-01"},
    "create_periods_from_bleeding": {},
    "set_pregnancy_mode": {"is_pregnant": True, "pregnancy_start_date": "2026-07-01"},
    "update_pregnancy_date": {"pregnancy_start_date": "2026-07-01"},
    "set_menarche_mode": {"is_menarche": False, "estimated_menarche_date": "2026-12-01", "family_menarche_age": 12},
    "update_menarche_date": {"date": "2026-06-15"},
    "log_first_period": {"date": "2026-06-15"},
    "get_menarche_info": {},
    "add_pre_menarche_sign": {"pre_menarche_sign": "breast_development", "tanner_stage": "stage_2"},
    "remove_pre_menarche_sign": {"pre_menarche_sign": "breast_development"},
    "set_menopause_mode": {"is_menopause": True, "menopause_start_date": "2024-06-01"},
    "update_menopause_date": {"menopause_start_date": "2024-06-01"},
    "save_timer_state": {"remaining_seconds": 10800, "total_seconds": 25200, "selected_product": "tampon", "is_running": True, "saved_at": 1750000000000},
    "export_doctor_report": {"days_back": 180, "patient_name": "Anna Muster", "patient_birthdate": "1995-06-15", "language": "de"},
    "export_wall_calendar": {"year": 2026, "language": "de", "title": "Anna 2026"},
    "set_profile_visibility": {"level": "status_only", "revert_after_minutes": 60},
    "repair_storage": {},
    "get_household_summary": {},
    "get_dashboard_prefs": {"profile": "anna"},
    "save_dashboard_prefs": {"profile": "anna", "prefs": {"widgetOrder": ["kpi_strip"], "widgetVisibility": {"kpi_strip": True}}},
}
# Services that address a profile through entry_id; the others (inventory, summary, backups, dashboard prefs) are global or take 'profile'.
GLOBAL = {"export_full_backup", "import_full_backup", "manage_household_inventory", "repair_storage", "get_household_summary",
          "get_dashboard_prefs", "save_dashboard_prefs"}


async def _seeded_profile(hass):
    assert await async_setup_component(hass, "persistent_notification", {})  # always loaded in a real instance
    entry = await _add_profile(hass)
    for day in ("2026-06-06", "2026-07-04", "2026-08-01", "2026-08-29"):
        await hass.services.async_call(DOMAIN, "add_cycle_start", {"entry_id": entry.entry_id, "date": day}, blocking=True)
    await hass.services.async_call(DOMAIN, "add_symptom", {"entry_id": entry.entry_id, "date": "2026-08-02",
                                                           "symptom_data": {"pain": ["cramps"], "mood": "tired"}}, blocking=True)
    return entry


def test_every_service_has_a_call():
    assert sorted(CALLS) == SERVICES, (set(SERVICES) ^ set(CALLS))


async def test_every_service_is_registered(hass):
    await _add_profile(hass)
    assert sorted(hass.services.async_services().get(DOMAIN, {})) == SERVICES


@pytest.mark.parametrize("service", SERVICES)
async def test_service_runs(hass, caplog, service):
    caplog.set_level(logging.WARNING)
    entry = await _seeded_profile(hass)
    data = dict(CALLS[service])
    if service not in GLOBAL and "entity_id" not in data:
        data["entry_id"] = entry.entry_id
    if service == "confirm_contraception_renewal":  # needs a method with a renewal period
        await hass.services.async_call(DOMAIN, "add_symptom", {"entry_id": entry.entry_id, "date": "2026-08-20",
                                                               "symptom_data": {"contraception_method": "injection"}}, blocking=True)
    if service == "import_full_backup":  # needs a file from export_full_backup
        await hass.services.async_call(DOMAIN, "export_full_backup", {"filename": "smoke_backup"}, blocking=True)
    result = await hass.services.async_call(
        DOMAIN, service, data, blocking=True,
        return_response=hass.services.supports_response(DOMAIN, service) != "none",
    )
    await hass.async_block_till_done()
    # only our own logger: Home Assistant itself warns about custom integrations and a missing zlib_ng
    assert [r.getMessage() for r in caplog.records if r.levelno >= logging.WARNING and r.name.startswith(f"custom_components.{DOMAIN}")] == []
    if service == "send_test_notification":
        assert hass.data["persistent_notification"], "no notification was created"
    if service.startswith("get_") or service in ("compare_current_cycle", "export_doctor_report", "export_wall_calendar"):
        assert result, f"{service} returned nothing"


async def test_profile_and_entity_id_addressing_work(hass):
    await _seeded_profile(hass)
    await hass.services.async_call(DOMAIN, "add_cycle_start", {"profile": "anna", "date": "2026-09-20"}, blocking=True)
    await hass.services.async_call(DOMAIN, "add_cycle_start", {"entity_id": "sensor.menstruation_anna", "date": "2026-10-18"}, blocking=True)
    out = await hass.services.async_call(DOMAIN, "get_cycle_predictions", {"profile": "anna"}, blocking=True, return_response=True)
    print(out)
    assert "2026-09-20" in str(out) and "2026-10-18" in str(out)
