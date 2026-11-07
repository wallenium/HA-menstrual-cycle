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
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));
const stateObj = { attributes: { profile: 'alice' } };

const makePanel = () => {
  const panel = new Panel();
  panel._lang = 'en';
  panel.render = () => {};
  panel._hass = { connection: { sendMessagePromise: async () => ({ response: null }) } };
  return panel;
};

const insight = (symptom_key, phase, direction = 'more_frequent', ratio = 1.8) => ({
  symptom_key, phase, direction, ratio, confidence: 'medium',
});
const render = (attrs, prefs) => {
  const panel = makePanel();
  if (prefs) panel._prefs = prefs;
  return panel._renderSymptomInsights({ attributes: { symptom_correlation_insights_reason: null, ...attrs } });
};

// "Today" line: only symptoms that are MORE frequent in the phase the cycle is in right now.
const insights = [
  insight('pain:headache', 'luteal'),
  insight('pain:cramps', 'period'),
  insight('mood:irritable', 'luteal', 'less_frequent', 0.4),
  insight('pain:tender_breasts', 'luteal'),
];

let html = render({ cycle_phase: 'luteal', symptom_correlation_insights: insights });
const todayLine = (html.match(/<p class="helper symptom-today">([^<]*)<\/p>/) || [])[1] || '';
assert.ok(/^Today \(luteal\), logged more often: .+/.test(todayLine), `today line missing: ${todayLine}`);
assert.ok(/^Today \(luteal\), logged more often: Headache, Tender Breasts$/.test(todayLine), todayLine);
assert.ok(!html.includes('pain:'), 'raw category:value key must not be shown');
assert.ok(!/cramps|irritable/i.test(todayLine), `other phase / less frequent must not appear: ${todayLine}`);
assert.ok(!/\{(phase|symptoms)\}/.test(html), 'no placeholder left over');
assert.ok(html.includes('anomaly-list'), 'the regular insight list is still rendered');

// No line without a current phase, without a matching insight, or only with "less frequent" ones.
for (const attrs of [
  { symptom_correlation_insights: insights },
  { cycle_phase: 'follicular', symptom_correlation_insights: insights },
  { cycle_phase: 'luteal', symptom_correlation_insights: [insight('mood:irritable', 'luteal', 'less_frequent', 0.4)] },
]) {
  assert.ok(!render(attrs).includes('symptom-today'), JSON.stringify(attrs));
}

// A category the user hid in the panel stays out of the line too.
html = render(
  { cycle_phase: 'luteal', symptom_correlation_insights: [insight('pain:headache', 'luteal'), insight('mood:happy', 'luteal')] },
  { categoryVisibility: { pain: false } },
);
assert.ok(!/headache/i.test(html), 'hidden category must not appear');

// Never more than three symptoms in the line.
html = render({ cycle_phase: 'period', symptom_correlation_insights: ['a', 'b', 'c', 'd', 'e'].map((k) => insight(`pain:${k}`, 'period')) });
assert.strictEqual(((html.match(/symptom-today">([^<]*)</) || [])[1] || '').split(': ')[1].split(', ').length, 3);

// Every language ships the key with both placeholders.
for (const lang of ['en', 'de', 'es', 'fr', 'sv']) {
  const tr = JSON.parse(fs.readFileSync(path.join(__dirname, `../custom_components/menstruation_cycle/www/translations/${lang}.json`), 'utf8'));
  assert.ok(tr.dashboard_symptom_today && tr.dashboard_symptom_today.includes('{phase}') && tr.dashboard_symptom_today.includes('{symptoms}'), lang);
}

console.log('  \u2713 symptom hint for today');
