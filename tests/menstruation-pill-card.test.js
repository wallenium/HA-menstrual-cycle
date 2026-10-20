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
console.log('pill card tests passed');
