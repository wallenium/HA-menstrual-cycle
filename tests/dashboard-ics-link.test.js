'use strict';
// ICS feed URL (secret token) must come from the admin-only websocket command,
// never from a state attribute (Frenck review, hacs/default#9845).

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-cycle-dashboard-panel.js'),
  'utf8',
);

global.HTMLElement = class HTMLElement {
  attachShadow() {
    this.shadowRoot = { innerHTML: '', addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [] };
    return this.shadowRoot;
  }
};
global.HTMLInputElement = class {};
global.HTMLFormElement = class {};
Object.defineProperty(global, 'navigator', { value: { language: 'en' }, configurable: true });
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const defined = {};
global.customElements = { define: (n, c) => { defined[n] = c; }, get: (n) => defined[n] };
const en = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/translations/en.json'), 'utf8'));
global.window = {
  location: { origin: 'http://ha.local:8123' },
  menstruationCycleI18n: { cache: { en }, fallback: { en }, loading: {} },
};
global.document = { scripts: [], querySelectorAll: () => [], createElement: () => ({}), head: {}, body: {}, documentElement: {} };
// eslint-disable-next-line no-eval
eval(source);
const Panel = defined['menstruation-cycle-dashboard-panel'];

const make = (sendMessagePromise) => {
  const panel = new Panel();
  panel._lang = 'en';
  panel._hass = { connection: { sendMessagePromise } };
  panel.renders = 0;
  panel.render = () => { panel.renders += 1; };
  return panel;
};

assert.ok(!/googleapis|gstatic|@import url\(/.test(source), 'no runtime font download');

(async () => {
  // A legacy attribute is ignored: no link, and the websocket command is used instead.
  const sent = [];
  const panel = make((msg) => { sent.push(msg); return Promise.resolve({ enabled: true, url: '/menstruation_cycle/ics/TOKEN.ics' }); });
  assert.strictEqual(panel._renderIcsSubscribeLink({ profile: 'anna', ics_url: '/leak.ics' }), '');
  assert.deepStrictEqual(sent, [{ type: 'menstruation_cycle/ics_url', profile: 'anna' }]);
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(panel.renders, 1, 're-rendered once the URL arrived');
  const html = panel._renderIcsSubscribeLink({ profile: 'anna' });
  assert.ok(html.includes('webcal://ha.local:8123/menstruation_cycle/ics/TOKEN.ics'), html);
  assert.ok(!html.includes('leak'), html);
  panel._renderIcsSubscribeLink({ profile: 'anna' });
  assert.strictEqual(sent.length, 1, 'asked only once per profile');

  // Feed off: no URL -> no link, no re-render.
  const off = make(() => Promise.resolve({ enabled: false, url: null }));
  off._renderIcsSubscribeLink({ profile: 'anna' });
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(off._renderIcsSubscribeLink({ profile: 'anna' }), '');
  assert.strictEqual(off.renders, 0);

  // Not an admin (command rejected): no link, no crash.
  const denied = make(() => Promise.reject(new Error('unauthorized')));
  denied._renderIcsSubscribeLink({ profile: 'anna' });
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(denied._renderIcsSubscribeLink({ profile: 'anna' }), '');
  console.log('dashboard-ics-link: ok');
})().catch((err) => { console.error(err); process.exit(1); });
