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


const html = (state, history, discreet = false) => {
  const { panel } = makePanel(state, {}, history);
  return panel._renderTemperatureAction(panel._hass.states['sensor.menstruation_berta'], discreet);
};

const withInput = (panel, value) => {
  panel.shadowRoot.querySelector = (selector) => (selector === 'input[data-action="temp-input"]' ? { value } : null);
};

(async () => {
  // offered to people who logged a temperature in the last 14 days (edges inclusive)
  const recent = html('neutral', [{ date: iso(-3), basal_temp: 36.4 }]);
  assert.ok(recent.includes('data-action="temp-input"') && recent.includes('data-action="temp-save"'), recent);
  assert.ok(recent.includes('Basal temperature today:') && recent.includes('>Save<'), recent);
  assert.ok(html('neutral', [{ date: iso(-14), basal_temp: 36.4 }]).includes('temp-save'));
  assert.strictEqual(html('neutral', [{ date: iso(-15), basal_temp: 36.4 }]), '');
  assert.strictEqual(html('neutral', [{ date: iso(1), basal_temp: 36.4 }]), '', 'a future entry does not count');
  assert.strictEqual(html('neutral', [{ date: iso(-1), mood: 'ok' }]), '');
  assert.strictEqual(html('neutral', []), '');

  // not in discreet mode and not in other life stages
  assert.strictEqual(html('neutral', [{ date: iso(-1), basal_temp: 36.4 }], true), '');
  for (const state of ['pregnant', 'pre_menarche', 'menarche', 'menopause', 'postpartum', 'private']) {
    assert.strictEqual(html(state, [{ date: iso(-1), basal_temp: 36.4 }]), '', state);
  }
  // it is also offered during the period and the fertile window (unlike the LH buttons)
  assert.ok(html('period', [{ date: iso(-1), basal_temp: 36.4 }]).includes('temp-save'));

  // today's value is prefilled
  assert.ok(html('neutral', [{ date: iso(0), basal_temp: 36.55 }]).includes('value="36.55"'));
  assert.ok(html('neutral', [{ date: iso(-1), basal_temp: 36.55 }]).includes('value=""'));

  // saving: the click reads the field and calls add_symptom for today (comma decimal accepted)
  for (const [typed, expected] of [['36.45', 36.45], [' 36,5 ', 36.5], ['97.8', 97.8]]) {
    const { panel, calls } = makePanel('neutral', {}, [{ date: iso(-1), basal_temp: 36.4 }]);
    withInput(panel, typed);
    const button = Object.create(global.HTMLElement.prototype);
    button.classList = { contains: () => false };
    button.dataset = { action: 'temp-save' };
    button.closest = () => button;
    panel._handleClick({ target: button });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepStrictEqual(calls[0], ['menstruation_cycle', 'add_symptom', {
      entity_id: 'sensor.menstruation_berta', profile: 'berta', date: iso(0), symptom_data: { basal_temp: expected },
    }], typed);
    assert.strictEqual(calls[1][1], 'update_entity');
    assert.strictEqual(panel._message, 'Temperature saved for today.');
  }

  // empty or non-numeric input calls nothing
  for (const typed of ['', '   ', 'abc', '36.4.5']) {
    const { panel, calls } = makePanel('neutral', {}, []);
    withInput(panel, typed);
    await panel._saveTemperature();
    assert.strictEqual(calls.length, 0, JSON.stringify(typed));
    assert.strictEqual(panel._message, 'Please enter a number.');
  }
  {
    const { panel, calls } = makePanel('neutral', {}, []);
    await panel._saveTemperature(); // no field in the DOM at all
    assert.strictEqual(calls.length, 0);
  }

  // the range error of the service (it knows the unit) is shown as is; other failures fall back to the generic text
  {
    const { panel } = makePanel('neutral', {}, []);
    withInput(panel, '365');
    panel._hass.callService = async () => { throw new Error('must be between 30 and 45 (°C)'); };
    await panel._saveTemperature();
    assert.strictEqual(panel._message, 'must be between 30 and 45 (°C)');
    panel._hass.callService = async () => { throw {}; };
    await panel._saveTemperature();
    assert.strictEqual(panel._message, 'Could not save.');
  }

  // the field sits right below the LH buttons in the panel
  assert.ok(/\$\{this\._renderLhTestActions\(stateObj, discreetMode\)\}\s*\$\{this\._renderTemperatureAction\(stateObj, discreetMode\)\}/.test(source));

  // every language has the texts
  for (const lang of ['de', 'en', 'es', 'fr', 'sv']) {
    const t = JSON.parse(fs.readFileSync(path.join(__dirname, `../custom_components/menstruation_cycle/www/translations/${lang}.json`), 'utf8'));
    for (const key of ['dashboard_temp_label', 'dashboard_temp_save', 'dashboard_temp_done', 'dashboard_temp_invalid']) {
      assert.ok(t[key] && t[key].length > 3, `${lang}.${key}`);
    }
  }

  console.log('dashboard temperature entry: ok');
})().catch((error) => { console.error(error); process.exit(1); });
