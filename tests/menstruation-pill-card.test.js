'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const www = path.join(__dirname, '../custom_components/menstruation_cycle/www');
const source = fs.readFileSync(path.join(www, 'menstruation-pill-card.js'), 'utf8');
const readLang = (code) => JSON.parse(fs.readFileSync(path.join(www, 'translations', `${code}.json`), 'utf8'));

global.HTMLElement = class HTMLElement {
  attachShadow() {
    const root = { innerHTML: '', handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; } };
    this.shadowRoot = root;
    return root;
  }
};
const defined = {};
global.customElements = { define: (name, cls) => { defined[name] = cls; }, get: (name) => defined[name] };
global.window = { menstruationCycleI18n: { cache: { en: readLang('en') }, loading: {}, fallback: { en: {} } } };

// eslint-disable-next-line no-eval
eval(source);

const Card = defined['menstruation-pill-card'];
assert.ok(Card, 'card is registered');
assert.ok(window.customCards.some((c) => c.type === 'menstruation-pill-card'));

const make = (pack, extra = {}) => {
  const calls = [];
  const card = new Card();
  card.setConfig({ entity: 'sensor.menstruation' });
  card.hass = {
    language: extra.language || 'en',
    states: { 'sensor.menstruation': { attributes: { pill_pack: pack } } },
    callService: (...args) => { calls.push(args); return Promise.resolve(); },
  };
  return { card, calls, html: () => card.shadowRoot.innerHTML };
};
const count = (html, cls) => (html.match(new RegExp(`class="cell ${cls}[ "]`, 'g')) || []).length;

// day 10 of 21, 7 pause days, today's pill still due
const pack = { active: 21, pause: 7, taken: [1, 2, 3, 4, 5, 6, 7, 8, 9], position: 10, in_pause: false, today_taken: false, new_pack: false };
const due = make(pack);
let html = due.html();
assert.strictEqual(count(html, 'taken'), 9, html);
assert.strictEqual(count(html, 'pause'), 7);
assert.strictEqual(count(html, 'today'), 1);
assert.strictEqual(count(html, 'upcoming'), 11);
assert.ok(html.includes('Day 10 of 21. Tap today&#39;s pill') || html.includes("Day 10 of 21. Tap today's pill"), html);
assert.ok(html.includes('data-action="take"'));

// tapping today's pill logs it once (a second tap while the call is pending does nothing)
const target = { closest: (sel) => (sel === '[data-action="take"]' ? {} : null) };
due.card.shadowRoot.handlers.click({ target });
due.card.shadowRoot.handlers.click({ target });
assert.strictEqual(due.calls.length, 1);
const [domain, service, data] = due.calls[0];
assert.deepStrictEqual([domain, service, data.entity_id, data.symptom_data], ['menstruation_cycle', 'add_symptom', 'sensor.menstruation', { contraception_method: 'pill' }]);
assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(data.date));
due.card.shadowRoot.handlers.click({ target: { closest: () => null } });
assert.strictEqual(due.calls.length, 1, 'clicks elsewhere do nothing');

// taken today: no button; missed days and pause break
html = make({ ...pack, taken: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], today_taken: true }).html();
assert.ok(!html.includes('data-action="take"') && html.includes("Today's pill is taken"));
html = make({ ...pack, taken: [1, 2, 3, 6], position: 6, today_taken: true }).html();
assert.strictEqual(count(html, 'missed'), 2);
html = make({ ...pack, taken: Array.from({ length: 21 }, (_, i) => i + 1), position: 23, in_pause: true }).html();
assert.ok(html.includes('Pack break: day 2 of 7') && !html.includes('data-action="take"'), html);
html = make({ ...pack, taken: [], position: 1, new_pack: true }).html();
assert.ok(html.includes('starts a new pack') && count(html, 'today') === 1);

// forgotten pills: the cells listed in pack.editable are buttons, the others stay plain cells
{
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const daysAgo = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
  const gap = { ...pack, taken: [1, 2, 3, 8], position: 8, today_taken: true, editable: [4, 5] };
  const forgot = make(gap);
  const fh = forgot.html();
  assert.strictEqual((fh.match(/data-action="take-past"/g) || []).length, 2, 'two cells can be logged afterwards');
  assert.ok(/data-action="take-past" data-day="4"/.test(fh) && /data-action="take-past" data-day="5"/.test(fh) && !/data-day="6"/.test(fh), 'only the listed cells');
  assert.ok(fh.includes('Forgot a pill? Tap its day to log it.') && fh.includes('Tap to log it for'), 'hint in the status line and on the cell');
  assert.strictEqual(count(fh, 'missed'), 4, 'the other missed cells are still shown as missed');
  assert.ok(!make({ ...gap, editable: undefined }).html().includes('take-past'), 'an older backend without the list offers nothing');
  assert.ok(!make({ ...gap, editable: [] }).html().includes('Forgot a pill'), 'no hint when nothing can be logged');
  window.confirm = (text) => { forgot.asked = text; return true; };
  const tapPast = (card, day) => card.shadowRoot.handlers.click({ target: { closest: (sel) => (sel === '[data-action="take-past"]' ? { dataset: { day: String(day) } } : null) } });
  tapPast(forgot.card, 4);
  assert.strictEqual(forgot.calls.length, 1);
  const [, svc, payload] = forgot.calls[0];
  assert.deepStrictEqual([svc, payload.entity_id, payload.date, payload.symptom_data], ['add_symptom', 'sensor.menstruation', iso(daysAgo(4)), { contraception_method: 'pill' }], 'the date is the cell\'s day: four cells before today');
  assert.ok(/^Log the pill for .+\?$/.test(forgot.asked), forgot.asked);
  const declined = make(gap);
  window.confirm = () => false;
  tapPast(declined.card, 5);
  assert.strictEqual(declined.calls.length, 0, 'declined: nothing is logged');
  window.confirm = () => { throw new Error('no question expected'); };
  tapPast(declined.card, 6); // not in the list
  tapPast(declined.card, 'x');
  assert.strictEqual(declined.calls.length, 0, 'a cell that is not offered cannot be logged');
  const withStart = make({ ...gap, position: 3, taken: [3], today_taken: true, editable: [1, 2] });
  window.confirm = () => true;
  tapPast(withStart.card, 1);
  assert.strictEqual(withStart.calls[0][2].date, iso(daysAgo(2)), 'cell 1 of position 3 is two days back');
  delete window.confirm;
}

// no pill pack / unknown entity / other language
assert.ok(make(null).html().includes('No pill pack to show'));
const lost = new Card(); lost.setConfig({ entity: 'sensor.x' }); lost.hass = { states: {} };
assert.ok(lost.shadowRoot.innerHTML.includes('Entity not found'));
window.menstruationCycleI18n.cache.de = readLang('de');
assert.ok(make(pack, { language: 'de' }).html().includes('Tag 10 von 21'));
assert.throws(() => new Card().setConfig({}), /entity is required/);

// title '' (used inside the dashboard panel, which has its own heading) hides the card heading
const untitled = make(pack);
untitled.card.setConfig({ entity: 'sensor.menstruation', title: '' });
assert.ok(!untitled.html().includes('class="title"'));
assert.ok(untitled.html().includes('class="blister"'));
assert.ok(make(pack).html().includes('class="title"'));

// every key used by the card exists in all five translation files
const keys = [...source.matchAll(/'(pill_card_[a-z_]+)'|`(pill_card_state_)\$\{state\}`/g)].map((m) => m[1]).filter(Boolean);
for (const lang of ['en', 'de', 'fr', 'es', 'sv']) {
  const texts = readLang(lang);
  for (const key of [...new Set(keys), 'pill_card_state_taken', 'pill_card_state_today', 'pill_card_state_missed', 'pill_card_state_pause', 'pill_card_state_upcoming']) {
    assert.ok(texts[key], `${lang} is missing ${key}`);
  }
}

// states are not colour-only: taken and missed cells carry a symbol, and a legend explains all four
html = make({ ...pack, taken: [1, 2, 3, 6], position: 6, today_taken: true }).html();
assert.ok(/class="cell taken"[^>]*data-mark="\u2713"/.test(html) && /class="cell missed"[^>]*data-mark="!"/.test(html), html);
assert.strictEqual((html.match(/class="legend-item"/g) || []).length, 4);
const noLegend = make(pack);
noLegend.card.setConfig({ entity: 'sensor.menstruation', show_legend: false });
assert.ok(!noLegend.html().includes('class="legend"') && noLegend.html().includes('class="blister"'));

// grid size for the sections view, and a visual editor
assert.deepStrictEqual(new Card().getGridOptions(), { columns: 6, min_columns: 4 });
assert.ok(typeof Card.getConfigElement === 'function' && defined['menstruation-pill-card-editor']);
const Editor = defined['menstruation-pill-card-editor'];
const editor = new Editor();
let emitted = null;
editor.dispatchEvent = (ev) => { emitted = ev.detail.config; };
global.CustomEvent = class CustomEvent { constructor(type, init) { this.type = type; this.detail = init.detail; } };
editor.setConfig({ entity: 'sensor.a', title: 'Pill' });
assert.ok(editor.shadowRoot.innerHTML.includes('value="sensor.a"') && editor.shadowRoot.innerHTML.includes('value="Pill"'));
const change = editor.shadowRoot.handlers.change;
change({ target: { id: 'title', value: '' } });
assert.deepStrictEqual(emitted, { entity: 'sensor.a' }, 'an empty title is removed from the config');
change({ target: { id: 'show_legend', checked: false } });
assert.deepStrictEqual(emitted, { entity: 'sensor.a', show_legend: false });
change({ target: { id: 'entity', value: ' sensor.b ' } });
assert.strictEqual(emitted.entity, 'sensor.b');

// while the call is pending the pill button is disabled; a failed call shows an error that a new tap clears
(async () => {
  let reject;
  const failing = make(pack);
  failing.card._hass.callService = () => new Promise((_, rej) => { reject = rej; });
  failing.card.shadowRoot.handlers.click({ target });
  assert.ok(/data-action="take"[^>]*disabled/.test(failing.html()) && failing.html().includes('aria-busy="true"'), failing.html());
  reject(new Error('boom'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(failing.html().includes('role="alert"') && failing.html().includes('Could not log the pill'), failing.html());
  assert.ok(!/data-action="take"[^>]*disabled/.test(failing.html()), 'the button is usable again');
  failing.card._hass.callService = () => Promise.resolve();
  failing.card.shadowRoot.handlers.click({ target });
  assert.ok(!failing.html().includes('role="alert"'), 'a new tap clears the error');
  await new Promise((resolve) => setTimeout(resolve, 0));
  // days missing before today and no known pack start: ask whether a new pack starts
  const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const back = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return isoOf(d); };
  const todayIso = back(0);
  const unsure = { active: 21, pause: 7, taken: [1, 2, 8], position: 8, in_pause: false, today_taken: false, new_pack: false, editable: [3, 4, 5, 6, 7], anchored: false };
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  const tapToday = async (state, answer) => {
    const card = make(state);
    let asked = 0;
    let text = '';
    window.confirm = (t) => { asked += 1; text = t; return answer; };
    card.card.shadowRoot.handlers.click({ target });
    await tick();
    await tick();
    return { ...card, asked, text };
  };
  let r = await tapToday(unsure, true);
  assert.strictEqual(r.asked, 1);
  assert.ok(r.text.startsWith('No pill is logged since ') && r.text.includes('new pack start today'), r.text);
  assert.deepStrictEqual(r.calls.map((c) => [c[1], c[2].date]), [['confirm_contraception_renewal', todayIso], ['add_symptom', todayIso]], 'yes: the pack starts today, then today is logged');
  r = await tapToday(unsure, false);
  assert.deepStrictEqual(r.calls.map((c) => [c[1], c[2].date]), [['confirm_contraception_renewal', back(7)], ['add_symptom', todayIso]], 'no: the pack keeps its start (cell 1 is seven days back), today is logged');
  r = await tapToday({ ...unsure, anchored: true }, true);
  assert.deepStrictEqual([r.asked, r.calls.map((c) => c[1])], [0, ['add_symptom']], 'with a known start nothing is asked');
  r = await tapToday({ ...unsure, editable: [] }, true);
  assert.deepStrictEqual([r.asked, r.calls.map((c) => c[1])], [0, ['add_symptom']], 'nothing missing: nothing is asked');
  r = await tapToday({ ...unsure, today_taken: true }, true);
  assert.strictEqual(r.asked, 0, 'today is already logged: nothing to ask');
  r = await tapToday({ ...unsure, new_pack: true }, true);
  assert.strictEqual(r.asked, 0, 'a new pack needs no question');
  const broken = make(unsure);
  window.confirm = () => true;
  broken.card._hass.callService = (domain, service) => { broken.calls.push(service); return service === 'confirm_contraception_renewal' ? Promise.reject(new Error('no')) : Promise.resolve(); };
  broken.card.shadowRoot.handlers.click({ target });
  await tick();
  await tick();
  assert.deepStrictEqual(broken.calls, ['confirm_contraception_renewal'], 'when setting the start fails, today is not logged on top');
  assert.ok(broken.html().includes('role="alert"'));
  delete window.confirm;
  console.log('pill card tests passed');
})().catch((err) => { console.error(err); process.exit(1); });
