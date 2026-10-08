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

const makePanel = (handler) => {
  const calls = [];
  const panel = new Panel();
  panel._lang = 'en';
  panel.render = () => {};
  panel._hass = {
    connection: {
      sendMessagePromise: async (msg) => {
        calls.push(msg);
        return handler(msg);
      },
    },
  };
  return { panel, calls };
};

const summary = {
  cycle_length: 29, average_cycle_length: 28, days_relative_to_average: 1,
  period_days: 5, pain_days: 3,
  recent_cycle_lengths: [27, 30, 28, 29],
  prediction_accuracy: { cycles: 4, mean_abs_error_days: 1.5, within_2_days: 3, errors: [] },
};

(async () => {
  // Rendered tile uses the translated tag and fills every placeholder.
  const ok = makePanel(async (msg) => (msg.service === 'get_last_cycle_summary' ? { response: summary } : { response: null }));
  assert.strictEqual(ok.panel._lastCycleSummary(stateObj), null, 'first call has nothing cached yet');
  await flushPromises();
  const html = ok.panel._renderCycleInsights(stateObj);
  assert.ok(html.includes('Last completed cycle'), 'tile tag is rendered');
  assert.ok(html.includes('29 days (avg 28) · period 5 days · pain days 3'), html);
  assert.ok(!/\{(length|average|period|pain)\}/.test(html), 'no placeholder left over');
  assert.ok(!html.includes('dashboard_last_cycle'), 'no raw translation key shown');

  // Prediction accuracy: its own entry, all placeholders filled, absent without data.
  assert.ok(html.includes('Prediction accuracy'), html);
  assert.ok(html.includes('1.5 days from the predicted day on average over the last 4 cycles (3 within 2 days)'), html);
  assert.ok(!html.includes('dashboard_prediction_accuracy') && !/\{(mean|cycles|within)\}/.test(html));
  const noAccuracy = makePanel(async () => ({ response: { ...summary, prediction_accuracy: null } }));
  noAccuracy.panel._lastCycleSummary(stateObj);
  await flushPromises();
  assert.ok(!noAccuracy.panel._renderCycleInsights(stateObj).includes('Prediction accuracy'), 'no entry without accuracy data');

  // Trend bars: one per cycle, newest highlighted, heights relative to the longest, numbers in the aria-label.
  assert.strictEqual((html.match(/class="cycle-bar( latest)?"/g) || []).length, 4, 'one bar per cycle');
  assert.strictEqual((html.match(/cycle-bar latest/g) || []).length, 1, 'only the newest bar is highlighted');
  assert.ok(/cycle-bar latest" style="height:\d+%" title="29"/.test(html), 'the newest cycle is the highlighted one');
  assert.ok(html.indexOf('title="27"') < html.indexOf('title="29"'), 'oldest first');
  assert.ok(html.includes('height:100%" title="30"'), 'longest cycle gets full height');
  assert.ok(html.includes('aria-label="Cycle lengths of the latest cycles in days: 27, 30, 28, 29"'), html);

  // Fewer than two cycles, or junk values: no chart at all.
  assert.strictEqual(ok.panel._renderCycleLengthBars([29]), '');
  assert.strictEqual(ok.panel._renderCycleLengthBars(undefined), '');
  assert.strictEqual(ok.panel._renderCycleLengthBars([null, 'x', 29]), '');

  // Several renders trigger exactly one service call per profile.
  ok.panel._renderCycleInsights(stateObj);
  ok.panel._renderCycleInsights(stateObj);
  await flushPromises();
  assert.strictEqual(ok.calls.filter((c) => c.service === 'get_last_cycle_summary').length, 1, 'fetch is deduplicated');
  assert.deepStrictEqual(
    ok.calls.find((c) => c.service === 'get_last_cycle_summary'),
    { type: 'call_service', domain: 'menstruation_cycle', service: 'get_last_cycle_summary', service_data: { profile: 'alice' }, return_response: true },
  );

  // A failing service (fewer than two cycle starts) is cached as null: no tile, no retry loop.
  const warn = console.warn;
  console.warn = () => {};
  const bad = makePanel(async () => { throw new Error('needs two cycle starts'); });
  bad.panel._lastCycleSummary(stateObj);
  await flushPromises();
  bad.panel._lastCycleSummary(stateObj);
  bad.panel._lastCycleSummary(stateObj);
  await flushPromises();
  assert.strictEqual(bad.calls.filter((c) => c.service === 'get_last_cycle_summary').length, 1, 'failure is cached');
  assert.ok(!bad.panel._renderCycleInsights(stateObj).includes('Last completed cycle'), 'no tile without a summary');

  // Missing optional numbers fall back to a dash instead of "undefined".
  const sparse = makePanel(async () => ({ response: { cycle_length: 30 } }));
  sparse.panel._lastCycleSummary(stateObj);
  await flushPromises();
  const sparseHtml = sparse.panel._renderCycleInsights(stateObj);
  assert.ok(sparseHtml.includes('30 days (avg –) · period – days · pain days –'), sparseHtml);
  assert.ok(!sparseHtml.includes('undefined'));

  console.warn = warn;
  console.log('Last-cycle tile tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
