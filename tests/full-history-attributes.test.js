'use strict';

// attributesWithFullHistory: cards get the lists the sensor shed from get_full_history instead of showing less.
const assert = require('assert');
const path = require('path');

global.window = {};
require(path.join(
  __dirname, '..', 'custom_components', 'menstruation_cycle', 'www', 'menstruation-functions.js'));
const mf = global.window.MenstruationFunctions;

const today = new Date().toISOString().slice(0, 10);
const old = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
const RESPONSE = {
  symptom_history: [{ date: today, bleeding_strength: 'light' }],
  product_usage: [{ date: today, product: 'pad', quantity: 2 }, { date: old, product: 'pad', quantity: 1 }],
};

function fakeHass(response = RESPONSE, fail = false) {
  const calls = [];
  return {
    calls,
    connection: {
      sendMessagePromise: (msg) => {
        calls.push(msg);
        return fail ? Promise.reject(new Error('boom')) : Promise.resolve({ response });
      },
    },
  };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));
let n = 0;
const state = (attributes, stamp = 't1') => ({ attributes: { profile: `p${n}`, ...attributes }, last_updated: stamp });

(async () => {
  // nothing missing: the attributes come back untouched and no request is made
  n += 1;
  let hass = fakeHass();
  let st = state({ symptom_history: [], product_usage_timeline: [] });
  assert.strictEqual(mf.attributesWithFullHistory(hass, st), st.attributes);
  assert.strictEqual(hass.calls.length, 0);

  // missing lists: one request, the next call returns the filled-in lists (usage limited to 30 days)
  n += 1;
  hass = fakeHass();
  st = state({ friendly_name: 'x' });
  let updates = 0;
  const first = mf.attributesWithFullHistory(hass, st, () => { updates += 1; });
  assert.strictEqual(first.symptom_history, undefined);
  assert.strictEqual(mf.fullHistoryVersion(st), 0);
  await flush();
  assert.strictEqual(updates, 1);
  assert.strictEqual(mf.fullHistoryVersion(st), 1);
  assert.deepStrictEqual(hass.calls[0].service_data, { profile: `p${n}`, days: 180 });
  assert.strictEqual(hass.calls[0].service, 'get_full_history');
  const filled = mf.attributesWithFullHistory(hass, st, () => {});
  assert.deepStrictEqual(filled.symptom_history, RESPONSE.symptom_history);
  assert.deepStrictEqual(filled.product_usage_timeline, [RESPONSE.product_usage[0]]);
  assert.strictEqual(filled.friendly_name, 'x');
  assert.strictEqual(hass.calls.length, 1, 'same state update: no second request');

  // a newer state update fetches again; an attribute that is present is not replaced
  st = state({ symptom_history: [{ date: 'own' }], friendly_name: 'x' }, 't2');
  st.attributes.profile = `p${n}`;
  const partial = mf.attributesWithFullHistory(hass, st, () => {});
  assert.deepStrictEqual(partial.symptom_history, [{ date: 'own' }]);
  assert.ok(partial.product_usage_timeline.length === 1);
  assert.strictEqual(hass.calls.length, 2);

  // two cards of the same profile are both told when the data arrives
  n += 1;
  hass = fakeHass();
  st = state({});
  const seen = [];
  mf.attributesWithFullHistory(hass, st, () => seen.push('a'));
  mf.attributesWithFullHistory(hass, st, () => seen.push('b'));
  await flush();
  assert.deepStrictEqual(seen.sort(), ['a', 'b']);
  assert.strictEqual(hass.calls.length, 1);

  // a failing service is not retried in a loop for the same state update
  n += 1;
  hass = fakeHass(null, true);
  const origWarn = console.warn;
  console.warn = () => {};
  st = state({});
  mf.attributesWithFullHistory(hass, st, () => {});
  await flush();
  mf.attributesWithFullHistory(hass, st, () => {});
  await flush();
  console.warn = origWarn;
  assert.strictEqual(hass.calls.length, 1);
  assert.strictEqual(mf.attributesWithFullHistory(hass, st, () => {}), st.attributes);

  // no profile or no connection: nothing happens
  const bare = { attributes: {} };
  assert.strictEqual(mf.attributesWithFullHistory(fakeHass(), bare), bare.attributes);
  assert.strictEqual(mf.fullHistoryVersion(bare), 0);
  // the cards that read the two lists from the attributes use the helper and redraw when the data arrives
  const fs = require('fs');
  for (const card of ['menstruation-statistics-card.js', 'menstruation-gauge-card.js', 'menstruation-calendar-card.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'custom_components', 'menstruation_cycle', 'www', card), 'utf8');
    assert.ok(src.includes('attributesWithFullHistory'), `${card} does not use attributesWithFullHistory`);
    assert.ok(src.includes('fullHistoryVersion'), `${card} does not put fullHistoryVersion into its render key`);
  }
  console.log('full-history-attributes: ok');
})().catch((err) => { console.error(err); process.exit(1); });
