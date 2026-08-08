from __future__ import annotations

import asyncio
import importlib.util
import json
import sys
import types
import unittest
from datetime import date, datetime
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
COMPONENT_ROOT = REPO_ROOT / "custom_components" / "menstruation_cycle"


def _install_homeassistant_stubs() -> None:
    homeassistant = types.ModuleType("homeassistant")
    homeassistant.__path__ = []
    sys.modules.setdefault("homeassistant", homeassistant)

    components = types.ModuleType("homeassistant.components")
    components.__path__ = []
    sys.modules.setdefault("homeassistant.components", components)

    sensor_mod = types.ModuleType("homeassistant.components.sensor")
    sensor_mod.SensorEntity = type("SensorEntity", (), {})
    sys.modules.setdefault("homeassistant.components.sensor", sensor_mod)

    config_entries = types.ModuleType("homeassistant.config_entries")
    config_entries.ConfigEntry = type("ConfigEntry", (), {})
    sys.modules.setdefault("homeassistant.config_entries", config_entries)

    const_mod = types.ModuleType("homeassistant.const")
    const_mod.CONF_TYPE = "type"
    const_mod.Platform = type("Platform", (), {"SENSOR": "sensor"})
    sys.modules.setdefault("homeassistant.const", const_mod)

    core = types.ModuleType("homeassistant.core")
    core.HomeAssistant = type("HomeAssistant", (), {})
    core.ServiceCall = type("ServiceCall", (), {})
    sys.modules.setdefault("homeassistant.core", core)

    exceptions = types.ModuleType("homeassistant.exceptions")
    exceptions.HomeAssistantError = type("HomeAssistantError", (Exception,), {})
    sys.modules.setdefault("homeassistant.exceptions", exceptions)

    helpers = types.ModuleType("homeassistant.helpers")
    helpers.__path__ = []
    sys.modules.setdefault("homeassistant.helpers", helpers)

    config_validation = types.ModuleType("homeassistant.helpers.config_validation")
    config_validation.config_entry_only_config_schema = lambda domain: domain
    config_validation.string = lambda value: value
    config_validation.entity_id = lambda value: value
    config_validation.boolean = lambda value: value
    sys.modules.setdefault("homeassistant.helpers.config_validation", config_validation)

    entity_registry = types.ModuleType("homeassistant.helpers.entity_registry")
    entity_registry.async_get = lambda hass: object()
    entity_registry.async_entries_for_config_entry = lambda registry, entry_id: []
    sys.modules.setdefault("homeassistant.helpers.entity_registry", entity_registry)

    dispatcher = types.ModuleType("homeassistant.helpers.dispatcher")
    dispatcher.async_dispatcher_connect = lambda *args, **kwargs: None
    dispatcher.async_dispatcher_send = lambda *args, **kwargs: None
    sys.modules.setdefault("homeassistant.helpers.dispatcher", dispatcher)

    entity_platform = types.ModuleType("homeassistant.helpers.entity_platform")
    entity_platform.AddEntitiesCallback = type("AddEntitiesCallback", (), {})
    sys.modules.setdefault("homeassistant.helpers.entity_platform", entity_platform)

    event = types.ModuleType("homeassistant.helpers.event")
    event.async_track_time_change = lambda *args, **kwargs: None
    sys.modules.setdefault("homeassistant.helpers.event", event)

    storage = types.ModuleType("homeassistant.helpers.storage")
    storage.Store = type("Store", (), {"__init__": lambda self, *args, **kwargs: None})
    sys.modules.setdefault("homeassistant.helpers.storage", storage)

    typing_mod = types.ModuleType("homeassistant.helpers.typing")
    typing_mod.StateType = object
    sys.modules.setdefault("homeassistant.helpers.typing", typing_mod)

    util = types.ModuleType("homeassistant.util")
    util.__path__ = []
    util.slugify = lambda value: str(value).strip().lower().replace(" ", "_")
    sys.modules.setdefault("homeassistant.util", util)

    dt_mod = types.ModuleType("homeassistant.util.dt")
    dt_mod.now = lambda: datetime(2026, 7, 20, 8, 0, 0)
    sys.modules.setdefault("homeassistant.util.dt", dt_mod)


def _load_module(module_name: str, file_name: str):
    spec = importlib.util.spec_from_file_location(module_name, COMPONENT_ROOT / file_name)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


_install_homeassistant_stubs()
package = types.ModuleType("mgtest")
package.__path__ = [str(COMPONENT_ROOT)]
sys.modules.setdefault("mgtest", package)
const = _load_module("mgtest.const", "const.py")
model = _load_module("mgtest.model", "model.py")
sensor = _load_module("mgtest.sensor", "sensor.py")
storage = _load_module("mgtest.storage", "storage.py")
integration = _load_module("mgtest.integration", "__init__.py")


class _FakeStorage:
    def __init__(self) -> None:
        self.saved_args = None

    async def async_save(self, *args, **kwargs) -> None:
        self.saved_args = args


class _FakeServices:
    def __init__(self) -> None:
        self.registrations: dict[str, dict[str, object]] = {}

    def async_register(self, domain, service, handler, **kwargs) -> None:
        self.registrations[service] = {"domain": domain, "handler": handler, **kwargs}

    def has_service(self, domain, service) -> bool:
        return service in self.registrations

    def async_remove(self, domain, service) -> None:
        self.registrations.pop(service, None)

    async def async_call(self, domain, service, data, blocking=False) -> None:
        return None


class _FakeHass:
    def __init__(self, runtime=None) -> None:
        self.data = {const.DOMAIN: {"entry-1": runtime}} if runtime is not None else {const.DOMAIN: {}}
        self.services = _FakeServices()
        self.states = types.SimpleNamespace(get=lambda entity_id: None)


class _FakeCall:
    def __init__(self, data) -> None:
        self.data = data


class ProductUsageBackendTests(unittest.TestCase):
    def test_register_domain_services_registers_log_first_period_without_required_date(self) -> None:
        hass = _FakeHass()

        integration._register_domain_services(hass)

        registration = hass.services.registrations[const.SERVICE_LOG_FIRST_PERIOD]
        self.assertEqual(registration["domain"], const.DOMAIN)
        self.assertEqual(registration["schema"]({}), {})
        self.assertEqual(
            registration["schema"]({const.SERVICE_FIELD_DATE: "2026-07-19"}),
            {const.SERVICE_FIELD_DATE: "2026-07-19"},
        )

    def test_log_first_period_defaults_to_today_and_updates_runtime(self) -> None:
        runtime = integration.MenstruationRuntime(
            storage=_FakeStorage(),
            profile="default",
            friendly_name="Default",
            icon="",
            history=[],
            period_duration_days=5,
            symptom_history=[],
            product_usage=[],
            menarche_data={
                "tracking_active": False,
                "is_menarche": False,
                "menarche_date": None,
                "estimated_date": "2026-08-01",
                "family_menarche_age": 12,
            },
        )
        hass = _FakeHass(runtime)
        refreshed_entry_ids: list[set[str]] = []

        async def _fake_refresh(hass_arg, entry_ids=None) -> None:
            refreshed_entry_ids.append(set(entry_ids or set()))

        integration._async_refresh_cycle_model = _fake_refresh
        integration.dt_util.now = lambda: datetime(2026, 7, 20, 8, 0, 0)

        asyncio.run(integration._async_handle_log_first_period(hass, _FakeCall({})))

        self.assertEqual(runtime.history, ["2026-07-20"])
        self.assertTrue(runtime.menarche_data["tracking_active"])
        self.assertTrue(runtime.menarche_data["is_menarche"])
        self.assertEqual(runtime.menarche_data["menarche_date"], "2026-07-20")
        self.assertEqual(runtime.menarche_data["estimated_date"], "2026-08-01")
        self.assertEqual(runtime.menarche_data["family_menarche_age"], 12)
        self.assertIsNotNone(runtime.storage.saved_args)
        self.assertEqual(runtime.storage.saved_args[5]["menarche_date"], "2026-07-20")
        self.assertEqual(refreshed_entry_ids, [{"entry-1"}])

    def test_build_cycle_model_keeps_period_active_until_duration_limit(self) -> None:
        cycle = model.build_cycle_model(
            history=["2026-07-01"],
            period_duration_days=5,
            symptom_history=[],
            today=date(2026, 7, 2),
        )

        self.assertEqual(cycle.state, const.STATE_PERIOD)
        self.assertIsNotNone(cycle.current_period)
        self.assertTrue(cycle.current_period["is_active"])
        self.assertEqual(cycle.current_period["days_elapsed"], 2)
        self.assertEqual(cycle.current_period["effective_duration"], 5)

    def test_build_cycle_model_ends_period_when_none_is_logged(self) -> None:
        cycle = model.build_cycle_model(
            history=["2026-07-01", "2026-07-02"],
            period_duration_days=5,
            symptom_history=[{"date": "2026-07-03", "bleeding_strength": "none"}],
            today=date(2026, 7, 3),
        )

        self.assertNotEqual(cycle.state, const.STATE_PERIOD)
        self.assertIsNotNone(cycle.current_period)
        self.assertFalse(cycle.current_period["is_active"])
        self.assertEqual(cycle.current_period["ended_by"], "bleeding_none")

    def test_build_cycle_model_ends_period_after_average_duration(self) -> None:
        cycle = model.build_cycle_model(
            history=["2026-07-01", "2026-07-02"],
            period_duration_days=5,
            symptom_history=[],
            today=date(2026, 7, 6),
        )

        self.assertNotEqual(cycle.state, const.STATE_PERIOD)
        self.assertIsNotNone(cycle.current_period)
        self.assertFalse(cycle.current_period["is_active"])
        self.assertEqual(cycle.current_period["ended_by"], "duration")

    def test_build_cycle_model_sets_fertile_window_to_ovulation_plus_minus_five_days_for_28_day_cycle(self) -> None:
        cycle = model.build_cycle_model(
            history=["2026-06-01", "2026-06-29"],
            period_duration_days=5,
            symptom_history=[],
            today=date(2026, 7, 1),
        )

        self.assertEqual(cycle.ovulation_day, "2026-07-12")
        self.assertEqual(cycle.fertile_window_start, "2026-07-07")
        self.assertEqual(cycle.fertile_window_end, "2026-07-17")

    def test_build_cycle_model_sets_fertile_window_to_ovulation_plus_minus_five_days_for_30_day_cycle(self) -> None:
        cycle = model.build_cycle_model(
            history=["2026-05-01", "2026-05-31"],
            period_duration_days=5,
            symptom_history=[],
            today=date(2026, 6, 1),
        )

        self.assertEqual(cycle.ovulation_day, "2026-06-14")
        self.assertEqual(cycle.fertile_window_start, "2026-06-09")
        self.assertEqual(cycle.fertile_window_end, "2026-06-19")

    def test_predict_future_starts_returns_six_predictions_with_avg_cycle_length(self) -> None:
        predictions = model.predict_future_starts(
            ["2026-01-01", "2026-01-29", "2026-02-26"],
            num_cycles=6,
        )
        self.assertEqual(
            predictions,
            [
                "2026-03-26",
                "2026-04-23",
                "2026-05-21",
                "2026-06-18",
                "2026-07-16",
                "2026-08-13",
            ],
        )

    def test_predict_future_starts_clamps_cycle_length_and_prediction_count(self) -> None:
        predictions = model.predict_future_starts(
            ["2026-01-01", "2026-03-15", "2026-05-27"],
            num_cycles=20,
        )
        self.assertEqual(len(predictions), 12)
        self.assertEqual(predictions[0], "2026-07-26")
        self.assertEqual(predictions[1], "2026-09-24")

    def test_learn_ovulation_pattern_returns_none_when_no_cycle_starts(self) -> None:
        result = model.learn_ovulation_pattern([], [])
        self.assertIsNone(result)

    def test_learn_ovulation_pattern_returns_none_with_only_one_cycle_start(self) -> None:
        result = model.learn_ovulation_pattern([], ["2026-06-01"])
        self.assertIsNone(result)

    def test_learn_ovulation_pattern_returns_none_when_no_temperature_data(self) -> None:
        cycle_starts = ["2026-05-01", "2026-05-29"]
        # Symptom history with no basal temperature entries
        symptoms = [{"date": "2026-05-10", "cervical_mucus": "watery"}]
        result = model.learn_ovulation_pattern(symptoms, cycle_starts)
        self.assertIsNone(result)

    def test_learn_ovulation_pattern_returns_average_when_two_cycles_have_temperature_rise(self) -> None:
        # Build symptom histories with temperature data for two cycles
        # Cycle 1 starts 2026-04-01, temperature rises at index 16 (0-based) → offset 16
        # Cycle 2 starts 2026-05-01, temperature rises at index 14 (0-based) → offset 14
        # Roetzer rule: 3 consecutive readings >= baseline + 0.2
        def make_temps(start_iso: str, rise_index: int) -> list[dict]:
            """Generate basal temp entries: low up to rise_index, high from rise_index on."""
            from datetime import date, timedelta
            start = date.fromisoformat(start_iso)
            entries = []
            for i in range(rise_index + 5):
                d = (start + timedelta(days=i)).isoformat()
                temp = 36.5 if i < rise_index else 36.8
                entries.append({"date": d, "basal_temp": temp})
            return entries

        symptoms = make_temps("2026-04-01", 16) + make_temps("2026-05-01", 14)
        cycle_starts = ["2026-04-01", "2026-05-01"]
        result = model.learn_ovulation_pattern(symptoms, cycle_starts)
        # Average of offsets 16 and 14 = 15
        self.assertIsNotNone(result)
        self.assertEqual(result, 15)

    def test_learn_ovulation_pattern_ignores_offsets_out_of_range(self) -> None:
        # Offsets < 8 or > 25 should be excluded
        from datetime import date, timedelta

        def make_temps(start_iso: str, rise_index: int) -> list[dict]:
            start = date.fromisoformat(start_iso)
            entries = []
            for i in range(rise_index + 5):
                d = (start + timedelta(days=i)).isoformat()
                temp = 36.5 if i < rise_index else 36.8
                entries.append({"date": d, "basal_temp": temp})
            return entries

        # Cycle 1: rise_index=4 → offset 4 (too early, < 8, excluded)
        # Cycles 2 and 3: rise_index=16 → offset 16
        symptoms = make_temps("2026-03-01", 4) + make_temps("2026-04-01", 16) + make_temps("2026-05-01", 16)
        cycle_starts = ["2026-03-01", "2026-04-01", "2026-05-01"]
        result = model.learn_ovulation_pattern(symptoms, cycle_starts)
        # offset 4 excluded, remaining [16, 16] → average 16
        self.assertEqual(result, 16)

    def test_build_cycle_model_uses_learned_offset_when_available(self) -> None:
        from datetime import date, timedelta

        def make_temps(start_iso: str, rise_index: int) -> list[dict]:
            start = date.fromisoformat(start_iso)
            entries = []
            for i in range(rise_index + 5):
                d = (start + timedelta(days=i)).isoformat()
                temp = 36.5 if i < rise_index else 36.8
                entries.append({"date": d, "basal_temp": temp})
            return entries

        # Two previous cycles with rise_index=16 → offset 16
        symptoms = make_temps("2026-04-01", 16) + make_temps("2026-05-01", 16)
        # History includes two previous cycles and current one
        history = [
            *[f"2026-04-0{d}" for d in range(1, 6)],
            *[f"2026-05-0{d}" for d in range(1, 6)],
            *[f"2026-06-0{d}" for d in range(1, 6)],
        ]
        cycle = model.build_cycle_model(
            history=history,
            period_duration_days=5,
            symptom_history=symptoms,
            today=date(2026, 6, 10),
        )
        # learned_ovulation_offset should be 16
        self.assertEqual(cycle.learned_ovulation_offset, 16)
        # ovulation_day should be cycle_start + 16 days = 2026-06-01 + 16 = 2026-06-17
        self.assertEqual(cycle.ovulation_day, "2026-06-17")

    def test_build_cycle_model_hybrid_mode_uses_formula_when_no_temperature_data(self) -> None:
        # Hybrid mode (default): no symptoms → falls back to the statistical formula.
        cycle = model.build_cycle_model(
            history=["2026-06-01", "2026-06-29"],
            period_duration_days=5,
            symptom_history=[],
            today=date(2026, 7, 1),
            nfp_mode="hybrid",
        )

        self.assertEqual(cycle.nfp_mode, "hybrid")
        # Formula: next_date - (cycle - cycle//2 + 1) = 2026-07-27 - 15 = 2026-07-12
        self.assertEqual(cycle.ovulation_day, "2026-07-12")
        self.assertEqual(cycle.fertile_window_start, "2026-07-07")
        self.assertEqual(cycle.fertile_window_end, "2026-07-17")

    def test_build_cycle_model_strict_mode_hides_ovulation_without_confirmed_temperature_rise(self) -> None:
        # Strict mode: no temperature rise logged → ovulation/fertile window must be None.
        cycle = model.build_cycle_model(
            history=["2026-06-01", "2026-06-29"],
            period_duration_days=5,
            symptom_history=[],
            today=date(2026, 7, 1),
            nfp_mode="strict",
        )

        self.assertEqual(cycle.nfp_mode, "strict")
        self.assertIsNone(cycle.ovulation_day)
        self.assertIsNone(cycle.fertile_window_start)
        self.assertIsNone(cycle.fertile_window_end)

    def test_build_cycle_model_strict_mode_shows_ovulation_when_temperature_rise_confirmed(self) -> None:
        # Strict mode: confirmed temperature rise + cervical mucus peak in current cycle → ovulation shown.
        # Need both temperature rise AND mucus data to reach medium/high confidence.
        from datetime import timedelta

        cycle_start = date(2026, 6, 1)
        rise_day_index = 14  # day 15 of cycle

        symptoms = []
        for i in range(rise_day_index + 3):
            d = (cycle_start + timedelta(days=i)).isoformat()
            temp = 36.5 if i < rise_day_index else 36.85
            # Add cervical mucus fertile days just before the rise → mucus_peak triggers medium confidence
            mucus = "fadenziehend" if rise_day_index - 3 <= i < rise_day_index else ""
            entry: dict = {"date": d, "basal_temp": temp}
            if mucus:
                entry["cervical_mucus"] = mucus
            symptoms.append(entry)

        cycle = model.build_cycle_model(
            history=["2026-05-01", str(cycle_start)],
            period_duration_days=5,
            symptom_history=symptoms,
            today=date(2026, 6, 20),
            nfp_mode="strict",
        )

        self.assertEqual(cycle.nfp_mode, "strict")
        # Ovulation should be pinned to the temperature_rise_day from NFP analysis.
        self.assertIsNotNone(cycle.ovulation_day)
        # Fertile window should span 5 days before through 1 day after the temp rise.
        if cycle.ovulation_day and cycle.fertile_window_start and cycle.fertile_window_end:
            ov = date.fromisoformat(cycle.ovulation_day)
            self.assertEqual(date.fromisoformat(cycle.fertile_window_start), ov - timedelta(days=5))
            self.assertEqual(date.fromisoformat(cycle.fertile_window_end), ov + timedelta(days=1))

    def test_nfp_temperature_rise_detected_on_05_august_2026(self) -> None:
        """Temperature rise must be identified on 2026-08-05 (36.1 → 36.6).

        The dataset shows a flat pre-ovulatory phase around 36.1–36.2 that
        drops back to 36.1 on 2026-08-02 and 2026-08-04, ruling out an
        earlier rise.  The clear jump to 36.6 on 2026-08-05, sustained at
        36.5 on 2026-08-06, is the first genuine Roetzer-compliant rise.
        """
        symptom_history = [
            {"date": "2026-07-22", "basal_temp": 36.2, "bleeding_strength": "heavy"},
            {"date": "2026-07-23", "basal_temp": 36.1, "bleeding_strength": "heavy"},
            {"date": "2026-07-24", "basal_temp": 36.1, "bleeding_strength": "heavy"},
            {"date": "2026-07-25", "basal_temp": 36.0, "bleeding_strength": "medium"},
            {"date": "2026-07-26", "basal_temp": 36.2, "bleeding_strength": "heavy"},
            {"date": "2026-07-27", "basal_temp": 36.2, "bleeding_strength": "medium"},
            {"date": "2026-07-28", "basal_temp": 36.2},
            {"date": "2026-07-29", "basal_temp": 36.2},
            {"date": "2026-07-30", "basal_temp": 36.2, "cervical_mucus": "cremig"},
            {"date": "2026-07-31", "basal_temp": 36.2, "cervical_mucus": "cremig"},
            {"date": "2026-08-01", "basal_temp": 36.2, "cervical_mucus": "cremig"},
            {"date": "2026-08-02", "basal_temp": 36.1, "cervical_mucus": "cremig"},
            {"date": "2026-08-03", "basal_temp": 36.2, "cervical_mucus": "cremig"},
            {"date": "2026-08-04", "basal_temp": 36.1, "cervical_mucus": "fadenziehend"},
            {"date": "2026-08-05", "basal_temp": 36.6, "cervical_mucus": "fadenziehend"},
            {"date": "2026-08-06", "basal_temp": 36.5},
        ]

        result = model.analyze_nfp_cycle(
            symptom_history=symptom_history,
            cycle_start_iso="2026-07-22",
            period_duration_days=6,
        )

        # The Roetzer rise must start on 2026-08-05, not on an earlier day
        # whose elevated level was subsequently invalidated by a drop to 36.1.
        self.assertTrue(result["temperature_rise_detected"])
        self.assertEqual(result["temperature_rise_day"], "2026-08-05")

        # Mucus peak (last fertile-quality mucus) is also 2026-08-05.
        self.assertEqual(result["cervical_mucus_peak"], "2026-08-05")

        # Temperature peak day (highest post-period temperature) is 2026-08-05.
        self.assertEqual(result["temperature_peak_day"], "2026-08-05")

        # Rise day and mucus peak coincide → no conflicting signals.
        self.assertFalse(result["details"]["conflicting_signals"])
        self.assertTrue(result["details"]["temperature_rise_confirmed"])

    def test_nfp_temperature_rise_day_does_not_match_invalidated_early_candidate(self) -> None:
        """An early temperature rise that is later followed by a drop must not be reported.

        Without mucus / cervix data the earliest reading that reaches baseline+0.2
        comes from the flat 36.2 plateau.  Because 2026-08-02 (36.1) drops back
        below the threshold of 36.2, that plateau must not be accepted as a rise.
        Only the 2026-08-05 jump qualifies.
        """
        symptom_history = [
            {"date": "2026-07-22", "basal_temp": 36.2},
            {"date": "2026-07-23", "basal_temp": 36.1},
            {"date": "2026-07-24", "basal_temp": 36.1},
            {"date": "2026-07-25", "basal_temp": 36.0},
            {"date": "2026-07-26", "basal_temp": 36.2},
            {"date": "2026-07-27", "basal_temp": 36.2},
            {"date": "2026-07-28", "basal_temp": 36.2},
            {"date": "2026-07-29", "basal_temp": 36.2},
            {"date": "2026-07-30", "basal_temp": 36.2},
            {"date": "2026-07-31", "basal_temp": 36.2},
            {"date": "2026-08-01", "basal_temp": 36.2},
            {"date": "2026-08-02", "basal_temp": 36.1},
            {"date": "2026-08-03", "basal_temp": 36.2},
            {"date": "2026-08-04", "basal_temp": 36.1},
            {"date": "2026-08-05", "basal_temp": 36.6},
            {"date": "2026-08-06", "basal_temp": 36.5},
        ]

        result = model.analyze_nfp_cycle(
            symptom_history=symptom_history,
            cycle_start_iso="2026-07-22",
            period_duration_days=6,
        )

        # temperature_rise_day must not be 2026-07-28 (invalidated by 2026-08-02 drop).
        self.assertNotEqual(result["temperature_rise_day"], "2026-07-28")
        # The confirmed rise starts on 2026-08-05.
        self.assertEqual(result["temperature_rise_day"], "2026-08-05")
        self.assertTrue(result["temperature_rise_detected"])

        # Temperature peak is on 2026-08-05 (highest post-period reading).
        self.assertEqual(result["temperature_peak_day"], "2026-08-05")

    def test_nfp_temperature_peak_day_is_separate_from_rise_day(self) -> None:
        """temperature_peak_day must reflect the highest reading, not the rise start.

        When the rise begins on day X but the highest temperature is on a later
        day Y, both fields must be present and distinct.
        """
        from datetime import timedelta as td

        cycle_start = date(2026, 6, 1)
        # Low phase (36.5) for 14 days, then rises: 36.8, 36.9, 37.0, 36.8, 36.8
        entries = []
        for i in range(14):
            entries.append({
                "date": (cycle_start + td(days=i)).isoformat(),
                "basal_temp": 36.5,
            })
        high_temps = [36.8, 36.9, 37.0, 36.8, 36.8]
        for j, t in enumerate(high_temps):
            entries.append({
                "date": (cycle_start + td(days=14 + j)).isoformat(),
                "basal_temp": t,
            })

        result = model.analyze_nfp_cycle(
            symptom_history=entries,
            cycle_start_iso=cycle_start.isoformat(),
            period_duration_days=5,
        )

        self.assertTrue(result["temperature_rise_detected"])
        # Rise starts on day 14 (first high reading).
        self.assertEqual(result["temperature_rise_day"], (cycle_start + td(days=14)).isoformat())
        # Peak is on day 16 (highest reading = 37.0).
        self.assertEqual(result["temperature_peak_day"], (cycle_start + td(days=16)).isoformat())
        # The two fields must differ.
        self.assertNotEqual(result["temperature_rise_day"], result["temperature_peak_day"])



        entries = [
            {"created_at": "2026-07-18T09:15:00Z", "product": "pantyliners", "quantity": "2"},
            {"date": "2026-07-19T10:30:00+02:00", "product": "period panties"},
            {"timestamp": "1752883200", "product": "binde"},
        ]

        normalized = storage.MenstruationStorage._normalize_product_usage(entries)

        self.assertEqual(
            normalized,
            [
                {"date": "2025-07-19", "product": "pad", "quantity": 1, "action": "used"},
                {"date": "2026-07-18", "product": "liner", "quantity": 2, "action": "used"},
                {"date": "2026-07-19", "product": "underwear", "quantity": 1, "action": "used"},
            ],
        )

    def test_storage_normalizes_quantity_variants(self) -> None:
        normalized = storage.MenstruationStorage._normalize_product_usage(
            [
                {"date": "2026-07-18", "product": "tampon", "quantity": "3"},
                {"date": "2026-07-18", "product": "pad", "quantity": "2x"},
                {"date": "2026-07-18", "product": "cup", "quantity": "3.0"},
                {"date": "2026-07-18", "product": "liner", "quantity": "0"},
                {"date": "2026-07-18", "product": "underwear", "quantity": "invalid"},
            ]
        )

        self.assertEqual(
            normalized,
            [
                {"date": "2026-07-18", "product": "cup", "quantity": 3, "action": "used"},
                {"date": "2026-07-18", "product": "liner", "quantity": 1, "action": "used"},
                {"date": "2026-07-18", "product": "pad", "quantity": 2, "action": "used"},
                {"date": "2026-07-18", "product": "tampon", "quantity": 3, "action": "used"},
                {"date": "2026-07-18", "product": "underwear", "quantity": 1, "action": "used"},
            ],
        )

    def test_merge_product_usage_sources_uses_symptom_fallbacks(self) -> None:
        merged = sensor._merge_product_usage_sources(
            [
                {"date": "2026-07-18", "product": "tampon", "quantity": 2},
            ],
            [
                {"date": "2026-07-18", "hygiene": ["tampon", "period_underwear"]},
                {"date": "2026-07-19", "hygiene": ["pantyliners"]},
            ],
        )

        self.assertEqual(
            merged,
            [
                {"date": "2026-07-18", "product": "tampon", "quantity": 2, "action": "used"},
                {"date": "2026-07-18", "product": "underwear", "quantity": 1, "action": "used"},
                {"date": "2026-07-19", "product": "liner", "quantity": 1, "action": "used"},
            ],
        )

    def test_compact_product_usage_includes_exact_cutoff_day(self) -> None:
        compact = sensor._compact_product_usage_for_sensor(
            product_usage=[],
            symptom_history=[
                {"date": "2026-06-19", "hygiene": ["tampon"]},
                {"date": "2026-06-20", "hygiene": ["pad"]},
                {"date": "2026-07-19", "hygiene": ["period_underwear"]},
            ],
            today=date(2026, 7, 19),
            days=30,
        )

        self.assertEqual(
            compact,
            [
                {"date": "2026-06-20", "product": "pad", "quantity": 1, "action": "used"},
                {"date": "2026-07-19", "product": "underwear", "quantity": 1, "action": "used"},
            ],
        )

    def test_build_product_usage_stats_counts_mixed_sources(self) -> None:
        stats = sensor._build_product_usage_stats(
            history=["2026-07-18", "2026-07-19"],
            product_usage=[
                {"created_at": "2026-07-18T08:00:00Z", "product": "tampon", "quantity": 2},
                {"date": "2026-07-18", "product": "cup", "quantity": 1, "action": "emptied"},
            ],
            today=date(2026, 7, 19),
            symptom_history=[
                {"date": "2026-07-18", "hygiene": ["tampon", "pantyliners", "period_underwear"]},
                {"date": "2026-07-19", "hygiene": ["binde"]},
            ],
        )

        self.assertEqual(stats["today"], {"tampon": 0, "pad": 1, "cup": 0, "liner": 0, "underwear": 0})
        self.assertEqual(stats["this_cycle"], {"tampon": 2, "pad": 1, "cup": 1, "liner": 1, "underwear": 1})
        self.assertEqual(stats["stats"]["cycles_considered"], 1)
        self.assertEqual(stats["stats"]["average_per_cycle"], {"tampon": 2, "pad": 1, "cup": 1, "liner": 1, "underwear": 1})

    def test_build_product_usage_stats_sums_quantities_same_day(self) -> None:
        stats = sensor._build_product_usage_stats(
            history=["2026-07-18", "2026-07-19"],
            product_usage=[
                {"date": "2026-07-18", "product": "tampon", "quantity": "2x"},
                {"date": "2026-07-18", "product": "tampon", "quantity": "3"},
                {"date": "2026-07-18", "product": "pad", "quantity": 0},
                {"date": "2026-07-18", "product": "cup", "quantity": None},
            ],
            today=date(2026, 7, 19),
            symptom_history=[],
        )

        self.assertEqual(stats["today"], {"tampon": 0, "pad": 0, "cup": 0, "liner": 0, "underwear": 0})
        self.assertEqual(stats["this_cycle"], {"tampon": 5, "pad": 1, "cup": 1, "liner": 0, "underwear": 0})
        self.assertEqual(stats["stats"]["average_per_cycle"], {"tampon": 5, "pad": 1, "cup": 1, "liner": 0, "underwear": 0})


class _FakeLovelaceCollection:
    def __init__(self, items: list[dict[str, str]] | None = None) -> None:
        self._items = list(items or [])
        self.create_calls: list[dict[str, str]] = []
        self.raise_on_create = False

    async def async_items(self) -> list[dict[str, str]]:
        return list(self._items)

    async def async_create_item(self, payload: dict[str, str]) -> None:
        self.create_calls.append(payload)
        if self.raise_on_create:
            self._items.append({"url": payload["url"]})
            raise RuntimeError("create failed after write")
        self._items.append({"url": payload["url"]})


class ManifestMetadataTests(unittest.TestCase):
    def test_manifest_omits_frontend_extra_module_url_and_matches_resource_version(self) -> None:
        with (COMPONENT_ROOT / "manifest.json").open(encoding="utf-8") as manifest_file:
            manifest = json.load(manifest_file)

        self.assertNotIn("frontend_extra_module_url", manifest)
        self.assertEqual(integration.RESOURCE_VERSION, manifest["version"])


class LovelaceResourceRegistrationTests(unittest.TestCase):
    def test_lovelace_resources_include_shared_i18n_loader_first(self) -> None:
        resource_urls = [resource_url for resource_url, _static_url, _filename in integration.LOVELACE_RESOURCES]
        filenames = [filename for _resource_url, _static_url, filename in integration.LOVELACE_RESOURCES]

        self.assertGreater(len(filenames), 0)
        self.assertEqual(filenames[0], "menstruation-i18n.js")
        self.assertIn("menstruation-i18n.js", filenames)
        self.assertIn(f"/{integration.DOMAIN}/menstruation-i18n.js?v={integration.RESOURCE_VERSION}", resource_urls)

    def test_ensure_lovelace_resource_skips_existing_normalized_urls(self) -> None:
        resource_url, _, _ = integration.LOVELACE_RESOURCES[0]
        normalized_url = integration._normalize_resource_url(resource_url)
        self.assertIsNotNone(normalized_url)
        assert normalized_url is not None

        collection = _FakeLovelaceCollection([{"url": f"{normalized_url}?v=0.0.1"}])
        hass = _FakeHass()

        async def _fake_get_collection(_hass):
            return collection, "storage"

        async def _fake_cleanup(_hass, _version):
            return None

        original_get_collection = integration._async_get_lovelace_resource_collection
        original_cleanup = integration._async_cleanup_old_lovelace_resources
        integration._async_get_lovelace_resource_collection = _fake_get_collection
        integration._async_cleanup_old_lovelace_resources = _fake_cleanup

        original_resources = integration.LOVELACE_RESOURCES
        integration.LOVELACE_RESOURCES = (original_resources[0],)
        try:
            asyncio.run(integration._async_ensure_lovelace_resource(hass))
        finally:
            integration._async_get_lovelace_resource_collection = original_get_collection
            integration._async_cleanup_old_lovelace_resources = original_cleanup
            integration.LOVELACE_RESOURCES = original_resources

        self.assertEqual(collection.create_calls, [])

    def test_ensure_lovelace_resource_stops_fallback_payloads_when_resource_appears(self) -> None:
        resource_url, _, _ = integration.LOVELACE_RESOURCES[0]
        collection = _FakeLovelaceCollection()
        collection.raise_on_create = True
        hass = _FakeHass()

        async def _fake_get_collection(_hass):
            return collection, "storage"

        async def _fake_cleanup(_hass, _version):
            return None

        original_get_collection = integration._async_get_lovelace_resource_collection
        original_cleanup = integration._async_cleanup_old_lovelace_resources
        integration._async_get_lovelace_resource_collection = _fake_get_collection
        integration._async_cleanup_old_lovelace_resources = _fake_cleanup

        original_resources = integration.LOVELACE_RESOURCES
        integration.LOVELACE_RESOURCES = (original_resources[0],)
        try:
            asyncio.run(integration._async_ensure_lovelace_resource(hass))
        finally:
            integration._async_get_lovelace_resource_collection = original_get_collection
            integration._async_cleanup_old_lovelace_resources = original_cleanup
            integration.LOVELACE_RESOURCES = original_resources

        self.assertEqual(len(collection.create_calls), 1)
        self.assertEqual(collection.create_calls[0]["url"], resource_url)


class HttpRouteHandlerTests(unittest.TestCase):
    def _make_hass_with_http(self):
        class _FakeRouter:
            def __init__(self):
                self.routes = {}

            def add_get(self, path, handler):
                self.routes[path] = handler

        class _FakeApp:
            def __init__(self):
                self.router = _FakeRouter()

        class _FakeHttp:
            def __init__(self):
                self.app = _FakeApp()

        class _FakeHassWithHttp:
            def __init__(self):
                self.data = {}
                self.http = _FakeHttp()

            async def async_add_executor_job(self, func, *args):
                return func(*args)

        return _FakeHassWithHttp()

    def test_translation_route_returns_200_with_correct_content_type(self) -> None:
        """_serve_translation_file must not raise ValueError from duplicate Content-Type."""
        hass = self._make_hass_with_http()
        asyncio.run(integration._async_register_http_handlers(hass))

        route_key = f"/{integration.DOMAIN}/translations/{{filename}}"
        handler = hass.http.app.router.routes.get(route_key)
        self.assertIsNotNone(handler, f"Route {route_key} was not registered")

        class _FakeRequest:
            match_info = {"filename": "en.json"}

        response = asyncio.run(handler(_FakeRequest()))
        self.assertEqual(response.status, 200)
        self.assertEqual(response.content_type, "application/json")

    def test_translation_route_returns_404_for_missing_file(self) -> None:
        """_serve_translation_file must return 404 when the translation file does not exist."""
        from aiohttp.web import HTTPNotFound

        hass = self._make_hass_with_http()
        asyncio.run(integration._async_register_http_handlers(hass))

        route_key = f"/{integration.DOMAIN}/translations/{{filename}}"
        handler = hass.http.app.router.routes.get(route_key)
        self.assertIsNotNone(handler)

        class _FakeRequest:
            match_info = {"filename": "zz.json"}

        with self.assertRaises(HTTPNotFound):
            asyncio.run(handler(_FakeRequest()))

    def test_translation_route_returns_400_for_path_traversal(self) -> None:
        """_serve_translation_file must reject filenames with path separators."""
        from aiohttp.web import HTTPBadRequest

        hass = self._make_hass_with_http()
        asyncio.run(integration._async_register_http_handlers(hass))

        route_key = f"/{integration.DOMAIN}/translations/{{filename}}"
        handler = hass.http.app.router.routes.get(route_key)
        self.assertIsNotNone(handler)

        class _FakeRequest:
            match_info = {"filename": "../secret.json"}

        with self.assertRaises(HTTPBadRequest):
            asyncio.run(handler(_FakeRequest()))


if __name__ == "__main__":
    unittest.main()
