'use strict';

// The period forecast window (period_forecast.window_start/_end) is shown on the gauge card, the compact
// status card and the compact cycle card, not only in the dashboard panel. This test covers the shared
// helper (menstruation-functions.js) and what the three cards render from it.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

class FakeShadowRoot {
  constructor() { this._html = ''; }
  set innerHTML(v) { this._html = v; }
  get innerHTML() { return this._html; }
  addEventListener() {}
  getElementById() { return null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
}

global.ResizeObserver = class { observe() {} disconnect() {} };
global.window = { customCards: [] };
global.document = undefined;
global.HTMLElement = class HTMLElement {};
const defined = {};
global.customElements = { define: (name, cls) => { defined[name] = cls; }, get: (name) => defined[name] };

const www = path.join(__dirname, '../custom_components/menstruation_cycle/www');
// eslint-disable-next-line no-eval
for (const file of ['menstruation-functions.js', 'menstruation-gauge-card.js', 'menstruation-cycle-compact-status-card.js']) {
  // eslint-disable-next-line no-eval
  eval(fs.readFileSync(path.join(www, file), 'utf8'));
}

const windowText = window.MenstruationFunctions.periodWindowText;
const TODAY = new Date(2026, 6, 1, 12, 0, 0, 0);
const forecast = (start, end) => ({ period_forecast: { predicted_start: '2026-07-05', window_start: start, window_end: end } });

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}\n    ${err.message}`);
    failed++;
  }
}

console.log('Helper: periodWindowText');

test('formats both ends with the locale', () => {
  assert.strictEqual(windowText(forecast('2026-07-03', '2026-07-07'), 'en', 'expected', TODAY), 'expected Jul 3 – Jul 7');
  assert.strictEqual(windowText(forecast('2026-07-03', '2026-07-07'), 'de', 'erwartet', TODAY), 'erwartet 3. Juli – 7. Juli');
});

test('empty without a forecast, without both ends, or for a one-day window', () => {
  assert.strictEqual(windowText({}, 'en', 'expected', TODAY), '');
  assert.strictEqual(windowText({ period_forecast: null }, 'en', 'expected', TODAY), '');
  assert.strictEqual(windowText(forecast('2026-07-03', undefined), 'en', 'expected', TODAY), '');
  assert.strictEqual(windowText(forecast('2026-07-05', '2026-07-05'), 'en', 'expected', TODAY), '');
  assert.strictEqual(windowText(forecast('2026-07-07', '2026-07-03'), 'en', 'expected', TODAY), '');
});

test('empty once the window is over (overdue period), still shown on its last day', () => {
  assert.strictEqual(windowText(forecast('2026-06-25', '2026-06-30'), 'en', 'expected', TODAY), '');
  assert.notStrictEqual(windowText(forecast('2026-06-25', '2026-07-01'), 'en', 'expected', TODAY), '');
});

test('ignores values that are not dates and survives an unknown locale', () => {
  assert.strictEqual(windowText(forecast('soon', 'later'), 'en', 'expected', TODAY), '');
  assert.ok(windowText(forecast('2026-07-03', '2026-07-07'), 'xx-invalid-locale-!', 'expected', TODAY).startsWith('expected '));
});

console.log('Gauge card');

const GaugeCard = defined['menstruation-cycle-card'] || defined['menstruation-gauge-card'];

function gaugeHtml(state, attributes) {
  const shadow = new FakeShadowRoot();
  const card = Object.create(GaugeCard.prototype);
  card.attachShadow = () => shadow;
  Object.defineProperty(card, 'shadowRoot', { get: () => shadow, configurable: true });
  card.getBoundingClientRect = () => ({ width: 400 });
  card.addEventListener = () => {};
  card.closest = () => null;
  card.setConfig({ entity: 'sensor.menstruation' });
  card._viewDate = TODAY;
  card._todayDate = () => TODAY;
  card._hass = {
    locale: { language: 'en' },
    themes: { darkMode: false },
    states: {
      'sensor.menstruation': {
        state,
        attributes: {
          entry_id: 'test', friendly_name: 'Test', history: [], grouped_starts: ['2026-06-07'], period_duration_days: 5,
          next_predicted_start: '2026-07-05', days_until_next_start: 4, symptom_history: [], ...attributes,
        },
      },
    },
  };
  card._render();
  return shadow.innerHTML;
}

test('shows the window under the countdown', () => {
  const html = gaugeHtml('neutral', forecast('2026-07-03', '2026-07-07'));
  assert.ok(html.includes('<div class="center-window">expected Jul 3 – Jul 7</div>'), 'window line missing');
});

test('shows nothing without a window or while pre-menarche', () => {
  assert.ok(!gaugeHtml('neutral', {}).includes('<div class="center-window">'));
  assert.ok(!gaugeHtml('pre_menarche', { ...forecast('2026-07-03', '2026-07-07'), menarche_data: { estimated_date: '2026-09-01' } }).includes('<div class="center-window">'));
});

console.log('Compact status card');

const StatusCard = defined['menstruation-cycle-compact-status'];

function statusHtml(state, attributes) {
  const shadow = new FakeShadowRoot();
  const card = Object.create(StatusCard.prototype);
  card.attachShadow = () => shadow;
  Object.defineProperty(card, 'shadowRoot', { get: () => shadow, configurable: true });
  card.addEventListener = () => {};
  card.dispatchEvent = () => {};
  card.setConfig({ entity: 'sensor.menstruation' });
  card._hass = {
    locale: { language: 'en' },
    states: { 'sensor.menstruation': { state, attributes: { avg_cycle_length: '28', days_until_next_start: '4', period_duration_days: '5', ...attributes } } },
  };
  // The helper reads the real clock here: use a window that is still open today.
  card._render();
  return shadow.innerHTML;
}

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

test('shows the window in the cycle layout', () => {
  const html = statusHtml('neutral', forecast(day(2), day(6)));
  assert.ok(/<div class="cycle-window">expected [^<]+ – [^<]+<\/div>/.test(html), 'window line missing');
});

test('shows nothing without a window and not in pregnancy', () => {
  assert.ok(!statusHtml('neutral', {}).includes('<div class="cycle-window">'));
  assert.ok(!statusHtml('pregnant', { ...forecast(day(2), day(6)), pregnancy_week: 12 }).includes('<div class="cycle-window">'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
