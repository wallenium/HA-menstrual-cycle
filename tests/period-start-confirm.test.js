/**
 * Calendar and gauge card: a tapped day 3-14 days after the previous period day asks before it opens a new period.
 *
 * Run with: node tests/period-start-confirm.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const www = path.join(__dirname, '../custom_components/menstruation_cycle/www');
const read = (name) => fs.readFileSync(path.join(www, name), 'utf8');

const defined = {};
global.HTMLElement = class HTMLElement {};
global.customElements = { define: (name, cls) => { defined[name] = cls; }, get: (name) => defined[name] || null };
global.ResizeObserver = class { observe() {} disconnect() {} };
global.requestAnimationFrame = (cb) => { cb(); return 0; };
global.document = undefined;
const en = JSON.parse(read('translations/en.json'));
const de = JSON.parse(read('translations/de.json'));
global.window = {
  customCards: [],
  menstruationCycleI18n: { cache: { en, de }, loading: {}, fallback: { en: {} } },
};
// eslint-disable-next-line no-eval
eval(read('menstruation-functions.js'));
// eslint-disable-next-line no-eval
eval(read('menstruation-calendar-card.js'));
// eslint-disable-next-line no-eval
eval(read('menstruation-gauge-card.js'));

const cards = {
  calendar: defined['menstruation-calendar-card'],
  gauge: defined['menstruation-cycle-card'] || defined['menstruation-gauge-card'],
};

const LAST = ['2026-07-01', '2026-07-02', '2026-07-03'];
const prompts = [];
let answer = true;
window.confirm = (text) => {
  prompts.push(text);
  return answer;
};

function makeCard(Card, lang = 'en') {
  const calls = [];
  const card = Object.create(Card.prototype);
  card._config = { entity: 'sensor.menstruation' };
  card._lang = () => lang;
  card._render = () => {};
  card._hass = {
    locale: { language: lang },
    callService: async (domain, service, data) => { calls.push([service, data.date]); },
    states: { 'sensor.menstruation': { state: 'ok', attributes: { entry_id: 'e1', profile: 'default', history: LAST, grouped_starts: ['2026-07-01'] } } },
  };
  return { card, calls };
}

(async () => {
  for (const [name, Card] of Object.entries(cards)) {
    assert.ok(Card, `${name} card registered`);
    const run = async (iso, lang) => {
      const { card, calls } = makeCard(Card, lang);
      prompts.length = 0;
      await card._toggleCycleStart(iso);
      return { calls, prompts: [...prompts] };
    };

    // 5 days after the last period day (07-03): asked, then added
    answer = true;
    let result = await run('2026-07-08');
    assert.deepStrictEqual(result.prompts, ['The previous period day was 5 days ago. Add this day as a new period anyway?'], name);
    assert.deepStrictEqual(result.calls, [['add_cycle_start', '2026-07-08']], name);

    // declined: nothing is saved
    answer = false;
    result = await run('2026-07-08');
    assert.strictEqual(result.prompts.length, 1, name);
    assert.deepStrictEqual(result.calls, [], name);
    answer = true;

    // translated question
    result = await run('2026-07-08', 'de');
    assert.ok(result.prompts[0].includes('vor 5 Tagen'), result.prompts[0]);

    // boundaries: 07-04 (1 day) and 07-05 (2 days) continue the period; 3 and 14 days ask; 15 days does not
    for (const [iso, asks] of [['2026-07-04', false], ['2026-07-05', false], ['2026-07-06', true], ['2026-07-17', true], ['2026-07-18', false]]) {
      result = await run(iso);
      assert.strictEqual(result.prompts.length === 1, asks, `${name} ${iso}`);
      assert.deepStrictEqual(result.calls, [['add_cycle_start', iso]], `${name} ${iso}`);
    }

    // a day before every logged period day has no predecessor
    result = await run('2026-06-20');
    assert.strictEqual(result.prompts.length, 0, name);

    // removing a day keeps its own confirmation and is not affected
    result = await run('2026-07-02');
    assert.deepStrictEqual(result.prompts, [en.confirm_remove_cycle_start], name);
    assert.deepStrictEqual(result.calls, [['remove_cycle_start', '2026-07-02']], name);
  }
  console.log("All period start confirm tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
