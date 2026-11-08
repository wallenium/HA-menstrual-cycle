'use strict';
// HA 2026.6 card picker: cards are suggested only for a cycle sensor of this integration, never for random entities.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.window = { customCards: [] };
global.HTMLElement = class HTMLElement {};
const defined = {};
global.customElements = { define(name, cls) { defined[name] = cls; }, get: () => undefined };
global.document = { createElement: () => ({}) };

const www = path.join(__dirname, '../custom_components/menstruation_cycle/www');
for (const file of ['menstruation-gauge-card.js', 'menstruation-cycle-compact-status-card.js',
  'menstruation-calendar-card.js', 'menstruation-pill-card.js', 'menstruation-cycle-heatmap-card.js',
  'menstruation-cycle-history-card-row.js', 'menstruation-cycle-card-compact.js', 'menstruation-countdown-timer.js']) {
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
assert.strictEqual(Object.keys(byType).length, 8);

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

// Live preview in the picker: the stub config points at a real cycle sensor, not at a made-up entity id.
for (const [type, fallback] of Object.entries({
  'menstruation-gauge-card': 'sensor.menstruation', 'menstruation-cycle-compact-status': 'sensor.menstruation',
  'menstruation-calendar-card': 'sensor.menstruation', 'menstruation-cycle-heatmap-card': 'sensor.menstruation',
  'menstruation-cycle-history-card-row': 'sensor.menstruation', 'menstruation-cycle-card': 'sensor.cycle_status',
  'menstruation-countdown-timer': 'sensor.anna',
})) {
  assert.strictEqual(byType[type].preview, true, `${type}: preview`);
  const cls = defined[type];
  assert.strictEqual(cls.getStubConfig(hass).entity, 'sensor.anna', `${type}: real sensor`);
  assert.strictEqual(cls.getStubConfig({ states: { 'light.kitchen': { attributes: {} } } }).entity, fallback, `${type}: fallback`);
  assert.strictEqual(cls.getStubConfig().entity, fallback, `${type}: no hass`);
}
assert.strictEqual(byType['menstruation-pill-card'].preview, true);
assert.strictEqual(defined['menstruation-pill-card'].getStubConfig(hass).entity, 'sensor.anna_pill'); // needs a pill pack
assert.strictEqual(defined['menstruation-pill-card'].getStubConfig({ states: { 'sensor.anna': { attributes: cycle } } }).entity, 'sensor.menstruation');
console.log('card-picker-suggestions: ok');
