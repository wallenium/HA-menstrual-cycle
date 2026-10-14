'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-cycle-dashboard-panel.js'),
  'utf8',
);

const storage = new Map();
const localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};

class FakeElement {
  constructor() {
    this.dataset = {};
  }
}

global.HTMLElement = class HTMLElement {
  attachShadow() {
    this.shadowRoot = {
      innerHTML: '',
      addEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
    };
    return this.shadowRoot;
  }
};

global.HTMLInputElement = FakeElement;
global.HTMLFormElement = FakeElement;
Object.defineProperty(global, 'navigator', {
  value: { language: 'en' },
  configurable: true,
});
global.localStorage = localStorage;

const defined = {};
global.customElements = {
  define: (name, cls) => { defined[name] = cls; },
  get: (name) => defined[name],
};

const translations = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/translations/en.json'),
  'utf8',
));

global.window = {
  location: { origin: 'http://localhost' },
  menstruationCycleI18n: { cache: { en: translations }, fallback: { en: translations }, loading: {} },
};
global.document = { scripts: [], querySelectorAll: () => [], createElement: () => ({}), head: {}, body: {}, documentElement: {} };

// eslint-disable-next-line no-eval
eval(source);

const Panel = defined['menstruation-cycle-dashboard-panel'];

const make = (lang) => {
  const panel = new Panel();
  panel._lang = lang;
  return panel;
};

// Every shipped language: each code renders its own text with the count filled in, no raw key or placeholder left.
const gating = {
  missing: [
    { code: 'more_cycles', needed: 2 },
    { code: 'irregular', needed: null },
    { code: 'more_logs', needed: 1 },
    { code: 'log_temperature', needed: null },
    { code: 'luteal_needs_cycles', needed: 2 },
    { code: 'unknown_future_code', needed: 5 },
  ],
};
const en = make('en')._renderMissingDataHints(gating);
assert.ok(en.includes('What would improve the forecast'), en);
assert.ok(en.includes('2 more finished cycle(s)'), en);
assert.ok(en.includes('Log 1 more day(s)'), en);
assert.ok(en.includes('Log your morning temperature'), en);
assert.ok(en.includes('2 more cycle(s) with a confirmed temperature rise'), en);
assert.strictEqual((en.match(/<li>/g) || []).length, 5, 'unknown codes are skipped');
assert.ok(!en.includes('dashboard_missing') && !en.includes('{n}'), en);

// Nothing missing or no data at all: nothing is rendered.
assert.strictEqual(make('en')._renderMissingDataHints({ missing: [] }), '');
assert.strictEqual(make('en')._renderMissingDataHints(null), '');
assert.strictEqual(make('en')._renderMissingDataHints({}), '');

// Text from the data is escaped.
assert.ok(!make('en')._renderMissingDataHints({ missing: [{ code: 'more_cycles', needed: '<b>' }] }).includes('<b>'));

// The other languages are translated (not the English fallback) and complete.
for (const lang of ['de', 'es', 'fr', 'sv']) {
  const dict = JSON.parse(fs.readFileSync(
    path.join(__dirname, `../custom_components/menstruation_cycle/www/translations/${lang}.json`), 'utf8'));
  window.menstruationCycleI18n.cache[lang] = dict;
  const html = make(lang)._renderMissingDataHints(gating);
  assert.ok(!html.includes('dashboard_missing') && !html.includes('{n}'), `${lang}: ${html}`);
  assert.notStrictEqual(html, en, `${lang} is translated`);
  assert.ok(html.includes(dict.dashboard_missing_title), lang);
}

console.log('dashboard missing-data hints: ok');
