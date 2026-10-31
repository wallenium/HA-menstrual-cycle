'use strict';
// Keyboard focus, reduced motion and table semantics (source-level checks).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', 'custom_components', 'menstruation_cycle', 'www', f), 'utf8');

for (const f of ['menstruation-statistics-card.js', 'menstruation-product-inventory-card.js', 'menstruation-cycle-card-compact.js']) {
  assert.ok(read(f).includes(':focus-visible'), `${f}: keyboard focus needs a visible outline`);
}
for (const f of ['menstruation-statistics-card.js', 'menstruation-product-inventory-card.js', 'menstruation-cycle-card-compact.js',
  'menstruation-cycle-compact-status-card.js', 'menstruation-cycle-history-card-row.js']) {
  assert.ok(read(f).includes('prefers-reduced-motion'), `${f}: animations must respect reduced motion`);
}
const history = read('menstruation-cycle-history-card-row.js');
const ths = history.match(/<th[ >]/g) || [];
const scoped = history.match(/<th scope="col"/g) || [];
assert.ok(ths.length >= 5 && ths.length === scoped.length, `all ${ths.length} column headers need scope="col" (got ${scoped.length})`);
assert.ok(/<table[^>]*>\s*<caption/.test(history), 'main table needs a caption');
console.log('a11y-css: ok');

// A stray "<" after the legend label showed up as "Period<" in the calendar card (found in a real browser).
for (const f of fs.readdirSync(path.join(__dirname, '..', 'custom_components', 'menstruation_cycle', 'www')).filter((n) => n.endsWith('.js'))) {
  assert.ok(!/\}<<\//.test(read(f)), `${f}: stray "<" before a closing tag`);
}
console.log('stray-lt: ok');
