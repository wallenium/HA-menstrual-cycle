"""Screenshots for the README / HACS store: the dashboard panel in Chromium with invented demo data (no real person).

Usage: python3 screenshots.py FIXTURE_DIR OUT_DIR     (same fixtures and requirements as browser_check.py)
Writes panel-light.png, panel-dark.png, cycle-compare.png and panel-teen-mobile.png. The demo profile has eight cycles with a
temperature curve, ovulation tests and pain days; everything is generated here, nothing comes from a real log."""
import http.server
import importlib.util
import json
import sys
import threading
from datetime import date, timedelta
from functools import partial
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import browser_check as bc  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

_spec = importlib.util.spec_from_file_location("mc_model", bc.REPO / "custom_components/menstruation_cycle/model.py")
_pkg = type(sys)("mc_pkg")
_pkg.__path__ = [str(bc.REPO / "custom_components/menstruation_cycle")]
sys.modules["mc_pkg"] = _pkg
for _name in ("const", "model"):
    _s = importlib.util.spec_from_file_location(f"mc_pkg.{_name}", bc.REPO / f"custom_components/menstruation_cycle/{_name}.py")
    _m = importlib.util.module_from_spec(_s)
    sys.modules[f"mc_pkg.{_name}"] = _m
    _s.loader.exec_module(_m)
temperature_rise_by_cycle = sys.modules["mc_pkg.model"].temperature_rise_by_cycle

LENGTHS = [28, 29, 27, 28, 30, 28, 29]  # seven finished cycles; the eighth is running
OPEN_DAYS = 11  # cycle day of today in the running cycle


def demo(base: dict, today: date, age: int | None = None, theme: str | None = None) -> dict:
    """A copy of the fixture whose profile sensor and full history carry eight invented cycles."""
    starts = []
    cursor = today - timedelta(days=OPEN_DAYS - 1 + sum(LENGTHS))
    for length in LENGTHS:
        starts.append(cursor)
        cursor += timedelta(days=length)
    starts.append(cursor)
    symptoms = []
    for index, start in enumerate(starts):
        length = LENGTHS[index] if index < len(LENGTHS) else OPEN_DAYS
        ovulation = (LENGTHS[index] if index < len(LENGTHS) else 28) - 14
        for day in range(length):
            entry = {"date": (start + timedelta(days=day)).isoformat()}
            if day < 4:
                entry["bleeding_strength"] = ("medium", "heavy", "medium", "light")[day]
            if day < 2:
                entry["pain"] = ["cramps"]
                entry["pain_intensity"] = 6 - day * 2 + index % 2
            if day >= 4:
                entry["basal_temp"] = round(36.25 + 0.04 * ((day * 7 + index * 3) % 4) + (0.4 if day >= ovulation else 0), 2)
            if ovulation - 4 <= day <= ovulation - 1:
                entry["cervical_mucus"] = "eggwhite" if day >= ovulation - 2 else "creamy"
            if index % 2 == 0 and day == ovulation - 2:
                entry["test"] = ["positive_ovulation"]
            if len(entry) > 1:
                symptoms.append(entry)
    starts_iso = [d.isoformat() for d in starts]
    sensor = json.loads(json.dumps(base["states"]["sensor.menstruation_anna"]))
    attrs = sensor["attributes"]
    blocks = [{"start": s, "end": (date.fromisoformat(s) + timedelta(days=3)).isoformat(), "length": 4} for s in starts_iso]
    attrs.update(
        history=[(date.fromisoformat(s) + timedelta(days=d)).isoformat() for s in starts_iso for d in range(4)],
        grouped_starts=starts_iso, bleeding_blocks=blocks[-6:], symptom_history=symptoms[-60:],
        cycle_start_date=starts_iso[-1], cycle_day=OPEN_DAYS, avg_cycle_length=round(sum(LENGTHS) / len(LENGTHS)),
        next_predicted_start=(starts[-1] + timedelta(days=28)).isoformat(),
        temperature_rise_days=temperature_rise_by_cycle(symptoms, starts_iso, 5),
        symptom_data_today={"mood": "calm"}, symptom_data_this_cycle={"mood": "calm"},
    )
    for key in ("contraception_status", "pill_pack"):  # no pill in the demo: no hormonal-contraception warning
        attrs.pop(key, None)
    attrs.pop("age_at_tracking", None)
    if age:
        attrs["age_at_tracking"] = age
    sensor["state"] = "follicular"
    states = {**base["states"], "sensor.menstruation_anna": sensor}
    services = {**base["services"], "get_full_history": {"symptom_history": symptoms, "product_usage": [], "days": 365},
                "get_dashboard_prefs": {"prefs": {"theme": theme} if theme else None}}
    return {**base, "states": states, "services": services}


def open_panel(browser, fixture, width, scheme, today_iso):
    page = browser.new_page(viewport={"width": width, "height": 1000}, color_scheme=scheme, device_scale_factor=2)
    page.add_init_script("try { localStorage.clear(); } catch (e) { /* none */ }")
    page.goto(bc.BASE + "/_page.html")
    page.evaluate("async () => { await customElements.whenDefined('menstruation-cycle-dashboard-panel'); }")
    hass = page.evaluate_handle(bc.HASS_JS, [fixture, "en"])
    page.evaluate("""(h) => { const p = document.createElement('menstruation-cycle-dashboard-panel');
        p.panel = {config: {}}; p.narrow = false; p.route = {path: ''}; document.getElementById('root').appendChild(p); p.hass = h; }""", hass)
    page.wait_for_timeout(2500)
    skip = page.locator("menstruation-cycle-dashboard-panel >> css=[data-action=wizard-skip]")
    if skip.count():
        skip.first.click()
    page.wait_for_timeout(3500)
    # no Home Assistant icon font here: icon-only buttons would be empty circles; the sync note is a transient message
    page.evaluate("""() => { const root = document.querySelector('menstruation-cycle-dashboard-panel').shadowRoot;
        const css = document.createElement('style'); css.textContent = 'button.icon-only { display: none !important; }'; root.appendChild(css);
        root.querySelectorAll('*').forEach((el) => { if (!el.children.length && el.textContent.trim() === 'Settings synced from another device.') el.remove(); }); }""")
    page.wait_for_timeout(300)
    return page


def run(fixture_dir, out):
    base = json.loads((Path(fixture_dir) / "full.json").read_text())
    today = date.today()
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), partial(bc.Handler))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    bc.BASE = f"http://127.0.0.1:{server.server_port}"
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for name, scheme in (("panel-light", "light"), ("panel-dark", "dark")):
            page = open_panel(browser, demo(base, today, theme=scheme), 1100, scheme, today.isoformat())
            page.screenshot(path=str(out / f"{name}.png"), clip={"x": 0, "y": 0, "width": 1100, "height": 900})
            if scheme == "light":
                card = page.locator("menstruation-cycle-dashboard-panel >> css=article[data-card=cycle_compare]")
                if card.count():
                    card.first.scroll_into_view_if_needed()
                    card.first.screenshot(path=str(out / "cycle-compare.png"))
                else:
                    print("cycle_compare card is not shown: no cycle-compare.png")
            page.close()
        page = open_panel(browser, demo(base, today, age=13), 390, "light", today.isoformat())
        page.screenshot(path=str(out / "panel-teen-mobile.png"), clip={"x": 0, "y": 0, "width": 390, "height": 900})
        page.close()
        browser.close()
    server.shutdown()


if __name__ == "__main__":
    orig = bc.Handler.do_GET

    def do_GET(self):
        if self.path.startswith("/_page.html"):
            body = bc.PAGE.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            orig(self)

    bc.Handler.do_GET = do_GET
    run(sys.argv[1], sys.argv[2])
