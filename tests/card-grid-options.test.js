'use strict';
// Sections view: every card announces a sane default and minimum width in the 12-column grid.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.window = { customCards: [] };
global.HTMLElement = class HTMLElement {};
const defined = {};
global.customElements = { define: (name, cls) => { defined[name] = cls; }, get: (name) => defined[name] };
global.document = { createElement: () => ({}) };

const www = path.join(__dirname, '../custom_components/menstruation_cycle/www');
const cards = ['gauge-card', 'calendar-card', 'cycle-heatmap-card', 'cycle-history-card-row', 'statistics-card',
  'product-inventory-card', 'support-card', 'cycle-compact-status-card', 'cycle-card-compact', 'countdown-timer', 'pill-card'];
for (const name of cards) {
  // eslint-disable-next-line no-eval
  eval(fs.readFileSync(path.join(www, `menstruation-${name}.js`), 'utf8'));
}

const registered = window.customCards.map((c) => c.type);
assert.ok(registered.length >= cards.length, `only ${registered.length} cards registered`);
for (const type of registered) {
  const Card = defined[type];
  assert.ok(Card, `${type} is not defined`);
  const grid = Card.prototype.getGridOptions && Card.prototype.getGridOptions.call({});
  assert.ok(grid, `${type} has no getGridOptions`);
  assert.ok(Number.isInteger(grid.columns) && grid.columns >= 1 && grid.columns <= 12, `${type} columns`);
  assert.ok(Number.isInteger(grid.min_columns) && grid.min_columns >= 1 && grid.min_columns <= grid.columns, `${type} min_columns`);
}
console.log(`card-grid-options: ok (${registered.length} cards)`);
