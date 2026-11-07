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


def view_features_check(page):
    """Real browser: folding a card, sticky header, chart period selector and the print view."""
    problems = []
    root = "menstruation-cycle-dashboard-panel >> "
    title = page.locator(root + 'css=h2[data-action="widget-collapse"][data-widget="cycle_history"]')
    if title.count() != 1:
        return [f"view: no foldable title for cycle_history ({title.count()})"]
    body_visible = lambda: page.locator(root + 'css=article:has(h2[data-widget="cycle_history"]) > :not(h2)').first.is_visible()
    title.scroll_into_view_if_needed()
    if not body_visible():
        problems.append("view: card body is not visible before folding")
    title.click()
    page.wait_for_timeout(200)
    if body_visible():
        problems.append("view: clicking the title did not fold the card")
    page.emulate_media(media="print")
    if not body_visible():
        problems.append("view: a folded card must be complete in the print view")
    toolbar_buttons = page.locator(root + "css=header.toolbar button")
    shown = [toolbar_buttons.nth(i).evaluate("(e) => e.className + '|' + e.dataset.action") for i in range(toolbar_buttons.count()) if toolbar_buttons.nth(i).is_visible()]
    if shown:
        problems.append(f"view: toolbar buttons are still shown in the print view: {shown}")
    page.emulate_media(media="screen")
    page.locator(root + 'css=h2[data-widget="cycle_history"]').click()
    page.wait_for_timeout(200)
    if not body_visible():
        problems.append("view: second click did not open the card again")

    # sticky header: stays at the top after scrolling far down
    page.evaluate("window.scrollTo(0, 2500)")
    page.wait_for_timeout(150)
    top = page.locator(root + "css=header.toolbar").bounding_box()["y"]
    if abs(top) > 2:
        problems.append(f"view: header is not sticky (top {top:.0f} after scrolling)")
    page.evaluate("window.scrollTo(0, 0)")

    # chart period: picking a period re-renders without losing the page
    picker = page.locator(root + "css=select.range-picker")
    if picker.count() != 1:
        problems.append("view: no chart period selector in the header")
    else:
        for value in ("3", "all", "auto"):
            picker.select_option(value)
            page.wait_for_timeout(150)
            if page.locator(root + "css=select.range-picker").input_value() != value:
                problems.append(f"view: period {value} was not kept")
        if page.locator(root + "css=section.grid > article.card").count() < 4:
            problems.append("view: cards are gone after changing the period")
    return problems


def ui_check(page):
    """Real browser: card "Today", jump bar, views (create, switch, back) and the phone layout."""
    problems = []
    root = "menstruation-cycle-dashboard-panel >> "
    page.evaluate("window.scrollTo(0, 0)")
    today = page.locator(root + "css=.today-card")
    if today.count() != 1 or not today.is_visible():
        problems.append("ui: card Today is missing")
    else:
        button = today.locator("button").first
        radius = float(button.evaluate("(e) => parseFloat(getComputedStyle(e).borderTopLeftRadius)"))
        if radius < 10:
            problems.append(f"ui: buttons in the card Today look like default buttons (radius {radius})")

    # jump bar: a tap brings the group's first card below the sticky header
    chips = page.locator(root + 'css=.jump-nav button[data-group]')
    if chips.count() < 3:
        problems.append(f"ui: jump bar has {chips.count()} chips")
    else:
        group = chips.nth(chips.count() - 1).get_attribute("data-group")
        chips.nth(chips.count() - 1).click()
        page.wait_for_timeout(900)
        header = page.locator(root + "css=header.toolbar").bounding_box()
        first = page.eval_on_selector_all(root + "css=[data-card]", "(els) => els.map((e) => e.dataset.card)")
        if not first:
            problems.append("ui: no cards with an id")
        else:
            tops = page.eval_on_selector_all(root + "css=[data-card]", "(els) => els.map((e) => [e.dataset.card, e.getBoundingClientRect().top])")
            near = [name for name, top in tops if header["y"] + header["height"] - 4 <= top < header["y"] + header["height"] + 400]
            if not near:
                problems.append(f"ui: jump to group {group} did not bring a card below the header ({tops[:3]})")
    page.evaluate("window.scrollTo(0, 0)")

    # views: add one in the edit mode, hide a card there, save; the switcher appears and swaps the layouts
    page.locator(root + 'css=[data-action="toggle-edit"]').first.click()
    page.wait_for_timeout(300)
    cards = root + "css=.edit-card"
    before = page.eval_on_selector_all(cards, "(els) => els.map((e) => e.dataset.widgetId)")
    views_before = page.locator(root + 'css=.edit-chip[data-action=view-switch]').count() or 1
    page.locator(root + 'css=[data-action="view-add"]').click()
    page.wait_for_timeout(200)
    victim = before[-1]
    page.locator(f'{cards}[data-widget-id="{victim}"]').scroll_into_view_if_needed()
    page.locator(f'{cards}[data-widget-id="{victim}"] >> css=.edit-x').click()
    page.wait_for_timeout(200)
    page.locator(root + 'css=[data-action="save-edit"]').click()
    page.wait_for_timeout(400)
    switch = page.locator(root + 'css=.view-switch button')
    if switch.count() != views_before + 1:
        problems.append(f"ui: view switcher has {switch.count()} buttons, expected {views_before + 1}")
    else:
        shown = lambda: page.eval_on_selector_all(root + "css=[data-card]", "(els) => els.map((e) => e.dataset.card)")
        if victim in shown():
            problems.append(f"ui: {victim} should be hidden in the new view")
        switch.nth(0).click()
        page.wait_for_timeout(500)
        if victim not in shown():
            problems.append(f"ui: {victim} should be back in the first view")
        pressed = page.locator(root + 'css=.view-switch button[aria-pressed="true"]').count()
        if pressed != 1:
            problems.append(f"ui: {pressed} pressed view buttons")

    # phone: bottom bar, compact header, no sideways scrolling
    page.set_viewport_size({"width": 390, "height": 800})
    page.wait_for_timeout(300)
    bar = page.locator(root + "css=.mobile-bar")
    if not bar.is_visible():
        problems.append("ui: phone bar is not visible on a narrow screen")
    else:
        box = bar.bounding_box()
        if abs(box["y"] + box["height"] - 800) > 2:
            problems.append(f"ui: phone bar is not at the bottom ({box})")
    if page.locator(root + "css=.toolbar .today-pill").is_visible():
        problems.append("ui: date pill should be hidden on the phone")
    overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    if overflow > 1:
        wide = page.evaluate("""() => {
          const host = document.querySelector('menstruation-cycle-dashboard-panel');
          const out = [];
          host.shadowRoot.querySelectorAll('*').forEach((e) => { const r = e.getBoundingClientRect(); if (r.right > window.innerWidth + 1 && r.width > 0) out.push([r.right | 0, e.tagName.toLowerCase() + '.' + (e.className && e.className.baseVal === undefined ? e.className : '')]); });
          const wideCards = [...host.shadowRoot.querySelectorAll('section.grid > article')].map((c) => [c.dataset.card, c.getBoundingClientRect().width | 0, c.scrollWidth]);
          const kids = [...host.shadowRoot.querySelector('main.page').children].map((c) => [c.tagName.toLowerCase() + '.' + c.className, c.getBoundingClientRect().width | 0, c.scrollWidth]);
          const rowKids = [...host.shadowRoot.querySelectorAll('.today-card > *, .today-row > *')].map((c) => [c.tagName.toLowerCase() + '.' + c.className, c.getBoundingClientRect().width | 0]);
          return [kids, rowKids.slice(0, 14)];
        }""")
        problems.append(f"ui: page scrolls sideways on the phone ({overflow}px): {wide}")
    page.screenshot(path="/tmp/shots/panel_phone.png")
    page.set_viewport_size({"width": 1100, "height": 1400})
    page.wait_for_timeout(200)
    if page.locator(root + "css=.mobile-bar").is_visible():
        problems.append("ui: phone bar must not show on a wide screen")
    return problems


def edit_mode_check(page, shots=None):
    """Real mouse: hide a card with the X, bring it back from the list, resize by dragging the corner, move a card by dragging."""
    problems = []
    cards = "menstruation-cycle-dashboard-panel >> css=.edit-card"
    # the mouse only reaches what is in the viewport: scroll the card into view first
    def box(widget):
        loc = page.locator(f'{cards}[data-widget-id="{widget}"]')
        loc.scroll_into_view_if_needed()
        return loc.bounding_box()
    order = lambda: page.eval_on_selector_all(cards, "(els) => els.map((e) => e.dataset.widgetId)")
    page.locator('menstruation-cycle-dashboard-panel >> css=[data-action="toggle-edit"]').first.click()
    page.wait_for_timeout(400)
    ids = order()
    if len(ids) < 4 or "inventory_card" not in ids or "timer_card" not in ids:
        return [f"edit mode: expected editable cards incl. inventory_card and timer_card, got {ids}"]

    # hide with the X, bring back from the list of hidden widgets
    page.locator(f'{cards}[data-widget-id="timer_card"] >> css=.edit-x').click()
    page.wait_for_timeout(200)
    if "timer_card" in order():
        problems.append("edit mode: the X did not hide the card")
    chip = page.locator('menstruation-cycle-dashboard-panel >> css=[data-action="widget-show"][data-widget="timer_card"]')
    if chip.count() != 1:
        problems.append("edit mode: hidden card is not in the list of hidden widgets")
    else:
        chip.click()
        page.wait_for_timeout(200)
        if "timer_card" not in order():
            problems.append("edit mode: card did not come back from the list")

    # resize: drag the corner two columns to the right
    before = box("inventory_card")
    grid_w = page.locator("menstruation-cycle-dashboard-panel >> css=section.grid").bounding_box()["width"]
    col = (grid_w + 16) / 12
    x, y = before["x"] + before["width"] - 6, before["y"] + before["height"] - 6
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(x + col, y, steps=6)
    page.mouse.move(x + 2 * col, y, steps=6)
    mid = box("inventory_card")
    page.mouse.up()
    page.wait_for_timeout(250)
    after = box("inventory_card")
    cls = page.locator(f'{cards}[data-widget-id="inventory_card"]').get_attribute("class")
    if not (after["width"] > before["width"] + col and "span-8" in cls):
        problems.append(f"edit mode: resize did not widen the card by two columns ({before['width']:.0f} -> {after['width']:.0f}, {cls})")
    if abs(mid["width"] - after["width"]) > 6:
        problems.append(f"edit mode: width during the drag ({mid['width']:.0f}) differs from the result ({after['width']:.0f})")

    # move: take the first card and drop it behind the second one
    ids = order()
    first, second = ids[0], ids[1]
    b = box(second)
    a = box(first)
    b = box(second)
    page.mouse.move(a["x"] + a["width"] / 2, a["y"] + a["height"] / 2)
    page.mouse.down()
    page.mouse.move(b["x"] + b["width"] * 0.7, b["y"] + b["height"] * 0.8, steps=12)
    page.mouse.up()
    page.wait_for_timeout(250)
    new_ids = order()
    if not (new_ids.index(first) > new_ids.index(second)):
        problems.append(f"edit mode: dragging {first} behind {second} did not reorder: {new_ids[:4]}")
    if sorted(new_ids) != sorted(ids):
        problems.append("edit mode: cards were lost or duplicated by the move")
    if shots:
        page.screenshot(path=str(Path(shots) / "panel_edit_mode.png"), full_page=True)

    # save: the arrangement stays, the editing marks go
    page.locator('menstruation-cycle-dashboard-panel >> css=[data-action="save-edit"]').click()
    page.wait_for_timeout(300)
    if page.locator(cards).count() != 0:
        problems.append("edit mode: editing marks are still there after saving")
    texts = page.eval_on_selector_all("menstruation-cycle-dashboard-panel >> css=section.grid > article.card", "(els) => els.map((e) => e.className)")
    if not any("span-8" in t for t in texts):
        problems.append("edit mode: the new width was not kept after saving")
    return problems


def wizard_check(page, shots=None):
    """Real browser: the setup assistant (three steps), the dark look with an accent colour, the view code and the header button."""
    problems = []
    root = "menstruation-cycle-dashboard-panel >> "
    host = page.locator("menstruation-cycle-dashboard-panel")
    wizard = page.locator(root + "css=.mc-modal.wizard")
    if wizard.count() != 1:
        return [f"wizard: not shown for a profile without saved settings ({wizard.count()})"]
    style = lambda prop: host.evaluate("(e, p) => getComputedStyle(e).getPropertyValue(p).trim()", prop)
    page.set_viewport_size({"width": 390, "height": 800})
    page.wait_for_timeout(200)
    box = wizard.bounding_box()
    if box["x"] < 0 or box["x"] + box["width"] > 390.5:
        problems.append(f"wizard: does not fit a phone screen ({box['x']:.0f}..{box['x'] + box['width']:.0f})")
    if page.evaluate("document.documentElement.scrollWidth > innerWidth + 1"):
        problems.append("wizard: the page scrolls sideways on a phone")
    if shots:
        page.screenshot(path=str(Path(shots) / "panel_wizard_phone.png"))
    page.set_viewport_size({"width": 1100, "height": 1400})
    page.wait_for_timeout(200)
    host.evaluate("(e) => e.shadowRoot.querySelector('select[data-pref=theme]').scrollIntoView()")
    page.locator(root + "css=select[data-pref=theme]").select_option("dark")
    page.wait_for_timeout(150)
    if host.get_attribute("data-theme") != "dark" or style("--primary-text-color") != "#e7e7ea":
        problems.append("wizard: choosing dark did not change the panel")
    background = host.evaluate("(e) => getComputedStyle(e).backgroundColor")
    if background not in ("rgb(22, 23, 26)",):
        problems.append(f"wizard: dark panel has background {background}")
    page.locator(root + 'css=button[data-accent="plum"]').click()
    page.wait_for_timeout(100)
    if style("--mc-accent") != "#8E4B73":
        problems.append("wizard: the accent colour did not reach the panel")
    if shots:
        page.screenshot(path=str(Path(shots) / "panel_wizard_dark.png"))
    page.locator(root + 'css=[data-action="wizard-next"]').click()
    page.locator(root + 'css=[data-cards="compact"]').click()
    page.wait_for_timeout(150)
    shown = page.locator(root + "css=section.grid > article").count()
    if not 1 <= shown <= 6:
        problems.append(f"wizard: compact should show a handful of cards, shows {shown}")
    page.locator(root + 'css=[data-cards="standard"]').click()
    page.wait_for_timeout(150)
    if page.locator(root + "css=section.grid > article").count() <= shown:
        problems.append("wizard: standard did not show more cards than compact")
    page.locator(root + 'css=[data-action="wizard-next"]').click()
    page.locator(root + 'css=input[data-wizard="view-name"]').fill("Unterwegs")
    page.locator(root + 'css=[data-action="wizard-done"]').click()
    page.wait_for_timeout(300)
    if wizard.count() != 0:
        problems.append("wizard: still open after Done")
    if page.locator(root + 'css=.view-switch button').count() != 2:
        problems.append("wizard: the named view is missing in the header")
    # the header button cycles the look: dark -> auto (dark is the third in the cycle auto, light, dark)
    page.locator(root + 'css=[data-action="theme-cycle"]').click()
    page.wait_for_timeout(100)
    if host.get_attribute("data-theme") is not None:
        problems.append(f"wizard: header button should go back to auto, theme is {host.get_attribute('data-theme')}")
    return problems


def view_code_check(page):
    """Real browser: copy a view as text in the edit mode and import it again."""
    problems = []
    root = "menstruation-cycle-dashboard-panel >> "
    page.locator(root + 'css=[data-action="toggle-edit"]').click()
    page.wait_for_timeout(200)
    before = page.locator(root + "css=.edit-chip[data-action=view-switch]").count()
    page.locator(root + 'css=[data-action="view-export"]').click()
    page.wait_for_timeout(200)
    code = page.locator(root + "css=textarea[data-pref=viewCode]").input_value()
    if not code.startswith("MCV1:"):
        problems.append(f"view code: export gave '{code[:20]}'")
    page.locator(root + 'css=[data-action="view-import"]').click()
    page.wait_for_timeout(200)
    if page.locator(root + "css=.edit-chip[data-action=view-switch]").count() != before + 1:
        problems.append("view code: importing the code did not add a view")
    page.locator(root + "css=textarea[data-pref=viewCode]").fill("nonsense")
    page.locator(root + 'css=[data-action="view-import"]').click()
    page.wait_for_timeout(200)
    if page.locator(root + "css=.edit-chip[data-action=view-switch]").count() != before + 1:
        problems.append("view code: nonsense must not add a view")
    page.locator(root + 'css=[data-action="cancel-edit"]').click()
    page.wait_for_timeout(200)
    return problems


def calendar_dialog_check(page):
    """Real browser: the day dialog grows out of the tapped day, shrinks away while scrolled out of view, and grows back."""
    problems = []
    card = page.locator("menstruation-cycle-dashboard-panel >> menstruation-calendar-card")
    if card.count() != 1:
        return [f"calendar dialog: no calendar card in the panel ({card.count()})"]
    page.set_viewport_size({"width": 1100, "height": 600})
    card.evaluate("(c) => c.scrollIntoView({block: 'center'})")
    page.wait_for_timeout(300)
    opened = card.evaluate("""async (c) => {
        const cell = c.shadowRoot.querySelector('button[data-iso]');
        cell.click();
        const t0 = performance.now();
        while (!c.shadowRoot.querySelector('.sym-dialog')) {
          if (performance.now() - t0 > 4000) return null;
          await new Promise((r) => requestAnimationFrame(r));
        }
        const d = c.shadowRoot.querySelector('.sym-dialog');
        return {animations: d.getAnimations().length, start: getComputedStyle(d).transform};
    }""")
    if not opened:
        page.set_viewport_size({"width": 1100, "height": 1400})
        return ["calendar dialog: tapping a day opened no dialog"]
    if opened["animations"] < 1 or opened["start"] == "none":
        problems.append(f"calendar dialog: no grow animation when opening ({opened})")
    page.wait_for_timeout(500)
    if card.evaluate("(c) => getComputedStyle(c.shadowRoot.querySelector('.sym-dialog')).transform") != "none":
        problems.append("calendar dialog: not at full size after the animation")
    # scroll the card out of view: the dialog shrinks away, what was typed stays
    card.evaluate("(c) => { c.shadowRoot.querySelector('#sym-basal-temp').value = '36.6'; }")
    page.evaluate("window.scrollBy(0, 5000)")
    page.wait_for_timeout(200)
    out_of_view = card.evaluate("(c) => { const r = c.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight; }")
    if not out_of_view:
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(200)
        out_of_view = card.evaluate("(c) => { const r = c.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight; }")
    page.wait_for_timeout(500)
    collapsed = card.evaluate("(c) => c.shadowRoot.querySelector('#sym-modal').classList.contains('sym-collapsed')")
    if out_of_view and not collapsed:
        problems.append("calendar dialog: did not shrink away while the card is out of view")
    if not out_of_view:
        problems.append("calendar dialog: control failed, the card could not be scrolled out of view")
    card.evaluate("(c) => c.scrollIntoView({block: 'center'})")
    page.wait_for_timeout(800)
    if card.evaluate("(c) => c.shadowRoot.querySelector('#sym-modal').classList.contains('sym-collapsed')"):
        problems.append("calendar dialog: did not grow back when the card came into view")
    if card.evaluate("(c) => c.shadowRoot.querySelector('#sym-basal-temp').value") != "36.6":
        problems.append("calendar dialog: what was typed got lost")
    card.evaluate("(c) => c.shadowRoot.querySelector('.sym-close').click()")
    page.wait_for_timeout(100)
    if card.evaluate("(c) => !c.shadowRoot.querySelector('.sym-dialog')"):
        problems.append("calendar dialog: closed at once, without shrinking back")
    page.wait_for_timeout(500)
    if card.evaluate("(c) => !!c.shadowRoot.querySelector('.sym-dialog')"):
        problems.append("calendar dialog: still open after closing")
    page.set_viewport_size({"width": 1100, "height": 1400})
    return problems


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
                if level == "full" and lang == "en":
                    problems += wizard_check(page, shots)
                    problems += view_features_check(page)
                    problems += view_code_check(page)
                    problems += calendar_dialog_check(page)
                    problems += edit_mode_check(page, shots)
                    problems += ui_check(page)
                else:
                    skip = page.locator("menstruation-cycle-dashboard-panel >> css=[data-action=wizard-skip]")
                    if skip.count():
                        skip.click()
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
