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
const render = (status, discreet = false) => {
  const panel = new Panel();
  panel._lang = 'en';
  return panel._renderContraceptionWarning({ attributes: { contraception_status: status } }, discreet);
};

(async () => {
  // Renewal period over: reminder plus the confirm button.
  const due = render({ current_method: 'implant', renewal_reminder_due: true, renewal_due_date: '2026-01-10' });
  assert.ok(due.includes('data-action="confirm-contraception-renewal"'), 'button when a renewal is due');
  assert.ok(due.includes('Renewed / new pack started today'), due);

  // Nothing due and no rhythm: no button.
  assert.ok(!render({ current_method: 'implant', renewal_reminder_due: false, is_hormonal: true }).includes('confirm-contraception-renewal'));

  // Patch rhythm: next step shown with its name, button only when a new pack is due soon.
  const change = render({ current_method: 'patch', rhythm: { event: 'patch_change', date: '2026-10-06', days_until: 5 } });
  assert.ok(change.includes('Next step: Patch change ('), change);
  assert.ok(!change.includes('confirm-contraception-renewal'), 'no button for a weekly patch change');
  for (const [event, label] of [['patch_new', 'New patch'], ['ring_insert', 'Insert new ring']]) {
    const html = render({ current_method: 'x', rhythm: { event, date: '2026-10-06', days_until: 0 } });
    assert.ok(html.includes(`Next step: ${label} (`), html);
    assert.ok(html.includes('confirm-contraception-renewal'), `button for ${event}`);
  }
  assert.ok(!render({ current_method: 'ring', rhythm: { event: 'ring_insert', date: '2026-10-20', days_until: 3 } }).includes('confirm-contraception-renewal'));
  assert.ok(render({ current_method: 'ring', rhythm: { event: 'ring_remove', date: '2026-10-20', days_until: 3 } }).includes('Remove ring (ring-free week)'));

  // Every step the backend can report has a text, no raw key leaks.
  for (const event of ['patch_change', 'patch_remove', 'patch_new', 'ring_remove', 'ring_insert']) {
    const html = render({ current_method: 'x', rhythm: { event, date: '2026-10-06', days_until: 9 } });
    assert.ok(!html.includes('dashboard_contraception'), `${event}: ${html}`);
  }

  // Discreet mode hides everything.
  assert.strictEqual(render({ current_method: 'ring', renewal_reminder_due: true, rhythm: { event: 'ring_insert', date: '2026-10-06', days_until: 0 } }, true), '');

  // The click calls the service for the selected profile and reports the result.
  const calls = [];
  const panel = new Panel();
  panel._lang = 'en';
  panel.render = () => {};
  panel._selectedEntityId = 'sensor.menstruation_anna';
  panel._hass = {
    states: { 'sensor.menstruation_anna': { attributes: { profile: 'anna' } } },
    callService: async (domain, service, data) => { calls.push([domain, service, data]); },
  };
  await panel._confirmContraceptionRenewal();
  assert.deepStrictEqual(calls[0], ['menstruation_cycle', 'confirm_contraception_renewal', { entity_id: 'sensor.menstruation_anna', profile: 'anna' }]);
  assert.strictEqual(panel._message, 'Saved. The renewal period now counts from today.');

  let seen = 0;
  panel._confirmContraceptionRenewal = () => { seen += 1; };
  class Btn extends HTMLElement {
    constructor() { super(); this.dataset = { action: 'confirm-contraception-renewal' }; this.classList = { contains: () => false }; }
    closest() { return this; }
  }
  global.HTMLElement = HTMLElement;
  panel._handleClick({ target: new Btn() });
  assert.strictEqual(seen, 1, 'the button is wired to the handler');

  // A failing service shows the error text instead of throwing.
  const failing = new Panel();
  failing._lang = 'en';
  failing.render = () => {};
  failing._selectedEntityId = 'sensor.menstruation_anna';
  failing._hass = { states: {}, callService: async () => { throw new Error('no current method'); } };
  await failing._confirmContraceptionRenewal();
  assert.ok(failing._message.startsWith('Could not save. Renewal applies'), failing._message);

  console.log('Contraception panel tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
