"""The unauthenticated web addresses of the integration, asked the way a calendar app or a stranger would; run with tools/real_ha/run.sh.

Covers the calendar feed (ICS): off by default, never for a private profile, a partner link with less in it, renewal makes old links dead,
nothing from the symptom log; and that the file routes cannot be talked into serving anything else."""
import re

import pytest

from homeassistant.util import dt as dt_util

from test_notifications import FERTILE_SOON, _options, _profile
from test_real_ha import DOMAIN

SECRET = "SECRETCANARY"


async def _feed_profile(hass, level="full", **options):
    """A profile with six cycles, a loaded symptom log (canaries) and the feed switched on."""
    entry, _, _ = await _profile(hass, level=level, starts_ago=FERTILE_SOON["starts_ago"],
                                 symptoms=[(3, {"note": SECRET, "pain": ["cramps"], "mood": "tired", "contraception_method": "pill"})])
    await _options(hass, entry, ics_feed_enabled=True, **options)
    return entry, hass.data[DOMAIN][entry.entry_id]


def _urls(runtime, entry):
    from custom_components.menstruation_cycle.ical import derive_partner_token  # importable once the test environment has set up the package path

    epoch = int(entry.options.get("ics_partner_epoch", 0) or 0)
    return f"/{DOMAIN}/ics/{runtime.ics_token}.ics", f"/{DOMAIN}/ics/{derive_partner_token(runtime.ics_token, epoch)}.ics"


def _summaries(text):
    return [line.split(":", 1)[1] for line in text.splitlines() if line.startswith("SUMMARY:")]


async def test_the_feed_is_off_until_it_is_switched_on(hass, hass_client_no_auth):
    entry, _, _ = await _profile(hass, starts_ago=FERTILE_SOON["starts_ago"])
    runtime = hass.data[DOMAIN][entry.entry_id]
    client = await hass_client_no_auth()
    assert not entry.options.get("ics_feed_enabled")
    for url in _urls(runtime, entry):
        assert (await client.get(url)).status == 404


async def test_full_and_partner_feed_are_served_and_carry_nothing_from_the_log(hass, hass_client_no_auth):
    entry, runtime = await _feed_profile(hass)
    client = await hass_client_no_auth()
    full_url, partner_url = _urls(runtime, entry)
    full, partner = await client.get(full_url), await client.get(partner_url)
    assert full.status == partner.status == 200 and full.content_type == "text/calendar"
    full_text, partner_text = await full.text(), await partner.text()
    assert full_text.startswith("BEGIN:VCALENDAR") and partner_text.startswith("BEGIN:VCALENDAR")
    for text in (full_text, partner_text):
        assert not [w for w in (SECRET, "cramps", "tired", "pill") if w.lower() in text.lower()], "something from the symptom log is in the feed"
    assert any("Period" in s for s in _summaries(partner_text)) and any("Fertile" in s for s in _summaries(partner_text))
    assert len(full_text) > len(partner_text), "the partner feed is not smaller than the full one"


@pytest.mark.parametrize("content, wanted, unwanted", [("period", "Period", "Fertile"), ("fertile", "Fertile", "Period")])
async def test_the_partner_feed_can_be_narrowed(hass, hass_client_no_auth, content, wanted, unwanted):
    entry, runtime = await _feed_profile(hass, ics_partner_content=content)
    client = await hass_client_no_auth()
    summaries = _summaries(await (await client.get(_urls(runtime, entry)[1])).text())
    assert any(wanted in s for s in summaries) and not any(unwanted in s for s in summaries), summaries


async def test_the_partner_feed_leaves_out_what_only_the_full_feed_has(hass, hass_client_no_auth):
    """Pregnancy due date and contraception dates are opt-in calendar items: in the full feed, never in the partner feed."""
    entry, _, _ = await _profile(hass, starts_ago=FERTILE_SOON["starts_ago"], symptoms=[(2, {"contraception_method": "injection"})])
    await hass.services.async_call(DOMAIN, "set_pregnancy_mode", {"entry_id": entry.entry_id, "is_pregnant": True,
                                                                   "pregnancy_start_date": (dt_util.now().date().replace(day=1)).isoformat()}, blocking=True)
    await _options(hass, entry, ics_feed_enabled=True, calendar_pregnancy_events=True, calendar_contraception_events=True, calendar_ovulation_events=True)
    runtime = hass.data[DOMAIN][entry.entry_id]
    client = await hass_client_no_auth()
    full = _summaries(await (await client.get(_urls(runtime, entry)[0])).text())
    partner = _summaries(await (await client.get(_urls(runtime, entry)[1])).text())
    extra = [s for s in full if not s.startswith(("Period", "Fertile"))]
    assert extra, f"no positive control: the full feed has nothing beyond period and fertile window ({full[:5]})"
    assert not [s for s in partner if s in extra], f"in the partner feed but not meant for it: {[s for s in partner if s in extra]}"


@pytest.mark.parametrize("level", ["status_only", "private"])
async def test_a_private_profile_is_never_served_and_comes_back_when_it_is_not_private(hass, hass_client_no_auth, level):
    entry, runtime = await _feed_profile(hass)
    client = await hass_client_no_auth()
    urls = _urls(runtime, entry)
    await hass.services.async_call(DOMAIN, "set_profile_visibility", {"entry_id": entry.entry_id, "level": level}, blocking=True)
    statuses = [(await client.get(u)).status for u in urls]
    assert statuses == ([404, 404] if level == "private" else [200, 200]), statuses
    await hass.services.async_call(DOMAIN, "set_profile_visibility", {"entry_id": entry.entry_id, "level": "full"}, blocking=True)
    assert [(await client.get(u)).status for u in urls] == [200, 200]


async def test_unknown_and_damaged_tokens_get_the_same_answer_as_a_switched_off_feed(hass, hass_client_no_auth):
    entry, runtime = await _feed_profile(hass)
    client = await hass_client_no_auth()
    full_url, _ = _urls(runtime, entry)
    token = runtime.ics_token
    flipped = token[:-1] + ("a" if token[-1] != "a" else "b")
    for bad in ("x", "0" * len(token), flipped, token + "0", token.upper(), "..", "%00"):
        response = await client.get(f"/{DOMAIN}/ics/{bad}.ics")
        assert response.status == 404 and token not in await response.text(), bad
    await _options(hass, entry, ics_feed_enabled=False)
    off = await client.get(full_url)
    assert off.status == 404 and (await off.text()) == (await (await client.get(f"/{DOMAIN}/ics/{flipped}.ics")).text())


async def test_a_new_link_kills_the_old_one(hass, hass_client_no_auth, hass_ws_client):
    entry, runtime = await _feed_profile(hass)
    ws = await hass_ws_client(hass)
    client = await hass_client_no_auth()
    old_full, old_partner = _urls(runtime, entry)
    await ws.send_json({"id": 1, "type": "menstruation_cycle/rotate_ics_partner_token", "profile": "anna"})
    reply = await ws.receive_json()
    assert reply["success"], reply
    runtime = hass.data[DOMAIN][entry.entry_id]
    new_full, new_partner = _urls(runtime, hass.config_entries.async_get_entry(entry.entry_id))
    assert new_full == old_full and new_partner != old_partner
    assert [(await client.get(u)).status for u in (old_full, old_partner, new_partner)] == [200, 404, 200]
    await ws.send_json({"id": 2, "type": "menstruation_cycle/rotate_ics_token", "profile": "anna"})
    assert (await ws.receive_json())["success"]
    runtime = hass.data[DOMAIN][entry.entry_id]
    final_full, final_partner = _urls(runtime, hass.config_entries.async_get_entry(entry.entry_id))
    assert [(await client.get(u)).status for u in (old_full, new_partner, final_full, final_partner)] == [404, 404, 200, 200]


async def test_the_feed_answers_a_repeat_request_with_not_modified(hass, hass_client_no_auth):
    entry, runtime = await _feed_profile(hass)
    client = await hass_client_no_auth()
    first = await client.get(_urls(runtime, entry)[0])
    again = await client.get(_urls(runtime, entry)[0], headers={"If-None-Match": first.headers["ETag"]})
    assert first.status == 200 and again.status == 304
    assert "private" in first.headers["Cache-Control"]


async def test_the_file_routes_do_serve_their_own_files(hass, hass_client_no_auth):
    """Positive control for the traversal test below: the same routes answer 200 for what they are meant to serve."""
    await _profile(hass, starts_ago=(27,))
    client = await hass_client_no_auth()
    first_card = next(p.name for p in (__import__("pathlib").Path(__file__).resolve().parents[2] / "custom_components" / DOMAIN / "www").glob("*.js"))
    for path in (f"/{DOMAIN}/translations/en.json", f"/{DOMAIN}/{first_card}"):
        assert (await client.get(path)).status == 200, path


@pytest.mark.parametrize("path", [
    "/{d}/..%2fmanifest.json", "/{d}/..%2f__init__.py", "/{d}/..%2fstrings.json", "/{d}/translations/..%2f..%2fmanifest.json", "/{d}/..%2f..%2fconfiguration.yaml", "/{d}/%2e%2e%2f%2e%2e%2f.storage%2fauth", "/{d}/..\\..\\x", "/{d}/.hidden", "/{d}/__init__.py", "/{d}/manifest.json",
    "/{d}/translations/..%2f..%2fmanifest.json", "/{d}/translations/en.json%00.png", "/{d}/translations/__init__.py", "/{d}/assets/..%2f..%2fx/a.svg",
    "/{d}/assets/icons/..%2f..%2f__init__.py", "/{d}/assets/icons/%2e%2e%2fmanifest.json.svg", "/{d}/ics/..%2f..%2fx.ics",
])
async def test_the_file_routes_serve_nothing_but_their_own_files(hass, hass_client_no_auth, path):
    await _profile(hass, starts_ago=(27,))
    client = await hass_client_no_auth()
    response = await client.get(path.format(d=DOMAIN))
    body = await response.read()
    assert response.status in (400, 404), (response.status, body[:100])
    assert not re.search(rb'"domain"|storage_key|BEGIN:VCALENDAR|\bimport\b', body)
