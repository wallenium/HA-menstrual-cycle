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
const mount = (state, attributes = {}, discreet = false) => {
  const panel = new Panel();
  panel._lang = 'en';
  return panel._renderPeriodActions({ state, attributes }, discreet);
};

(async () => {
  // no running period: start today / yesterday
  const idle = mount('neutral');
  assert.ok(idle.includes('data-action="period-start" data-days-ago="0"'), idle);
  assert.ok(idle.includes('data-action="period-start" data-days-ago="1"'), idle);
  assert.ok(idle.includes('Period started today') && idle.includes('Period started yesterday'), idle);
  assert.ok(!idle.includes('period-end'));

  // running period (by state or by the bleeding block): only "bleeding is over"
  for (const running of [mount('period'), mount('fertile', { current_bleeding_block: { is_active: true } })]) {
    assert.ok(running.includes('data-action="period-end"') && running.includes('Bleeding is over'), running);
    assert.ok(!running.includes('period-start'));
  }

  // hidden in discreet mode and for life stages without periods
  assert.strictEqual(mount('neutral', {}, true), '');
  for (const state of ['pregnant', 'pre_menarche', 'menopause', 'postpartum', 'private']) {
    assert.strictEqual(mount(state), '', state);
  }

  // the handlers call the right services
  const calls = [];
  const panel = new Panel();
  panel._lang = 'en';
  panel.render = () => {};
  panel._selectedEntityId = 'sensor.menstruation_berta';
  panel._hass = {
    states: { 'sensor.menstruation_berta': { attributes: { profile: 'berta' } } },
    callService: async (domain, service, data) => { calls.push([domain, service, data]); },
  };
  const iso = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  await panel._logPeriodAction('start', '1');
  assert.deepStrictEqual(calls[0], ['menstruation_cycle', 'add_cycle_start', { entity_id: 'sensor.menstruation_berta', profile: 'berta', date: iso(1) }]);
  assert.strictEqual(panel._message, 'Period start saved.');
  await panel._logPeriodAction('end', '0');
  assert.deepStrictEqual(calls[2], ['menstruation_cycle', 'add_symptom', {
    entity_id: 'sensor.menstruation_berta', profile: 'berta', date: iso(0), symptom_data: { bleeding_strength: 'none' },
  }]);
  panel._hass.callService = async () => { throw new Error('boom'); };
  await panel._logPeriodAction('start', '0');
  assert.strictEqual(panel._message, 'Could not save.');

  console.log('dashboard period actions: ok');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
