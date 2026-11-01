"""Long-term use and parallel calls in a real Home Assistant; run with tools/real_ha/run.sh.

Five years of history with a symptom entry every day: load time, size of every state's attributes (the recorder refuses
attributes above 16384 bytes), nothing missing after a reload. And 50 add_symptom calls at the same moment: none may be lost."""
import asyncio
import json
import random
import time
from datetime import date, timedelta

from homeassistant.config_entries import ConfigEntryState

from test_real_ha import DOMAIN, _add_profile, _call
from test_services_smoke import _seeded_profile

RECORDER_LIMIT = 16384
END = date(2026, 9, 30)
DAYS = 5 * 365


def _five_years():
    rng = random.Random(7)
    starts, day = [], END - timedelta(days=DAYS)
    while day <= END:
        starts.append(day)
        day += timedelta(days=rng.randint(26, 32))
    entries = []
    for i in range(DAYS):
        d = END - timedelta(days=i)
        entries.append({"date": d.isoformat(), "mood": rng.choice(["ok", "tired", "happy"]), "pain": rng.sample(["cramps", "headache", "lower_back"], k=rng.randint(0, 2)),
                        "discharge": "clear", "energy_level": rng.choice(["low", "normal"]), "basal_temp": round(36.2 + rng.random() * 0.8, 2)})
    return [s.isoformat() for s in starts], entries


def _sizes(hass):
    return {s.entity_id: len(json.dumps(dict(s.attributes), default=str)) for s in hass.states.async_all() if "anna" in s.entity_id}


async def _history(hass, entry):
    out = await _call(hass, "get_full_history", {"entry_id": entry.entry_id, "days": 4000}, response=True)
    return json.dumps(out, sort_keys=True, default=str)


async def test_five_years_of_daily_entries(hass):
    entry = await _add_profile(hass)
    starts, entries = _five_years()
    t = time.monotonic()
    await _call(hass, "import_cycle_history", {"entry_id": entry.entry_id, "dates": starts, "date_format": "auto"})
    await _call(hass, "import_symptom_history", {"entry_id": entry.entry_id, "entries": entries})
    await hass.async_block_till_done()
    imported = time.monotonic() - t
    runtime = hass.data[DOMAIN][entry.entry_id]
    assert len(runtime.history) == len(starts) and len(runtime.symptom_history) == DAYS, (len(runtime.history), len(runtime.symptom_history))

    big = {k: v for k, v in _sizes(hass).items() if v > RECORDER_LIMIT}
    assert big == {}, f"state attributes the recorder would refuse (> {RECORDER_LIMIT} bytes): {big}"
    before = await _history(hass, entry)

    t = time.monotonic()
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    reload_seconds = time.monotonic() - t
    assert entry.state is ConfigEntryState.LOADED
    assert await _history(hass, entry) == before, "history differs after save and reload"
    print(f"\nimport {imported:.1f}s, reload {reload_seconds:.1f}s, largest attributes {max(_sizes(hass).values())} bytes, {len(runtime.symptom_history)} entries")
    assert reload_seconds < 20 and imported < 60


async def test_fifty_parallel_add_symptom_calls_lose_nothing(hass):
    entry = await _seeded_profile(hass)
    dates = [(date(2026, 1, 1) + timedelta(days=i)).isoformat() for i in range(50)]
    await asyncio.gather(*(_call(hass, "add_symptom", {"entry_id": entry.entry_id, "date": d, "symptom_data": {"mood": "ok", "pain": ["cramps"]}}) for d in dates))
    await hass.async_block_till_done()
    have = {e["date"] for e in hass.data[DOMAIN][entry.entry_id].symptom_history}
    assert set(dates) <= have, sorted(set(dates) - have)
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    have = {e["date"] for e in hass.data[DOMAIN][entry.entry_id].symptom_history}
    assert set(dates) <= have, f"lost after reload: {sorted(set(dates) - have)}"


async def test_parallel_calls_for_the_same_day_keep_every_field(hass):
    entry = await _seeded_profile(hass)
    fields = [{"mood": "ok"}, {"pain": ["cramps"]}, {"discharge": "clear"}, {"smell": "normal"}, {"energy_level": "low"}, {"sleep_quality": "good"}]
    await asyncio.gather(*(_call(hass, "add_symptom", {"entry_id": entry.entry_id, "date": "2026-09-01", "symptom_data": f}) for f in fields))
    await hass.async_block_till_done()
    day = next(e for e in hass.data[DOMAIN][entry.entry_id].symptom_history if e["date"] == "2026-09-01")
    missing = [k for f in fields for k in f if k not in day]
    assert missing == [], f"lost fields: {missing} (entry: {day})"
