/**
 * Inventory card and dashboard panel show the "supplies may not last the next period" hint from the
 * household sensor's `supply_short` attribute.
 *
 * Run with: node tests/supply-short-hint.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const www = path.join(__dirname, '../custom_components/menstruation_cycle/www');
const read = (name) => fs.readFileSync(path.join(www, name), 'utf8');
const translations = Object.fromEntries(['de', 'en', 'es', 'fr', 'sv'].map((l) => [l, JSON.parse(read(`translations/${l}.json`))]));

const defined = {};
class FakeShadow {
  constructor() { this.innerHTML = ''; }
  addEventListener() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  getElementById() { return null; }
}
global.HTMLElement = class HTMLElement {
  attachShadow() { this.shadowRoot = new FakeShadow(); return this.shadowRoot; }
};
global.HTMLInputElement = class {};
global.HTMLFormElement = class {};
global.customElements = { define: (n, c) => { defined[n] = c; }, get: (n) => defined[n] };
global.requestAnimationFrame = (cb) => cb();
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
Object.defineProperty(global, 'navigator', { value: { language: 'en' }, configurable: true });
global.document = { scripts: [], querySelectorAll: () => [], createElement: () => ({}), head: {}, body: {}, documentElement: {} };
global.window = {
  customCards: [],
  location: { origin: 'http://localhost' },
  menstruationCycleI18n: { cache: translations, fallback: { en: translations.en }, loading: {} },
};
// eslint-disable-next-line no-eval
eval(read('menstruation-functions.js'));
// eslint-disable-next-line no-eval
eval(read('menstruation-product-inventory-card.js'));

function renderCard(attrs, lang = 'en') {
  const Card = defined['menstruation-product-inventory-card'];
  const card = new Card();
  card.setConfig({ inventory_entity: 'sensor.stock' });
  card.hass = {
    locale: { language: lang },
    states: { 'sensor.stock': { state: '30', attributes: { inventory: { tampon: 8, pad: 20, liner: 2, cup: 1, underwear: 0 }, thresholds: {}, ...attrs } } },
  };
  return card.shadowRoot.innerHTML;
}

let passed = 0;
function test(name, fn) { fn(); passed += 1; }

test('card: a short product gets the hint with its typical need, others do not', () => {
  const html = renderCard({ supply_short: { tampon: { stock: 8, need: 14 } } });
  assert.strictEqual((html.match(/Stock may not last the next period/g) || []).length, 1, html);
  assert.ok(html.includes('typically about 14 per period'), html);
});

test('card: nothing without the attribute or with an empty one', () => {
  assert.ok(!renderCard({}).includes('may not last'));
  assert.ok(!renderCard({ supply_short: {} }).includes('may not last'));
});

test('card: the hint follows the language', () => {
  const html = renderCard({ supply_short: { pad: { stock: 2, need: 6 } } }, 'de');
  assert.ok(html.includes('Vorrat reicht evtl. nicht für die nächste Periode (üblich: ca. 6 pro Periode).'), html);
});

test('every language has the hint text with its {need} placeholder', () => {
  for (const [lang, t] of Object.entries(translations)) {
    assert.ok(t.supply_short_hint && t.supply_short_hint.includes('{need}'), lang);
  }
});

console.log(`All ${passed} supply short hint test(s) passed.`);
