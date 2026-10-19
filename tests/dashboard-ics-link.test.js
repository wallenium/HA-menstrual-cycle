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
  // Rotation: admin button asks first, sends the command and swaps in the new URL; "cancel" sends nothing.
  const rotSent = [];
  const rot = make((msg) => {
    rotSent.push(msg);
    return Promise.resolve(msg.type === 'menstruation_cycle/ics_url'
      ? { enabled: true, url: '/menstruation_cycle/ics/OLD.ics' }
      : { enabled: true, url: '/menstruation_cycle/ics/NEW.ics' });
  });
  rot._renderIcsSubscribeLink({ profile: 'anna' });
  await new Promise((r) => setImmediate(r));
  assert.ok(rot._renderIcsSubscribeLink({ profile: 'anna' }).includes('data-action="rotate-ics-url"'), 'rotate button next to the link');
  global.window.confirm = () => false;
  await rot._rotateIcsUrl('anna');
  assert.strictEqual(rotSent.length, 1, 'cancelled: no command sent');
  global.window.confirm = () => true;
  await rot._rotateIcsUrl('anna');
  assert.deepStrictEqual(rotSent[1], { type: 'menstruation_cycle/rotate_ics_token', profile: 'anna' });
  const rotated = rot._renderIcsSubscribeLink({ profile: 'anna' });
  assert.ok(rotated.includes('/ics/NEW.ics') && !rotated.includes('OLD'), rotated);
  assert.strictEqual(rotSent.length, 2, 'no extra fetch after rotation');
  // Partner link: separate URL, copied to the clipboard (absolute), never part of the main link markup.
  const partnerSent = [];
  const partner = make(() => Promise.resolve({ enabled: true, url: '/menstruation_cycle/ics/MAIN.ics', partner_url: '/menstruation_cycle/ics/PARTNER.ics' }));
  partner._renderIcsSubscribeLink({ profile: 'anna' });
  await new Promise((r) => setImmediate(r));
  const partnerHtml = partner._renderIcsSubscribeLink({ profile: 'anna' });
  assert.ok(partnerHtml.includes('data-action="copy-ics-partner-url"') && !partnerHtml.includes('PARTNER'), partnerHtml);
  Object.defineProperty(global, 'navigator', { value: { language: 'en', clipboard: { writeText: (t) => { partnerSent.push(t); return Promise.resolve(); } } }, configurable: true });
  const button = { textContent: '' };
  await partner._copyIcsPartnerUrl('anna', button);
  assert.deepStrictEqual(partnerSent, ['http://ha.local:8123/menstruation_cycle/ics/PARTNER.ics']);
  assert.strictEqual(button.textContent, 'Copied');
  // Partner link renewal sends its own command, keeps the main URL and shows when each link was last fetched.
  const prSent = [];
  const pr = make((msg) => {
    prSent.push(msg);
    return Promise.resolve(msg.type === 'menstruation_cycle/rotate_ics_partner_token'
      ? { enabled: true, url: '/menstruation_cycle/ics/MAIN.ics', partner_url: '/menstruation_cycle/ics/P2.ics', last_fetch: { full: '2026-10-01T08:30:00Z', partner: null } }
      : { enabled: true, url: '/menstruation_cycle/ics/MAIN.ics', partner_url: '/menstruation_cycle/ics/P1.ics', last_fetch: { full: '2026-10-01T08:30:00Z', partner: '2026-10-02T09:00:00Z' } });
  });
  pr._renderIcsSubscribeLink({ profile: 'anna' });
  await new Promise((r) => setImmediate(r));
  const prHtml = pr._renderIcsSubscribeLink({ profile: 'anna' });
  assert.ok(prHtml.includes('data-action="rotate-ics-partner-url"'), prHtml);
  assert.ok(/Feed last fetched: .*2026/.test(prHtml) && /Partner link last fetched: .*2026/.test(prHtml), prHtml);
  global.window.confirm = () => false;
  await pr._rotateIcsPartnerUrl('anna');
  assert.strictEqual(prSent.length, 1, 'cancelled: no command sent');
  global.window.confirm = () => true;
  await pr._rotateIcsPartnerUrl('anna');
  assert.deepStrictEqual(prSent[1], { type: 'menstruation_cycle/rotate_ics_partner_token', profile: 'anna' });
  assert.strictEqual(pr._icsPartnerUrls.anna, '/menstruation_cycle/ics/P2.ics');
  assert.strictEqual(pr._icsUrls.anna, '/menstruation_cycle/ics/MAIN.ics');
  const prAfter = pr._renderIcsSubscribeLink({ profile: 'anna' });
  assert.ok(/Feed last fetched/.test(prAfter) && !/Partner link last fetched/.test(prAfter), prAfter);
  // Feed switched off meanwhile: the link disappears.
  const gone = make(() => Promise.resolve({ enabled: false, url: null }));
  global.window.confirm = () => true;
  await gone._rotateIcsUrl('anna');
  assert.strictEqual(gone._renderIcsSubscribeLink({ profile: 'anna' }), '');
  console.log('dashboard-ics-link: ok');
})().catch((err) => { console.error(err); process.exit(1); });
