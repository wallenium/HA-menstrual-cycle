'use strict';
// HA 2026.6 card picker: cards are suggested only for a cycle sensor of this integration, never for random entities.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.window = { customCards: [] };
global.HTMLElement = class HTMLElement {};
global.customElements = { define() {}, get: () => undefined };
global.document = { createElement: () => ({}) };

const www = path.join(__dirname, '../custom_components/menstruation_cycle/www');
for (const file of ['menstruation-gauge-card.js', 'menstruation-cycle-compact-status-card.js',
  'menstruation-calendar-card.js', 'menstruation-pill-card.js']) {
  // eslint-disable-next-line no-eval
  eval(fs.readFileSync(path.join(www, file), 'utf8'));
}

const cycle = { visibility_level: 'private', onboarding_stage: 'adult' };
const hass = { states: {
  'sensor.anna': { attributes: cycle },
  'sensor.anna_pill': { attributes: { ...cycle, pill_pack: {} } },
  'light.kitchen': { attributes: { brightness: 3 } },
} };
const byType = Object.fromEntries(window.customCards.map((c) => [c.type, c]));
assert.strictEqual(Object.keys(byType).length, 4);

for (const type of ['menstruation-gauge-card', 'menstruation-cycle-compact-status', 'menstruation-calendar-card']) {
  const card = byType[type];
  assert.deepStrictEqual(card.getEntitySuggestion(hass, 'sensor.anna').config, { type: `custom:${type}`, entity: 'sensor.anna' });
  assert.strictEqual(card.getEntitySuggestion(hass, 'light.kitchen'), null);
  assert.strictEqual(card.getEntitySuggestion(hass, 'sensor.missing'), null);
  assert.strictEqual(card.getEntitySuggestion({}, 'sensor.anna'), null);
}

const pill = byType['menstruation-pill-card'];
assert.strictEqual(pill.getEntitySuggestion(hass, 'sensor.anna'), null); // no pill pack -> no pill card
assert.deepStrictEqual(pill.getEntitySuggestion(hass, 'sensor.anna_pill').config,
  { type: 'custom:menstruation-pill-card', entity: 'sensor.anna_pill' });
console.log('card-picker-suggestions: ok');
