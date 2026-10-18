"""Speed work (model cache, per-profile refresh signal, gzip for card files).

The model cache must be invisible: same result as a fresh build, rebuilt as soon as anything it depends on changes.
"""

from __future__ import annotations

import gzip
import os
import sys
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_notifications as tn  # noqa: E402  (loads the integration package with Home Assistant stubs)

model_mod = sys.modules[f"{tn._PKG}.model"]
const = tn.const
integration = tn.integration
TODAY = date(2026, 10, 6)
COMPONENT = Path(__file__).resolve().parents[1] / "custom_components" / "menstruation_cycle"


def _runtime():
    starts = [(TODAY - timedelta(days=28 * k + 3)).isoformat() for k in range(6, 0, -1)]
    logs = [{"date": (TODAY - timedelta(days=k)).isoformat(), "basal_temp": 36.4} for k in range(10)]
    return tn._runtime(history=starts, symptom_history=logs)


class CountingBuild:
    def __enter__(self):
        self.calls = 0
        real = model_mod.build_cycle_model

        def counting(*args, **kwargs):
            self.calls += 1
            return real(*args, **kwargs)

        self._patch = patch.object(model_mod, "build_cycle_model", counting)
        self._patch.start()
        return self

    def __exit__(self, *exc):
        self._patch.stop()


class ModelCacheTests(unittest.TestCase):
    def test_same_inputs_are_built_once_and_shared(self):
        rt = _runtime()
        with CountingBuild() as counter:
            first = model_mod.cached_cycle_model(rt, TODAY)
            second = model_mod.cached_cycle_model(rt, TODAY)
        self.assertIs(first, second)
        self.assertEqual(counter.calls, 1)

    def test_result_equals_a_fresh_build(self):
        rt = _runtime()
        cached = model_mod.cached_cycle_model(rt, TODAY, nfp_mode="strict", onboarding_stage="established")
        fresh = model_mod.build_cycle_model(
            rt.history, rt.period_duration_days, rt.symptom_history, rt.pregnancy_data, rt.menarche_data,
            rt.pre_menarche_data, rt.menopause_data, rt.noncycle_data, TODAY, rt.cycle_length_override,
            nfp_mode="strict", onboarding_stage="established",
        )
        self.assertEqual(cached, fresh)

    def test_in_place_edits_are_noticed(self):
        for edit in (
            lambda rt: rt.history.append((TODAY + timedelta(days=1)).isoformat()),
            lambda rt: rt.symptom_history[0].update(basal_temp=37.1),
            lambda rt: rt.symptom_history.pop(),
            lambda rt: rt.noncycle_data.update(ovulation_confirmed_cycle="x"),
            lambda rt: rt.pregnancy_data.update(is_pregnant=True, start_date=(TODAY - timedelta(days=20)).isoformat()),
            lambda rt: setattr(rt, "cycle_length_override", 31),
            lambda rt: setattr(rt, "period_duration_days", 7),
        ):
            rt = _runtime()
            with CountingBuild() as counter:
                model_mod.cached_cycle_model(rt, TODAY)
                edit(rt)
                model_mod.cached_cycle_model(rt, TODAY)
            self.assertEqual(counter.calls, 2)

    def test_new_day_rebuilds_and_drops_old_entries(self):
        rt = _runtime()
        with CountingBuild() as counter:
            model_mod.cached_cycle_model(rt, TODAY)
            model_mod.cached_cycle_model(rt, TODAY + timedelta(days=1))
        self.assertEqual(counter.calls, 2)
        self.assertEqual({key[0] for key in rt.model_cache}, {TODAY + timedelta(days=1)})

    def test_modes_are_separate_entries_and_cache_stays_small(self):
        rt = _runtime()
        with CountingBuild() as counter:
            for mode in ("hybrid", "strict", "hybrid", "strict"):
                model_mod.cached_cycle_model(rt, TODAY, nfp_mode=mode)
            model_mod.cached_cycle_model(rt, TODAY, onboarding_stage="established")
        self.assertEqual(counter.calls, 3)
        self.assertEqual(len(rt.model_cache), 3)
        rt.history.append((TODAY + timedelta(days=2)).isoformat())
        model_mod.cached_cycle_model(rt, TODAY)
        self.assertEqual(len(rt.model_cache), 1)


class RefreshSignalTests(unittest.TestCase):
    def test_truth_table(self):
        applies = const.history_signal_applies
        self.assertTrue(applies("a"))  # options save: no payload -> everyone
        self.assertTrue(applies("a", frozenset({"a", "b"})))
        self.assertFalse(applies("c", frozenset({"a", "b"})))
        self.assertFalse(applies("a", frozenset({"a"}), True, sensor=True))  # sensors are refreshed separately
        self.assertTrue(applies("a", frozenset({"a"}), True, sensor=False))  # image/calendar/todo still follow
        self.assertTrue(applies("a", frozenset({"a"}), False, sensor=True))

    def test_refresh_sends_changed_profiles_and_sensor_flag(self):
        sent = []
        entity_entries = {"e1": [SimpleNamespace(domain="sensor", entity_id="sensor.a")], "e2": []}
        hass = SimpleNamespace(
            data={const.DOMAIN: {"e1": object(), "e2": object()}},
            services=SimpleNamespace(async_call=lambda *a, **k: tn.asyncio.sleep(0)),
        )
        er = SimpleNamespace(async_get=lambda h: None, async_entries_for_config_entry=lambda reg, eid: entity_entries[eid])
        with patch.object(integration, "er", er), patch.object(integration, "Platform", SimpleNamespace(SENSOR="sensor")), patch.object(
            integration, "async_dispatcher_send", lambda h, signal, *payload: sent.append((signal, payload))
        ):
            tn._run(integration._async_refresh_cycle_model(hass, {"e1"}))
            tn._run(integration._async_refresh_cycle_model(hass, {"e2"}))
        self.assertEqual(sent[0], (const.SIGNAL_HISTORY_UPDATED, (frozenset({"e1"}), True)))
        self.assertEqual(sent[1], (const.SIGNAL_HISTORY_UPDATED, (frozenset({"e2"}), False)))

    def test_every_listener_filters_by_entry(self):
        for name in ("sensor.py", "image.py", "calendar.py", "todo.py"):
            source = (COMPONENT / name).read_text(encoding="utf-8")
            handlers = source.count("entry_ids=None, sensors_follow=False")
            self.assertEqual(handlers, source.count("history_signal_applies(self._entry.entry_id"), name)
            self.assertGreaterEqual(handlers, 1, name)


class CardGzipTests(unittest.TestCase):
    def setUp(self):
        integration._CARD_GZIP_CACHE.clear()
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "card.js"
        self.path.write_text("console.log('hello');\n" * 200, encoding="utf-8")

    def tearDown(self):
        self.dir.cleanup()

    def test_gzip_roundtrip_and_cached(self):
        body, gzipped = integration._read_card_file(self.path, True)
        self.assertTrue(gzipped)
        self.assertEqual(gzip.decompress(body), self.path.read_bytes())
        self.assertLess(len(body), self.path.stat().st_size // 5)
        again, _ = integration._read_card_file(self.path, True)
        self.assertIs(body, again)

    def test_plain_when_client_has_no_gzip(self):
        body, gzipped = integration._read_card_file(self.path, False)
        self.assertEqual((body, gzipped), (self.path.read_bytes(), False))

    def test_changed_file_is_recompressed_and_old_entry_dropped(self):
        old, _ = integration._read_card_file(self.path, True)
        self.path.write_text("changed();\n" * 50, encoding="utf-8")
        os.utime(self.path, ns=(1, 1))
        new, _ = integration._read_card_file(self.path, True)
        self.assertEqual(gzip.decompress(new), b"changed();\n" * 50)
        self.assertEqual(len(integration._CARD_GZIP_CACHE), 1)

    def test_missing_file(self):
        self.assertEqual(integration._read_card_file(self.path.with_name("nope.js"), True), (None, False))
        self.assertEqual(integration._read_card_file(self.path.with_name("nope.js"), False), (None, False))

    def test_handler_sets_encoding_headers(self):
        source = (COMPONENT / "__init__.py").read_text(encoding="utf-8")
        for needle in ('"Vary": "Accept-Encoding"', 'headers["Content-Encoding"] = "gzip"', '"gzip" in request.headers.get("Accept-Encoding"'):
            self.assertIn(needle, source)


if __name__ == "__main__":
    unittest.main()
