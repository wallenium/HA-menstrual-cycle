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

const readLang = (code) => JSON.parse(fs.readFileSync(
  path.join(__dirname, `../custom_components/menstruation_cycle/www/translations/${code}.json`),
  'utf8',
));
const translations = readLang('en');

global.window = {
  location: { origin: 'http://localhost' },
  menstruationCycleI18n: { cache: { en: translations }, fallback: { en: translations }, loading: {} },
};
global.document = { scripts: [], querySelectorAll: () => [], createElement: () => ({}), head: {}, body: {}, documentElement: {} };

// eslint-disable-next-line no-eval
eval(source);

const Panel = defined['menstruation-cycle-dashboard-panel'];


const make = (lang = 'en', today = '2026-10-04') => {
  const panel = new Panel();
  panel._lang = lang;
  panel._hass = { language: lang };
  panel._activeProfile = 'anna';
  panel._todayIso = () => today;
  panel.render = () => { panel.rendered = (panel.rendered || 0) + 1; };
  window.menstruationCycleI18n.cache[lang] = readLang(lang);
  return panel;
};
const state = (starts) => ({ attributes: { grouped_starts: starts } });

storage.clear();
let panel = make();
let html = panel._renderFirstPeriodWelcome(state(['2026-09-20']), 'cycle');
assert.ok(html.includes('Your first period is logged') && html.includes('data-action="dismiss-welcome"'), html);
assert.strictEqual((html.match(/<li>/g) || []).length, 5, 'five points');

// only for exactly one start, within 60 days, in cycle mode
assert.strictEqual(panel._renderFirstPeriodWelcome(state([]), 'cycle'), '');
assert.strictEqual(panel._renderFirstPeriodWelcome(state(['2026-08-20', '2026-09-20']), 'cycle'), '');
assert.strictEqual(panel._renderFirstPeriodWelcome(state(['2026-06-01']), 'cycle'), '', 'too long ago');
assert.strictEqual(panel._renderFirstPeriodWelcome(state(['2026-10-20']), 'cycle'), '', 'start in the future');
assert.strictEqual(panel._renderFirstPeriodWelcome(state(['2026-09-20']), 'menarche'), '');
assert.strictEqual(panel._renderFirstPeriodWelcome({ attributes: {} }, 'cycle'), '');

// "Got it" hides it for this profile only, and remembers that
panel._dismissWelcome();
assert.strictEqual(panel.rendered, 1, 'dismissing re-renders');
assert.strictEqual(panel._renderFirstPeriodWelcome(state(['2026-09-20']), 'cycle'), '');
assert.strictEqual(storage.get('menstruation_cycle.welcome_dismissed.anna'), '1');
const reloaded = make();
assert.strictEqual(reloaded._renderFirstPeriodWelcome(state(['2026-09-20']), 'cycle'), '', 'stays hidden after a reload');
const other = make();
other._activeProfile = 'mia';
assert.ok(other._renderFirstPeriodWelcome(state(['2026-09-20']), 'cycle').includes('dismiss-welcome'), 'other profile unaffected');

// the click action is wired and the card is placed before the widgets
assert.ok(source.includes("action === 'dismiss-welcome'"));
assert.ok(/_renderFirstPeriodWelcome\(stateObj, mode\) \+ cards\.join/.test(source));

// every language: all texts exist, no raw key shown
for (const lang of ['en', 'de', 'fr', 'es', 'sv']) {
  storage.clear();
  const out = make(lang)._renderFirstPeriodWelcome(state(['2026-09-20']), 'cycle');
  assert.ok(out && !/dashboard_welcome_/.test(out), `${lang}: ${out}`);
}
console.log('dashboard first period welcome tests passed');
