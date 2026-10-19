"""Reduced partner ICS feed: predicted periods + fertile window only, behind a token derived from the main one."""

from __future__ import annotations

import re
import unittest
from datetime import date, timedelta

from test_ics_feed import _make_forecasts, ical

EXTRA = [("pregnancy_due", date.today() + timedelta(days=10), date.today() + timedelta(days=10), "Due date")]


class PartnerFeedTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pf, self.ff, _ = _make_forecasts()

    def _ics(self, partner: bool) -> str:
        return ical.generate_ics(
            "e1", self.pf, self.ff, 28, 6, "en", 2, date.today() + timedelta(days=5), date.today(), EXTRA, partner
        ).decode()

    def test_partner_feed_has_only_period_and_fertile_window(self) -> None:
        text = self._ics(True)
        summaries = set(re.findall(r"^SUMMARY:(.*?)\r?$", text, re.M))
        self.assertEqual(summaries, {"Period (predicted)", "Fertile window (predicted)"})
        for leaked in ("DESCRIPTION", "VALARM", "confidence"):
            self.assertNotIn(leaked, text)

    def test_full_feed_is_unchanged_and_uids_do_not_collide(self) -> None:
        full = self._ics(False)
        self.assertIn("Ovulation", full)
        self.assertIn("Due date", full)
        self.assertIn("VALARM", full)
        self.assertFalse(set(re.findall(r"^UID:(.*?)\r?$", full, re.M)) & set(re.findall(r"^UID:(.*?)\r?$", self._ics(True), re.M)))

    def test_partner_token_is_stable_url_safe_and_differs_per_token(self) -> None:
        a = ical.derive_partner_token("main-token-a")
        self.assertEqual(a, ical.derive_partner_token("main-token-a"))
        self.assertNotEqual(a, ical.derive_partner_token("main-token-b"))
        self.assertNotIn("main-token-a", a)
        self.assertRegex(a, r"^[A-Za-z0-9_-]{43}$")


if __name__ == "__main__":
    unittest.main()
