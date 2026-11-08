'use strict';
// Teen design in the standalone cards: the same decision as the dashboard panel, the saved choice read once per profile,
// and the three cards (calendar, gauge, compact status) apply it.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const www = path.join(__dirname, '../custom_components/menstruation_cycle/www');
global.window = {};
require(path.join(www, 'menstruation-functions.js'));
const F = global.window.MenstruationFunctions;

// decision
assert.strictEqual(F.isTeen({}, null), false, 'an established adult profile');
assert.strictEqual(F.isTeen({ onboarding_stage: 'pre_menarche' }, null), true);
assert.strictEqual(F.isTeen({ onboarding_stage: 'early_menarche' }, null), true);
assert.strictEqual(F.isTeen({ onboarding_stage_effective: 'early_menarche', onboarding_stage: 'established_cycle' }, null), true, 'the effective stage wins');
assert.strictEqual(F.isTeen({ age_at_tracking: 15 }, null), true);
assert.strictEqual(F.isTeen({ age_at_tracking: 16 }, null), false, '16 is no longer a teen design');
assert.strictEqual(F.isTeen({ age_at_tracking: 0 }, null), true);
assert.deepStrictEqual([null, '15', -1, 12.5, 'x'].map((age) => F.isTeen({ age_at_tracking: age }, null)), [false, false, false, false, false], 'no age, text, negative or fractional: no teen');
assert.strictEqual(F.isTeen({}, { teenStyle: 'on' }), true, 'switched on');
assert.strictEqual(F.isTeen({ age_at_tracking: 12 }, { teenStyle: 'off' }), false, 'switched off beats the age');
assert.strictEqual(F.isTeen({ age_at_tracking: 12 }, { teenStyle: 'auto' }), true);
assert.strictEqual(F.isTeen({ age_at_tracking: 12 }, { teenStyle: 'bogus' }), true, 'unknown values mean automatic');

// applying it to a card
const makeHost = () => { const host = { attrs: new Set(), toggleAttribute(name, on) { if (on) this.attrs.add(name); else this.attrs.delete(name); } }; return host; };
const calls = [];
let resolveFetch;
const hass = { connection: { sendMessagePromise: (msg) => { calls.push(msg); return new Promise((resolve) => { resolveFetch = resolve; }); } } };
const state = (attributes) => ({ attributes });
const host = makeHost();
F.applyTeenLook(host, hass, state({ profile: 'anna', age_at_tracking: 12 }));
assert.ok(host.attrs.has('data-teen'), 'automatic until the saved choice arrives');
assert.strictEqual(calls.length, 1);
assert.deepStrictEqual([calls[0].service, calls[0].service_data, calls[0].return_response], ['get_dashboard_prefs', { profile: 'anna' }, true], 'the saved settings of that profile');
F.applyTeenLook(host, hass, state({ profile: 'anna', age_at_tracking: 12 }));
assert.strictEqual(calls.length, 1, 'one fetch while it is under way');
resolveFetch({ response: { prefs: { teenStyle: 'off' } } });
setImmediate(() => {
  assert.ok(!host.attrs.has('data-teen'), 'the saved "off" takes the design away once it is known');
  F.applyTeenLook(host, hass, state({ profile: 'anna', age_at_tracking: 12 }));
  assert.strictEqual(calls.length, 1, 'and is not fetched again');
  assert.ok(!host.attrs.has('data-teen'));
  const adult = makeHost();
  F.applyTeenLook(adult, hass, state({ profile: 'bea' }));
  assert.ok(!adult.attrs.has('data-teen'));
  assert.strictEqual(calls.length, 2, 'each profile has its own settings');
  resolveFetch({ response: { prefs: { teenStyle: 'on' } } });
  setImmediate(() => {
    assert.ok(adult.attrs.has('data-teen'), 'switched on in the panel: the card follows');
    // a failed read keeps the automatic decision and does not retry in a loop
    const failing = makeHost();
    let failures = 0;
    const failHass = { connection: { sendMessagePromise: () => { failures += 1; return Promise.reject(new Error('no')); } } };
    F.applyTeenLook(failing, failHass, state({ profile: 'c', age_at_tracking: 9 }));
    setImmediate(() => {
      F.applyTeenLook(failing, failHass, state({ profile: 'c', age_at_tracking: 9 }));
      assert.ok(failing.attrs.has('data-teen') && failures === 1, 'automatic, one try');
      // no state / no connection: nothing happens, no error
      F.applyTeenLook(makeHost(), {}, null);
      const offline = makeHost();
      F.applyTeenLook(offline, {}, state({ onboarding_stage: 'pre_menarche' }));
      assert.ok(offline.attrs.has('data-teen'));
      done();
    });
  });
});

function done() {
  // the look: the tint is the one the panel's contrast test checks
  assert.ok(F.TEEN_CARD_CSS.includes('88%, #F4A6CF 12%') && F.TEEN_CARD_CSS.includes('94%, #F4A6CF 6%'), 'same tint shares as the panel');
  // these cards call it at the start of their render and carry the style (cycle-card, the editors and the old compact card have no look)
  const cards = ['calendar-card', 'gauge-card', 'cycle-compact-status-card', 'cycle-heatmap-card', 'statistics-card', 'pill-card', 'support-card',
    'product-inventory-card', 'countdown-timer', 'cycle-history-card-row'];
  for (const file of cards.map((name) => `menstruation-${name}.js`)) {
    const src = fs.readFileSync(path.join(www, file), 'utf8');
    assert.strictEqual((src.match(/MenstruationFunctions\?\.applyTeenLook\?\.\(this, this\._hass,/g) || []).length, 1, `${file}: applies the look`);
    assert.strictEqual((src.match(/\$\{window\.MenstruationFunctions\?\.TEEN_CARD_CSS \|\| ['"]{2}\}/g) || []).length, 1, `${file}: carries the style`);
  }
  console.log('teen-cards: ok');
}
