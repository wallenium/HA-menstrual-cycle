'use strict';
// Quantity inputs of the inventory card need accessible names (source-level check).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'custom_components', 'menstruation_cycle', 'www', 'menstruation-product-inventory-card.js'), 'utf8');
const inputs = src.match(/<input class="qty"[^>]*>/g) || [];
assert.strictEqual(inputs.length, 3, 'expected 3 qty inputs, got ' + inputs.length);
for (const i of inputs) assert.ok(/aria-label="\$\{this\._t\(product\)\}: /.test(i), 'missing aria-label: ' + i);
console.log('inventory-qty-labels: ok');
