"""Home Assistant's time zone, not the system clock, decides what "today" is.

date.today()/datetime.now() read the process time zone, which differs from the zone configured in Home Assistant
(e.g. in a container without TZ): around midnight the integration would then work with the wrong day. Modules that
talk to Home Assistant must use dt_util.now(); pure helpers only fall back to the system date when no day is passed.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"
HA_FACING = ("__init__.py", "sensor.py", "calendar.py", "image.py", "config_flow.py", "todo.py", "logbook.py", "diagnostics.py", "storage.py")
PATTERN = re.compile(r"\b(?:date\.today|datetime\.now|datetime\.today|datetime\.utcnow)\(\)")


class SystemDateTests(unittest.TestCase):
    def test_ha_facing_modules_never_read_the_system_clock(self) -> None:
        problems = []
        for name in HA_FACING:
            for number, line in enumerate((ROOT / name).read_text(encoding="utf-8").splitlines(), 1):
                if PATTERN.search(line) and not line.lstrip().startswith("#"):
                    problems.append(f"{name}:{number}: {line.strip()}")
        self.assertEqual(problems, [])

    def test_every_cycle_model_call_passes_today(self) -> None:
        """build_cycle_model without today= would fall back to the system date."""
        problems = []
        for name in HA_FACING:
            source = (ROOT / name).read_text(encoding="utf-8")
            for match in re.finditer(r"build_cycle_model\(\s*\n(.*?)\n\s*\)", source, re.S):
                if "today=" not in match.group(1):
                    problems.append(f"{name}: build_cycle_model(...) without today=")
        self.assertEqual(problems, [])


if __name__ == "__main__":
    unittest.main()
