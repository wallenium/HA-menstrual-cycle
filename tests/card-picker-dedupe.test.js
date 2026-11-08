'use strict';
// A card file that is loaded twice (an old extra dashboard resource) must list its card only once in the "Add card" dialog.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.window = { customCards: [{ type: 'someone-elses-card' }] };
global.HTMLElement = class HTMLElement {};
const defined = {};
global.customElements = {
  define(name, cls) { if (defined[name]) throw new Error(`already defined: ${name}`); defined[name] = cls; },
  get: (name) => defined[name],
};
global.document = { createElement: () => ({}) };

const www = path.join(__dirname, '../custom_components/menstruation_cycle/www');
const files = fs.readdirSync(www).filter((f) => /^menstruation-.*\.js$/.test(f) && !/(dashboard-panel|functions|i18n)/.test(f));
for (const file of files) {
  const code = fs.readFileSync(path.join(www, file), 'utf8');
  for (let load = 0; load < 2; load += 1) {
    try { eval(code); } catch (e) { if (!/already defined/.test(e.message)) throw e; } // eslint-disable-line no-eval
  }
}
const counts = {};
for (const c of window.customCards) counts[c.type] = (counts[c.type] || 0) + 1;
assert.strictEqual(counts['someone-elses-card'], 1, 'foreign cards stay');
const mine = Object.entries(counts).filter(([t]) => t.startsWith('menstruation-'));
assert.ok(mine.length >= 11, `expected all 11 cards, got ${mine.length}`);
for (const [type, n] of mine) assert.strictEqual(n, 1, `${type} listed ${n} times`);
console.log('card-picker-dedupe: ok');
