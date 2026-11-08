"""Screenshots for the README / HACS store: the dashboard panel in Chromium with invented demo data (no real person).

Usage: python3 screenshots.py FIXTURE_DIR OUT_DIR     (same fixtures and requirements as browser_check.py)
Writes panel-light.png, panel-dark.png, cycle-compare.png and panel-teen-mobile.png; with a third argument "cards" instead one
card-<tag>.png per card, with "panel-cards" one dash-<card>.png per panel card for the wiki (standard look, light theme, same demo data). The demo profile has eight cycles with a
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
    # the fixture's own forecasts belong to another day: make everything the cards derive agree with the invented cycles
    today = starts[-1] + timedelta(days=OPEN_DAYS - 1)
    nxt = starts[-1] + timedelta(days=28)
    ovulation = nxt - timedelta(days=14)
    iso = lambda d: d.isoformat()  # noqa: E731
    upcoming = [iso(nxt + timedelta(days=28 * i)) for i in range(6)]
    attrs.update(
        next_predicted_start=iso(nxt), days_until_next_start=(nxt - today).days, last_cycle_start=starts_iso[-1], cycle_phase="follicular",
        ovulation_day=iso(ovulation), fertile_window_start=iso(ovulation - timedelta(days=5)), fertile_window_end=iso(ovulation + timedelta(days=1)),
        predicted_cycle_starts=upcoming, predicted_starts_preview=upcoming[:3],
        current_bleeding_block={"start": starts_iso[-1], "end": iso(starts[-1] + timedelta(days=3)), "length": 4, "confirmed_days": [
            iso(starts[-1] + timedelta(days=d)) for d in range(4)], "days_elapsed": 4, "effective_duration": 4, "is_active": False,
            "today_logged": False},
    )
    attrs["period_forecast"] = {**attrs["period_forecast"], "predicted_start": iso(nxt), "predicted_end": iso(nxt + timedelta(days=3)),
                                "window_start": iso(nxt - timedelta(days=3)), "window_end": iso(nxt + timedelta(days=3))}
    attrs["fertility_forecast"] = {**attrs["fertility_forecast"], "ovulation_estimate": iso(ovulation),
                                   "fertile_window_start": iso(ovulation - timedelta(days=5)), "fertile_window_end": iso(ovulation + timedelta(days=1)),
                                   "best_days_start": iso(ovulation - timedelta(days=2)), "best_days_end": iso(ovulation - timedelta(days=1))}
    attrs["cycle_statistics"] = {**attrs["cycle_statistics"], "average_cycle_length": round(sum(LENGTHS) / len(LENGTHS), 1),
                                 "average_period_duration": 4, "cycles_analyzed": len(LENGTHS), "min_cycle_length": min(LENGTHS),
                                 "max_cycle_length": max(LENGTHS), "recent_cycles": [
                                     {"start": iso(starts[i]), "end": iso(starts[i + 1] - timedelta(days=1)), "length": LENGTHS[i]} for i in range(len(LENGTHS))]}
    for key in ("contraception_status", "pill_pack"):  # no pill in the demo: no hormonal-contraception warning
        attrs.pop(key, None)
    attrs.pop("age_at_tracking", None)
    if age:
        attrs["age_at_tracking"] = age
    sensor["state"] = "fertile"  # the sensor states are period / fertile / pms / neutral ...; day 11 of 28 lies in the fertile window
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
        const css = document.createElement('style'); css.textContent = 'button.icon-only, .mc-chat-fab-button, .mc-chat-fab-panel { display: none !important; }'; root.appendChild(css);
        root.querySelectorAll('*').forEach((el) => { if (!el.children.length && el.textContent.trim() === 'Settings synced from another device.') el.remove(); }); }""")
    page.wait_for_timeout(300)
    return page


# the panel cards shown in the wiki (data-card ids of the dashboard panel)
PANEL_CARDS = ("kpi_strip", "phase_timeline", "week_ahead", "week_review", "basal_temp", "phase_donut", "cycle_history", "calendar_card",
               "product_usage", "inventory_card", "timer_card", "pill_card", "statistics_card", "long_term_trend", "symptom_heatmap",
               "progress_badges", "cycle_day_earlier", "cycle_compare",
               "prediction_check", "history_search", "year_overview")


def panel_shots(browser, base, today, out):
    """The dashboard panel for the wiki: every card on its own, the Today card, the quick-log dialog, the edit mode and a phone."""
    out = Path(out)
    page = open_panel(browser, demo(base, today, theme="light"), 1100, "light", today.isoformat())
    root = "menstruation-cycle-dashboard-panel >> "
    for card in PANEL_CARDS:
        loc = page.locator(root + f"css=[data-card={card}]")
        if not loc.count():
            print(f"panel card {card} is not shown: no dash-{card}.png")
            continue
        loc.first.scroll_into_view_if_needed()
        page.wait_for_timeout(250)
        box = loc.first.bounding_box()
        if box and box["height"] > 700:  # a long list (history search): the top is enough
            page.screenshot(path=str(out / f"dash-{card}.png"), clip={**box, "height": 620}, full_page=True)
        else:
            loc.first.screenshot(path=str(out / f"dash-{card}.png"))
    for name, selector in (("today", "css=section.today-card"), ("header", "css=header"), ("jump-bar", "css=nav.jump-nav")):
        loc = page.locator(root + selector)
        if loc.count():
            loc.first.scroll_into_view_if_needed()
            loc.first.screenshot(path=str(out / f"dash-{name}.png"))
        else:
            print(f"{name} is not shown: no dash-{name}.png")
    page.evaluate("window.scrollTo(0, 0)")
    click = "(a) => document.querySelector('menstruation-cycle-dashboard-panel').shadowRoot.querySelector(`[data-action=${a}]`).click()"
    page.evaluate(click, "open-quick-log")  # icon-only buttons are hidden here (no icon font), so click them from the script
    page.wait_for_timeout(1200)
    dialog = page.locator(root + "css=.mc-modal[role=dialog]")
    if dialog.count():
        dialog.first.screenshot(path=str(out / "dash-quick-log.png"))
    else:
        print("quick-log dialog not found: whole page")
        page.screenshot(path=str(out / "dash-quick-log.png"))
    page.evaluate(click, "quick-log-close")
    page.wait_for_timeout(500)
    page.evaluate(click, "toggle-edit")
    page.wait_for_timeout(1500)
    page.screenshot(path=str(out / "dash-edit-appearance.png"), clip={"x": 0, "y": 340, "width": 1100, "height": 500})
    page.screenshot(path=str(out / "dash-edit-grid.png"), clip={"x": 0, "y": 2440, "width": 1100, "height": 640}, full_page=True)
    page.close()
    page = open_panel(browser, demo(base, today, theme="light"), 390, "light", today.isoformat())
    page.screenshot(path=str(out / "dash-phone.png"), clip={"x": 0, "y": 0, "width": 390, "height": 900})
    page.close()


# tag -> (width in px, extra config); the shipped cards as they look in a normal dashboard column
CARD_SHOTS = {
    "menstruation-gauge-card": (420, {}), "menstruation-cycle-card": (360, {}), "menstruation-cycle-compact-status": (360, {}),
    "menstruation-cycle-history-card-row": (1100, {}), "menstruation-cycle-heatmap-card": (420, {}), "menstruation-calendar-card": (420, {}),
    "menstruation-countdown-timer": (360, {}), "menstruation-product-inventory-card": (360, {"member": "Anna"}),
    "menstruation-statistics-card": (420, {}), "menstruation-pill-card": (420, {}), "menstruation-support-card": (420, {}),
}


def card_shots(browser, base, today, out):
    """One screenshot per card, rendered from the invented demo profile (the pill card gets a demo pack, the support card the early stage)."""
    for tag, (width, config) in CARD_SHOTS.items():
        fixture = demo(base, today, age=13 if tag.endswith("support-card") else None, theme="light")
        fixture["services"]["get_dashboard_prefs"] = {"prefs": {"theme": "light", "teenStyle": "off"}}
        page = browser.new_page(viewport={"width": width + 40, "height": 1000}, color_scheme="light", device_scale_factor=2)
        page.add_init_script("""try { localStorage.clear(); } catch (e) { /* none */ }
            if (!customElements.get('ha-card')) customElements.define('ha-card', class extends HTMLElement {  // Home Assistant's card frame
              constructor() { super(); this.attachShadow({mode: 'open'}).innerHTML = '<style>:host { display: block; background: var(--ha-card-background); '
                + 'border-radius: var(--ha-card-border-radius); box-shadow: var(--ha-card-box-shadow); overflow: hidden; }</style><slot></slot>'; } });""")
        page.goto(bc.BASE + "/_page.html")
        page.evaluate("async (t) => { await customElements.whenDefined(t); }", tag)
        hass = page.evaluate_handle(bc.HASS_JS, [fixture, "en"])
        page.evaluate("""([h, entity, tag]) => { const s = h.states[entity]; const attrs = {...s.attributes};
            if (tag.endsWith('support-card')) attrs.onboarding_stage = 'early_menarche';
            if (tag.endsWith('pill-card')) attrs.pill_pack = {active: 21, pause: 7, taken: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], position: 11, in_pause: false,
              today_taken: false, new_pack: false, anchored: true, editable: [11]};
            h.states[entity] = {...s, attributes: attrs};
            h.states['sensor.household_product_stock'] = {entity_id: 'sensor.household_product_stock', state: 'ok', context: {},
              attributes: {inventory: {tampon: 12, pad: 20, cup: 1, liner: 8, underwear: 3}, thresholds: {tampon: 5, pad: 5},
                household_members: [{name: 'Anna', profile: attrs.profile}]}}; }""", [hass, bc.ENTITY, tag])
        # a dashboard column: the page background, the Home Assistant look of the card variables and font
        frame = page.evaluate_handle("""([tag, h, entity, extra, width]) => { const box = document.createElement('div');
            box.style.cssText = `width:${width}px;padding:16px;background:#fafafa;font-family:Roboto,Helvetica,Arial,sans-serif;
              --card-background-color:#fff;--primary-text-color:#212121;--secondary-text-color:#727272;--divider-color:#e0e0e0;
              --primary-color:#03a9f4;--ha-card-border-radius:12px;--ha-card-background:#fff;--ha-card-box-shadow:0 2px 2px 0 rgba(0,0,0,.14),0 1px 5px 0 rgba(0,0,0,.12),0 3px 1px -2px rgba(0,0,0,.2)`;
            const el = document.createElement(tag);
            el.setConfig({entity, entities: [entity], type: 'custom:' + tag, ...extra});
            box.appendChild(el); document.getElementById('root').appendChild(box); el.hass = h; return box; }""", [tag, hass, bc.ENTITY, config, width])
        page.wait_for_timeout(3500)
        frame.as_element().screenshot(path=str(Path(out) / f"card-{tag}.png"))
        page.close()


def run(fixture_dir, out, mode="panel"):
    base = json.loads((Path(fixture_dir) / "full.json").read_text())
    today = date.today()
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), partial(bc.Handler))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    bc.BASE = f"http://127.0.0.1:{server.server_port}"
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        if mode in ("cards", "panel-cards"):
            (card_shots if mode == "cards" else panel_shots)(browser, base, today, out)
            browser.close()
            server.shutdown()
            return
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
    run(*sys.argv[1:4])
