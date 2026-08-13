"""Tests for the ICS feed generator (ical.py)."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from datetime import date, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPONENT_ROOT = REPO_ROOT / "custom_components" / "menstruation_cycle"


def _install_homeassistant_stubs() -> None:
    for name in [
        "homeassistant",
        "homeassistant.components",
        "homeassistant.components.sensor",
        "homeassistant.config_entries",
        "homeassistant.const",
        "homeassistant.core",
        "homeassistant.exceptions",
        "homeassistant.helpers",
        "homeassistant.helpers.config_validation",
        "homeassistant.helpers.entity",
        "homeassistant.helpers.entity_platform",
        "homeassistant.helpers.entity_registry",
        "homeassistant.helpers.dispatcher",
        "homeassistant.helpers.event",
        "homeassistant.helpers.storage",
        "homeassistant.helpers.typing",
        "homeassistant.util",
        "homeassistant.util.dt",
    ]:
        if name not in sys.modules:
            mod = types.ModuleType(name)
            mod.__path__ = []  # type: ignore[attr-defined]
            sys.modules[name] = mod


def _load_module(module_name: str, file_name: str):
    spec = importlib.util.spec_from_file_location(module_name, COMPONENT_ROOT / file_name)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


_install_homeassistant_stubs()
_pkg = types.ModuleType("mctest")
_pkg.__path__ = [str(COMPONENT_ROOT)]  # type: ignore[attr-defined]
sys.modules.setdefault("mctest", _pkg)
_load_module("mctest.const", "const.py")
model = _load_module("mctest.model", "model.py")
ical = _load_module("mctest.ical", "ical.py")

generate_ics = ical.generate_ics
_deterministic_uid = ical._deterministic_uid
compute_period_forecast = model.compute_period_forecast
compute_fertility_forecast = model.compute_fertility_forecast


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_forecasts(
    cycle_starts: list[str] | None = None,
    next_start: str | None = None,
    period_duration: int = 5,
    avg_cycle: int = 28,
):
    """Build period + fertility forecasts for test data."""
    if cycle_starts is None:
        today = date.today()
        # Build 4 past cycle starts with 28-day spacing
        starts = [(today - timedelta(days=28 * i)).isoformat() for i in range(4, 0, -1)]
        cycle_starts = starts
    if next_start is None:
        last = date.fromisoformat(cycle_starts[-1])
        next_start = (last + timedelta(days=avg_cycle)).isoformat()

    period_forecast = compute_period_forecast(cycle_starts, next_start, period_duration)

    # Compute basic fertile window/ovulation from next_start and avg_cycle
    next_date = date.fromisoformat(next_start)
    ovulation = (next_date - timedelta(days=14)).isoformat()
    fw_start = (date.fromisoformat(ovulation) - timedelta(days=5)).isoformat()
    fw_end = (date.fromisoformat(ovulation) + timedelta(days=1)).isoformat()

    fertility_forecast = compute_fertility_forecast(
        next_predicted_start=next_start,
        avg_cycle_length=avg_cycle,
        fertile_window_start=fw_start,
        fertile_window_end=fw_end,
        ovulation_day=ovulation,
        nfp_analysis=None,
    )
    return period_forecast, fertility_forecast, next_start


class TestGenerateIcsStructure(unittest.TestCase):
    """Test that generate_ics returns valid VCALENDAR bytes."""

    def setUp(self):
        self.pf, self.ff, self.next_start = _make_forecasts()
        self.entry_id = "test-entry-abc123"

    def test_returns_bytes(self):
        result = generate_ics(self.entry_id, self.pf, self.ff)
        self.assertIsInstance(result, bytes)

    def test_utf8_decodable(self):
        result = generate_ics(self.entry_id, self.pf, self.ff)
        text = result.decode("utf-8")
        self.assertIn("BEGIN:VCALENDAR", text)

    def test_vcalendar_wrapper(self):
        text = generate_ics(self.entry_id, self.pf, self.ff).decode("utf-8")
        self.assertTrue(text.startswith("BEGIN:VCALENDAR"))
        self.assertIn("END:VCALENDAR", text)

    def test_required_fields(self):
        text = generate_ics(self.entry_id, self.pf, self.ff).decode("utf-8")
        self.assertIn("VERSION:2.0", text)
        self.assertIn("PRODID:", text)
        self.assertIn("CALSCALE:GREGORIAN", text)
        self.assertIn("METHOD:PUBLISH", text)

    def test_crlf_line_endings(self):
        result = generate_ics(self.entry_id, self.pf, self.ff)
        self.assertIn(b"\r\n", result)
        # Every non-empty line should end with CRLF
        lines = result.split(b"\r\n")
        self.assertGreater(len(lines), 2)


class TestGenerateIcsEventTypes(unittest.TestCase):
    """Test that correct event types are included."""

    def setUp(self):
        self.pf, self.ff, _ = _make_forecasts()
        self.entry_id = "entry-events-test"

    def test_period_events_present(self):
        text = generate_ics(self.entry_id, self.pf, self.ff).decode("utf-8")
        self.assertIn("Period (predicted)", text)

    def test_fertile_window_events_present(self):
        text = generate_ics(self.entry_id, self.pf, self.ff).decode("utf-8")
        self.assertIn("Fertile window (predicted)", text)

    def test_ovulation_events_present(self):
        text = generate_ics(self.entry_id, self.pf, self.ff).decode("utf-8")
        self.assertIn("Ovulation (predicted)", text)

    def test_event_count_reasonable(self):
        """12 months should give approximately 12 period + 12 fertile + 12 ovulation events."""
        text = generate_ics(self.entry_id, self.pf, self.ff, horizon_months=12).decode("utf-8")
        period_count = text.count("Period (predicted)")
        fertile_count = text.count("Fertile window (predicted)")
        ov_count = text.count("Ovulation (predicted)")
        # At least 10 and no more than 15 of each in 12 months
        self.assertGreaterEqual(period_count, 10)
        self.assertLessEqual(period_count, 15)
        self.assertGreaterEqual(fertile_count, 10)
        self.assertGreaterEqual(ov_count, 10)

    def test_no_events_when_no_forecast(self):
        """With no forecasts, should produce empty but valid VCALENDAR."""
        text = generate_ics(self.entry_id, None, None).decode("utf-8")
        self.assertIn("BEGIN:VCALENDAR", text)
        self.assertIn("END:VCALENDAR", text)
        self.assertNotIn("BEGIN:VEVENT", text)


class TestGenerateIcsAllDayDates(unittest.TestCase):
    """Test that all-day date format is used."""

    def setUp(self):
        self.pf, self.ff, _ = _make_forecasts()
        self.entry_id = "entry-allday-test"

    def test_dtstart_value_date(self):
        text = generate_ics(self.entry_id, self.pf, self.ff).decode("utf-8")
        self.assertIn("DTSTART;VALUE=DATE:", text)
        # Should NOT use TZID or datetime format
        self.assertNotIn("DTSTART;TZID=", text)

    def test_dtend_value_date(self):
        text = generate_ics(self.entry_id, self.pf, self.ff).decode("utf-8")
        self.assertIn("DTEND;VALUE=DATE:", text)

    def test_dates_are_8_digits(self):
        import re
        text = generate_ics(self.entry_id, self.pf, self.ff).decode("utf-8")
        dtstart_dates = re.findall(r"DTSTART;VALUE=DATE:(\d+)", text)
        for d in dtstart_dates:
            self.assertEqual(len(d), 8, f"Expected 8-digit date, got: {d}")
            # Must parse as valid date
            date(int(d[:4]), int(d[4:6]), int(d[6:8]))

    def test_dtend_exclusive(self):
        """DTEND for a single-day event should be start + 1 day (exclusive end)."""
        import re
        text = generate_ics(self.entry_id, self.pf, self.ff).decode("utf-8")
        vevents = text.split("BEGIN:VEVENT")
        for vevent in vevents[1:]:
            dtstart_m = re.search(r"DTSTART;VALUE=DATE:(\d{8})", vevent)
            dtend_m = re.search(r"DTEND;VALUE=DATE:(\d{8})", vevent)
            if dtstart_m and dtend_m:
                start = date(
                    int(dtstart_m.group(1)[:4]),
                    int(dtstart_m.group(1)[4:6]),
                    int(dtstart_m.group(1)[6:8]),
                )
                end = date(
                    int(dtend_m.group(1)[:4]),
                    int(dtend_m.group(1)[4:6]),
                    int(dtend_m.group(1)[6:8]),
                )
                # end must be strictly after start
                self.assertGreater(end, start)


class TestGenerateIcsUIDStability(unittest.TestCase):
    """Test that UIDs are deterministic and stable across regenerations."""

    def setUp(self):
        self.pf, self.ff, _ = _make_forecasts()
        self.entry_id = "entry-uid-test"

    def test_uids_are_deterministic(self):
        import re
        text1 = generate_ics(self.entry_id, self.pf, self.ff).decode("utf-8")
        text2 = generate_ics(self.entry_id, self.pf, self.ff).decode("utf-8")
        uids1 = sorted(re.findall(r"UID:(.+)", text1))
        uids2 = sorted(re.findall(r"UID:(.+)", text2))
        self.assertEqual(uids1, uids2)

    def test_uids_are_unique_within_feed(self):
        import re
        text = generate_ics(self.entry_id, self.pf, self.ff).decode("utf-8")
        uids = re.findall(r"UID:(.+)", text)
        self.assertEqual(len(uids), len(set(uids)), "UIDs should be unique")

    def test_uid_differs_for_different_entry_ids(self):
        uid1 = _deterministic_uid("entry-A", "period", "2026-09-01")
        uid2 = _deterministic_uid("entry-B", "period", "2026-09-01")
        self.assertNotEqual(uid1, uid2)

    def test_uid_differs_for_different_event_types(self):
        uid_period = _deterministic_uid("entry-X", "period", "2026-09-01")
        uid_fertile = _deterministic_uid("entry-X", "fertile", "2026-09-01")
        uid_ov = _deterministic_uid("entry-X", "ovulation", "2026-09-01")
        self.assertNotEqual(uid_period, uid_fertile)
        self.assertNotEqual(uid_period, uid_ov)
        self.assertNotEqual(uid_fertile, uid_ov)

    def test_uid_differs_for_different_dates(self):
        uid1 = _deterministic_uid("entry-X", "period", "2026-09-01")
        uid2 = _deterministic_uid("entry-X", "period", "2026-10-01")
        self.assertNotEqual(uid1, uid2)

    def test_uid_domain_suffix(self):
        uid = _deterministic_uid("entry-X", "period", "2026-09-01")
        self.assertTrue(uid.endswith("@menstruation_cycle.ha"))


class TestGenerateIcsHorizon(unittest.TestCase):
    """Test horizon bounds."""

    def setUp(self):
        self.pf, self.ff, _ = _make_forecasts()
        self.entry_id = "entry-horizon-test"

    def test_short_horizon_fewer_events(self):
        text1 = generate_ics(self.entry_id, self.pf, self.ff, horizon_months=1).decode("utf-8")
        text12 = generate_ics(self.entry_id, self.pf, self.ff, horizon_months=12).decode("utf-8")
        count1 = text1.count("BEGIN:VEVENT")
        count12 = text12.count("BEGIN:VEVENT")
        self.assertLess(count1, count12)

    def test_horizon_capped_at_max(self):
        from mctest.const import ICS_HORIZON_MONTHS_MAX
        # Requesting more than max should be same as max
        text_max = generate_ics(self.entry_id, self.pf, self.ff, horizon_months=ICS_HORIZON_MONTHS_MAX).decode("utf-8")
        text_over = generate_ics(self.entry_id, self.pf, self.ff, horizon_months=ICS_HORIZON_MONTHS_MAX + 100).decode("utf-8")
        self.assertEqual(text_max.count("BEGIN:VEVENT"), text_over.count("BEGIN:VEVENT"))

    def test_horizon_minimum_1(self):
        """Even horizon=0 or negative should produce at least 1 month."""
        text = generate_ics(self.entry_id, self.pf, self.ff, horizon_months=0).decode("utf-8")
        self.assertIn("BEGIN:VCALENDAR", text)


class TestIcsTokenConstants(unittest.TestCase):
    """Test ICS-related constants exist and are reasonable."""

    def test_constants_exist(self):
        from mctest.const import (
            ATTR_ICS_URL,
            ICS_HORIZON_MONTHS_DEFAULT,
            ICS_HORIZON_MONTHS_MAX,
            ICS_TOKEN_KEY,
        )
        self.assertEqual(ATTR_ICS_URL, "ics_url")
        self.assertEqual(ICS_TOKEN_KEY, "ics_token")
        self.assertGreater(ICS_HORIZON_MONTHS_DEFAULT, 0)
        self.assertGreaterEqual(ICS_HORIZON_MONTHS_MAX, ICS_HORIZON_MONTHS_DEFAULT)


if __name__ == "__main__":
    unittest.main()
