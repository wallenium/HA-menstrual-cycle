/**
 * Tests for menstruation-statistics-card.js
 *
 * Covers:
 *  - Tab labels/rendering for Periode + Hygiene
 *  - Tab switching keeps filter state stable
 *  - Gear filter toggles and applies days-back filter
 *  - Hygiene tab keeps 30-day product timeline logic
 *  - Compact/reponsive hygiene layout CSS is present
 *
 * Run with: node tests/menstruation-statistics-card.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

class FakeShadowRoot {
  constructor() {
    this._html = '';
    this._selectors = {};
    this._ids = {};
  }
  set innerHTML(value) { this._html = value; }
  get innerHTML() { return this._html; }
  querySelectorAll(selector) { return this._selectors[selector] || []; }
  getElementById(id) { return this._ids[id] || null; }
  setSelector(selector, nodes) { this._selectors[selector] = nodes; }
  setId(id, node) { this._ids[id] = node; }
}

class FakeButton {
  constructor(dataset = {}) {
    this.dataset = dataset;
    this._listeners = {};
  }
  addEventListener(type, fn) {
    this._listeners[type] = this._listeners[type] || [];
    this._listeners[type].push(fn);
  }
  click() {
    (this._listeners.click || []).forEach((fn) => fn({ target: this }));
  }
}

global.window = { customCards: [], ProductIcons: { getSvgIcon: () => '' } };
global.document = { createElement: () => ({}) };
global.HTMLElement = class HTMLElement {};
const defined = {};
global.customElements = {
  define: (name, cls) => { defined[name] = cls; },
  get: (name) => defined[name] || null,
};

const cardSrc = fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-statistics-card.js'),
  'utf8',
);
// eslint-disable-next-line no-eval
eval(cardSrc);

const CardClass = defined['menstruation-statistics-card'];

function makeCard() {
  const shadow = new FakeShadowRoot();
  const el = Object.create(CardClass.prototype);
  el.attachShadow = () => shadow;
  Object.defineProperty(el, 'shadowRoot', { get: () => shadow, configurable: true });
  el.addEventListener = () => {};
  return el;
}

function daysAgo(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function makeHass() {
  return {
    locale: { language: 'de' },
    states: {
      'sensor.menstruation': {
        state: 'period',
        attributes: {
          friendly_name: 'Test Sensor',
          grouped_starts: [daysAgo(120), daysAgo(90), daysAgo(60), daysAgo(30), daysAgo(1)],
          history: [daysAgo(120), daysAgo(119), daysAgo(90), daysAgo(60), daysAgo(59), daysAgo(30), daysAgo(29)],
          bleeding_blocks: [
            { start: daysAgo(120), end: daysAgo(116), length: 5 },
            { start: daysAgo(90), end: daysAgo(86), length: 5 },
            { start: daysAgo(60), end: daysAgo(56), length: 5 },
            { start: daysAgo(30), end: daysAgo(26), length: 5 },
          ],
          symptom_history: [
            { date: daysAgo(29), pain: ['cramps'], bleeding_strength: 'heavy' },
            { date: daysAgo(28), pain: ['cramps'], bleeding_strength: 'medium' },
            { date: daysAgo(2), pain: ['headache'], bleeding_strength: 'light' },
          ],
          product_usage_timeline: [
            { date: daysAgo(1), product: 'tampon', quantity: 2 },
            { date: daysAgo(31), product: 'pad', quantity: 1 },
          ],
          product_usage_this_cycle: { tampon: 2, pad: 1, cup: 0, liner: 3, underwear: 1 },
          product_usage_stats: {
            average_per_cycle: { tampon: 5, pad: 2, cup: 1, liner: 4, underwear: 2 },
            cycles_considered: 3,
          },
          days_until_next_start: 12,
        },
      },
    },
    callService: async () => {},
  };
}

function bindInteractiveControls(card, controls = {}) {
  const root = card.shadowRoot;
  root.setSelector('.tab-btn', controls.tabs || []);
  root.setSelector('.days-btn', controls.days || []);
  root.setSelector('button[data-action="add-underwear-shopping"]', controls.actions || []);
  root.setId('statistics-filter-toggle', controls.filterToggle || null);
  root.setId('patient-name', null);
  root.setId('patient-birthdate', null);
  root.setId('export-lang', null);
  root.setId('export-btn', null);
  card._attachListeners();
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${error.message}`);
    failed += 1;
  }
}

console.log('Statistics card tabs and hygiene integration');

test('renders Periode and Hygiene tabs', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', language: 'de' });
  card._hass = makeHass();
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(html.includes('>Periode<'), 'Periode tab missing');
  assert.ok(html.includes('>Hygiene<'), 'Hygiene tab missing');
});

test('tab switching updates content and keeps selected days-back state', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', language: 'de', days_back: 180 });
  card._hass = makeHass();
  card._render();

  const filterToggle = new FakeButton();
  const day365 = new FakeButton({ days: '365' });
  bindInteractiveControls(card, { filterToggle, days: [day365] });
  filterToggle.click();
  bindInteractiveControls(card, { filterToggle, days: [day365] });
  day365.click();
  assert.strictEqual(card._daysBack, 365, 'days-back filter not updated to 365');

  const toHygiene = new FakeButton({ tab: 'hygiene' });
  const toStats = new FakeButton({ tab: 'stats' });
  bindInteractiveControls(card, { tabs: [toHygiene, toStats] });
  toHygiene.click();
  assert.strictEqual(card._tab, 'hygiene', 'tab did not switch to hygiene');
  bindInteractiveControls(card, { tabs: [toHygiene, toStats] });
  toStats.click();

  assert.strictEqual(card._tab, 'stats', 'tab did not switch back to stats');
  assert.strictEqual(card._daysBack, 365, 'days-back filter reset after tab switch');
  assert.ok(card.shadowRoot.innerHTML.includes('von 365 Tage'), 'stats tab does not reflect the preserved filter value');
});

test('gear toggle opens filter popover and days button closes it', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', language: 'de' });
  card._hass = makeHass();
  card._render();

  const filterToggle = new FakeButton();
  const day90 = new FakeButton({ days: '90' });
  bindInteractiveControls(card, { filterToggle, days: [day90] });
  filterToggle.click();
  assert.strictEqual(card._settingsOpen, true, 'filter popover did not open');
  assert.ok(card.shadowRoot.innerHTML.includes('filter-popover open'), 'open filter markup missing');

  bindInteractiveControls(card, { filterToggle, days: [day90] });
  day90.click();
  assert.strictEqual(card._daysBack, 90, 'filter did not apply 90 days');
  assert.strictEqual(card._settingsOpen, false, 'filter popover did not close after selection');
});

test('hygiene tab keeps 30-day timeline and renders product stats', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', language: 'de' });
  card._hass = makeHass();
  card._tab = 'hygiene';
  card._render();
  const html = card.shadowRoot.innerHTML;

  assert.ok(html.includes('Tampons / Periode'), 'hygiene stat label missing');
  assert.ok(html.includes('mgp-chip tampon'), 'recent tampon entry missing from hygiene timeline');
  assert.ok(!html.includes('mgp-chip pad'), 'timeline should exclude entries older than 30 days');
  assert.ok(html.includes('Letzte 30 Tage'), '30-day heading changed unexpectedly');
});

test('compact hygiene layout CSS includes responsive stat grid', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', language: 'de' });
  card._hass = makeHass();
  card._tab = 'hygiene';
  card._render();
  const html = card.shadowRoot.innerHTML;

  assert.ok(html.includes('grid-template-columns: repeat(auto-fit, minmax(116px, 1fr));'), 'compact hygiene stat grid CSS missing');
  assert.ok(html.includes('@media (max-width: 480px)'), 'responsive hygiene media query missing');
  assert.ok(html.includes('min-height: 76px;'), 'compact hygiene tile height CSS missing');
});

console.log('\nNFP pregnancy likelihood');

test('_nfpPregnancyLikelihood returns unknown when nfp is null', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  assert.strictEqual(card._nfpPregnancyLikelihood(null), 'unknown');
  assert.strictEqual(card._nfpPregnancyLikelihood(undefined), 'unknown');
  assert.strictEqual(card._nfpPregnancyLikelihood({}), 'unknown');
});

test('_nfpPregnancyLikelihood returns high when today is within fertile window with high confidence', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  const today = '2026-08-05';
  const nfp = {
    confidence_level: 'high',
    fertile_window: { start: '2026-08-03', end: '2026-08-07' },
    temperature_rise_detected: false,
    details: { temperature_rise_confirmed: false },
  };
  assert.strictEqual(card._nfpPregnancyLikelihood(nfp, today), 'high');
});

test('_nfpPregnancyLikelihood returns high when today is within fertile window with medium confidence', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  const today = '2026-08-05';
  const nfp = {
    confidence_level: 'medium',
    fertile_window: { start: '2026-08-03', end: '2026-08-07' },
    temperature_rise_detected: false,
  };
  assert.strictEqual(card._nfpPregnancyLikelihood(nfp, today), 'high');
});

test('_nfpPregnancyLikelihood returns elevated when today is one day before fertile window', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  const today = '2026-08-02';
  const nfp = {
    confidence_level: 'high',
    fertile_window: { start: '2026-08-03', end: '2026-08-07' },
    temperature_rise_detected: false,
  };
  assert.strictEqual(card._nfpPregnancyLikelihood(nfp, today), 'elevated');
});

test('_nfpPregnancyLikelihood returns low when temperature rise confirmed with high confidence', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  const today = '2026-08-15'; // well after any fertile window
  const nfp = {
    confidence_level: 'high',
    fertile_window: { start: '2026-08-03', end: '2026-08-07' },
    temperature_rise_detected: true,
    details: { temperature_rise_confirmed: true },
  };
  assert.strictEqual(card._nfpPregnancyLikelihood(nfp, today), 'low');
});

test('_nfpPregnancyLikelihood returns unknown when temperature rise detected but confidence is low', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  const today = '2026-08-15';
  const nfp = {
    confidence_level: 'low',
    fertile_window: { start: null, end: null },
    temperature_rise_detected: true,
    details: { temperature_rise_confirmed: true },
  };
  assert.strictEqual(card._nfpPregnancyLikelihood(nfp, today), 'unknown');
});

test('_nfpConceptionEstimate uses cycle-based backend estimate when available', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation' });
  const estimate = card._nfpConceptionEstimate({
    confidence_level: 'high',
    conception_likelihood: {
      probability: 47,
      level: 'high',
      confidence: 'high',
      reason_key: 'fertile_unprotected',
    },
  });
  assert.deepStrictEqual(estimate, {
    probability: 47,
    level: 'high',
    confidence: 'high',
    reason_key: 'fertile_unprotected',
  });
});

test('NFP tab renders current-cycle conception estimate when available', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', language: 'en' });
  const hass = makeHass();
  const today = new Date().toISOString().slice(0, 10);
  hass.states['sensor.menstruation'].attributes.nfp_analysis = {
    confidence_level: 'high',
    ovulation_day: today,
    ovulation_detected: true,
    temperature_rise_day: today,
    temperature_rise_detected: true,
    fertile_window: { start: today, end: today },
    nfp_symptom_score: 0.8,
    conception_likelihood: {
      probability: 47,
      level: 'high',
      confidence: 'high',
      reason_key: 'fertile_unprotected',
    },
    details: { temperature_rise_confirmed: true, conflicting_signals: false },
  };
  card._hass = hass;
  card._tab = 'nfp';
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(html.includes('nfp-pregnancy-likelihood'), 'pregnancy likelihood section missing from NFP tab');
  assert.ok(html.includes('Conception likelihood this cycle'), 'current-cycle conception label missing');
  assert.ok(html.includes('47%'), 'probability estimate missing from NFP tab');
  assert.ok(html.includes('logged unprotected intercourse'), 'conception explanation missing from NFP tab');
  assert.ok(html.includes('nfp_likelihood_disclaimer') || html.includes('Estimated from cycle history'), 'disclaimer missing from NFP tab');
});

test('NFP tab shows no-data message and no pregnancy likelihood when NFP data is absent', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', language: 'en' });
  const hass = makeHass();
  hass.states['sensor.menstruation'].attributes.nfp_analysis = null;
  card._hass = hass;
  card._tab = 'nfp';
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(!html.includes('nfp-pregnancy-likelihood'), 'pregnancy likelihood section must be absent when no NFP data');
});

test('NFP tab keeps low-data conception estimate visible when only conception likelihood is available', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', language: 'en' });
  const hass = makeHass();
  hass.states['sensor.menstruation'].attributes.nfp_analysis = {
    confidence_level: 'low',
    conception_likelihood: {
      probability: null,
      level: 'unknown',
      confidence: 'low',
      reason_key: 'insufficient_data',
    },
  };
  card._hass = hass;
  card._tab = 'nfp';
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(html.includes('Conception likelihood this cycle'), 'conception estimate label missing for low-data case');
  assert.ok(html.includes('Estimate unavailable'), 'low-data estimate text missing');
});

console.log('\nCycle planning and fertility forecast');

test('stats tab renders planning section when period_forecast and fertility_forecast are present (stable cycle)', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', language: 'en' });
  const hass = makeHass();
  hass.states['sensor.menstruation'].attributes.period_forecast = {
    predicted_start: '2026-09-01',
    predicted_end: '2026-09-05',
    cycle_std_days: 1.2,
    confidence: 'high',
  };
  hass.states['sensor.menstruation'].attributes.fertility_forecast = {
    ovulation_estimate: '2026-08-18',
    fertile_window_start: '2026-08-13',
    fertile_window_end: '2026-08-19',
    best_days_start: '2026-08-16',
    best_days_end: '2026-08-17',
    source: 'estimated',
    confidence: 'medium',
  };
  card._hass = hass;
  card._tab = 'stats';
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(html.includes('planning-section'), 'planning section missing from stats tab');
  assert.ok(html.includes('2026-09-01'), 'period forecast start date missing');
  assert.ok(html.includes('2026-09-05'), 'period forecast end date missing');
  assert.ok(html.includes('planning_disclaimer') || html.includes('estimate') || html.includes('statistical'), 'planning disclaimer missing');
  assert.ok(html.includes('2026-08-13'), 'fertile window start missing');
  assert.ok(html.includes('2026-08-16'), 'best days start missing');
});

test('stats tab renders fertility forecast with NFP source label when source is nfp', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', language: 'en' });
  const hass = makeHass();
  hass.states['sensor.menstruation'].attributes.period_forecast = {
    predicted_start: '2026-09-01',
    predicted_end: '2026-09-05',
    cycle_std_days: 0.8,
    confidence: 'high',
  };
  hass.states['sensor.menstruation'].attributes.fertility_forecast = {
    ovulation_estimate: '2026-08-18',
    fertile_window_start: '2026-08-13',
    fertile_window_end: '2026-08-19',
    best_days_start: '2026-08-16',
    best_days_end: '2026-08-17',
    source: 'nfp',
    confidence: 'high',
  };
  card._hass = hass;
  card._tab = 'stats';
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(html.includes('planning-section'), 'planning section missing');
  assert.ok(html.includes('NFP (measured)'), 'NFP source label missing');
});

test('stats tab gracefully omits planning section when no forecast data', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', language: 'en' });
  const hass = makeHass();
  hass.states['sensor.menstruation'].attributes.period_forecast = null;
  hass.states['sensor.menstruation'].attributes.fertility_forecast = null;
  card._hass = hass;
  card._tab = 'stats';
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(!html.includes('planning-section'), 'planning section must be absent when no forecast data');
});

test('_renderPlanningSection shows no-data messages when only partial forecast data is present', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', language: 'en' });
  const hass = makeHass();
  // Only period_forecast present, no fertility_forecast
  hass.states['sensor.menstruation'].attributes.period_forecast = {
    predicted_start: '2026-09-01',
    predicted_end: '2026-09-05',
    cycle_std_days: 4.5,
    confidence: 'low',
  };
  hass.states['sensor.menstruation'].attributes.fertility_forecast = null;
  card._hass = hass;
  card._tab = 'stats';
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(html.includes('planning-section'), 'planning section missing when only period_forecast is present');
  assert.ok(html.includes('2026-09-01'), 'period forecast date missing');
  // fertility no-data message should be shown
  assert.ok(html.includes('fertility_forecast_no_data') || html.includes('Not enough data for a fertility forecast'), 'fertility no-data message missing');
});

test('_computeDateRangeForecast marks vacation range as likely for period estimate', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', language: 'en' });
  const forecast = card._computeDateRangeForecast(
    {
      predicted_start: '2027-08-03',
      predicted_end: '2027-08-07',
      cycle_std_days: 1.2,
      confidence: 'high',
    },
    null,
    '2027-08-01',
    '2027-08-10',
  );
  assert.ok(forecast, 'range forecast missing');
  assert.strictEqual(forecast.period.label, 'likely');
  assert.ok(forecast.period.percent >= 70, `expected period likelihood >= 70, got ${forecast.period.percent}`);
});

test('_computeDateRangeForecast marks fertility window as likely in selected range', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', language: 'en' });
  const forecast = card._computeDateRangeForecast(
    null,
    {
      ovulation_estimate: '2027-08-06',
      fertile_window_start: '2027-08-01',
      fertile_window_end: '2027-08-07',
      best_days_start: '2027-08-04',
      best_days_end: '2027-08-05',
      source: 'nfp',
      confidence: 'high',
    },
    '2027-08-04',
    '2027-08-08',
  );
  assert.ok(forecast, 'range forecast missing');
  assert.strictEqual(forecast.fertility.label, 'likely');
  assert.ok(forecast.fertility.percent >= 70, `expected fertility likelihood >= 70, got ${forecast.fertility.percent}`);
});

test('planning section shows low-confidence hint for variable cycle range forecast', () => {
  const card = makeCard();
  card.setConfig({ entity: 'sensor.menstruation', language: 'en' });
  const hass = makeHass();
  hass.states['sensor.menstruation'].attributes.period_forecast = {
    predicted_start: '2027-08-20',
    predicted_end: '2027-08-24',
    cycle_std_days: 9,
    confidence: 'low',
  };
  hass.states['sensor.menstruation'].attributes.fertility_forecast = {
    ovulation_estimate: '2027-08-16',
    fertile_window_start: '2027-08-11',
    fertile_window_end: '2027-08-17',
    best_days_start: '2027-08-14',
    best_days_end: '2027-08-15',
    source: 'estimated',
    confidence: 'low',
  };
  card._planningRangeStart = '2027-08-01';
  card._planningRangeEnd = '2027-08-03';
  card._hass = hass;
  card._tab = 'stats';
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.ok(html.includes('Low confidence due to high cycle variability'), 'low-confidence hint missing');
});

if (failed > 0) {
  console.error(`
${failed} test(s) failed, ${passed} passed.`);
  process.exit(1);
}

console.log(`
All ${passed} statistics card test(s) passed.`);
