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

const make = (lang) => { const p = new Panel(); p._lang = lang; return p; };

// 1. _t() must not rebuild the dictionaries on every call (that copy was ~90% of a render).
const panel = make('en');
const first = panel._getI18n().cache.en;
for (let i = 0; i < 50; i++) panel._t('dashboard_missing_title');
assert.strictEqual(panel._getI18n().cache.en, first, 'cache.en is stable between lookups');
assert.strictEqual(panel._getI18n().fallback.en, panel._getI18n().fallback.en);

// ...but a replaced dictionary (what the i18n loader does) still gets the English fallbacks merged in.
const i18n = panel._getI18n();
i18n.cache.en = { custom_only_key: 'custom' };
assert.strictEqual(panel._t('custom_only_key'), 'custom');
assert.ok(Object.keys(panel._getI18n().cache.en).length > 50, 'fallback keys merged into the replaced dictionary');
assert.strictEqual(panel._t('definitely_missing_key'), 'definitely_missing_key', 'unknown keys fall through');
i18n.fallback.en = { ...i18n.fallback.en, late_fallback_key: 'late' };
assert.strictEqual(panel._t('late_fallback_key'), 'late', 'a replaced fallback dictionary is merged too');

// 2. _formatDate: same output as toLocaleDateString, formatted once per (locale, options, date).
const realFormat = Date.prototype.toLocaleDateString;
let calls = 0;
Date.prototype.toLocaleDateString = function (...args) { calls += 1; return realFormat.apply(this, args); };
try {
  for (const lang of ['de', 'en', 'fr', 'sv']) {
    const p = make(lang);
    for (const options of [undefined, { day: '2-digit', month: 'short' }, { weekday: 'long', day: 'numeric', month: 'long' }]) {
      const expected = realFormat.call(new Date('2026-10-06'), p._localeCode(), options || { day: '2-digit', month: '2-digit', year: 'numeric' });
      assert.strictEqual(p._formatDate('2026-10-06', options), expected, `${lang} ${JSON.stringify(options)}`);
    }
  }
  const before = calls;
  const p = make('de');
  const a = p._formatDate('2026-10-06');
  const b = p._formatDate('2026-10-06');
  assert.strictEqual(a, b);
  assert.strictEqual(calls - before <= 1, true, 'second identical call comes from the cache');
  assert.notStrictEqual(make('en')._formatDate('2026-10-06'), a, 'locale is part of the cache key');
  assert.notStrictEqual(p._formatDate('2026-10-06', { year: 'numeric' }), a, 'options are part of the cache key');
  assert.strictEqual(p._formatDate('not a date'), 'not a date');
  assert.strictEqual(p._formatDate(''), '');
  assert.strictEqual(p._formatDate(null), null);
} finally {
  Date.prototype.toLocaleDateString = realFormat;
}
console.log('dashboard-render-speed: ok');
