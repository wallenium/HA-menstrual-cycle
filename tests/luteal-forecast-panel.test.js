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

const hero = (nfp, discreet = false) => {
  const panel = new Panel();
  panel._lang = 'en';
  panel._selectedEntityId = 'sensor.menstruation_berta';
  const stateObj = {
    state: 'neutral',
    attributes: {
      profile: 'berta', cycle_day: 20, avg_cycle_length: 29, days_until_next_start: 10,
      next_predicted_start: '2026-06-27', period_forecast: { predicted_start: '2026-06-27' },
      nfp_analysis: nfp,
    },
  };
  return panel._renderCycleHero(stateObj, discreet);
};

const forecast = (extra = {}) => ({ temperature_rise_detected: true, luteal_forecast: { predicted_start: '2026-06-30', luteal_days: 14, difference_days: 3, ...extra } });

// the second forecast sits under the calendar one, with the difference
let html = hero(forecast());
assert.ok(html.includes('From temperature:') && html.includes('(+3 days vs. calendar)'), html);
assert.ok(html.includes('expected') || html.includes('erwartet'));

// signs: earlier, same day, unknown
assert.ok(hero(forecast({ difference_days: -2 })).includes('(-2 days vs. calendar)'));
assert.ok(hero(forecast({ difference_days: 0 })).includes('(±0 days vs. calendar)'));
assert.ok(hero(forecast({ difference_days: null })).includes('(? days vs. calendar)'));

// the date comes from a sensor attribute and is escaped
assert.ok(!hero(forecast({ predicted_start: '<img src=x>' })).includes('<img src=x>'));

// nothing without a forecast, without a date, or in discreet mode
for (const nfp of [null, { temperature_rise_detected: true }, { luteal_forecast: {} }, { luteal_forecast: { predicted_start: null } }]) {
  assert.ok(!hero(nfp).includes('From temperature'), JSON.stringify(nfp));
}
assert.ok(!hero(forecast(), true).includes('From temperature'));

// ovulation foot line: temperature wins, then an anchoring LH test (with its escaped date), else the calendar text
const ovFoot = (nfp) => {
  const panel = new Panel();
  panel._lang = 'en';
  panel._selectedEntityId = 'sensor.menstruation_berta';
  const stateObj = {
    state: 'neutral',
    attributes: {
      profile: 'berta', cycle_day: 20, avg_cycle_length: 29, days_until_next_start: 10, ovulation_day: '2026-06-17',
      next_predicted_start: '2026-06-27', period_forecast: { predicted_start: '2026-06-27' }, nfp_analysis: nfp,
    },
  };
  return panel._renderCycleHero(stateObj, false);
};
assert.ok(ovFoot({ lh_anchored: true, lh_first_positive_day: '2026-06-16' }).includes('Positive ovulation test on'));
assert.ok(!ovFoot({ lh_anchored: false, lh_first_positive_day: '2026-06-16' }).includes('Positive ovulation test on'));
assert.ok(!ovFoot({ lh_anchored: true, lh_first_positive_day: null }).includes('Positive ovulation test on'));
assert.ok(!ovFoot({ lh_anchored: true, lh_first_positive_day: '2026-06-16', temperature_rise_detected: true }).includes('Positive ovulation test on'));
assert.ok(!ovFoot({ lh_anchored: true, lh_first_positive_day: '<img src=x>' }).includes('<img src=x>'));
assert.ok(!ovFoot(null).includes('Positive ovulation test on'));

// every language has both texts
for (const lang of ['de', 'en', 'es', 'fr', 'sv']) {
  const t = JSON.parse(fs.readFileSync(path.join(__dirname, `../custom_components/menstruation_cycle/www/translations/${lang}.json`), 'utf8'));
  assert.ok(t.dashboard_luteal_forecast.includes('{date}') && t.dashboard_luteal_forecast.includes('{diff}'), lang);
  assert.ok(t.luteal_forecast_hint.length > 5, lang);
  assert.ok(t.dashboard_ovulation_lh_based.includes('{date}'), lang);
}
console.log('luteal forecast in the panel: ok');
