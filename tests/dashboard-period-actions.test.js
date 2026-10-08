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

  // a start shortly after the last period day is asked about first (same 14-day rule as the backend)
  {
    const calls2 = [];
    const guarded = new Panel();
    guarded._lang = 'en';
    guarded.render = () => {};
    guarded._selectedEntityId = 'sensor.menstruation_berta';
    const setLast = (daysAgo) => {
      guarded._hass = {
        states: { 'sensor.menstruation_berta': { state: 'neutral', attributes: { profile: 'berta', history: [iso(daysAgo + 3), iso(daysAgo + 2), iso(daysAgo)] } } },
        callService: async (domain, service, data) => { calls2.push([domain, service, data]); },
      };
      guarded._periodStartConfirm = null;
      calls2.length = 0;
    };
    const click = (action, daysAgo = '0') => {
      const button = Object.create(global.HTMLElement.prototype);
      button.classList = { contains: () => false };
      button.dataset = { action, daysAgo };
      button.closest = () => button;
      guarded._handleClick({ target: button });
    };
    const html = () => guarded._renderPeriodActions(guarded._hass.states['sensor.menstruation_berta'], false);

    setLast(5);
    click('period-start', '0');
    assert.strictEqual(calls2.length, 0, 'nothing is saved before the answer');
    assert.deepStrictEqual(guarded._periodStartConfirm, { entityId: 'sensor.menstruation_berta', daysAgo: 0, gap: 5 });
    const question = html();
    assert.ok(question.includes('Your last period day was 5 days ago. Start a new period anyway?'), question);
    for (const action of ['period-start-spotting', 'period-start-confirm', 'period-start-cancel']) {
      assert.ok(question.includes(`data-action="${action}"`), action);
    }
    assert.ok(!question.includes('data-action="period-start"'), 'the start buttons give way to the question');

    // "yesterday" counts the gap from yesterday
    setLast(5);
    click('period-start', '1');
    assert.strictEqual(guarded._periodStartConfirm.gap, 4);
    assert.strictEqual(guarded._periodStartConfirm.daysAgo, 1);

    // confirm -> the period is started on the asked day
    click('period-start-confirm', '1');
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepStrictEqual(calls2[0], ['menstruation_cycle', 'add_cycle_start', { entity_id: 'sensor.menstruation_berta', profile: 'berta', date: iso(1) }]);
    assert.strictEqual(guarded._periodStartConfirm, null);

    // spotting -> only a bleeding entry, no period start
    setLast(5);
    click('period-start', '1');
    click('period-start-spotting', '1');
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepStrictEqual(calls2[0], ['menstruation_cycle', 'add_symptom', {
      entity_id: 'sensor.menstruation_berta', profile: 'berta', date: iso(1), symptom_data: { bleeding_strength: 'light' },
    }]);
    assert.ok(!calls2.some((call) => call[1] === 'add_cycle_start'));
    assert.strictEqual(guarded._message, 'Saved as bleeding between periods.');

    // cancel -> nothing saved, buttons are back
    setLast(5);
    click('period-start', '0');
    click('period-start-cancel', '0');
    await new Promise((resolve) => setImmediate(resolve));
    assert.strictEqual(calls2.length, 0);
    assert.strictEqual(guarded._periodStartConfirm, null);
    assert.ok(html().includes('data-action="period-start"'));

    // boundary: 14 days still asks, 15 days and "today is already a period day" do not, nor does a missing history
    for (const [lastDaysAgo, asks] of [[14, true], [15, false], [1, true], [0, false]]) {
      setLast(lastDaysAgo);
      guarded._hass.states['sensor.menstruation_berta'].attributes.history = [iso(lastDaysAgo)];
      click('period-start', '0');
      await new Promise((resolve) => setImmediate(resolve));
      assert.strictEqual(guarded._periodStartConfirm !== null, asks, `last period day ${lastDaysAgo} days ago`);
      assert.strictEqual(calls2.some((call) => call[1] === 'add_cycle_start'), !asks, `last period day ${lastDaysAgo} days ago`);
    }
    setLast(3);
    delete guarded._hass.states['sensor.menstruation_berta'].attributes.history;
    click('period-start', '0');
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(calls2.some((call) => call[1] === 'add_cycle_start'), 'no history attribute: no question');

    // an answer that arrives after the profile was switched is dropped
    setLast(5);
    click('period-start', '0');
    guarded._selectedEntityId = 'sensor.menstruation_clara';
    guarded._hass.states['sensor.menstruation_clara'] = { state: 'neutral', attributes: {} };
    click('period-start-confirm', '0');
    await new Promise((resolve) => setImmediate(resolve));
    assert.strictEqual(calls2.length, 0);
    guarded._selectedEntityId = 'sensor.menstruation_berta';

    // a pending question never shows for another profile
    setLast(5);
    click('period-start', '0');
    guarded._selectedEntityId = 'sensor.menstruation_clara';
    guarded._hass.states['sensor.menstruation_clara'] = { state: 'neutral', attributes: {} };
    assert.ok(guarded._renderPeriodActions(guarded._hass.states['sensor.menstruation_clara'], false).includes('data-action="period-start"'));
  }

  // open repair issues of this integration are counted and linked (refreshed at most every 5 minutes)
  {
    const sent = [];
    let issues = [
      { domain: 'menstruation_cycle', issue_id: 'a', ignored: false },
      { domain: 'menstruation_cycle', issue_id: 'b', ignored: false },
      { domain: 'menstruation_cycle', issue_id: 'c', ignored: true },
      { domain: 'other_integration', issue_id: 'd', ignored: false },
    ];
    let fail = false;
    const make = () => {
      const p = new Panel();
      p._lang = 'en';
      p.render = () => { p.rendered = (p.rendered || 0) + 1; };
      p._hass = {
        connection: {
          sendMessagePromise: async (msg) => {
            sent.push(msg.type);
            if (fail) throw new Error('no permission');
            return { issues };
          },
        },
      };
      return p;
    };
    const tick = () => new Promise((resolve) => setImmediate(resolve));

    const panelWith = make();
    assert.strictEqual(panelWith._renderOpenIssues(false), '', 'nothing before the count is known');
    await tick();
    assert.deepStrictEqual(sent, ['repairs/list_issues']);
    assert.strictEqual(panelWith.rendered, 1);
    const line = panelWith._renderOpenIssues(false);
    assert.ok(line.includes('Open notes about your data: 2') && line.includes('href="/config/repairs"'), line);
    assert.strictEqual(sent.length, 1, 'cached within 5 minutes');

    // discreet mode shows nothing and asks nothing
    const discreet = make();
    assert.strictEqual(discreet._renderOpenIssues(true), '');
    await tick();
    assert.strictEqual(sent.length, 1);

    // exactly 5 minutes is refreshed, a moment earlier is not; an unchanged count does not re-render
    const realNow = Date.now;
    try {
      panelWith._openIssuesAt = 1000000;
      const before = panelWith.rendered;
      Date.now = () => 1000000 + 299999;
      panelWith._fetchOpenIssues();
      await tick();
      assert.strictEqual(sent.length, 1);
      Date.now = () => 1000000 + 300000;
      panelWith._fetchOpenIssues();
      await tick();
      assert.strictEqual(sent.length, 2);
      assert.strictEqual(panelWith.rendered, before, 'same count: no extra render');
    } finally {
      Date.now = realNow;
    }
    sent.length = 1;

    // a refresh after 5 minutes picks up a changed count; no issues hides the line
    panelWith._openIssuesAt -= 300001;
    issues = [];
    panelWith._renderOpenIssues(false);
    await tick();
    assert.strictEqual(panelWith._renderOpenIssues(false), '');

    // a failing request hides the line and does not retry in a loop
    const failing = make();
    fail = true;
    failing._renderOpenIssues(false);
    await tick();
    failing._renderOpenIssues(false);
    assert.strictEqual(failing._renderOpenIssues(false), '');
    assert.strictEqual(sent.length, 3);
  }

  console.log('dashboard period actions: ok');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
