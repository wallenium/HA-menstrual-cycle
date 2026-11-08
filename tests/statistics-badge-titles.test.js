'use strict';
// Every badge the backend can earn needs a title and a description in the statistics card (it showed the raw key for the newer ones).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../custom_components/menstruation_cycle');
const badges = fs.readFileSync(path.join(root, 'badges.py'), 'utf8');
const card = fs.readFileSync(path.join(root, 'www/menstruation-statistics-card.js'), 'utf8');
const keys = [...badges.matchAll(/^_V\d_BADGE_KEYS = \[([^\]]*)\]/gm)].flatMap((m) => [...m[1].matchAll(/"([a-z0-9_]+)"/g)].map((k) => k[1]));
assert.ok(keys.length >= 15, `badge keys not found (${keys.length})`);
for (const key of keys) {
  for (const part of ['title', 'desc']) {
    assert.ok(card.includes(`progress_badge_${key}_${part}: '`), `${key}: no ${part} in the statistics card`);
  }
  assert.ok(card.includes(`titleKey: 'progress_badge_${key}_title'`), `${key}: no icon entry in the statistics card`);
}
console.log('statistics-badge-titles: ok');
