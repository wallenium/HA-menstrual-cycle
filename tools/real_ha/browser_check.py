"""Loads the dashboard panel and all cards in a real Chromium against data a real Home Assistant produced.

Usage: python3 browser_check.py FIXTURE_DIR [SCREENSHOT_DIR]     (needs: pip install playwright && playwright install chromium)
The fixtures come from test_browser_fixtures.py; hass is a stand-in object (states, callService, sendMessagePromise) fed with them,
so this checks rendering and privacy of the shipped JavaScript, not the Home Assistant frontend around it."""
import http.server
import json
import re
import sys
import threading
from functools import partial
from pathlib import Path

from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parents[2]
WWW = REPO / "custom_components" / "menstruation_cycle" / "www"
FILES = re.findall(r'"(menstruation-[a-z0-9-]+\.js)"', (REPO / "custom_components/menstruation_cycle/__init__.py").read_text().split("CARD_FILES = [")[1].split("]")[0])
FILES += ["menstruation-cycle-dashboard-panel.js"] if "menstruation-cycle-dashboard-panel.js" not in FILES else []
ENTITY = "sensor.menstruation_anna"
CARDS = ["menstruation-gauge-card", "menstruation-cycle-heatmap-card", "menstruation-calendar-card", "menstruation-countdown-timer",
         "menstruation-product-inventory-card", "menstruation-cycle-card", "menstruation-cycle-compact-status",
         "menstruation-cycle-history-card-row", "menstruation-statistics-card", "menstruation-support-card", "menstruation-pill-card"]
KEYS = {k for k in json.loads((WWW / "translations" / "en.json").read_text(encoding="utf-8")) if "_" in k}
BAD = ("undefined", "NaN", "[object Object]", "Invalid Date")
SECRETS = ("canary-", "36.47")  # free texts and temperature entered in the fixture; must show at "full" and nowhere below


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = path.split("?")[0]
        if path.startswith("/menstruation_cycle/assets/"):
            return str(WWW.parent / path[len("/menstruation_cycle/"):])
        return str(WWW / path.replace("/menstruation_cycle/", "/").lstrip("/"))

    def log_message(self, *args):
        pass


PAGE = "<!doctype html><meta charset=utf-8><body style='margin:0'><div id=root></div>" + "".join(
    f'<script type="module" src="/{f}"></script>' for f in FILES)

HASS_JS = """
([fixture, lang]) => {
  const calls = [];
  const states = {};
  for (const [id, s] of Object.entries(fixture.states)) states[id] = {entity_id: id, state: s.state, attributes: s.attributes, last_changed: new Date().toISOString(), last_updated: new Date().toISOString(), context: {}};
  const hass = {
    states, language: lang, locale: {language: lang, number_format: 'language', time_format: 'language'},
    user: {id: 'u', name: 'Anna', is_admin: !!fixture.viewer_is_admin}, themes: {}, selectedTheme: null, config: {unit_system: {temperature: '°C'}, time_zone: 'Europe/Berlin', language: lang},
    entities: {}, devices: {}, areas: {}, panels: {}, resources: {}, localize: (k) => k, formatEntityState: (s) => s.state,
    callService: async (domain, service, data) => { calls.push([domain, service, data]); return {}; },
    callWS: async (msg) => fixture.ws[msg.type] ?? {},
    connection: {sendMessagePromise: async (msg) => {
      calls.push(['ws', msg.type, msg.service]);
      if (msg.type === 'call_service') {
        const r = fixture.services[msg.service] ?? {};
        if (r.error) throw {code: 'home_assistant_error', message: r.error};
        return {context: {}, response: r};
      }
      return fixture.ws[msg.type] ?? {};
    }},
  };
  window.__calls = calls;
  return hass;
}
"""


def raw_keys(text):
    """Translation keys that reached the screen untranslated."""
    return sorted(KEYS & set(re.findall(r"[a-z][a-z0-9]*(?:_[a-z0-9]+)+", text)))


def visible_text(page, handle):
    return page.evaluate("""(el) => {
      const out = [];
      const walk = (n) => { if (n.nodeType === 3) out.push(n.textContent); else if (n.nodeType === 1 && !['SCRIPT','STYLE'].includes(n.tagName)) {
        if (n.shadowRoot) walk(n.shadowRoot); for (const c of n.childNodes) walk(c); } else if (n.nodeType === 11) for (const c of n.childNodes) walk(c); };
      walk(el); return out.join(' ').replace(/\\s+/g, ' ');
    }""", handle)


def run(fixture_dir, shots=None):
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"
    problems = []
    seen_at_full = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for level in ("full", "status_only", "private"):
            fixture = json.loads((Path(fixture_dir) / f"{level}.json").read_text())
            for lang in ("en", "de"):
                page = browser.new_page(viewport={"width": 1100, "height": 1400})
                errors = []
                page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
                page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
                page.on("requestfailed", lambda r: errors.append(f"requestfailed: {r.url}"))
                page.on("response", lambda r: errors.append(f"http {r.status}: {r.url}") if r.status >= 400 else None)
                page.goto(base + "/_page.html")
                page.evaluate("async (names) => { await Promise.all(names.map((n) => customElements.whenDefined(n))); }", CARDS[:1] + ["menstruation-cycle-dashboard-panel"])
                hass = page.evaluate_handle(HASS_JS, [fixture, lang])
                panel = page.evaluate_handle("""(h) => { const p = document.createElement('menstruation-cycle-dashboard-panel');
                    p.panel = {config: {}}; p.narrow = false; p.route = {path: ''}; document.getElementById('root').appendChild(p); p.hass = h; return p; }""", hass)
                page.wait_for_timeout(2500)
                text = visible_text(page, panel)
                label = f"panel[{level},{lang}]"
                if len(text) < 80:
                    problems.append(f"{label}: nearly empty ({len(text)} characters)")
                problems += [f"{label}: shows '{bad}'" for bad in BAD if bad in text]
                problems += [f"{label}: untranslated key '{k}'" for k in raw_keys(text)]
                if level != "full":
                    problems += [f"{label}: shows private data '{s}'" for s in SECRETS if s.lower() in text.lower()]
                else:
                    seen_at_full += [s for s in SECRETS if s in text]
                if shots:
                    Path(shots).mkdir(parents=True, exist_ok=True)
                    page.screenshot(path=str(Path(shots) / f"panel_{level}_{lang}.png"), full_page=True)
                if lang == "en":
                    for tag in CARDS:
                        if tag == "menstruation-support-card":  # only shown while the profile is in an early stage
                            page.evaluate("([h, e]) => { h.states[e].attributes.onboarding_stage = 'early_menarche'; }", [hass, ENTITY])
                        card = page.evaluate_handle("""([tag, h, entity]) => { const el = document.createElement(tag);
                            try { el.setConfig({entity, entities: [entity], type: 'custom:' + tag}); } catch (e) { return {error: String(e)}; }
                            document.getElementById('root').appendChild(el); el.hass = h; return el; }""", [tag, hass, ENTITY])
                        page.wait_for_timeout(300)
                        err = card.evaluate("(el) => el.error || null")
                        ctext = "" if err else visible_text(page, card)
                        if err:
                            problems.append(f"{tag}[{level}]: setConfig failed: {err}")
                        elif len(ctext) < 5:
                            problems.append(f"{tag}[{level}]: renders no text")
                        problems += [f"{tag}[{level}]: shows '{bad}'" for bad in BAD if bad in ctext]
                        problems += [f"{tag}[{level}]: untranslated key '{k}'" for k in raw_keys(ctext)]
                        if level != "full":
                            problems += [f"{tag}[{level}]: shows private data '{s}'" for s in SECRETS if s.lower() in ctext.lower()]
                        else:
                            seen_at_full += [s for s in SECRETS if s in ctext]
                # below "full" the read services refuse ordinary users; the shipped code logs that as a warning and carries on
                real = [e for e in errors if "favicon" not in e and "only available to administrators" not in e]
                problems += [f"{label}: {e}" for e in sorted(set(real))]
                page.close()
        browser.close()
    server.shutdown()
    if not seen_at_full:  # the privacy check below "full" means nothing if the data never shows up at "full"
        problems.append("control failed: none of the fixture's private values appear at 'full', so the privacy check proves nothing")
    return problems


if __name__ == "__main__":
    # the page that loads every script, served from memory
    orig = Handler.do_GET

    def do_GET(self):
        if self.path.startswith("/_page.html"):
            body = PAGE.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            orig(self)

    Handler.do_GET = do_GET
    found = run(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
    print("\n".join(found) if found else "browser check: no problems")
    sys.exit(1 if found else 0)
