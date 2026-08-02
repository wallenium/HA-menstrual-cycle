'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-gauge-card.js'),
  'utf8',
);

global.window = { customCards: [] };
global.HTMLElement = class HTMLElement {};
const defined = {};
global.customElements = {
  define: (name, cls) => { defined[name] = cls; },
  get: () => undefined,
};

global.document = { createElement: () => ({}) };

// eslint-disable-next-line no-eval
eval(source);

assert.ok(defined['menstruation-gauge-card']);
assert.ok(defined['menstruation-cycle-card']);
assert.ok(defined['menstruation-gauge-card-editor']);
assert.ok(defined['menstruation-cycle-card-editor']);
assert.strictEqual(defined['menstruation-gauge-card'].name, 'MenstruationGaugeCard');
assert.strictEqual(defined['menstruation-cycle-card'].name, 'MenstruationGaugeCard');
assert.strictEqual(defined['menstruation-gauge-card-editor'].name, 'MenstruationGaugeCardEditor');
assert.strictEqual(defined['menstruation-cycle-card-editor'].name, 'MenstruationGaugeCardEditor');

const registration = (global.window.customCards || []).find((row) => row.type === 'menstruation-gauge-card');
assert.ok(registration, 'customCards should register menstruation-gauge-card');
assert.strictEqual(registration.name, 'Menstruation Gauge Card');

console.log('Gauge card registration test passed.');
