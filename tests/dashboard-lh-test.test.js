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

const iso = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const makePanel = (state, attributes = {}, cachedHistory = []) => {
  const panel = new Panel();
  panel._lang = 'en';
  panel.render = () => {};
  panel._selectedEntityId = 'sensor.menstruation_berta';
  const calls = [];
  panel._hass = {
    states: { 'sensor.menstruation_berta': { state, attributes: { profile: 'berta', ...attributes } } },
    callService: async (domain, service, data) => { calls.push([domain, service, data]); },
  };
  panel._fullHistoryCache = { berta: { symptom_history: cachedHistory } };
  return { panel, calls };
};

const window_ = { fertile_window_start: iso(-2), fertile_window_end: iso(2) };
const html = (state, attrs, history, discreet = false) => {
  const { panel } = makePanel(state, attrs, history);
  return panel._renderLhTestActions(panel._hass.states['sensor.menstruation_berta'], discreet);
};

(async () => {
  // shown inside the fertile window, with both answers
  const shown = html('fertile', window_, []);
  assert.ok(shown.includes('data-action="lh-test" data-value="positive_ovulation"'), shown);
  assert.ok(shown.includes('data-action="lh-test" data-value="negative_ovulation"'), shown);
  assert.ok(shown.includes('Ovulation test today:') && shown.includes('LH test positive') && shown.includes('LH test negative'), shown);

  // window edges are inclusive; outside, without a window, in discreet mode, during the period and in other life stages: nothing
  assert.ok(html('neutral', { fertile_window_start: iso(0), fertile_window_end: iso(3) }, []).includes('lh-test'));
  assert.ok(html('neutral', { fertile_window_start: iso(-3), fertile_window_end: iso(0) }, []).includes('lh-test'));
  assert.strictEqual(html('neutral', { fertile_window_start: iso(1), fertile_window_end: iso(5) }, []), '');
  assert.strictEqual(html('neutral', { fertile_window_start: iso(-5), fertile_window_end: iso(-1) }, []), '');
  assert.strictEqual(html('neutral', {}, []), '');
  assert.strictEqual(html('fertile', window_, [], true), '');
  assert.strictEqual(html('period', window_, []), '');
  for (const state of ['pregnant', 'pre_menarche', 'menopause', 'postpartum', 'private']) {
    assert.strictEqual(html(state, window_, []), '', state);
  }

  // today's answer is shown as pressed
  const pressed = html('fertile', window_, [{ date: iso(0), test: ['positive_ovulation'] }]);
  assert.ok(/data-value="positive_ovulation"[^>]*aria-pressed="true"/.test(pressed.replace(/\n/g, ' ')) || pressed.includes('aria-pressed="true">LH test positive'), pressed);
  assert.ok(pressed.includes('aria-pressed="false">LH test negative'), pressed);
  const other = html('fertile', window_, [{ date: iso(-1), test: ['positive_ovulation'] }]);
  assert.ok(!other.includes('aria-pressed="true"'), 'a test from another day is not pressed');

  // logging: the click calls add_symptom for today
  {
    const { panel, calls } = makePanel('fertile', window_, []);
    const button = Object.create(global.HTMLElement.prototype);
    button.classList = { contains: () => false };
    button.dataset = { action: 'lh-test', value: 'positive_ovulation' };
    button.closest = () => button;
    panel._handleClick({ target: button });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepStrictEqual(calls[0], ['menstruation_cycle', 'add_symptom', {
      entity_id: 'sensor.menstruation_berta', profile: 'berta', date: iso(0), symptom_data: { test: ['positive_ovulation'] },
    }]);
    assert.strictEqual(calls[1][1], 'update_entity');
    assert.strictEqual(panel._message, 'LH test saved for today.');
  }

  // the negative button logs the negative answer
  {
    const { panel, calls } = makePanel('fertile', window_, []);
    const button = Object.create(global.HTMLElement.prototype);
    button.classList = { contains: () => false };
    button.dataset = { action: 'lh-test', value: 'negative_ovulation' };
    button.closest = () => button;
    panel._handleClick({ target: button });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepStrictEqual(calls[0][2].symptom_data, { test: ['negative_ovulation'] });
  }

  // the buttons sit right below the period actions in the panel
  assert.ok(/\$\{this\._renderPeriodActions\(stateObj, discreetMode\)\}\s*\$\{this\._renderLhTestActions\(stateObj, discreetMode\)\}/.test(source));

  // the service replaces the whole test field: other tests of today stay, an earlier LH answer is swapped
  {
    const history = [{ date: iso(0), test: ['negative_ovulation', 'negative_pregnancy'] }, { date: iso(-1), test: ['positive_ovulation'] }];
    const { panel, calls } = makePanel('fertile', window_, history);
    await panel._logLhTest('positive_ovulation');
    assert.deepStrictEqual(calls[0][2].symptom_data, { test: ['negative_pregnancy', 'positive_ovulation'] });
    assert.strictEqual(calls[0][2].date, iso(0));
  }

  // anything but the two LH values is ignored, a failing service shows the error
  {
    const { panel, calls } = makePanel('fertile', window_, []);
    await panel._logLhTest('positive_pregnancy');
    await panel._logLhTest(undefined);
    assert.strictEqual(calls.length, 0);
    panel._hass.callService = async () => { throw new Error('boom'); };
    await panel._logLhTest('negative_ovulation');
    assert.strictEqual(panel._message, 'Could not save.');
  }

  // every language has the texts
  for (const lang of ['de', 'en', 'es', 'fr', 'sv']) {
    const t = JSON.parse(fs.readFileSync(path.join(__dirname, `../custom_components/menstruation_cycle/www/translations/${lang}.json`), 'utf8'));
    for (const key of ['dashboard_lh_label', 'dashboard_lh_positive', 'dashboard_lh_negative', 'dashboard_lh_done']) {
      assert.ok(t[key] && t[key].length > 3, `${lang}.${key}`);
    }
  }

  console.log('dashboard LH test buttons: ok');
})().catch((error) => { console.error(error); process.exit(1); });
